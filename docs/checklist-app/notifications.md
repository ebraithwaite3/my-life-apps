# Notifications System

## Overview
The notification system handles event reminders, activity reminders (checklists, workouts), and standalone reminders. Supports one-time and recurring notifications with Firebase Cloud Messaging and Expo Notifications.

## Notification Types

### 1. Event Reminders
Notifications scheduled for calendar events.

**Example**: "Reminder: Team Meeting" 15 minutes before event

### 2. Activity Reminders
Notifications for activities within events (checklists, workouts, etc.).

**Example**: "Reminder: Complete Meeting Prep checklist"

### 3. Standalone Reminders
Admin-created recurring or one-time reminders independent of events.

**Example**: "Daily standup at 9am" (recurring)

### 4. Quick Send Notifications
Admin-created one-time notifications sent immediately or scheduled.

**Example**: "System maintenance tonight at 10pm"

## Data Model

### Firestore Collection: `pendingNotifications`
**Path**: `/pendingNotifications/{notificationId}` (root collection)

**Document Structure**:
```javascript
{
  // Recipient
  userId: "user123",

  // Notification content
  title: "Reminder: Team Meeting",
  body: "Team Meeting starts in 15 minutes",

  // Scheduling
  scheduledFor: "2026-02-17T08:45:00-05:00", // ISO timestamp
  createdAt: "2026-02-16T10:00:00-05:00",

  // Delivery tracking
  sent: false,
  sentAt: null,

  // Association
  eventId?: "evt-123456789",
  notificationId?: "checklist_abc123", // For activities

  // Metadata for deep linking
  data: {
    screen: "Calendar",
    eventId: "evt-123456789",
    app: "checklist-app",
    date: "2026-02-17T09:00:00-05:00",
    checklistId?: "checklist_abc123",
    workoutId?: "workout_xyz789"
  },

  // Recurring configuration (if applicable)
  isRecurring?: true,
  recurringConfig?: {
    intervalSeconds: 86400, // 24 hours
    totalOccurrences: 30,
    currentOccurrence: 1,
    nextScheduledFor: "2026-02-18T08:45:00-05:00",
    lastSentAt: null,
    completedCancelsRecurring: true
  }
}
```

## Scheduling Notifications

### Hook: `useNotifications`
**Location**: `/packages/hooks/src/notificationHooks/useNotifications.js`

**Methods**:

#### `scheduleActivityReminder`
Schedule a reminder for an activity (checklist, workout, etc.).

```javascript
await scheduleActivityReminder(
  activity,           // { id, name, reminderTime }
  activityType,       // "Event" | "Checklist" | "Workout"
  eventId,            // Associated event ID (if any)
  calendarId,         // Calendar ID (if any)
  additionalData      // Extra data for deep linking
);
```

#### `scheduleBatchNotification`
Schedule notifications for multiple users (shared events).

```javascript
await scheduleBatchNotification(
  userIds,            // Array of user IDs
  title,              // Notification title
  body,               // Notification body
  scheduledFor,       // Date object or ISO string
  data                // Deep linking data
);
```

### Service: `scheduleNotification`
**Location**: `/packages/services/src/notificationService.js`

**Function**: `scheduleNotification(userId, title, body, eventId, reminderTime, data)`

**Purpose**: Low-level notification creation in Firestore

```javascript
await scheduleNotification(
  "user123",
  "Reminder: Team Meeting",
  "Meeting starts in 15 minutes",
  "evt-123456789",
  new Date("2026-02-17T08:45:00-05:00"),
  {
    screen: "Calendar",
    eventId: "evt-123456789",
    app: "checklist-app"
  }
);
```

Creates document in `pendingNotifications` collection.

## Deleting Notifications

### Hook: `useDeleteNotification`
**Location**: `/packages/hooks/src/useDeleteNotification.js`

**Purpose**: Delete pending notifications by identifier

**Usage**:
```javascript
const deleteNotification = useDeleteNotification();

// Delete by event ID
await deleteNotification("evt-123456789");

// Delete by notification ID (activity)
await deleteNotification("checklist_abc123");
```

