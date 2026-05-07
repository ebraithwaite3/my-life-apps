const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * handleCombinedPayload — process todos, alerts, and notifications in one POST.
 *
 * Expected body:
 * {
 *   todos?: {
 *     action: "updateTodos",
 *     date: "yyyy-MM-dd",
 *     todos: [{ person, userId, todoTitle, eventId, monthKey, items }]
 *   },
 *   alerts?: [
 *     {
 *       userId: string,
 *       deliveryMode: "alert" | "push" | "alert+push",
 *       alert?: { id, title, message, scheduledTime, ... },
 *       notification?: { title, body, scheduledTime, data }
 *     }
 *   ],
 *   notifications?: [
 *     {
 *       userId: string,
 *       title: string,
 *       body: string,
 *       scheduledTime?: ISO string,
 *       data?: object
 *     }
 *   ]
 * }
 */
exports.handleCombinedPayload = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  const {todos, notifications} = req.body || {};
  let alerts = req.body?.alerts;
  const db = admin.firestore();
  const results = {};

  // ─── Process todos ───────────────────────────────────────────────────────
  if (todos) {
    const {todoResults, extractedAlerts} = await processTodos(db, todos);
    results.todos = todoResults;
    // Merge item-level alerts with any top-level alerts for unified processing
    if (extractedAlerts.length > 0) {
      alerts = [...(alerts || []), ...extractedAlerts];
    }
  }

  // ─── Process alerts / notifications ──────────────────────────────────────
  if (Array.isArray(alerts) && alerts.length > 0) {
    results.alerts = await processAlerts(db, alerts);
  }

  if (Array.isArray(notifications) && notifications.length > 0) {
    results.notifications = await processNotifications(db, notifications);
  }

  const hasAny = todos || (alerts?.length) || (notifications?.length);
  if (!hasAny) {
    return res.status(400).json({
      error: "Payload must include at least one of: " +
        "todos, alerts, notifications",
    });
  }

  return res.status(200).json({success: true, results});
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Process todos payload — write checklist items for each person.
 * Also extracts item-level scheduledAlert entries for unified processing.
 * @param {object} db - Firestore instance
 * @param {object} todosPayload - the todos payload object
 * @return {object} todoResults and extractedAlerts
 */
async function processTodos(db, todosPayload) {
  let todoEntries;
  let date;

  if (Array.isArray(todosPayload.todos)) {
    todoEntries = todosPayload.todos;
    date = todosPayload.date;
  } else if (todosPayload.userId && todosPayload.items) {
    todoEntries = [todosPayload];
    date = todosPayload.date || null;
  } else {
    return {
      todoResults: [{status: "error", reason: "Invalid todos payload shape"}],
      extractedAlerts: [],
    };
  }

  console.log(`📝 processTodos — date: ${date}, entries: ${todoEntries.length}`);
  const results = [];
  const extractedAlerts = [];

  for (const entry of todoEntries) {
    const {person, userId, todoTitle, eventId, monthKey, items} = entry;

    if (!eventId) {
      console.log(`⚠️  ${person}: no eventId — skipping`);
      results.push({person, status: "skipped", reason: "no eventId"});
      continue;
    }

    if (!userId || !monthKey || !Array.isArray(items)) {
      console.log(`⚠️  ${person}: missing required fields — skipping`);
      results.push({person, status: "skipped", reason: "missing fields"});
      continue;
    }

    try {
      // Extract item-level scheduledAlert — kept on the item in Firestore
      // so the app can find/delete the linked alert without scanning
      // masterConfig.
      const cleanItems = items.map((item) => {
        if (item.scheduledAlert) {
          const alertId = item.scheduledAlert.alert?.id ||
            `item-${item.id || Date.now()}`;
          extractedAlerts.push({
            userId,
            deliveryMode: item.scheduledAlert.deliveryMode || "alert",
            alert: item.scheduledAlert.alert ?
              {
                ...item.scheduledAlert.alert,
                id: alertId,
                acknowledged: false,
                createdAt: item.scheduledAlert.alert.createdAt ||
                  new Date().toISOString(),
              } :
              undefined,
            notification: item.scheduledAlert.notification,
          });
          console.log(
              `📌 Extracted scheduledAlert from item "${item.name}" ` +
              `(${person})`,
          );
        }
        return item;
      });

      const monthRef = db
          .collection("activities")
          .doc(userId)
          .collection("months")
          .doc(monthKey);

      const monthDoc = await monthRef.get();

      if (!monthDoc.exists) {
        results.push({
          person,
          status: "skipped",
          reason: "month doc not found",
        });
        continue;
      }

      const monthData = monthDoc.data();
      const event = monthData.items?.[eventId];

      if (!event) {
        results.push({person, status: "skipped", reason: "event not found"});
        continue;
      }

      const activities = event.activities || [];
      const checklistIdx = activities.findIndex(
          (a) => a.activityType === "checklist",
      );

      let updatedActivities;
      if (checklistIdx === -1) {
        updatedActivities = [
          ...activities,
          {
            activityType: "checklist",
            items: cleanItems,
            updatedAt: new Date().toISOString(),
          },
        ];
      } else {
        updatedActivities = activities.map((a, i) =>
          i !== checklistIdx ?
            a :
            {...a, items: cleanItems, updatedAt: new Date().toISOString()},
        );
      }

      await monthRef.set(
          {items: {[eventId]: {...event, activities: updatedActivities}}},
          {merge: true},
      );

      console.log(
          `✅ ${person} (${todoTitle}): wrote ${cleanItems.length} items`,
      );
      results.push({person, status: "updated", itemCount: cleanItems.length});
    } catch (err) {
      console.error(`❌ ${person}:`, err.message);
      results.push({person, status: "error", reason: err.message});
    }
  }

  return {todoResults: results, extractedAlerts};
}

