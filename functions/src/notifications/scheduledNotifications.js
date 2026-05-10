const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const {DateTime} = require("luxon");
const handlers = require("./handlers");

/**
 * Compute the next occurrence for a single recurringSchedule entry.
 * DST-safe: advances in the entry's timezone.
 * @param {Object} entry - Schedule entry with day, time, timezone fields.
 * @return {DateTime} Luxon DateTime of the next matching occurrence.
 */
function nextOccurrenceForEntry({day, time, timezone}) {
  const tz = timezone || "America/New_York";
  const now = DateTime.now().setZone(tz);
  const [hour, minute] = time.split(":").map(Number);
  let candidate = now.set({hour, minute, second: 0, millisecond: 0});
  if (candidate <= now) candidate = candidate.plus({days: 1});
  let iterations = 0;
  while (
    candidate.toFormat("EEE").toUpperCase().slice(0, 2) !== day &&
    ++iterations <= 14
  ) {
    candidate = candidate.plus({days: 1});
  }
  return candidate;
}

/**
 * Compute the next scheduledTime ISO string based on the reminder's
 * recurrence config. Returns null if no recurrence config is present.
 * @param {Object} reminder - Reminder object with recurrence fields.
 * @param {Date} now - Current date used as base for interval advancement.
 * @return {string|null} ISO timestamp string, or null if not recurring.
 */
function computeNextScheduledTime(reminder, now) {
  if (reminder.recurringIntervalMinutes) {
    const intervalMs = reminder.recurringIntervalMinutes * 60 * 1000;
    const TEN_MIN = 600000;
    return new Date(
        Math.ceil((now.getTime() + intervalMs - 5 * 60000) / TEN_MIN) * TEN_MIN,
    ).toISOString();
  }
  if (reminder.recurringIntervalDays) {
    const tz = reminder.recurringSchedule?.[0]?.timezone || "America/New_York";
    return DateTime.fromISO(reminder.scheduledTime)
        .setZone(tz)
        .plus({days: reminder.recurringIntervalDays})
        .toISO();
  }
  if (Array.isArray(reminder.recurringSchedule) &&
      reminder.recurringSchedule.length) {
    const candidates = reminder.recurringSchedule.map(nextOccurrenceForEntry);
    const soonest = candidates.reduce((min, c) => (c < min ? c : min));
    return soonest.toISO();
  }
  if (reminder.recurringConfig?.intervalSeconds) {
    const intervalMs = reminder.recurringConfig.intervalSeconds * 1000;
    return new Date(now.getTime() + intervalMs).toISOString();
  }
  return null;
}

/**
 * Apply advance-or-remove logic to the reminders array after a reminder fires.
 * NEVER deletes a reminder with an alert component — user must dismiss in-app.
 * Only pure push-only one-time reminders are removed here.
 * @param {Array} updatedReminders - Current reminders array to modify.
 * @param {Object} reminder - The reminder that just fired.
 * @param {Date} now - Current timestamp for computing next scheduled time.
 * @param {boolean} isPersistent - True if app owns rescheduling via buttons.
 * @param {boolean} hasAlert - True if reminder has an in-app alert component.
 * @return {Array} Updated reminders array.
 */
