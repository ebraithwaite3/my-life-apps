// CJS copy of packages/utils/src/reminderValidator.js for Cloud Functions.
// Keep in sync with the shared package when schema changes.

const DELIVERY_MODES = ["alert", "push", "alert+push"];
const VALID_DAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const VALID_ON_TODO = ["reschedule", "pause", "delete"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * @param {*} v
 * @return {boolean}
 */
function isValidISO(v) {
  return typeof v === "string" && !isNaN(new Date(v).getTime());
}

/**
 * @param {*} v
 * @return {boolean}
 */
function isPositiveNumber(v) {
  return typeof v === "number" && v > 0;
}

/**
 * Validate a single reminder object against the canonical reminder schema.
 * @param {Object} reminder
 * @return {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateReminder(reminder) {
  const errors = [];
  const warnings = [];

  if (!reminder || typeof reminder !== "object" || Array.isArray(reminder)) {
    return {
      valid: false,
      errors: ["reminder must be a non-null object"],
      warnings: [],
    };
  }

  // ── Identity ──────────────────────────────────────────────────────────────

  if (!reminder.id || typeof reminder.id !== "string" || !reminder.id.trim()) {
    errors.push("id: required non-empty string");
  }

  if (typeof reminder.deletable !== "boolean") {
    errors.push("deletable: required boolean");
  }

  if (!isValidISO(reminder.createdAt)) {
    errors.push("createdAt: required valid ISO 8601 string");
  }

  if (!isValidISO(reminder.updatedAt)) {
    errors.push("updatedAt: required valid ISO 8601 string");
  }

  // ── Content ───────────────────────────────────────────────────────────────

  if (
    !reminder.title ||
    typeof reminder.title !== "string" ||
    !reminder.title.trim()
  ) {
    errors.push("title: required non-empty string");
  }

  if (reminder.message === undefined || reminder.message === null) {
    errors.push("message: required (can be empty string)");
  }

  // ── Delivery ──────────────────────────────────────────────────────────────

  if (!DELIVERY_MODES.includes(reminder.deliveryMode)) {
    errors.push(
        `deliveryMode: must be one of ${DELIVERY_MODES.join(", ")} ` +
        `(got "${reminder.deliveryMode}")`,
    );
  }

  // ── Timing ────────────────────────────────────────────────────────────────

  if (!isValidISO(reminder.scheduledTime)) {
    errors.push("scheduledTime: required valid ISO 8601 string");
  }

  if (
    reminder.acknowledgedAt !== null &&
    reminder.acknowledgedAt !== undefined &&
    !isValidISO(reminder.acknowledgedAt)
  ) {
    errors.push("acknowledgedAt: must be null or valid ISO 8601 string");
  }

  if (typeof reminder.paused !== "boolean") {
    errors.push("paused: required boolean");
  }

  if (
    reminder.pausedUntil !== null &&
    reminder.pausedUntil !== undefined &&
    !isValidISO(reminder.pausedUntil)
  ) {
    errors.push("pausedUntil: must be null or valid ISO 8601 string");
  }

  const isOneTime =
    reminder.reminderType === "oneTime" ||
    reminder.recurrence?.oneTime === true;

  const hasAnchor =
    isValidISO(reminder.scheduledAlertTime) ||
    isValidISO(reminder.lastScheduledOccurrence);

  if (!hasAnchor && !isOneTime) {
    warnings.push(
        "scheduledAlertTime (or lastScheduledOccurrence) is not set — " +
        "retry and pending checks may behave incorrectly",
    );
  }

  if (
    isValidISO(reminder.scheduledAlertTime) &&
    isValidISO(reminder.scheduledTime)
  ) {
    if (
      new Date(reminder.scheduledAlertTime) > new Date(reminder.scheduledTime)
    ) {
      warnings.push(
          "scheduledAlertTime is after scheduledTime — " +
          "the anchor must be <= scheduledTime",
      );
    }
  }

  // ── Recurrence ────────────────────────────────────────────────────────────

  const hasNewRecurrence =
    reminder.recurrence !== null &&
    reminder.recurrence !== undefined &&
    typeof reminder.recurrence === "object";

  const hasOldRecurrence = !!(
    (
      Array.isArray(reminder.recurringSchedule) &&
      reminder.recurringSchedule.length
    ) ||
    reminder.recurringIntervalDays ||
    reminder.recurringIntervalMinutes
  );

  if (!hasNewRecurrence && !hasOldRecurrence && !isOneTime) {
    errors.push(
        "recurrence: no recurrence type found — set " +
        "recurrence.scheduleByDay, recurrence.everyNDays, " +
        "recurrence.everyNMinutes, recurrence.oneTime, " +
        "or reminderType=\"oneTime\" (old schema)",
    );
  }

  if (hasNewRecurrence) {
    const r = reminder.recurrence;
    const activeTypes = [
      "scheduleByDay", "everyNDays", "everyNMinutes", "oneTime",
    ].filter((k) => r[k] !== undefined);

    if (activeTypes.length === 0) {
      errors.push(
          "recurrence: must contain exactly one of " +
          "scheduleByDay, everyNDays, everyNMinutes, oneTime",
      );
    } else if (activeTypes.length > 1) {
      errors.push(
          `recurrence: multiple types set (${activeTypes.join(", ")}) ` +
          "— pick exactly one",
      );
    } else {
      if (r.scheduleByDay !== undefined) {
        if (!Array.isArray(r.scheduleByDay) || r.scheduleByDay.length === 0) {
          errors.push("recurrence.scheduleByDay: must be a non-empty array");
        } else {
          r.scheduleByDay.forEach((entry, i) => {
            if (!VALID_DAYS.includes(entry.day)) {
              errors.push(
                  `recurrence.scheduleByDay[${i}].day: invalid day ` +
                  `"${entry.day}" — must be one of ${VALID_DAYS.join(", ")}`,
              );
            }
            if (!TIME_RE.test(entry.time)) {
              errors.push(
                  `recurrence.scheduleByDay[${i}].time: must be HH:mm ` +
                  `(got "${entry.time}")`,
              );
            }
          });
        }
      }

      if (r.everyNDays !== undefined) {
        if (!isPositiveNumber(r.everyNDays.n)) {
          errors.push("recurrence.everyNDays.n: must be a positive number");
        }
        if (!TIME_RE.test(r.everyNDays.time)) {
          errors.push(
              `recurrence.everyNDays.time: must be HH:mm ` +
              `(got "${r.everyNDays.time}")`,
          );
        }
      }

      if (r.everyNMinutes !== undefined) {
        if (!isPositiveNumber(r.everyNMinutes.n)) {
          errors.push(
              "recurrence.everyNMinutes.n: must be a positive number",
          );
        } else if (r.everyNMinutes.n < 10) {
          warnings.push(
              "recurrence.everyNMinutes.n is below the 10-min scheduler tick " +
              "— the first fire will be rounded up to the next tick",
          );
        }
        if (
          (reminder.retry && reminder.retry.intervalMinutes != null) ||
          reminder.unacknowledgedRetryMinutes != null
        ) {
          warnings.push(
              "recurrence.everyNMinutes and a retry interval are both set — " +
              "this is usually redundant (see NOTIFICATIONS_SCHEMA.md)",
          );
        }
      }

      if (r.oneTime !== undefined && r.oneTime !== true) {
        errors.push("recurrence.oneTime: value must be true");
      }
    }
  }

  if (hasOldRecurrence) {
    if (reminder.recurringSchedule !== undefined) {
      if (!Array.isArray(reminder.recurringSchedule)) {
        errors.push("recurringSchedule: must be an array");
      } else {
        reminder.recurringSchedule.forEach((entry, i) => {
          if (!VALID_DAYS.includes(entry.day)) {
            errors.push(
                `recurringSchedule[${i}].day: invalid "${entry.day}" ` +
                `— must be one of ${VALID_DAYS.join(", ")}`,
            );
          }
          if (!TIME_RE.test(entry.time)) {
            errors.push(
                `recurringSchedule[${i}].time: must be HH:mm ` +
                `(got "${entry.time}")`,
            );
          }
        });
      }
    }

    if (
      reminder.recurringIntervalDays !== undefined &&
      !isPositiveNumber(reminder.recurringIntervalDays)
    ) {
      errors.push("recurringIntervalDays: must be a positive number");
    }

    if (reminder.recurringIntervalMinutes !== undefined) {
      if (!isPositiveNumber(reminder.recurringIntervalMinutes)) {
        errors.push("recurringIntervalMinutes: must be a positive number");
      } else if (reminder.recurringIntervalMinutes < 10) {
        warnings.push(
            "recurringIntervalMinutes is below the 10-min scheduler tick " +
            "— the first fire will be rounded up to the next tick",
        );
      }
      if (reminder.unacknowledgedRetryMinutes != null) {
        warnings.push(
            "recurringIntervalMinutes and unacknowledgedRetryMinutes " +
            "are both set — usually redundant (see NOTIFICATIONS_SCHEMA.md)",
        );
      }
    }
  }

  // ── Retry ─────────────────────────────────────────────────────────────────

  if (reminder.retry !== null && reminder.retry !== undefined) {
    if (!isPositiveNumber(reminder.retry.intervalMinutes)) {
      errors.push("retry.intervalMinutes: must be a positive number");
    } else if (reminder.retry.intervalMinutes < 10) {
      warnings.push(
          "retry.intervalMinutes is below the 10-min scheduler tick " +
          "— will be rounded up",
      );
    }
    if (
      reminder.retry.retryUntil !== null &&
      reminder.retry.retryUntil !== undefined &&
      !TIME_RE.test(reminder.retry.retryUntil)
    ) {
      errors.push(
          `retry.retryUntil: must be HH:mm or null ` +
          `(got "${reminder.retry.retryUntil}")`,
      );
    }
  }

  if (
    reminder.unacknowledgedRetryMinutes !== null &&
    reminder.unacknowledgedRetryMinutes !== undefined
  ) {
    if (!isPositiveNumber(reminder.unacknowledgedRetryMinutes)) {
      errors.push("unacknowledgedRetryMinutes: must be a positive number");
    } else if (reminder.unacknowledgedRetryMinutes < 10) {
      warnings.push(
          "unacknowledgedRetryMinutes is below the 10-min scheduler tick " +
          "— will be rounded up",
      );
    }
  }

  // ── Notification sync ──────────────────────────────────────────────────────

  if (
    reminder.notification &&
    isValidISO(reminder.scheduledTime) &&
    reminder.notification.scheduledTime &&
    reminder.notification.scheduledTime !== reminder.scheduledTime
  ) {
    warnings.push(
        `notification.scheduledTime (${reminder.notification.scheduledTime})` +
        ` is out of sync with scheduledTime (${reminder.scheduledTime})`,
    );
  }

  // ── Linking ───────────────────────────────────────────────────────────────

  const hasLinkedTitle =
    typeof reminder.linkedTitle === "string" &&
    reminder.linkedTitle.trim().length > 0;

  if (hasLinkedTitle && !reminder.onTodoComplete) {
    warnings.push(
        "linkedTitle is set but onTodoComplete is null — " +
        "the reminder will not react when the checklist item is completed",
    );
  }

  if (reminder.onTodoComplete && !hasLinkedTitle) {
    warnings.push(
        "onTodoComplete is set but linkedTitle is null — " +
        "set linkedTitle to enable checklist item sync",
    );
  }

  if (
    reminder.onTodoComplete !== null &&
    reminder.onTodoComplete !== undefined &&
    !VALID_ON_TODO.includes(reminder.onTodoComplete)
  ) {
    errors.push(
        `onTodoComplete: must be one of ${VALID_ON_TODO.join(", ")} or null ` +
        `(got "${reminder.onTodoComplete}")`,
    );
  }

  // ── Interaction Controls ─────────────────────────────────────────────────

  if (
    reminder.snoozable !== null &&
    reminder.snoozable !== undefined &&
    typeof reminder.snoozable !== "boolean"
  ) {
    errors.push("snoozable: must be boolean or null if present");
  }

  if (
    reminder.reschedulable !== null &&
    reminder.reschedulable !== undefined &&
    typeof reminder.reschedulable !== "boolean"
  ) {
    errors.push("reschedulable: must be boolean or null if present");
  }

  return {valid: errors.length === 0, errors, warnings};
}

module.exports = {validateReminder};
