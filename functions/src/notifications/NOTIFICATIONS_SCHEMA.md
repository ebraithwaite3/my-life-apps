# Reminder Schema — Single Source of Truth

> This document describes the canonical reminder schema used by the Cloud Functions scheduler,
> the checklist app, and the admin dashboard. When there is a disagreement between this file
> and live code, this file wins — update the code.

---

## Overview

A **reminder** is a document stored inside the `masterConfig/{userId}.reminders[]` array in
Firestore. The array is the only location reminders are stored; there is no separate collection.

```
masterConfig/{userId}
  reminders: Reminder[]
  reminderDefaults: ReminderDefaults
  silentMode: boolean
  silentModeCount: number
```

### Two key principles

1. **Store only what is needed for queries or expensive to recompute.** Fields like
   `scheduledTime` and `acknowledgedAt` must be stored because the scheduler reads them from
   Firestore on every 10-minute tick. Fields like `status` or `isPending` are cheap to derive
   at read time and are never stored.

2. **Compute everything else on the fly.** The app and scheduler both derive `isRetrying`,
   `isPending`, `nextOccurrence`, `nextRetryTime`, and `status` from stored fields at the
   point of use.

---

## Full Field Reference

### Identity

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | ✅ | Unique identifier. Format: `reminder-{timestamp}` for user-created, `template-{name}` for template-seeded. |
| `templateId` | `string \| null` | | If seeded from a template, the template's ID. `null` for user-created reminders. Read-only after creation. |
| `deletable` | `boolean` | ✅ | Whether the user can delete this reminder from the UI. Template reminders may set this to `false`. |
| `createdAt` | `ISO string` | ✅ | Wall-clock time the reminder was first created. Never updated. |
| `updatedAt` | `ISO string` | ✅ | Wall-clock time of the last write (save, reschedule, snooze, acknowledgement). |

---

### Content

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | ✅ | Short label shown in the alert header and the RemindersModal card. Also used for `linkedTitle` matching (see below). |
| `message` | `string` | ✅ | Body text of the alert/notification. |

---

### Timing

| Field | Type | Required | Description |
|---|---|---|---|
| `scheduledTime` | `ISO string` | ✅ | The next time the scheduler should process (fire) this reminder. The scheduler advances this field on every fire. |
| `scheduledAlertTime` | `ISO string` | ✅ | The anchor time for the current fire cycle. Set to the same value as `scheduledTime` when a fresh occurrence fires. **Never moved during retry advances** — only updated when (a) a fresh occurrence fires, or (b) snooze is tapped (see Snooze Behavior). Used by both the scheduler and the app to determine `isPending`. |
| `acknowledgedAt` | `ISO string \| null` | ✅ | Wall-clock time the user tapped Done, Snooze, or any dismissal action. `null` means unacknowledged. Reset to `null` whenever `scheduledAlertTime` advances to a new occurrence. |
| `paused` | `boolean` | ✅ | When `true`, the scheduler skips this reminder entirely. |
| `pausedUntil` | `ISO string \| null` | | If set, the scheduler auto-unpauses when `now >= pausedUntil`. Cleared when auto-unpause fires. |

---

### Recurrence

Exactly one of the four recurrence type objects must be present. The type determines how
`scheduledTime` is advanced after a fire, and how `Done` behaves.

```jsonc
"recurrence": {
  // — Pick exactly one —

  // Type 1: fire on specific days of the week at specific times
  "scheduleByDay": [
    { "day": "MO", "time": "17:00", "timezone": "America/New_York" },
    { "day": "FR", "time": "17:00", "timezone": "America/New_York" }
  ],

  // Type 2: fire every N calendar days at a fixed clock time
  "everyNDays": {
    "n": 2,
    "time": "20:00",
    "timezone": "America/New_York"
  },

  // Type 3: fire every N minutes (repeating interval)
  "everyNMinutes": {
    "n": 10
  },

  // Type 4: fire once and delete
  "oneTime": true
}
```

#### `scheduleByDay`

