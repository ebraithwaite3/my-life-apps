const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const {DateTime} = require("luxon");
const handlers = require("./handlers");

/**
 * Advance a recurring masterConfig notification to its next scheduledTime,
 * or remove it if it's one-time / final occurrence.
 * Returns the updated notifications array.
 */
function advanceOrRemoveMCNotif(notifications, notif, nowDate) {
  if (!notif.isRecurring || !notif.recurringConfig) {
    return notifications.filter((n) => n.id !== notif.id);
  }

  const config = notif.recurringConfig;
  const isInfinite = config.totalOccurrences === null;
  const hasMore = config.currentOccurrence < config.totalOccurrences;

  if (!isInfinite && !hasMore) {
    return notifications.filter((n) => n.id !== notif.id);
  }

  // DST-safe: advance by calendar days in the notification's timezone if
  // intervalSeconds is a whole number of days and a timezone is present.
  const tz = notif.data?.handlerParams?.timezone;
  const intervalDays = config.intervalSeconds / 86400;
  const isWholeDays = Number.isInteger(intervalDays);

  let nextScheduledTime;
  if (tz && isWholeDays) {
    nextScheduledTime = DateTime.fromISO(notif.scheduledTime, {zone: tz})
        .plus({days: intervalDays})
        .toISO();
  } else {
    nextScheduledTime = DateTime.fromISO(notif.scheduledTime)
        .plus({seconds: config.intervalSeconds})
        .toISO();
  }

  const nextOccurrence = config.currentOccurrence + 1;
  console.log(
      `[MC notifs] 🔁 Recurring ${nextOccurrence}/${config.totalOccurrences || "∞"} → ${nextScheduledTime}`,
  );

  return notifications.map((n) =>
    n.id !== notif.id ? n : {
      ...n,
      scheduledTime: nextScheduledTime,
      recurringConfig: {
        ...config,
        currentOccurrence: nextOccurrence,
        lastSentAt: nowDate.toISOString(),
      },
    },
  );
}

