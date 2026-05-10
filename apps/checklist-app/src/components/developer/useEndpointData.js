import { useCallback } from "react";
import { useData } from "@my-apps/contexts";
import { DateTime } from "luxon";

const TIMEZONE = "America/New_York";

const JACK_USER_ID  = "ObqbPOKgzwYr2SmlN8UQOaDbkzE2";
const ELLIE_USER_ID = "CjW9bPGIjrgEqkjE9HxNF6xuxfA3";

function buildTodosPayload(getActivitiesForEntity, userId, dateISO) {
  const people = [
    { id: userId,       person: "Me",    todoTitle: "To Do"       },
    { id: JACK_USER_ID,  person: "Jack",  todoTitle: "Jack To Do"  },
    { id: ELLIE_USER_ID, person: "Ellie", todoTitle: "Ellie To Do" },
  ];

  const todayISO = dateISO || DateTime.now().setZone(TIMEZONE).toISODate();
  const date  = DateTime.fromISO(todayISO, { zone: TIMEZONE });
  const start = date.startOf("day");
  const end   = date.endOf("day");

  const todos = people.map(({ id, person, todoTitle }) => {
    const all = getActivitiesForEntity(id);

    const todayToDo = all.find((item) => {
      if (!item.startTime) return false;
      const s = DateTime.fromISO(item.startTime);
      return (
        s >= start &&
        s <= end &&
        (item.title || "").trim().toLowerCase() === todoTitle.toLowerCase()
      );
    });

    const monthKey = todayToDo
      ? DateTime.fromISO(todayToDo.startTime).toFormat("yyyy-LL")
      : date.toFormat("yyyy-LL");

    const checklistActivity = todayToDo?.activities?.find(
      (a) => a.activityType === "checklist",
    );

    const items = (checklistActivity?.items || []).map((i) => ({ ...i }));

    return {
      person,
      userId: id,
      todoTitle,
      eventId: todayToDo?.eventId ?? null,
      monthKey,
      items,
    };
  });

  return { action: "updateTodos", date: todayISO, todos };
}

