const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const {DateTime} = require("luxon");
const handlers = require("./handlers");
const {validateReminder} = require("./reminderValidator");

/**
 * Round a Date up to the nearest 10-minute scheduler tick.
 * Applies a 5-minute lead so the result always lands in a future tick.
 * @param {Date} date
 * @return {Date}
 */
function roundUpToTenMinutes(date) {
  const TEN_MIN_MS = 10 * 60 * 1000;
  return new Date(
      Math.ceil((date.getTime() - 5 * 60 * 1000) / TEN_MIN_MS) * TEN_MIN_MS,
  );
}

/**
 * Compute the next scheduledTime ISO string from a reminder's recurrence
 * config.
 * Returns null for oneTime reminders (signals deletion after firing).
 * DST-safe: all timezone math done in Luxon using the entry's own timezone.
 * @param {Object} reminder
 * @param {Date} now
 * @return {string|null}
 */
function computeNextScheduledTime(reminder, now) {
  const {recurrence} = reminder;
  if (!recurrence) return null;

  if (recurrence.scheduleByDay) {
    const candidates = recurrence.scheduleByDay.map(({day, time, timezone}) => {
      const tz = timezone || "America/New_York";
      const nowInZone = DateTime.fromJSDate(now).setZone(tz);
      const [hour, minute] = time.split(":").map(Number);
      let candidate = nowInZone.set({hour, minute, second: 0, millisecond: 0});
      if (candidate <= nowInZone) candidate = candidate.plus({days: 1});
      let iterations = 0;
      while (
        candidate.toFormat("EEE").toUpperCase().slice(0, 2) !== day &&
        ++iterations <= 14
      ) {
        candidate = candidate.plus({days: 1});
      }
      return candidate;
    });
    const soonest = candidates.reduce((min, c) => (c < min ? c : min));
    return soonest.toISO();
  }

  if (recurrence.everyNDays) {
    const {n, time, timezone} = recurrence.everyNDays;
    const tz = timezone || "America/New_York";
    const [hour, minute] = time.split(":").map(Number);
    return DateTime.fromJSDate(now)
        .setZone(tz)
        .plus({days: n})
        .set({hour, minute, second: 0, millisecond: 0})
        .toISO();
  }

  if (recurrence.everyNMinutes) {
    return roundUpToTenMinutes(
        new Date(now.getTime() + recurrence.everyNMinutes.n * 60000),
    ).toISOString();
  }

  if (recurrence.oneTime) {
    return null;
  }

  return null;
}

/**
 * Advance or remove a reminder after it fires.
 * Returns the updated reminder object, or null to signal deletion.
 *
 * Path 1 — retryUntil exceeded: pause the reminder so it stops firing.
 * Path 2 — isRetrying (scheduledAlertTime past, scheduledTime future): advance
 *   scheduledTime only — scheduledAlertTime stays anchored to the original
 *   fire time.
 * Path 3 — retry or fresh occurrence:
 *   - retry configured → advance scheduledTime only; scheduledAlertTime
 *     stays anchored so isPending remains true until acknowledged in-app.
 *   - no retry → advance scheduledTime only; scheduledAlertTime also stays
 *     anchored. App advances scheduledAlertTime on Done tap.
 * Post-acknowledgement advancement is NOT the scheduler's job — the app
 * handles that on Done tap (writes scheduledTime, scheduledAlertTime,
 * acknowledgedAt: null atomically).
 *
 * Every path syncs notification.scheduledTime and stamps updatedAt.
 *
 * @param {Object} reminder
 * @param {Date} now
 * @return {Object|null}
 */
