const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * handleCombinedPayload — process todos and reminders in one POST.
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
 *       notification?: { title, body, scheduledTime, screen, data }
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

  const {todos} = req.body || {};
  let alerts = req.body?.alerts;
  const db = admin.firestore();
  const results = {};

  // ─── Process todos ───────────────────────────────────────────────────────
  if (todos) {
    const {todoResults, extractedAlerts} = await processTodos(db, todos);
    results.todos = todoResults;
    // Merge item-level alerts with top-level alerts for unified processing
    if (extractedAlerts.length > 0) {
      alerts = [...(alerts || []), ...extractedAlerts];
    }
  }

  // ─── Process reminders ───────────────────────────────────────────────────
  if (Array.isArray(alerts) && alerts.length > 0) {
    results.reminders = await processReminders(db, alerts);
  }

  const hasAny = todos || alerts?.length;
  if (!hasAny) {
    return res.status(400).json({
      error: "Payload must include at least one of: todos, alerts",
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
 * Process reminders — upsert to masterConfig.reminders[].
 * Notification is embedded inside the reminder object.
 * Matches existing entries by alert.id — re-sending the same id
 * updates in place rather than creating a duplicate.
 * @param {object} db - Firestore instance
 * @param {Array} alerts - array of reminder payload objects
 * @return {Array} results
 */
async function processReminders(db, alerts) {
  const results = [];

  // Validate and group by userId — one Firestore read per user.
  const byUser = {};
  for (const payload of alerts) {
    if (!payload.userId || !payload.deliveryMode) {
      results.push({
        status: "error",
        reason: "userId and deliveryMode required",
      });
      continue;
    }
    if (!byUser[payload.userId]) byUser[payload.userId] = [];
    byUser[payload.userId].push(payload);
  }

  for (const [userId, payloads] of Object.entries(byUser)) {
    const configRef = db.doc(`masterConfig/${userId}`);
    const configSnap = await configRef.get();
    const configData = configSnap.exists ? configSnap.data() : {};
    let currentReminders = configData.reminders || [];

    for (const payload of payloads) {
      const {deliveryMode, alert, notification} = payload;

      try {
        const reminderId = alert?.id ||
          db.collection("masterConfig").doc().id;
        const existing = currentReminders.find(
            (r) => r.id === reminderId,
        );

        // Embed notification when deliveryMode includes push.
        const hasNotif =
          deliveryMode === "push" || deliveryMode === "alert+push";
        const notifData = hasNotif && notification ? {
          title: notification.title,
          body: notification.body,
          scheduledTime: notification.scheduledTime ||
            alert?.scheduledTime || new Date().toISOString(),
          screen: notification.screen || null,
          handlerName: notification.handlerName || null,
          handlerParams: notification.handlerParams || null,
          data: notification.data || {app: "checklist-app"},
        } : undefined;

        const reminderData = {
          ...(existing || {}),
          ...(alert || {}),
          id: reminderId,
          deliveryMode,
          acknowledgedAt: alert?.acknowledgedAt ??
            existing?.acknowledgedAt ?? null,
          createdAt: existing?.createdAt ||
            alert?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(notifData !== undefined && {notification: notifData}),
        };
        // Strip legacy cross-reference fields if present.
        delete reminderData.linkedNotificationId;
        delete reminderData.acknowledged;

        if (existing) {
          currentReminders = currentReminders.map((r) =>
            r.id === reminderId ? reminderData : r,
          );
          results.push({
            userId, deliveryMode,
            reminder: {status: "updated", id: reminderId},
          });
          console.log(`✏️ Reminder "${reminderId}" updated`);
        } else {
          currentReminders = [...currentReminders, reminderData];
          results.push({
            userId, deliveryMode,
            reminder: {status: "created", id: reminderId},
          });
          console.log(`✅ Reminder "${reminderId}" created`);
        }
      } catch (err) {
        console.error(`❌ Reminder for ${userId}:`, err.message);
        results.push({userId, status: "error", reason: err.message});
      }
    }

    // Single write per user.
    try {
      await configRef.set(
          {reminders: currentReminders},
          {merge: true},
      );
      console.log(`💾 masterConfig/${userId} reminders written`);
    } catch (err) {
      console.error(`❌ Write failed for ${userId}:`, err.message);
    }
  }

  return results;
}
