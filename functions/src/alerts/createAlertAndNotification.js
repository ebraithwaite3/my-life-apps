const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * createAlertAndNotification
 *
 * Upsert a reminder to masterConfig/{userId}.reminders[].
 * Notification is embedded inside the reminder object when
 * deliveryMode is "push" or "alert+push". No cross-reference IDs.
 *
 * Expected body:
 * {
 *   userId: string,
 *   deliveryMode: "alert" | "push" | "alert+push",
 *   alert?: {
 *     id: string,
 *     title: string,
 *     message: string,
 *     scheduledTime: ISO string,
 *     recurringIntervalMinutes?: number,
 *     reminderType?: "persistent" | "oneTime" | "simple",
 *     deepLinkTarget?: string,
 *     acknowledgedAt?: null,
 *     paused?: boolean,
 *     pausedUntil?: null,
 *     createdAt?: ISO string
 *   },
 *   notification?: {
 *     title: string,
 *     body: string,
 *     scheduledTime?: ISO string,
 *     screen?: string,
 *     data?: object
 *   }
 * }
 */
exports.createAlertAndNotification = functions.https.onRequest(
    async (req, res) => {
      res.set("Access-Control-Allow-Origin", "*");

      if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Methods", "POST");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        return res.status(204).send("");
      }

      if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"});
      }

      const {userId, deliveryMode, alert, notification} =
        req.body || {};

      if (!userId) {
        return res.status(400).json({error: "userId is required"});
      }

      const validModes = ["alert", "push", "alert+push"];
      if (!deliveryMode || !validModes.includes(deliveryMode)) {
        return res.status(400).json({
          error:
            "deliveryMode must be 'alert', 'push', or 'alert+push'",
        });
      }

      const db = admin.firestore();
      const reminderId = alert?.id ||
        db.collection("masterConfig").doc().id;
      const hasNotif =
        deliveryMode === "push" || deliveryMode === "alert+push";

      if (!alert) {
        return res.status(400).json({
          error: "alert object required",
        });
      }
      if (hasNotif && !notification) {
        return res.status(400).json({
          error: "notification object required for deliveryMode: " +
            deliveryMode,
        });
      }

      try {
        const configRef = db.doc(`masterConfig/${userId}`);
        const configSnap = await configRef.get();
        const configData = configSnap.exists ?
          configSnap.data() : {};
        const currentReminders = configData.reminders || [];
        const existing = currentReminders.find(
            (r) => r.id === reminderId,
        );

        const notifData = hasNotif ? {
          title: notification.title,
          body: notification.body,
          scheduledTime: notification.scheduledTime ||
            alert.scheduledTime || new Date().toISOString(),
          screen: notification.screen || null,
          handlerName: notification.handlerName || null,
          handlerParams: notification.handlerParams || null,
          data: notification.data || {app: "checklist-app"},
        } : undefined;

        const reminderData = {
          ...(existing || {}),
          ...alert,
          id: reminderId,
          deliveryMode,
          acknowledgedAt: alert.acknowledgedAt ??
            existing?.acknowledgedAt ?? null,
          createdAt: existing?.createdAt ||
            alert.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(notifData !== undefined && {notification: notifData}),
        };
        // Strip legacy cross-reference fields if present.
        delete reminderData.linkedNotificationId;
        delete reminderData.acknowledged;

        const updatedReminders = existing ?
          currentReminders.map((r) =>
            r.id === reminderId ? reminderData : r,
          ) :
          [...currentReminders, reminderData];

        await configRef.set(
            {reminders: updatedReminders},
            {merge: true},
        );

        const action = existing ? "updated" : "created";
        console.log(
            `✅ Reminder "${reminderId}" ${action}` +
            ` in masterConfig/${userId}`,
        );

        return res.status(200).json({
          success: true,
          userId,
          deliveryMode,
          reminder: {status: action, id: reminderId},
        });
      } catch (err) {
        console.error("❌ createAlertAndNotification error:", err);
        return res.status(500).json({error: err.message});
      }
    },
);
