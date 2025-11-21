const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

/**
 * Runs every 10 minutes to send scheduled notifications
 * Runs at :00, :10, :20, :30, :40, :50 every hour
 */
exports.sendScheduledNotifications = onSchedule(
    "*/10 * * * *",
    async () => {
      console.log("⏰ Checking for scheduled notifications...");

      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();

      try {
        // Query notifications that are due
        const snapshot = await db
            .collection("pendingNotifications")
            .where("scheduledFor", "<=", now)
            .limit(50)
            .get();

        if (snapshot.empty) {
          console.log("📭 No notifications to send");
          return;
        }

        console.log(`📬 Found ${snapshot.size} notifications to send`);

        let sent = 0;
        let failed = 0;

        // Process each notification
        for (const doc of snapshot.docs) {
          try {
            const notification = doc.data();

            // Get user's push token
            const userDoc = await db
                .collection("users")
                .doc(notification.userId)
                .get();

            if (!userDoc.exists || !userDoc.data().pushToken) {
              console.log(
                  `⚠️  User ${notification.userId} has no push token`,
              );
              await doc.ref.delete();
              failed++;
              continue;
            }

            const pushToken = userDoc.data().pushToken;

            // Build and send notification
            const message = {
              to: pushToken,
              sound: "default",
              title: notification.title || "MyOrganizer",
              body: notification.body || "",
              data: notification.data || {},
            };

            const response = await fetch(
                "https://exp.host/--/api/v2/push/send",
                {
                  method: "POST",
                  headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(message),
                },
            );

            const responseData = await response.json();

            // LOG THE ACTUAL RESPONSE
            console.log(
                "Expo API response:",
                JSON.stringify(responseData, null, 2),
            );

            // Check response - handle different formats
            let sendSuccess = false;

            // Check HTTP status first
            if (response.ok) {
              // HTTP 200 = success
              sendSuccess = true;
            }

            // Also check response body for explicit errors
            if (responseData.data) {
              const result = responseData.data[0];
              if (result && result.status === "error") {
                console.log(`❌ Expo error: ${result.message}`);
                sendSuccess = false;
              }
            } else if (responseData.errors) {
              console.log(
                  `❌ Validation errors:`,
                  JSON.stringify(responseData.errors),
              );
              sendSuccess = false;
            }

            if (sendSuccess) {
              console.log(
                  `✅ Sent to ${notification.userId}:`,
                  notification.title,
              );
              sent++;
            } else {
              console.log(
                  `❌ Failed to send to ${notification.userId}`,
              );
              failed++;
            }

            // ALWAYS delete after attempting to send
            await doc.ref.delete();
          } catch (error) {
            console.error(
                `❌ Error processing notification:`,
                error,
            );
            failed++;

            // Delete even on error to prevent re-processing
            try {
              await doc.ref.delete();
            } catch (deleteError) {
              console.error("Failed to delete doc:", deleteError);
            }
          }
        }

        console.log(
            `✅ Batch complete: ${sent} sent, ${failed} failed`,
        );
      } catch (error) {
        console.error("❌ Scheduler error:", error);
      }
    },
);
