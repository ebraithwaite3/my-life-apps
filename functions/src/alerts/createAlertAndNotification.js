const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * createAlertAndNotification
 *
 * Write to masterConfig alerts, notifications, or both.
 * Notifications are now stored in masterConfig/{userId}.notifications
 * (not pendingNotifications) and cross-referenced with their paired alert.
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
 *     onDone?: "delete" | "acknowledge_and_reschedule" | "mark_done_today",
 *     onStop?: "delete" | "pause_today" | "pause_indefinitely",
 *     actionType?: string,
 *     deepLinkTarget?: string,
 *     deleteOnConfirm?: boolean,
 *     deleteOnView?: boolean,
 *     acknowledged: false,
 *     createdAt?: ISO string
 *   },
 *   notification?: {
 *     title: string,
 *     body: string,
 *     scheduledTime?: ISO string,
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

      const {userId, deliveryMode, alert, notification} = req.body || {};

      if (!userId) {
        return res.status(400).json({error: "userId is required"});
      }

      const validModes = ["alert", "push", "alert+push"];
      if (!deliveryMode || !validModes.includes(deliveryMode)) {
        return res.status(400).json({
          error: "deliveryMode must be 'alert', 'push', or 'alert+push'",
        });
      }

      const db = admin.firestore();
      const arrayUnion = admin.firestore.FieldValue.arrayUnion;
      const results = {};

      // Pre-generate IDs so alert and notification can cross-reference
      const alertId = alert?.id ||
        db.collection("masterConfig").doc().id;
      const notifId = db.collection("masterConfig").doc().id;
      const isPaired = deliveryMode === "alert+push";

      try {
        if (deliveryMode === "alert" || isPaired) {
          if (!alert) {
            return res.status(400).json({
              error: "alert object required for deliveryMode: " +
                deliveryMode,
            });
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

          console.log(
              `✅ Alert "${alertId}" written to masterConfig/${userId}`,
          );
          results.alert = {status: "created", id: alertId};
        }

        if (deliveryMode === "push" || isPaired) {
          if (!notification) {
            return res.status(400).json({
              error: "notification object required for deliveryMode: " +
                deliveryMode,
            });
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
              `✅ Notification "${notifId}" written to ` +
            `masterConfig/${userId}`,
          );
          results.notification = {status: "created", id: notifId};
        }

        return res.status(200).json({
          success: true,
          userId,
          deliveryMode,
          results,
        });
      } catch (err) {
        console.error("❌ createAlertAndNotification error:", err);
        return res.status(500).json({error: err.message});
      }
    },
);