| Sub-field | Type | Description |
|---|---|---|
| `day` | `"MO" \| "TU" \| "WE" \| "TH" \| "FR" \| "SA" \| "SU"` | Day of week (ISO weekday abbreviation). |
| `time` | `"HH:mm"` | 24-hour clock time in the reminder's local timezone. |
| `timezone` | `string` | IANA timezone identifier. Defaults to `"America/New_York"`. |

Next occurrence: earliest future `(day, time, timezone)` tuple across all entries. DST-safe —
computed in the entry's own timezone.

#### `everyNDays`

| Sub-field | Type | Description |
|---|---|---|
| `n` | `number` | Interval in calendar days. |
| `time` | `"HH:mm"` | Fixed clock time for each occurrence. |
| `timezone` | `string` | IANA timezone identifier. |

Next occurrence: `scheduledTime + n days`, preserving the clock time in the given timezone.

#### `everyNMinutes`

| Sub-field | Type | Description |
|---|---|---|
| `n` | `number` | Interval in minutes. |

Next occurrence: `now + n minutes`, rounded up to the nearest 10-minute scheduler tick
(with a 5-minute lead so it lands in the next tick, not the current one).

> **`everyNMinutes` vs `retry` — these are not the same thing.**
>
> `recurrence.everyNMinutes` means: *this reminder intentionally fires on a repeating
> N-minute interval forever.* The user has opted into receiving it that frequently. Each
> fire is a fresh, expected occurrence.
>
> `retry.intervalMinutes` means: *this reminder fires on its normal schedule, but if the
> user ignores it, pester them every N minutes until they acknowledge.* The user did not
> opt into the extra fires — they are consequence of inaction.
>
> Setting both on the same reminder to the same interval is redundant and almost certainly
> wrong. If you want a reminder that fires every 10 minutes until acknowledged, use
> `recurrence.everyNMinutes` (or `recurrence.oneTime` + `retry.intervalMinutes`), not both.
> The example in the Full Examples section uses `everyNMinutes` alone — the `retry` block
> shown there is illustrative of the object shape, not a recommended pattern.

#### `oneTime`

Value is always `true`. No next occurrence — the reminder is deleted after it fires.

---

### Retry

Optional. When present, the scheduler re-fires the reminder every `intervalMinutes` until the
user acknowledges, or until `retryUntil` is reached.

```jsonc
"retry": {
  "intervalMinutes": 30,
  "retryUntil": "23:00"   // optional — local time in reminderDefaults.timezone
}
```

| Sub-field | Type | Description |
|---|---|---|
| `intervalMinutes` | `number` | How often to re-fire if unacknowledged. Rounded to the 10-min scheduler grid. |
| `retryUntil` | `"HH:mm" \| null` | Stop retrying after this local time on the same day. If `null`, retry indefinitely until acknowledged. |

**Critical invariant:** `scheduledAlertTime` is never advanced during a retry. It stays anchored
to the original fire time for the current cycle. Only the `scheduledTime` field moves forward
(to the next retry tick). This allows the pending check (`scheduledAlertTime < now`) to remain
true throughout the entire retry window.

---

### Actions

Defines which action buttons appear on the in-app alert. The `done` action behavior is
**auto-determined** by recurrence type (see Done Behavior section) and does not need to be
explicitly configured.

```jsonc
"actions": {
  "done": {},   // behavior is derived — no config needed

  "snooze": {
    "defaultDuration": "20m",
    "options": ["10m", "20m", "30m", "1h", "2h"]
  },

  "remindTomorrow": {
    "morning": "06:40",
    "evening": "21:40",
    "timezone": "America/New_York"
  }
}
```

`actions.snooze` is optional. When absent, snooze options come from
`reminderDefaults.snoozeOptions` and `reminderDefaults.defaultSnooze`. When present, it
overrides those defaults for this specific reminder only.

All three keys are optional. Omitting a key hides that button from the alert.