// ---------------------------------------------------------------------------
// useCombinedPayloadData
//
// "Get Data" for the Combined Payload endpoint.
// Returns a Claude Voice prompt with today's todo data + full instructions
// for producing a handleCombinedPayload JSON (todos + alerts + notifications).
// ---------------------------------------------------------------------------
export const useCombinedPayloadData = () => {
  const {
    getActivitiesForEntity, user,
    masterConfigReminders,
    jackMasterConfig, ellieMasterConfig,
  } = useData();

  const getData = useCallback((dateISO) => {
    const todosPayload = buildTodosPayload(getActivitiesForEntity, user?.userId, dateISO);
    const todayISO = todosPayload.date;
    const myUserId = user?.userId || "";

    const masterConfigData = {
      eric:  { reminders: masterConfigReminders  || [] },
      jack:  { reminders: jackMasterConfig?.reminders  || [] },
      ellie: { reminders: ellieMasterConfig?.reminders || [] },
    };

    const prompt = `\
You are my daily planning assistant. Today is ${todayISO} (America/New_York).

OUTPUT: A single valid JSON object — nothing else, no explanation, no markdown.
Omit any top-level key you don't need (e.g. omit "alerts" if none).

═══ TOP-LEVEL SHAPE ═══
{
  "todos": { "action": "updateTodos", "date": "${todayISO}", "todos": [ ...] },
  "alerts": [ ...top-level reminders not tied to a specific item... ]
}

═══ REMINDER OBJECT — unified alert + notification ═══
Every entry in "alerts" is a single reminder object. The notification is embedded
directly on the reminder — no separate notification array, no cross-reference IDs.

{
  "userId": "...",
  "deliveryMode": "alert" | "push" | "alert+push",
  "alert": {
    // ─── IDENTITY ─────────────────────────────────────────────
    "id": "unique-kebab-case-string",   // generate a UUID if new, reuse if updating
    "templateId": null,                 // future use

    // ─── CONTENT ──────────────────────────────────────────────
    "title": "...",
    "message": "...",

    // ─── TIMING ───────────────────────────────────────────────
    "scheduledTime": "ISO 8601 UTC",
    "acknowledgedAt": null,             // always null on creation / rescheduling.
                                        // App writes an ISO timestamp when user confirms.
                                        // Never set to anything other than null.
                                        // Setting null on update re-arms the reminder.

    // ─── PAUSE ────────────────────────────────────────────────
    "paused": false,                    // true = dormant until planning chat reactivates
    "pausedUntil": null,                // ISO UTC — Cloud Timer auto-unpauses at this time

    // ─── RECURRING — use ONE, never more than one ─────────────
    "recurringIntervalMinutes": null,   // fires every N minutes
    "recurringIntervalDays": null,      // fires every N days (DST-safe)
    "recurringSchedule": [              // fires on specific days at specific times
      { "day": "MO", "time": "15:30", "timezone": "America/New_York" },
      { "day": "WE", "time": "18:00", "timezone": "America/New_York" }
    ],                                  // array — each day can have its own time
                                        // mutually exclusive with interval fields

    // ─── REMINDER TYPE ────────────────────────────────────────
    // "persistent" → never deleted, always rescheduled. Use buttons to control lifecycle.
    // "oneTime"    → fires once, deleted after user acts on it
    // "simple"     → Yes/No only, no buttons array
    "reminderType": "persistent",
    "confirmLabel": null,               // custom label for primary confirm button

    // ─── NAVIGATION ───────────────────────────────────────────
    "deepLinkTarget": null,             // "Pinned" | "Calendar" | "Workouts" | null

    // ─── LINKED TODO ITEM ─────────────────────────────────────
    // When done button marks a todo item complete
    "linkedItem": {
      "userId": "...",
      "monthKey": "2026-05",
      "eventId": "...",
      "checklistId": "...",
      "itemId": "uuid-of-todo-item"
    },

    // ─── ON TODO COMPLETION ───────────────────────────────────
    // What happens when linkedItem is marked done in the app
    "onTodoComplete": "reschedule",     // "delete" | "pause" | "reschedule"

    // ─── MODE SWITCHING ───────────────────────────────────────
    // "evening" → all buttons shown
    // "morning" → buttons with onComplete:"set_mode_morning" hidden
    // null      → no filtering, all buttons always shown
    "mode": null,

    // ─── METADATA ─────────────────────────────────────────────
    "deletable": true,

    // ─── BUTTONS ARRAY (advanced reminders) ───────────────────
    // If present, renders exactly these buttons. No Yes/No fallback.
    "buttons": [
      {
        "id": "btn-done",
        "label": "Done",
        // Actions:
        // "reschedule"         → advance scheduledTime to specific wall-clock time
        // "snooze"             → advance scheduledTime by duration
        // "done"               → delete reminder. If linkedItem, marks todo complete.
        // "open"               → navigate to screen, delete reminder
        // "remind_me_again"    → open date/time picker, reschedule in place
        // "edit"               → same as remind_me_again
        // "delete"             → remove reminder, no side effects
        // "pause_indefinitely" → sets paused:true, stamps acknowledgedAt, keeps reminder
        "action": "reschedule",
        "rescheduleTime": "21:40",      // wall-clock time (for reschedule)
        "timezone": "America/New_York",
        "advanceDays": 1,
        "rescheduleType": "next_occurrence", // finds next occurrence of rescheduleTime
        "duration": "20m",             // for snooze: 10m|20m|30m|1h|2h|1d
        "target": "Pinned",            // for open: Pinned|Calendar|Workouts
        "itemId": null,                // for open: future auto-open
        "affectsLinked": true,         // update notification.scheduledTime too
        "onComplete": "set_mode_evening" // set_mode_evening|set_mode_morning|null
      }
    ]
  },

  // ─── EMBEDDED NOTIFICATION ──────────────────────────────────
  // Only include when deliveryMode is "push" or "alert+push"
  // Lives directly on the reminder — no separate array, no cross-reference IDs
  "notification": {
    "title": "...",
    "body": "...",
    "scheduledTime": "ISO 8601 UTC",   // always match alert.scheduledTime on creation and reschedule
    "screen": null                     // "Calendar" | "Pinned" | "Workouts" | null
  }
}

═══ ITEM-LEVEL ALERTS ═══
Any checklist item can carry a "scheduledAlert" field. The system extracts it and
creates the reminder automatically. The field stays on the item in Firestore.
Do NOT include a userId on scheduledAlert — derived from the parent todo entry.

{
  "id": "...",
  "name": "Do laundry",
  "completed": false,
  "scheduledAlert": {
    "deliveryMode": "alert+push",
    "alert": {
      "id": "laundry-reminder-1",
      "title": "Ready to start laundry?",
      "message": "You scheduled laundry for now.",
      "scheduledTime": "ISO 8601 UTC",
      "recurringIntervalMinutes": 30,
      "reminderType": "persistent",
      "paused": false,
      "pausedUntil": null,
      "acknowledgedAt": null,
      "deletable": true
    },
    "notification": {
      "title": "Laundry Time",
      "body": "Time to start your laundry",
      "scheduledTime": "ISO 8601 UTC"
    }
  }
}

═══ REMINDER TYPES ═══
persistent        → never deleted. Use buttons to control lifecycle. Good for recurring tasks.
oneTime           → fires once, deleted after user acts on it. Good for one-off reminders.
simple            → Yes/No only, no buttons array.

═══ DELIVERY MODES ═══
"alert"           → in-app modal only, no push notification
"push"            → push notification only, no in-app modal
"alert+push"      → both simultaneously

═══ PAUSE BEHAVIOR ═══
paused:true + pausedUntil:null     → dormant indefinitely. Planning chat reactivates it.
paused:true + pausedUntil:"ISO"    → auto-unpauses at that time (Cloud Timer handles it)
Use pause_indefinitely button action for tasks like dishes — done for now, ask again later.

═══ PLANNING CHAT FREQUENCY ═══
askFrequency: N    → only ask about this reminder every N days
                     Check acknowledgedAt — if less than N days ago, skip asking
                     If null or N+ days ago, ask about it
                     Default: ask every day if field is absent

═══ MODE SWITCHING ═══
Alerts can have mode: "evening" | "morning" to show different button sets.
mode: "evening" → all buttons shown
mode: "morning" → buttons with onComplete: "set_mode_morning" are hidden

Example — daily planning reminder:
buttons: [
  { id: "btn-done", label: "Done", action: "reschedule",
    rescheduleType: "next_occurrence", rescheduleTime: "21:40",
    timezone: "America/New_York", onComplete: "set_mode_evening", affectsLinked: true },
  { id: "btn-snooze", label: "Remind me in 20", action: "snooze",
    duration: "20m", affectsLinked: true },
  { id: "btn-morning", label: "Remind me tomorrow at 6:40 AM", action: "reschedule",
    rescheduleTime: "06:40", timezone: "America/New_York", advanceDays: 1,
    onComplete: "set_mode_morning", affectsLinked: true }
]

═══ TODO ITEM TYPES — PRESERVE ALL FIELDS ═══
itemType:"yesNo" yesNoConfig.type:"header"       Parent item — tapping Yes expands sub-choices
                                                 answer:"no" → parent completed:true, subItems stay completed:false (correct, not a bug)
itemType:"yesNo" yesNoConfig.type:"guided"       Stepped flow with quantities and timers
itemType:"yesNo" yesNoConfig.type:"simple"       Basic yes/no toggle
itemType:"yesNo" yesNoConfig.type:"multiChoice"  Yes/no with subject options (e.g. Homework → subjects)
itemType:"yesNo" yesNoConfig.type:"assignable"   Sends a push notification to another user
itemType:"group"                                 Expandable group with checkbox sub-items
itemType:"checkbox"                              Standard sub-item inside a group
(no itemType)                                    Plain item — id, name, completed only
requiredForScreenTime:true                       Gates screen time — NEVER remove or modify this flag
subItems                                         ALWAYS preserve the full array with all nested fields

KEY RULE (reminders): Reminder IDs must be unique. Never reuse an existing reminder ID
for a new reminder — only reuse it if explicitly updating that existing reminder.
Generate a UUID for any new reminder that needs one.

KEY RULE: Always include the COMPLETE items array for every person with ALL existing items
and their full data shape preserved. Only modify what was explicitly asked to change.
Never drop subItems, yesNoConfig, requiredForScreenTime, or any other field not mentioned.

═══ USER IDs ═══
Me (Eric): ${myUserId}
Jack:      ${JACK_USER_ID}
Ellie:     ${ELLIE_USER_ID}

═══ TODAY'S CURRENT DATA ═══
${JSON.stringify(todosPayload, null, 2)}

═══ CURRENT REMINDERS (per person) ═══
Use this to avoid creating duplicates. If a reminder already exists
for something the user asks about, update or reschedule it instead of adding a new one.
If a reminder is paused, ask whether to reactivate it and set a new scheduledTime.
${JSON.stringify(masterConfigData, null, 2)}`;

    return prompt;
  }, [getActivitiesForEntity, user?.userId, masterConfigReminders, jackMasterConfig, ellieMasterConfig]);

  return getData;
};