**How it Works**:
1. Searches by `notificationId` field first
2. If not found, searches by `eventId` field
3. Deletes all matching notifications
4. Returns `{ success, deletedCount }`

**Example Flow**:
```javascript
const deleteResult = await deleteNotification(eventId);

if (deleteResult.success) {
  console.log(`🗑️ Deleted ${deleteResult.deletedCount} notification(s)`);
} else {
  console.error(`❌ Failed to delete: ${deleteResult.error}`);
}
```

**When Used**:
- Event deleted → delete event notifications
- Reminder changed → delete old, schedule new
- Activity removed → delete activity notifications
- Standalone reminder disabled → delete future occurrences

## Recurring Notifications

### Configuration
```javascript
recurringConfig: {
  // How often to send (in seconds)
  intervalSeconds: 86400, // Daily = 86400, Weekly = 604800

  // Total times to send (null = infinite)
  totalOccurrences: 30,

  // Current iteration
  currentOccurrence: 1,

  // Next scheduled time
  nextScheduledFor: "2026-02-18T08:45:00-05:00",

  // Last time sent (null initially)
  lastSentAt: null,

  // Cancel remaining if activity completed
  completedCancelsRecurring: true
}
```

### Frequency Mapping

**Template Format** (used in schedule templates):
```javascript
{
  frequency: 'daily' | 'weekly' | 'monthly',
  interval: 1, // Every X days/weeks/months
}
```

**Runtime Format** (used in pendingNotifications):
```javascript
{
  intervalSeconds: 86400, // Converted from frequency + interval
}
```

**Conversion**:
- Minutely: `interval * 60`
- Hourly: `interval * 3600`
- Daily: `interval * 86400`
- Weekly: `interval * 604800`
- Monthly: `interval * 2592000` (approximate)

### Lifecycle
1. **Creation**: Notification created with `currentOccurrence: 1`
2. **Sending**: Firebase function sends notification
3. **Update**: After send:
   - `currentOccurrence` incremented
   - `lastSentAt` updated
   - `nextScheduledFor` calculated (current + intervalSeconds)
   - If `currentOccurrence >= totalOccurrences`, delete notification
4. **Completion**: If activity completed and `completedCancelsRecurring: true`, delete notification

## Notification Delivery

### Firebase Cloud Function: `scheduledNotifications`
**Location**: `/functions/src/notifications/scheduledNotifications.js`

**Trigger**: Runs every minute (scheduled function)

**Process**:
1. Query `pendingNotifications` where `scheduledFor <= now` and `sent: false`
2. For each notification:
   - Get user's Expo push token
   - Send notification via Expo API
   - If recurring:
     - Update `currentOccurrence`, `lastSentAt`, `nextScheduledFor`
     - If finished, mark `sent: true` or delete
   - If one-time:
     - Mark `sent: true` or delete

### Push Token Management
Users register their Expo push tokens in Firestore:
```
users/{userId}
  expoPushToken: "ExponentPushToken[...]"
```

## Deep Linking

When user taps notification, app opens to specific screen with context.

### Data Payload Examples

**Event Reminder**:
```javascript
data: {
  screen: "Calendar",
  eventId: "evt-123456789",
  app: "checklist-app",
  date: "2026-02-17T09:00:00-05:00"
}
```

**Checklist Reminder**:
```javascript
data: {
  screen: "Calendar",
  eventId: "evt-123456789",
  checklistId: "checklist_abc123",
  app: "checklist-app",
  date: "2026-02-17T09:00:00-05:00"
}
```

**Workout Reminder**:
```javascript
data: {
  screen: "Calendar",
  activityId: "workout-123",
  eventId: "evt-xyz",
  app: "workout-app",
  openWorkout: true
}
```

### Navigation Handling
```javascript
// In NotificationProvider or navigation setup
if (notification.data.screen === 'Calendar') {
  navigation.navigate('Calendar', {
    date: notification.data.date,
    eventId: notification.data.eventId,
    openChecklist: notification.data.checklistId,
  });
}
```