function applyAdvanceOrRemove(
    updatedReminders, reminder, now, isPersistent, hasAlert,
) {
  if (isPersistent) {
    // App owns scheduledTime — just clear acknowledgedAt to re-arm if set
    if (!reminder.acknowledgedAt) return updatedReminders;
    return updatedReminders.map((r) =>
      r.id !== reminder.id ? r : {...r, acknowledgedAt: null},
    );
  }

  const nextTime = computeNextScheduledTime(reminder, now);

  if (hasAlert) {
    // Never delete — advance if recurring, otherwise leave for app to dismiss
    if (!nextTime) return updatedReminders;
    return updatedReminders.map((r) =>
      r.id !== reminder.id ? r :
        {...r, scheduledTime: nextTime, acknowledgedAt: null},
    );
  }

  // Pure push-only
  if (!nextTime) {
    // One-time — safe to remove after firing
    return updatedReminders.filter((r) => r.id !== reminder.id);
  }
  return updatedReminders.map((r) =>
    r.id !== reminder.id ? r :
      {...r, scheduledTime: nextTime, acknowledgedAt: null},
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
        let totalSent = 0;
        let totalFailed = 0;

        for (const [userId, configData] of Object.entries(masterConfigByUser)) {
          const reminders = configData.reminders || [];
          if (reminders.length === 0) continue;

          let changed = false;

          // STEP 1 — auto-unpause reminders whose pausedUntil has passed
          let updatedReminders = reminders.map((r) => {
            if (r.paused && r.pausedUntil && new Date(r.pausedUntil) <= now) {
              changed = true;
              return {...r, paused: false, pausedUntil: null};
            }
            return r;
          });

          // STEP 2 — find due reminders
          const dueReminders = updatedReminders.filter((r) => {
            if (r.paused) return false;
            if (r.pausedUntil && new Date(r.pausedUntil) > now) return false;
            if (!r.scheduledTime ||
                new Date(r.scheduledTime) > now) return false;
            const isPending = !r.acknowledgedAt ||
              new Date(r.acknowledgedAt) < new Date(r.scheduledTime);
            return isPending;
          });

          if (dueReminders.length === 0 && !changed) continue;

          if (dueReminders.length > 0) {
            console.log(
                `[reminders] 📬 ${dueReminders.length} due for user ${userId}`,
            );
          }

          // Look up user doc once per user for push token
          const userDoc = await db.collection("users").doc(userId).get();
          const userData = userDoc.exists ? userDoc.data() : null;
          const silentMode = configData.silentMode === true;

          // STEP 3 — process each due reminder
          for (const reminder of dueReminders) {
            const isPersistent = !!(reminder.buttons?.some(
                (b) => b.action === "reschedule" || b.action === "snooze",
            ));
            const hasAlert = reminder.deliveryMode === "alert" ||
                             reminder.deliveryMode === "alert+push";
            const hasPush = reminder.deliveryMode === "push" ||
                            reminder.deliveryMode === "alert+push";

            // Resolve push content
            let title = reminder.title || "Reminder";
            let body = reminder.message || "";
            const handlerName = reminder.notification?.handlerName;
            const handlerParams = reminder.notification?.handlerParams;
            if (handlerName) {
              const handler = handlers[handlerName];
              if (handler) {
                try {
                  const result = await handler(userId, handlerParams || {}, db);
                  title = result.title;
                  body = result.body;
                  console.log(
                      `[reminders] 🧠 Handler "${handlerName}" resolved`,
                  );
                } catch (hErr) {
                  console.error(
                      `[reminders] ❌ Handler "${handlerName}" failed:`, hErr,
                  );
                  // Falls through to static title/body
                }
              } else {
                console.warn(
                    `[reminders] ⚠️ Unknown handler: ${handlerName}`,
                );
              }
            }

            // Silent mode check
            if (silentMode) {
              const increment = admin.firestore.FieldValue.increment(1);
              const configRef = db.doc(`masterConfig/${userId}`);

              if (!hasAlert) {
                // Push-only — convert to in-app alert; nothing silently lost
                updatedReminders = [
                  ...updatedReminders,
                  {
                    id: `silent-${reminder.id}-${Date.now()}`,
                    deliveryMode: "alert",
                    reminderType: "oneTime",
                    title,
                    message: body,
                    scheduledTime: now.toISOString(),
                    acknowledgedAt: null,
                    paused: false,
                    pausedUntil: null,
                    deletable: true,
                    createdAt: now.toISOString(),
                  },
                ];
              }

              await configRef.set({silentModeCount: increment}, {merge: true});
              console.log(
                  `[reminders] 🔕 Silent mode: suppressed push for ${userId}`,
              );
              updatedReminders = applyAdvanceOrRemove(
                  updatedReminders, reminder, now, isPersistent, hasAlert,
              );
              changed = true;
              continue;
            }

            // Push delivery
            if (hasPush) {
              const pushToken = userData?.pushTokens?.["checklist-app"];
              if (!pushToken) {
                console.log(
                    `[reminders] ⚠️ No checklist-app token for ${userId}`,
                );
                totalFailed++;
                if (!hasAlert) {
                  updatedReminders = updatedReminders.filter(
                      (r) => r.id !== reminder.id,
                  );
                  changed = true;
                  continue;
                }
                // hasAlert — alert still shows in-app;
                // fall through to advance/remove
              } else {
                const message = {
                  to: pushToken,
                  sound: "default",
                  title,
                  body,
                  data: {app: "checklist-app", id: reminder.id},
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
                    "[reminders] Expo response:",
                    JSON.stringify(responseData, null, 2),
                );

                let sendSuccess = response.ok;
                if (responseData.data?.[0]?.status === "error") {
                  console.log(
                      `[reminders] ❌ Expo error: ` +
                      `${responseData.data[0].message}`,
                  );
                  sendSuccess = false;
                } else if (responseData.errors) {
                  console.log(
                      `[reminders] ❌ Validation errors:`,
                      JSON.stringify(responseData.errors),
                  );
                  sendSuccess = false;
                }

                if (sendSuccess) {
                  console.log(`[reminders] ✅ Sent to ${userId}`);
                  totalSent++;
                } else {
                  console.log(`[reminders] ❌ Send failed for ${userId}`);
                  totalFailed++;
                  if (!hasAlert) {
                    updatedReminders = updatedReminders.filter(
                        (r) => r.id !== reminder.id,
                    );
                    changed = true;
                    continue;
                  }
                  // hasAlert — push failed but alert still shows; fall through
                }
              }
            }

            // ADVANCE OR REMOVE
            const before = updatedReminders;
            updatedReminders = applyAdvanceOrRemove(
                updatedReminders, reminder, now, isPersistent, hasAlert,
            );
            if (updatedReminders !== before) changed = true;
          }

          // STEP 4 — single write per user if anything changed
          if (changed) {
            try {
              await db.doc(`masterConfig/${userId}`)
                  .update({reminders: updatedReminders});
              console.log(
                  `[reminders] 💾 Updated reminders for ${userId}`,
              );
            } catch (writeErr) {
              console.error(
                  `[reminders] ❌ Write failed for ${userId}:`, writeErr,
              );
            }
          }
        }

        console.log(
            `[reminders] ✅ Done: ${totalSent} sent, ${totalFailed} failed`,
        );
      } catch (error) {
        console.error("❌ Scheduler error:", error);
      }
    },
);