function applyAdvanceOrRemove(reminder, now) {
  const {recurrence, retry} = reminder;
  if (!recurrence) return null;

  const isOneTime = !!recurrence.oneTime;
  const isPending =
    new Date(reminder.scheduledAlertTime) < now &&
    reminder.acknowledgedAt === null;

  // PATH 1 — retryUntil: cutoff passed → pause instead of retrying
  if (retry?.retryUntil && isPending) {
    const userTimezone =
      recurrence.scheduleByDay?.[0]?.timezone ??
      recurrence.everyNDays?.timezone ??
      "America/New_York";
    const cutoff = DateTime.fromFormat(retry.retryUntil, "HH:mm", {
      zone: userTimezone,
    });
    const nowInZone = DateTime.fromJSDate(now).setZone(userTimezone);
    if (nowInZone > cutoff) {
      return {
        ...reminder,
        paused: true,
        acknowledgedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    }
  }

  // PATH 2 — dead path kept for safety: scheduledTime > now cannot occur here
  // because STEP 2 only admits reminders where scheduledTime <= now.

  // PATH 3 — retry or fresh occurrence
  const nextTime = computeNextScheduledTime(reminder, now);

  if (retry?.intervalMinutes) {
    // User hasn't acknowledged — advance scheduledTime only for the next retry
    // tick. scheduledAlertTime stays anchored so isPending remains true.
    const retryISO = roundUpToTenMinutes(
        new Date(now.getTime() + retry.intervalMinutes * 60000),
    ).toISOString();
    return {
      ...reminder,
      scheduledTime: retryISO,
      ...(reminder.notification && {
        notification: {...reminder.notification, scheduledTime: retryISO},
      }),
      updatedAt: now.toISOString(),
    };
  }

  // Fresh occurrence — advance scheduledTime only; scheduledAlertTime stays
  // anchored at the current fire time so isPending remains true until the
  // user taps Done in-app (which then advances scheduledAlertTime).
  if (!nextTime || isOneTime) {
    return null;
  }

  return {
    ...reminder,
    scheduledTime: nextTime,
    // scheduledAlertTime intentionally NOT advanced — stays at current fire
    // time so the in-app modal shows until acknowledged.
    acknowledgedAt: null,
    ...(reminder.notification && {
      notification: {...reminder.notification, scheduledTime: nextTime},
    }),
    updatedAt: now.toISOString(),
  };
}

/**
 * Core scheduler logic. Accepts an injectable `now` so it can be driven
 * by the cron trigger (real time) or the manual HTTP endpoint (test time).
 * @param {Date} now - The reference time for "is this reminder due?"
 * @param {FirebaseFirestore.Firestore} db - Firestore instance.
 * @param {string|null} filterUserId - When set, only process this user.
 * @return {Promise<Object>} processed, fired, filteredToUser, byUser
 */
async function runScheduler(now, db, filterUserId = null) {
  const masterConfigSnap = await db.collection("masterConfig").get();
  const masterConfigByUser = {};
  for (const configDoc of masterConfigSnap.docs) {
    masterConfigByUser[configDoc.id] = configDoc.data();
  }
  console.log(
      "Now is:", now.toISOString(),
      filterUserId ? `| filtering to user ${filterUserId}` : "",
  );

  let totalProcessed = 0;
  let totalFired = 0;
  const byUser = {};

  try {
    for (const [userId, configData] of Object.entries(masterConfigByUser)) {
      if (filterUserId && userId !== filterUserId) continue;

      const reminders = configData.reminders || [];
      if (reminders.length === 0) continue;

      let userProcessed = 0;
      let userFired = 0;
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
        if (!r.scheduledTime || new Date(r.scheduledTime) > now) return false;
        const isPending =
          new Date(r.scheduledAlertTime) < now &&
          r.acknowledgedAt === null;
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
        const {valid, errors, warnings} = validateReminder(reminder);
        if (!valid) {
          console.warn(
              `[reminders] ⚠️ Skipping invalid reminder "${reminder.id}" ` +
              `for ${userId}:`, errors,
          );
          continue;
        }
        if (warnings.length) {
          console.warn(
              `[reminders] ⚠️ Reminder "${reminder.id}" warnings:`, warnings,
          );
        }

        userProcessed++;

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
                recurrence: {oneTime: true},
                title,
                message: body,
                scheduledTime: now.toISOString(),
                scheduledAlertTime: now.toISOString(),
                acknowledgedAt: null,
                paused: false,
                pausedUntil: null,
                deletable: true,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
                notification: {
                  title,
                  body,
                  scheduledTime: now.toISOString(),
                  data: {app: "checklist-app"},
                },
              },
            ];
          }

          await configRef.set({silentModeCount: increment}, {merge: true});
          console.log(
              `[reminders] 🔕 Silent mode: suppressed push for ${userId}`,
          );

          const advanced = applyAdvanceOrRemove(reminder, now);
          if (advanced === null) {
            updatedReminders = updatedReminders.filter(
                (r) => r.id !== reminder.id,
            );
          } else {
            updatedReminders = updatedReminders.map((r) =>
              r.id === reminder.id ? advanced : r,
            );
          }
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
            if (!hasAlert) {
              updatedReminders = updatedReminders.filter(
                  (r) => r.id !== reminder.id,
              );
              changed = true;
              continue;
            }
            // hasAlert — alert still shows in-app; fall through
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
              userFired++;
            } else {
              console.log(`[reminders] ❌ Send failed for ${userId}`);
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
        const advanced = applyAdvanceOrRemove(reminder, now);
        if (advanced === null) {
          updatedReminders = updatedReminders.filter(
              (r) => r.id !== reminder.id,
          );
        } else {
          updatedReminders = updatedReminders.map((r) =>
            r.id === reminder.id ? advanced : r,
          );
        }
        changed = true;
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

      if (userProcessed > 0) {
        totalProcessed += userProcessed;
        totalFired += userFired;
        byUser[userId] = {processed: userProcessed, fired: userFired};
      }
    }

    console.log(
        `[reminders] ✅ Done: ${totalFired} sent, ` +
        `${totalProcessed - totalFired} failed/skipped`,
    );
  } catch (error) {
    console.error("❌ Scheduler error:", error);
    throw error;
  }

  return {
    processed: totalProcessed,
    fired: totalFired,
    filteredToUser: filterUserId,
    byUser,
  };
}

exports.sendScheduledNotifications = onSchedule(
    "*/10 * * * *",
    async () => {
      console.log("⏰ Checking for scheduled notifications...");
      const db = admin.firestore();
      await runScheduler(new Date(), db);
    },
);

exports.triggerNotificationsManual = onRequest(
    {cors: true},
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

      const {testTime, userId = null} = req.body || {};
      const now = testTime ? new Date(testTime) : new Date();

      if (testTime && isNaN(now.getTime())) {
        return res.status(400).json({
          error: "Invalid testTime — must be ISO 8601",
        });
      }

      console.log(
          `[manual trigger] now=${now.toISOString()}` +
          (testTime ? " (injected)" : " (real)") +
          (userId ? ` | userId=${userId}` : ""),
      );

      const db = admin.firestore();
      try {
        const result = await runScheduler(now, db, userId);
        return res.status(200).json(result);
      } catch (err) {
        console.error("[manual trigger] ❌ runScheduler threw:", err);
        return res.status(500).json({error: err.message});
      }
    },
);