/**
 * Process alerts — write to masterConfig.alerts and/or
 * masterConfig.notifications. Alerts and notifications created together
 * are cross-referenced via linkedNotificationId / linkedAlertId.
 * @param {object} db - Firestore instance
 * @param {Array} alerts - array of alert payload objects
 * @return {Array} results
 */
async function processAlerts(db, alerts) {
  const results = [];
  const arrayUnion = admin.firestore.FieldValue.arrayUnion;

  for (const payload of alerts) {
    const {userId, deliveryMode, alert, notification} = payload;

    if (!userId || !deliveryMode) {
      results.push({
        status: "error",
        reason: "userId and deliveryMode required",
      });
      continue;
    }

    try {
      const entryResult = {};
      const isPaired = deliveryMode === "alert+push";

      // Pre-generate IDs so alert and notification can cross-reference
      const alertId = alert?.id ||
        db.collection("masterConfig").doc().id;
      const notifId = db.collection("masterConfig").doc().id;

      if (deliveryMode === "alert" || isPaired) {
        if (!alert) {
          results.push({userId, status: "error",
            reason: "alert object required"});
          continue;
        }

        const alertData = {
          ...alert,
          id: alertId,
          acknowledged: alert.acknowledged ?? false,
          createdAt: alert.createdAt || new Date().toISOString(),
          ...(isPaired && {linkedNotificationId: notifId}),
        };

        await db.doc(`masterConfig/${userId}`).set(
            {alerts: arrayUnion(alertData)},
            {merge: true},
        );

        console.log(`✅ Alert "${alertId}" → masterConfig/${userId}`);
        entryResult.alert = {status: "created", id: alertId};
      }

      if (deliveryMode === "push" || isPaired) {
        if (!notification) {
          results.push({userId, status: "error",
            reason: "notification object required"});
          continue;
        }

        const notificationData = {
          id: notifId,
          title: notification.title,
          body: notification.body,
          scheduledTime: notification.scheduledTime ||
            new Date().toISOString(),
          createdAt: new Date().toISOString(),
          data: notification.data || {app: "checklist-app"},
          ...(isPaired && {linkedAlertId: alertId}),
        };

        await db.doc(`masterConfig/${userId}`).set(
            {notifications: arrayUnion(notificationData)},
            {merge: true},
        );

        console.log(
            `✅ Notification "${notifId}" → masterConfig/${userId}`,
        );
        entryResult.notification = {status: "created", id: notifId};
      }

      results.push({userId, deliveryMode, ...entryResult});
    } catch (err) {
      console.error(`❌ Alert for ${userId}:`, err.message);
      results.push({userId, status: "error", reason: err.message});
    }
  }

  return results;
}

/**
 * Process standalone notifications — write to masterConfig.notifications.
 * @param {object} db - Firestore instance
 * @param {Array} notifications - array of notification objects
 * @return {Array} results
 */
async function processNotifications(db, notifications) {
  const results = [];
  const arrayUnion = admin.firestore.FieldValue.arrayUnion;

  for (const notif of notifications) {
    const {userId, title, body, scheduledTime, data} = notif;

    if (!userId || !title || !body) {
      results.push({
        status: "error",
        reason: "userId, title, and body required",
      });
      continue;
    }

    try {
      const notifId = db.collection("masterConfig").doc().id;

      const notificationData = {
        id: notifId,
        title,
        body,
        scheduledTime: scheduledTime || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        data: data || {app: "checklist-app"},
      };

      await db.doc(`masterConfig/${userId}`).set(
          {notifications: arrayUnion(notificationData)},
          {merge: true},
      );

      console.log(
          `✅ Notification "${notifId}" → masterConfig/${userId}`,
      );
      results.push({userId, status: "created", id: notifId});
    } catch (err) {
      console.error(`❌ Notification for ${userId}:`, err.message);
      results.push({userId, status: "error", reason: err.message});
    }
  }

  return results;
}
