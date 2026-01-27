const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

exports.sendScheduledNotifications = onSchedule(
    "*/10 * * * *",
    async () => {
      console.log("⏰ Checking for scheduled notifications...");

      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();
      console.log("Now is:", now.toDate().toISOString());
      console.log("Now in timestamp as it will come back:", now);

      try {
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
        let rescheduled = 0;

        for (const doc of snapshot.docs) {
          try {
            const notification = doc.data();

            // Get app from notification data
            const targetApp = notification.data?.app || "organizer-app";

            const userDoc = await db
                .collection("users")
                .doc(notification.userId)
                .get();

            if (!userDoc.exists) {
              console.log(`⚠️  User ${notification.userId} not found`);
              await doc.ref.delete();
              failed++;
              continue;
            }

            // Get app-specific token
            const userData = userDoc.data();
            const pushToken = userData.pushTokens?.[targetApp];

            if (!pushToken) {
              console.log(
                  `⚠️  User ${notification.userId} ` +
                  `doesn't have ${targetApp}`,
              );
              await doc.ref.delete();
              failed++;
              continue;
            }

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

            console.log(
                "Expo API response:",
                JSON.stringify(responseData, null, 2),
            );

            let sendSuccess = false;

            if (response.ok) {
              sendSuccess = true;
            }

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
                  `✅ Sent ${targetApp} notification to ` +
                  `${notification.userId}`,
              );
              sent++;

              // ✅ Handle recurring notifications
              if (notification.isRecurring &&
                  notification.recurringConfig) {
                const config = notification.recurringConfig;
                const isInfinite = config.totalOccurrences === null;
                const hasMore =
                    config.currentOccurrence < config.totalOccurrences;

                if (isInfinite || hasMore) {
                  // ✅ Calculate next time from ORIGINAL scheduled time
                  const currentScheduledTime = notification.scheduledFor;
                  const nextSeconds =
                      currentScheduledTime.seconds + config.intervalSeconds;

                  const nextScheduledFor = new admin.firestore.Timestamp(
                      nextSeconds,
                      0,
                  );

                  const nowIso = admin.firestore.Timestamp.now()
                      .toDate().toISOString();

                  await doc.ref.update({
                    "recurringConfig.currentOccurrence":
                        config.currentOccurrence + 1,
                    "recurringConfig.lastSentAt": nowIso,
                    "scheduledFor": nextScheduledFor,
                  });

                  const nextOccur = config.currentOccurrence + 1;
                  const total = config.totalOccurrences || "∞";
                  console.log(
                      `🔁 Rescheduled recurring notification ` +
                      `(occurrence ${nextOccur}/${total})`,
                  );
                  console.log(
                      `   Next send: ` +
                      `${nextScheduledFor.toDate().toISOString()}`,
                  );
                  rescheduled++;
                } else {
                  // ✅ Final occurrence reached
                  await doc.ref.delete();
                  const current = config.currentOccurrence;
                  const total = config.totalOccurrences;
                  console.log(
                      `✅ Final recurring occurrence sent ` +
                      `(${current}/${total}) - deleted`,
                  );
                }
              } else {
                // ✅ Non-recurring notification - delete as normal
                await doc.ref.delete();
              }
            } else {
              console.log(
                  `❌ Failed to send to ${notification.userId}`,
              );
              failed++;
              await doc.ref.delete();
            }
          } catch (error) {
            console.error(
                `❌ Error processing notification:`,
                error,
            );
            failed++;

            try {
              await doc.ref.delete();
            } catch (deleteError) {
              console.error("Failed to delete doc:", deleteError);
            }
          }
        }

        console.log(
            `✅ Batch complete: ${sent} sent, ` +
            `${failed} failed, ${rescheduled} rescheduled`,
        );
      } catch (error) {
        console.error("❌ Scheduler error:", error);
      }
    },
);