| Action | Button label | Behavior |
|---|---|---|
| `done` | "Done" | Auto-derived from recurrence type (see Done Behavior). |
| `snooze` | "Snooze {defaultDuration}" | Resets `scheduledTime` and `scheduledAlertTime` to `now + duration`, rounded to 10-min tick. `acknowledgedAt` stays `null`. |
| `remindTomorrow` | "Tomorrow AM" / "Tomorrow PM" | Sets `scheduledTime` and `scheduledAlertTime` to tomorrow at the configured time. Clears `acknowledgedAt`. |

---

### Side Effects

Optional array of side effects that execute when this reminder fires (alongside the
notification delivery).

```jsonc
"sideEffects": [
  { "type": "sendNotification", "app": "checklist-app" },
  { "type": "callFunction",     "name": "myHandlerName", "params": {} },
  { "type": "rescheduleAnother","reminderId": "reminder-1234567890" },
  { "type": "triggerWorkflow",  "workflowId": "morning-routine" }
]
```

| Type | Description |
|---|---|
| `sendNotification` | Send an Expo push notification to the specified app (`checklist-app` by default). |
| `callFunction` | Invoke a named handler from `handlers/index.js` to dynamically resolve title/body. |
| `rescheduleAnother` | Advance another reminder's `scheduledTime` when this one fires. |
| `triggerWorkflow` | Execute a named multi-step workflow (future use). |

---

### Linking

| Field | Type | Description |
|---|---|---|
| `linkedTitle` | `string \| null` | When set, a case-insensitive exact match against today's To Do checklist item names. Replaces the old `linkedItem.itemId` approach. When the user taps Done on the alert, the matching item is marked complete. When the user marks the checklist item complete, the reminder executes its `onTodoComplete` behavior. |
| `onTodoComplete` | `"reschedule" \| "pause" \| "delete" \| null` | What happens to this reminder when the linked checklist item is marked complete. `null` means no reaction. |

> **Migration note:** The previous `linkedItem: { userId, monthKey, eventId, itemId }` object
> is deprecated. New reminders use `linkedTitle`. The `done` handler checks `linkedItem` first
> (legacy path) and falls back to `linkedTitle` matching if `linkedItem` is absent.

---

### Interaction Controls

These fields are optional overrides on individual reminders. When absent, the app reads from
the user's `reminderDefaults`. When `reminderDefaults` is also absent, the app falls back to
`false`.

**Resolution order (both fields):**
1. Reminder's own explicit field (override — wins always)
2. `reminderDefaults.snoozable` / `reminderDefaults.reschedulable` (user default)
3. `false` (app fallback — safest default)

| Field | Type | Default | Description |
|---|---|---|---|
| `snoozable` | `boolean \| null` | null (inherit) | When `true`, Snooze option shown. When `false`, hidden. When `null`/absent, inherits from `reminderDefaults`. |
| `reschedulable` | `boolean \| null` | null (inherit) | When `true`, Reschedule option shown. When `false`, hidden. When `null`/absent, inherits from `reminderDefaults`. |

> **Resolution order:** The AlertModal reads `snoozable` and `reschedulable` by checking the
> reminder's own fields first (explicit override), then `reminderDefaults`, then defaulting to
> `false`. This means Eric's config can be `true` for both, and individual reminders can
> override to `false` to force accountability (Done only, no escape). Kids default to `false`
> on both; specific reminders can be set to `true` when earned.

---

### Delivery

| Field | Type | Valid values | Description |
|---|---|---|---|
| `deliveryMode` | `string` | `"alert"`, `"push"`, `"alert+push"` | How the reminder is delivered. `alert` = in-app modal only. `push` = Expo push only. `alert+push` = both. |
| `deepLinkTarget` | `string \| null` | Any valid deep link path | Deep link opened when the user taps the notification. `null` for no deep link. |

---

### Notification Object

Carries the resolved push payload. Kept in sync with `scheduledTime` on every advance.

```jsonc
"notification": {
  "title": "Take vitamins",
  "body": "Daily reminder",
  "scheduledTime": "2026-05-27T21:00:00.000Z",
  "handlerName": null,      // optional: name of a handler in handlers/index.js
  "handlerParams": {},      // optional: params passed to the handler
  "data": {
    "app": "checklist-app"
  }
}
```

