import { useCallback } from "react";
import { useData } from "@my-apps/contexts";
import { DateTime } from "luxon";

const TIMEZONE = "America/New_York";

const JACK_USER_ID  = "ObqbPOKgzwYr2SmlN8UQOaDbkzE2";
const ELLIE_USER_ID = "CjW9bPGIjrgEqkjE9HxNF6xuxfA3";

function buildTodosPayload(getActivitiesForEntity, userId) {
  const people = [
    { id: userId,       person: "Me",    todoTitle: "To Do"       },
    { id: JACK_USER_ID,  person: "Jack",  todoTitle: "Jack To Do"  },
    { id: ELLIE_USER_ID, person: "Ellie", todoTitle: "Ellie To Do" },
  ];

  const todayISO = DateTime.now().setZone(TIMEZONE).toISODate();
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
    masterConfigAlerts, masterConfigNotifications,
    jackMasterConfig, ellieMasterConfig,
  } = useData();

  const getData = useCallback(() => {
    const todosPayload = buildTodosPayload(getActivitiesForEntity, user?.userId);
    const todayISO = todosPayload.date;
    const myUserId = user?.userId || "";

    const masterConfigData = {
      eric:  { alerts: masterConfigAlerts  || [], notifications: masterConfigNotifications || [] },
      jack:  { alerts: jackMasterConfig?.alerts  || [], notifications: jackMasterConfig?.notifications  || [] },
      ellie: { alerts: ellieMasterConfig?.alerts || [], notifications: ellieMasterConfig?.notifications || [] },
    };

    const prompt = `\
You are my daily planning assistant. Today is ${todayISO} (America/New_York).

OUTPUT: A single valid JSON object — nothing else, no explanation, no markdown.
Omit any top-level key you don't need (e.g. omit "notifications" if none).

═══ TOP-LEVEL SHAPE ═══
{
  "todos": { "action": "updateTodos", "date": "${todayISO}", "todos": [ ...] },
  "alerts": [ ...top-level alerts not tied to a specific item... ],
  "notifications": [ ...standalone push notifications... ]
}

═══ ITEM-LEVEL ALERTS ═══
Any checklist item can carry a "scheduledAlert" field. The system extracts it and
creates the alert/notification automatically. The field stays on the item in Firestore
so the app can find and delete the linked alert later.
Do NOT include a userId on scheduledAlert — it is derived from the parent todo entry.

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
      "deepLinkTarget": "Pinned",
      "deleteOnConfirm": true,
      "deleteOnView": false,
      "acknowledged": false
    },
    "notification": {
      "title": "Laundry Time",
      "body": "Time to start your laundry",
      "scheduledTime": "ISO 8601 UTC"
    }
  }
}

═══ ALERT FLAGS (simple alerts — no buttons array) ═══
deleteOnConfirm: true  → alert deleted when user taps Yes
deleteOnView: true     → alert deleted as soon as the modal appears (Yes or No)
Neither set            → Yes marks acknowledged:true; No dismisses in-memory, re-shows next session

Recurring snooze: When No is tapped on a recurring alert, the app writes
acknowledged:true + advances scheduledTime by recurringIntervalMinutes.
The timer resets acknowledged:false when that time passes.
The alert keeps firing until the user taps Yes.

═══ ALERT TIERS ═══
Simple alert   → no buttons array. Uses deleteOnConfirm/deleteOnView flags. Shows Yes/No.
Advanced alert → has buttons array. Renders exactly the buttons configured. Ignores deleteOnConfirm.

═══ ALERT TYPES ═══
One-shot, dismiss either way     deleteOnConfirm:true,  deleteOnView:false
One-shot, keep record            deleteOnConfirm:false, deleteOnView:false
Recurring until confirmed        deleteOnConfirm:true,  recurringIntervalMinutes:N
Silent / in-app only             deliveryMode:"alert"   (no push)
Time-sensitive, needs both       deliveryMode:"alert+push"
Persistent, never deleted        deleteOnConfirm:false, deleteOnView:false — use buttons to control lifecycle

═══ ALERT BUTTON ACTIONS ═══
Use buttons array for any alert that needs more than Yes/No.
Each button has: id, label, action, and action-specific fields.

reschedule    → advance scheduledTime to a specific wall-clock time
  rescheduleTime: "21:40"           wall-clock time in timezone
  timezone: "America/New_York"
  advanceDays: 1                    days to advance from now
  rescheduleType: "next_occurrence" → finds next occurrence of rescheduleTime
                                      (today if before that time, tomorrow if after)
  affectsLinked: true               → also reschedules linkedNotificationId

snooze        → advance scheduledTime by duration
  duration: "20m" | "30m" | "1h" | "2h" | "1d"
  affectsLinked: true

done          → delete alert. If linkedItem present, marks that todo item completed:true
open          → navigate to target screen, delete alert. Does NOT mark item complete.
  target: "Pinned" | "Calendar" | "Workouts"
  itemId: "..."                     optional, for future auto-open support
remind_me_again → open date/time picker, reschedule in place on submit
edit          → open date/time picker, reschedule in place on submit (same as remind_me_again)
delete        → remove alert, no side effects

onComplete field (optional on any button):
  "set_mode_evening" → sets mode: "evening" on the alert after action
  "set_mode_morning" → sets mode: "morning" on the alert after action

═══ MODE SWITCHING ═══
Alerts can have mode: "evening" | "morning" to show different button sets.
mode: "evening" → all buttons shown
mode: "morning" → buttons with onComplete: "set_mode_morning" are hidden
Use for alerts that behave differently depending on time of day.

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

═══ LINKED ITEM (for done button) ═══
When a button with action: "done" should also mark a todo item complete:
"linkedItem": {
  "userId": "...",
  "monthKey": "2026-05",
  "eventId": "...",
  "itemId": "actual-item-id"
}
When the user taps Done, the alert is deleted AND that todo item is marked completed:true.
Also: when a todo item is marked complete in the app, any alert with a matching
linkedItem.itemId is automatically deleted from masterConfig.

═══ RECURRING SCHEDULE (alternative to recurringIntervalMinutes) ═══
Use recurringSchedule for day-of-week based recurrence instead of flat intervals.
Mutually exclusive with recurringIntervalMinutes — use one or the other.

"recurringSchedule": {
  "daysOfWeek": ["MO","TU","WE","TH","FR"],
  "time": "15:30",
  "timezone": "America/New_York"
}

Days: "MO","TU","WE","TH","FR","SA","SU"
time: wall-clock time in timezone (never pre-convert to UTC)
Cloud Timer advances scheduledTime to next matching day+time on each occurrence.

═══ ADVANCED ALERT CONFIG (onDone / onStop) ═══
For alerts without a buttons array that need configurable behavior:
onDone: "delete" | "acknowledge_and_reschedule" | "mark_done_today"
onStop: "delete" | "pause_today" | "pause_indefinitely"
paused: true → alert exists but won't show until unpaused

═══ TOP-LEVEL ALERT SHAPE (alerts[] array) ═══
{
  "userId": "...",
  "deliveryMode": "alert" | "push" | "alert+push",
  "alert": {
    "id": "unique-short-string",
    "title": "...",
    "message": "...",
    "scheduledTime": "ISO 8601 UTC",
    "recurringIntervalMinutes": null,
    "recurringSchedule": null,
    "deepLinkTarget": "Pinned" | "Calendar" | "Workouts" | null,
    "deleteOnConfirm": true,
    "deleteOnView": false,
    "acknowledged": false,
    "mode": "evening" | "morning" | null,
    "buttons": [ ...see ALERT BUTTON ACTIONS... ],
    "linkedItem": null,
    "onDone": null,
    "onStop": null
  },
  "notification": {
    "title": "...",
    "body": "...",
    "scheduledTime": "ISO 8601 UTC"
  }
}

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

KEY RULE (alerts): Alert IDs must be unique. Never reuse an existing alert ID for a new alert —
only reuse it if explicitly updating that existing alert.

KEY RULE: Always include the COMPLETE items array for every person with ALL existing items
and their full data shape preserved. Only modify what was explicitly asked to change.
Never drop subItems, yesNoConfig, requiredForScreenTime, or any other field not mentioned.

═══ USER IDs ═══
Me (Eric): ${myUserId}
Jack:      ${JACK_USER_ID}
Ellie:     ${ELLIE_USER_ID}

═══ TODAY'S CURRENT DATA ═══
${JSON.stringify(todosPayload, null, 2)}

═══ CURRENT ALERTS & NOTIFICATIONS (per person) ═══
Use this to avoid creating duplicates. If an alert or notification already exists
for something the user asks about, update or reschedule it instead of adding a new one.
${JSON.stringify(masterConfigData, null, 2)}`;

    return prompt;
  }, [getActivitiesForEntity, user?.userId, masterConfigAlerts, masterConfigNotifications, jackMasterConfig, ellieMasterConfig]);

  return getData;
};