## Admin Features

### Standalone Reminders
**Location**: PreferencesScreen → Standalone Reminders section (admin only)

**Features**:
- Create recurring or one-time reminders
- Set recipients (select from users)
- Set schedule (time, frequency, occurrences)
- Toggle active/inactive
- Edit/delete reminders

**Storage**: `users/{adminUserId}/standAloneReminders/{reminderId}`

**Application**: When saved, creates `pendingNotifications` for each recipient

### Quick Send
**Location**: PreferencesScreen → Quick Notifications section (admin only)

**Modes**:
- **Send Now**: Immediately send to all recipients (via Cloud Function)
- **Schedule**: Create `pendingNotifications` for future delivery

**Use Cases**:
- Emergency alerts
- System maintenance notices
- General announcements

## Recent Fixes (2026-02-16)

### Bug: Notifications Not Deleted on Event Edit
**Issue**: When editing event reminder, new notifications created but old ones remained

**Cause**: Manual Firestore query in `useEventUpdate` wasn't working

**Fix**: Replaced with `useDeleteNotification` hook:
```javascript
// Before
const notificationsRef = collection(db, 'pendingNotifications');
const q = query(notificationsRef, where('eventId', '==', eventId));
const snapshot = await getDocs(q);
// ... manual filtering and deletion

// After
const deleteResult = await deleteNotification(eventId);
```

**Impact**: Cleaner code, more reliable deletion, better error handling

### Bug: Missing Firestore Imports
**Issue**: `Property 'collection' doesn't exist` error

**Cause**: Using Firestore functions without importing them

**Fix**: Added imports:
```javascript
import { collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
```

Note: These imports were later removed when switching to `useDeleteNotification` hook.

## Best Practices

### 1. Always Delete Old Notifications
When updating reminders, always delete old notifications first:
```javascript
await deleteNotification(eventId);
await scheduleActivityReminder(...);
```

### 2. Check Reminder Changes
Don't reschedule if reminder hasn't changed:
```javascript
const reminderChanged = oldReminderISO !== newReminderISO;
if (reminderChanged) {
  // Only then delete and reschedule
}
```

### 3. Use Hooks Over Manual Queries
Prefer `useDeleteNotification` over manual Firestore queries:
- Better tested
- Handles edge cases
- More maintainable

### 4. Include Deep Link Data
Always include enough data for navigation:
```javascript
data: {
  screen: "Calendar",
  eventId: eventId,
  app: "checklist-app",
  // Add any other needed context
}
```

### 5. Set Recurring Limits
For recurring notifications, always set `totalOccurrences` to prevent infinite notifications:
```javascript
recurringConfig: {
  intervalSeconds: 86400,
  totalOccurrences: 30, // Don't leave infinite
}
```

## Testing Checklist

### One-Time Notifications
- [ ] Schedule notification for future time
- [ ] Verify notification appears in pendingNotifications
- [ ] Wait for scheduled time, verify notification received
- [ ] Verify notification marked as sent
- [ ] Tap notification, verify deep link works

### Recurring Notifications
- [ ] Create recurring notification (daily)
- [ ] Verify first occurrence scheduled
- [ ] Receive first notification
- [ ] Verify next occurrence scheduled
- [ ] Complete activity if `completedCancelsRecurring: true`
- [ ] Verify remaining occurrences cancelled

### Deletion
- [ ] Delete event with reminder
- [ ] Verify pendingNotifications deleted
- [ ] Change event reminder
- [ ] Verify old notifications deleted, new created
- [ ] Disable standalone reminder
- [ ] Verify future notifications deleted

### Admin Features
- [ ] Create standalone reminder
- [ ] Toggle active/inactive
- [ ] Edit reminder
- [ ] Delete reminder
- [ ] Quick send (immediate)
- [ ] Quick send (scheduled)

---

**Last Updated**: 2026-02-16
**Status**: Active, recently fixed deletion bug
**Related Docs**: [events-calendar.md](./events-calendar.md), [schedule-templates.md](./schedule-templates.md)