When `handlerName` is set, the scheduler calls the handler at fire time to dynamically resolve
`title` and `body`. The static `title`/`body` fields serve as fallback if the handler fails.

---

## Computed Fields

These fields are **never stored in Firestore**. They are always derived from stored fields at
the point of use.

| Field | Derivation |
|---|---|
| `isRetrying` | `scheduledAlertTime < now && acknowledgedAt === null` |
| `isPending` | Same check as `isRetrying` — used by the app modal to decide whether to show the alert. |
| `nextOccurrence` | Calculated from `recurrence` config + `now`. For `scheduleByDay`: nearest future `(day, time)` tuple. For `everyNDays`: `scheduledTime + n days`. For `everyNMinutes`: `now + n minutes` rounded to 10-min tick. For `oneTime`: `null`. |
| `nextRetryTime` | `scheduledTime + retry.intervalMinutes`, rounded up to the nearest 10-min scheduler tick (with 5-min lead). Only meaningful when `retry` is set and `isRetrying` is true. |
| `status` | Derived from `paused`, `acknowledgedAt`, and `scheduledTime`: `"paused"` → `"acknowledged"` → `"pending"` → `"scheduled"`. |

---

## Pending Check

Both the scheduler (Cloud Function) and the app (React Native) use the same logic to decide
if a reminder should fire or be shown.

```
isPending = scheduledAlertTime < now && acknowledgedAt === null
```

- **`scheduledAlertTime < now`** — the fire cycle has started (the original scheduled time has
  passed).
- **`acknowledgedAt === null`** — the user has not yet dismissed this occurrence.

A reminder stays pending across the entire retry window because `scheduledAlertTime` never
moves during retries. `scheduledTime` advances on each retry tick, but `scheduledAlertTime`
stays anchored to the original occurrence, keeping `isPending` true until the user acts.

---

## Snooze Behavior

When the user taps Snooze:

1. Compute `snoozeTarget = now + duration`, rounded up to the nearest 10-min scheduler tick.
2. Write to Firestore:
   ```
   scheduledTime      = snoozeTarget
   scheduledAlertTime = snoozeTarget   ← both fields move together
   acknowledgedAt     = null           ← stays null; fire cycle restarts at new time
   ```

**Critical:** snooze moves `scheduledAlertTime` forward. This restarts the fire cycle at the
snoozed time. After the snooze delay elapses, the pending check (`scheduledAlertTime < now`)
becomes true again and the alert re-shows.

This is different from a retry advance, where only `scheduledTime` moves and
`scheduledAlertTime` stays anchored.

---

## Done Behavior

Done behavior is **auto-determined by the reminder's recurrence type**. No explicit `done`
config is required.

| Recurrence type | Done behavior |
|---|---|
| `scheduleByDay` | Advance `scheduledTime` and `scheduledAlertTime` to the next occurrence forward in time. Set `acknowledgedAt = null`. |
| `everyNDays` | Advance `scheduledTime` and `scheduledAlertTime` to `now + n days` at the fixed clock time. Set `acknowledgedAt = null`. |
| `everyNMinutes` | Advance `scheduledTime` and `scheduledAlertTime` to `now + n minutes` (10-min tick). Set `acknowledgedAt = null`. |
| `oneTime` | Delete the reminder from the `reminders[]` array entirely. |

> **App owns Done advancement.** When the user taps Done, the app computes the next
> occurrence and writes `scheduledTime`, `scheduledAlertTime`, and `acknowledgedAt: null`
> in a single atomic Firestore write. The scheduler never sees a reminder with
> `acknowledgedAt !== null` — post-acknowledgement advancement is entirely the app's
> responsibility. This keeps the scheduler's contract narrow: fire pending reminders,
> advance `scheduledTime` only for the retry tick if unacknowledged, advance both anchors
> to next occurrence only when no retry is configured.

---

## Full Examples

### 1. `scheduleByDay` — Take vitamins, daily at 5 PM