exports.sendScheduledNotifications = onSchedule(
    "*/10 * * * *",
    async () => {
      console.log("⏰ Checking for scheduled notifications...");

      const db = admin.firestore();
      const now = new Date();

      // Pre-fetch all masterConfig docs
      const masterConfigSnap = await db.collection("masterConfig").get();
      const masterConfigByUser = {};
      for (const configDoc of masterConfigSnap.docs) {
        masterConfigByUser[configDoc.id] = configDoc.data();
      }
      console.log("Now is:", now.toISOString());

      try {
        // ─── Process masterConfig.notifications ───────────────────────────
        console.log("[MC notifs] ⏰ Checking masterConfig.notifications...");

        const nowDateMC = now;
        let mcSent = 0;
        let mcFailed = 0;
        let mcRescheduled = 0;

        for (const [mcUserId, configData] of Object.entries(masterConfigByUser)) {
          const mcNotifications = configData.notifications || [];
          if (mcNotifications.length === 0) continue;

          const dueNotifs = mcNotifications.filter(
              (n) => n.scheduledTime && new Date(n.scheduledTime) <= nowDateMC,
          );
          if (dueNotifs.length === 0) continue;

          console.log(`[MC notifs] 📬 ${dueNotifs.length} due for user ${mcUserId}`);

          // Look up user doc once per user for push token
          const mcUserDoc = await db.collection("users").doc(mcUserId).get();
          const mcUserData = mcUserDoc.exists ? mcUserDoc.data() : null;

          let updatedMCNotifs = [...mcNotifications];

          for (const notif of dueNotifs) {
            try {
              const targetApp = notif.data?.app || "organizer-app";
              let title = notif.title || "MyOrganizer";
              let body = notif.body || "";

              // handlerName lives at notif.data.handlerName in masterConfig shape
              const handlerName = notif.data?.handlerName;
              const handlerParams = notif.data?.handlerParams;
              if (handlerName) {
                const handler = handlers[handlerName];
                if (handler) {
                  try {
                    const result = await handler(mcUserId, handlerParams || {}, db);
                    title = result.title;
                    body = result.body;
                    console.log(`[MC notifs] 🧠 Handler "${handlerName}" resolved`);
                  } catch (hErr) {
                    console.error(`[MC notifs] ❌ Handler "${handlerName}" failed:`, hErr);
                    // Falls through to static title/body
                  }
                } else {
                  console.warn(`[MC notifs] ⚠️ Unknown handler: ${handlerName}`);
                }
              }

              // Silent mode check
              const userConfig = masterConfigByUser[mcUserId] || {};
              if (userConfig.silentMode === true) {
                const arrayUnion = admin.firestore.FieldValue.arrayUnion;
                const increment = admin.firestore.FieldValue.increment(1);
                const configRef = db.doc(`masterConfig/${mcUserId}`);

                if (notif.linkedAlertId) {
                  await configRef.set({silentModeCount: increment}, {merge: true});
                } else {
                  const silentAlert = {
                    id: `silent-${notif.id}`,
                    title,
                    message: body,
                    scheduledTime: new Date().toISOString(),
                    acknowledged: false,
                    deleteOnConfirm: true,
                    createdAt: new Date().toISOString(),
                  };
                  await configRef.set(
                      {alerts: arrayUnion(silentAlert), silentModeCount: increment},
                      {merge: true},
                  );
                }

                const beforeLen = updatedMCNotifs.length;
                updatedMCNotifs = advanceOrRemoveMCNotif(updatedMCNotifs, notif, nowDateMC);
                if (updatedMCNotifs.length === beforeLen) mcRescheduled++;
                console.log(`[MC notifs] 🔕 Silent mode: suppressed push for ${mcUserId}`);
                mcSent++;
                continue;
              }

              // Push token check
              if (!mcUserData) {
                console.log(`[MC notifs] ⚠️ User ${mcUserId} not found — removing notif`);
                updatedMCNotifs = updatedMCNotifs.filter((n) => n.id !== notif.id);
                mcFailed++;
                continue;
              }
              const pushToken = mcUserData.pushTokens?.[targetApp];
              if (!pushToken) {
                console.log(`[MC notifs] ⚠️ No ${targetApp} token for ${mcUserId} — removing notif`);
                updatedMCNotifs = updatedMCNotifs.filter((n) => n.id !== notif.id);
                mcFailed++;
                continue;
              }

              // Send via Expo push API
              const mcMessage = {
                to: pushToken,
                sound: notif.silent === true ? null : "default",
                title,
                body,
                data: notif.data || {},
              };

              const mcResponse = await fetch(
                  "https://exp.host/--/api/v2/push/send",
                  {
                    method: "POST",
                    headers: {
                      "Accept": "application/json",
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(mcMessage),
                  },
              );
              const mcResponseData = await mcResponse.json();
              console.log(
                  "[MC notifs] Expo response:",
                  JSON.stringify(mcResponseData, null, 2),
              );

              let mcSendSuccess = mcResponse.ok;
              if (mcResponseData.data?.[0]?.status === "error") {
                console.log(`[MC notifs] ❌ Expo error: ${mcResponseData.data[0].message}`);
                mcSendSuccess = false;
              } else if (mcResponseData.errors) {
                console.log(`[MC notifs] ❌ Validation errors:`, JSON.stringify(mcResponseData.errors));
                mcSendSuccess = false;
              }

              if (mcSendSuccess) {
                console.log(`[MC notifs] ✅ Sent ${targetApp} to ${mcUserId}`);
                mcSent++;
                const beforeLen = updatedMCNotifs.length;
                updatedMCNotifs = advanceOrRemoveMCNotif(updatedMCNotifs, notif, nowDateMC);
                if (updatedMCNotifs.length === beforeLen) mcRescheduled++;
              } else {
                console.log(`[MC notifs] ❌ Send failed for ${mcUserId} — removing notif`);
                mcFailed++;
                updatedMCNotifs = updatedMCNotifs.filter((n) => n.id !== notif.id);
              }
            } catch (notifErr) {
              console.error(`[MC notifs] ❌ Error processing notif:`, notifErr);
              mcFailed++;
              updatedMCNotifs = updatedMCNotifs.filter((n) => n.id !== notif.id);
            }
          }

          // Write all changes for this user in one atomic update
          try {
            await db.doc(`masterConfig/${mcUserId}`).update({notifications: updatedMCNotifs});
            console.log(`[MC notifs] 💾 Updated array for ${mcUserId}`);
          } catch (writeErr) {
            console.error(`[MC notifs] ❌ Write failed for ${mcUserId}:`, writeErr);
          }
        }

        console.log(
            `[MC notifs] ✅ Done: ${mcSent} sent, ${mcFailed} failed, ${mcRescheduled} rescheduled`,
        );

        // ─── Process recurring alerts in masterConfig ─────────────────────
        console.log("⏰ Checking masterConfig for recurring alerts...");

        const nowDate = now;
        let alertsRescheduled = 0;

        for (const [userId, configData] of Object.entries(masterConfigByUser)) {
          const alerts = configData.alerts || [];
          if (alerts.length === 0) continue;

          let changed = false;
          const updatedAlerts = alerts.map((alert) => {
            if (alert.acknowledged) return alert;
            if (!alert.recurringIntervalMinutes) return alert;
            if (!alert.scheduledTime) return alert;

            const scheduledTime = new Date(alert.scheduledTime);
            if (scheduledTime > nowDate) return alert;

            // Past-due, unacknowledged, recurring — advance to next window
            const nextTime = new Date(
                nowDate.getTime() +
                alert.recurringIntervalMinutes * 60 * 1000,
            );
            changed = true;
            alertsRescheduled++;
            return {...alert, scheduledTime: nextTime.toISOString()};
          });

          if (changed) {
            try {
              await db
                  .doc(`masterConfig/${userId}`)
                  .update({alerts: updatedAlerts});
              console.log(
                  `🔁 Rescheduled recurring alerts for user ${userId}`,
              );
            } catch (err) {
              console.error(
                  `❌ Failed to update alerts for ${userId}:`, err,
              );
            }
          }
        }

        console.log(
            `✅ Alert check complete: ${alertsRescheduled} alert(s) rescheduled`,
        );
      } catch (error) {
        console.error("❌ Scheduler error:", error);
      }
    },
);