```json
{
  "id": "reminder-1748388000000",
  "title": "Take vitamins",
  "message": "Don't forget your vitamins",
  "deliveryMode": "alert+push",
  "scheduledTime": "2026-05-27T21:00:00.000Z",
  "scheduledAlertTime": "2026-05-27T21:00:00.000Z",
  "acknowledgedAt": null,
  "paused": false,
  "pausedUntil": null,
  "recurrence": {
    "scheduleByDay": [
      { "day": "MO", "time": "17:00", "timezone": "America/New_York" },
      { "day": "TU", "time": "17:00", "timezone": "America/New_York" },
      { "day": "WE", "time": "17:00", "timezone": "America/New_York" },
      { "day": "TH", "time": "17:00", "timezone": "America/New_York" },
      { "day": "FR", "time": "17:00", "timezone": "America/New_York" },
      { "day": "SA", "time": "17:00", "timezone": "America/New_York" },
      { "day": "SU", "time": "17:00", "timezone": "America/New_York" }
    ]
  },
  "actions": {
    "done": {},
    "snooze": {
      "defaultDuration": "20m",
      "options": ["10m", "20m", "30m", "1h", "2h"]
    }
  },
  "linkedTitle": "Take vitamins",
  "onTodoComplete": "reschedule",
  "deepLinkTarget": null,
  "deletable": true,
  "templateId": null,
  "notification": {
    "title": "Take vitamins",
    "body": "Don't forget your vitamins",
    "scheduledTime": "2026-05-27T21:00:00.000Z",
    "data": { "app": "checklist-app" }
  },
  "createdAt": "2026-05-01T12:00:00.000Z",
  "updatedAt": "2026-05-27T21:00:00.000Z"
}
```

---

### 2. `everyNDays` — Owala gasket, every 2 days at 8 PM

```json
{
  "id": "reminder-1748390000000",
  "title": "Clean Owala gasket",
  "message": "Pull the gasket, rinse, dry",
  "deliveryMode": "alert+push",
  "scheduledTime": "2026-05-28T00:00:00.000Z",
  "scheduledAlertTime": "2026-05-28T00:00:00.000Z",
  "acknowledgedAt": null,
  "paused": false,
  "pausedUntil": null,
  "recurrence": {
    "everyNDays": {
      "n": 2,
      "time": "20:00",
      "timezone": "America/New_York"
    }
  },
  "actions": {
    "done": {},
    "snooze": {
      "defaultDuration": "1h",
      "options": ["30m", "1h", "2h"]
    }
  },
  "linkedTitle": "Clean Owala gasket",
  "onTodoComplete": "reschedule",
  "deepLinkTarget": null,
  "deletable": true,
  "templateId": null,
  "notification": {
    "title": "Clean Owala gasket",
    "body": "Pull the gasket, rinse, dry",
    "scheduledTime": "2026-05-28T00:00:00.000Z",
    "data": { "app": "checklist-app" }
  },
  "createdAt": "2026-05-01T12:00:00.000Z",
  "updatedAt": "2026-05-28T00:00:00.000Z"
}
```

---

### 3. `everyNMinutes` — Test alert, every 10 minutes

```json
{
  "id": "reminder-1748392000000",
  "title": "Test alert",
  "message": "This fires every 10 minutes",
  "deliveryMode": "alert+push",
  "scheduledTime": "2026-05-27T21:40:00.000Z",
  "scheduledAlertTime": "2026-05-27T21:40:00.000Z",
  "acknowledgedAt": null,
  "paused": false,
  "pausedUntil": null,
  "recurrence": {
    "everyNMinutes": {
      "n": 10
    }
  },
  "actions": {
    "done": {}
  },
  "linkedTitle": null,
  "onTodoComplete": null,
  "deepLinkTarget": null,
  "deletable": true,
  "templateId": null,
  "notification": {
    "title": "Test alert",
    "body": "This fires every 10 minutes",
    "scheduledTime": "2026-05-27T21:40:00.000Z",
    "data": { "app": "checklist-app" }
  },
  "createdAt": "2026-05-27T21:00:00.000Z",
  "updatedAt": "2026-05-27T21:40:00.000Z"
}
```

---

### 4. `oneTime` — Cut grass, fires once with retry until 11 PM

```json
{
  "id": "reminder-1748394000000",
  "title": "Cut the grass",
  "message": "Front and back",
  "deliveryMode": "alert+push",
  "scheduledTime": "2026-05-27T18:00:00.000Z",
  "scheduledAlertTime": "2026-05-27T18:00:00.000Z",
  "acknowledgedAt": null,
  "paused": false,
  "pausedUntil": null,
  "recurrence": {
    "oneTime": true
  },
  "retry": {
    "intervalMinutes": 30,
    "retryUntil": "23:00"
  },
  "actions": {
    "done": {},
    "snooze": {
      "defaultDuration": "30m",
      "options": ["30m", "1h", "2h"]
    },
    "remindTomorrow": {
      "morning": "06:40",
      "evening": "21:40",
      "timezone": "America/New_York"
    }
  },
  "linkedTitle": null,
  "onTodoComplete": null,
  "deepLinkTarget": null,
  "deletable": true,
  "templateId": null,
  "notification": {
    "title": "Cut the grass",
    "body": "Front and back",
    "scheduledTime": "2026-05-27T18:00:00.000Z",
    "data": { "app": "checklist-app" }
  },
  "createdAt": "2026-05-27T10:00:00.000Z",
  "updatedAt": "2026-05-27T18:00:00.000Z"
}
```

---

## `reminderDefaults` Object

Companion object stored at `masterConfig/{userId}.reminderDefaults`. Provides user-level
defaults so the editor and scheduler don't need to hard-code these values.

```json
{
  "defaultSnooze": "20m",
  "snoozeOptions": ["10m", "20m", "30m", "1h", "2h"],
  "defaultMorningTime": "06:40",
  "defaultEveningTime": "21:40",
  "timezone": "America/New_York",
  "snoozable": true,
  "reschedulable": true
}
```

| Field | Description |
|---|---|
| `defaultSnooze` | Pre-selected snooze duration in the alert modal. |
| `snoozeOptions` | List of snooze durations shown in the picker. |
| `defaultMorningTime` | Default time for "Remind Tomorrow Morning" and weekly morning schedules. |
| `defaultEveningTime` | Default time for "Remind Tomorrow Evening". |
| `timezone` | User's local IANA timezone. Used as the fallback when a recurrence entry omits its own timezone. |
| `snoozable` | Default snooze visibility for all reminders. Individual reminders can override. |
| `reschedulable` | Default reschedule visibility for all reminders. Individual reminders can override. |

---

## Backlog

Features not yet in the schema. Document here before implementing.

| Feature | Notes |
|---|---|
| **Biweekly / monthly recurrence** | `everyNDays` covers biweekly (n=14) but not true "last Friday of the month" patterns. Needs a `scheduleByCalendar` recurrence type. |
| **Recurring retry windows** | Time-of-day gating for retries (e.g. "only retry between 8 AM – 10 PM"). Currently `retryUntil` covers a single daily cutoff. |
| **Smart adjustments** | Calendar-aware scheduling: "don't fire during events", "shift to next free slot". Requires reading `activities` collection at fire time. |
| **Weekly morning/evening default schedules** | A shorthand recurrence type that maps to `scheduleByDay` using the user's `defaultMorningTime` / `defaultEveningTime` without enumerating all 7 entries. |
| **Additional side effect types** | `triggerWebhook` (POST to external URL), `updateCalendarEvent` (write to `activities` doc), `assignToUser` (copy reminder to another family member's `masterConfig`). |
| **Full TypeScript migration** | Define `Reminder`, `Recurrence`, `RetryConfig`, `Actions`, `SideEffect` interfaces in a shared `@my-apps/types` package consumed by both the functions and the React Native app. |
| **`actions.snooze.onSnooze` / `actions.reschedule.onReschedule` side effect hooks** | Attach a side effect (e.g. notify parent) when a specific reminder is snoozed or rescheduled. Same structure as the `sideEffects` array. Useful for tracking kids' interaction with their reminders. |
