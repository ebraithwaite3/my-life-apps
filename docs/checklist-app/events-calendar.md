# Events & Calendar Management

## Overview
The calendar system supports both **Internal/Group Calendars** (stored in Firestore) and **Google Calendars** (synced via Google Calendar API). Events can be created, edited, and deleted with full support for reminders, activities (checklists), and multi-user notifications.

## Event Types

### Internal Calendar Events
- Stored in Firestore under `calendars/{calendarId}/months/{YYYY-MM}/events/{eventId}`
- Used for personal calendar (`calendarId: "internal"`)
- Used for group calendars (`calendarId: "group-{groupId}"`)
- Full control over data structure and permissions

### Google Calendar Events
- Created via Google Calendar API
- Stored in user's Google Calendar
- Mirrored in Firestore for app features (reminders, activities)
- Event ID format: `{googleEventId}@google.com-{timestamp}`

## Creating Events

### User Flow
1. User taps "+" button or taps on a time slot in calendar
2. Event modal opens (internal) or Google event creation flow
3. User fills in event details:
   - Title (required)
   - Start/End time
   - Calendar selection
   - Optional: Description, Location, Reminder, Activities
4. Event is created in appropriate calendar
5. If reminder set, notification is scheduled

### Technical Implementation

#### Hook: `useEventCreation`
**Location**: `/packages/hooks/src/eventHooks/useEventCreation.js` (assumed)

**Flow**:
```javascript
// Determine calendar type
if (calendarId === 'internal' || calendarType === 'group') {
  // Internal/Group calendar
  await createInternalEvent({...eventData, groupId});

  // Schedule notifications for group members
  if (isSharedEvent) {
    await scheduleBatchNotification(membersToNotify, ...);
  }
} else {
  // Google Calendar
  await createGoogleEvent(calendarId, eventData);

  // Mirror in Firestore with activities/reminder
  await storeEventInFirestore(eventData);
}
```

#### Data Structure
**Internal Event**:
```javascript
{
  eventId: "evt-{timestamp}",
  title: "Team Meeting",
  description: "Weekly sync",
  location: "Conference Room A",
  start: {
    dateTime: "2026-02-17T09:00:00-05:00",
    timeZone: "America/New_York"
  },
  end: {
    dateTime: "2026-02-17T10:00:00-05:00",
    timeZone: "America/New_York"
  },
  isAllDay: false,
  reminderMinutes: {
    scheduledFor: "2026-02-17T08:45:00-05:00",
    isRecurring: false
  },
  activities: [
    {
      activityType: "checklist",
      id: "checklist_123",
      name: "Meeting Prep",
      items: [...]
    }
  ],
  createdBy: "userId",
  createdAt: "2026-02-16T...",
  source: "internal" | "google"
}
```

## Editing Events

### User Flow
1. User taps on existing event
2. Event details modal opens
3. User modifies fields (title, time, reminder, etc.)
4. User saves changes
5. System detects if reminder changed
6. If reminder changed:
   - Deletes old notifications
   - Schedules new notifications
7. Success alert shown

### Technical Implementation

#### Hook: `useEventUpdate`
**Location**: `/packages/hooks/src/eventHooks/useEventUpdate.js`

**Key Features**:
- Handles both internal and Google Calendar events
- Detects reminder changes to avoid unnecessary notification updates
- Uses `useDeleteNotification` hook for clean notification management
- Supports group event updates with multi-user notifications

**Reminder Change Detection**:
```javascript
const oldReminderISO = event.reminderMinutes?.scheduledFor || null;
const newReminderISO = reminderMinutes?.scheduledFor || null;
const reminderChanged = oldReminderISO !== newReminderISO;

if (reminderChanged) {
  // Delete old notifications
  await deleteNotification(eventId);

  // Schedule new reminder if set
  if (reminderMinutes != null) {
    await scheduleActivityReminder(...);
  }
}
```

**Internal/Group Calendar Update**:
```javascript
await updateInternalEvent({
  eventId,
  startTime: originalStartTime,
  summary: eventData.summary,
  description: eventData.description,
  start: eventData.start,
  end: eventData.end,
  activities: cleanedActivities,
  reminderMinutes,
  groupId // For group calendars
});
```

**Google Calendar Update**:
```javascript
await updateGoogleEvent(
  eventId,
  selectedCalendarId,
  eventData,
  cleanedActivities,
  originalStartTime,
  reminderMinutes
);
```

### Recent Fixes (2026-02-16)

#### Bug: Missing Firestore Imports
**Issue**: When editing events with reminder changes, got error `Property 'collection' doesn't exist`

**Cause**: Firestore functions were being used but not imported

**Fix**: Added imports:
```javascript
import { collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
```

#### Bug: Old Notifications Not Deleted
**Issue**: When changing event reminder, new notifications created but old ones remained

**Cause**: Manual Firestore query/delete code wasn't working reliably

**Fix**: Replaced manual deletion with existing `useDeleteNotification` hook:
```javascript
// OLD: Manual query and filter
const notificationsRef = collection(db, 'pendingNotifications');
const q = query(notificationsRef, where('eventId', '==', eventId));
const snapshot = await getDocs(q);
const eventLevelDocs = snapshot.docs.filter(doc => {...});
await Promise.all(eventLevelDocs.map(doc => deleteDoc(doc.ref)));

// NEW: Use tested hook
const deleteResult = await deleteNotification(eventId);
if (deleteResult.success && deleteResult.deletedCount > 0) {
  console.log(`🗑️ Deleted ${deleteResult.deletedCount} old notification(s)`);
}
```

**Benefits**:
- ✅ More reliable - hook is battle-tested
- ✅ Cleaner code - less manual Firestore operations
- ✅ Better error handling - hook handles edge cases
- ✅ Automatic fallback - searches by both notificationId and eventId

## Deleting Events

### User Flow
1. User long-presses event or taps delete button
2. Confirmation alert shown
3. User confirms deletion
4. Event deleted from calendar
5. Associated notifications deleted
6. Success alert shown

### Technical Implementation

#### Hook: `useEventDelete` (assumed)

**Internal Calendar**:
```javascript
// Delete from Firestore
const monthKey = eventStartTime.substring(0, 7); // "2026-02"
const monthRef = doc(db, 'calendars', calendarId, 'months', monthKey);
const monthDoc = await getDoc(monthRef);
const events = monthDoc.data().events || {};
delete events[eventId];
await updateDoc(monthRef, { events });

// Delete associated notifications
await deleteNotification(eventId);
```

**Google Calendar**:
```javascript
// Delete from Google Calendar
await deleteGoogleCalendarEvent(calendarId, eventId);

// Delete from Firestore mirror
const monthKey = eventStartTime.substring(0, 7);
const monthRef = doc(db, 'calendars', calendarId, 'months', monthKey);
// ... same as internal

// Delete associated notifications
await deleteNotification(eventId);
```

## Calendar Types Comparison

| Feature | Internal Calendar | Group Calendar | Google Calendar |
|---------|------------------|----------------|-----------------|
| Storage | Firestore only | Firestore only | Google + Firestore mirror |
| Multi-user | Single user | Multiple users | Single Google account |
| Permissions | App-controlled | Group membership | Google account |
| Activities | ✅ Full support | ✅ Full support | ✅ Full support |
| Reminders | ✅ App notifications | ✅ App notifications | ✅ App + Google |
| Sync speed | Instant | Instant | API call required |
| Offline | ✅ Read-only | ✅ Read-only | ❌ Requires connection |

## Data Storage Patterns

### Firestore Structure
```
calendars/
  {calendarId}/
    months/
      2026-02/
        events/
          {eventId}: { ...eventData }
          {eventId}: { ...eventData }
      2026-03/
        events/
          {eventId}: { ...eventData }
```

**Why monthly partitioning?**
- Efficient querying (load only current/nearby months)
- Prevents document size limits (max 1MB per document)
- Better performance for calendar view rendering

### Event ID Formats

**Internal Events**: `evt-{timestamp}`
- Example: `evt-1708128000000`

**Google Events**: `{googleEventId}@google.com-{timestamp}`
- Example: `abc123def456@google.com-1708128000000`
- Combines Google's event ID with timestamp for uniqueness

## Activities Integration

Events can have attached activities (checklists, workouts, etc.):

```javascript
activities: [
  {
    activityType: "checklist",
    id: "checklist_123",
    name: "Meeting Prep",
    items: [
      { id: "item_1", text: "Prepare slides", completed: false },
      { id: "item_2", text: "Send agenda", completed: true }
    ]
  }
]
```

**Activity Lifecycle**:
1. User creates event with activity
2. Activity stored in event data
3. Activity displayed in event details
4. User can edit/complete activity items
5. Activity updates saved to event
6. Activity-level reminders can be set separately

## Reminders

### Reminder Data Structure
```javascript
reminderMinutes: {
  scheduledFor: "2026-02-17T08:45:00-05:00", // ISO timestamp
  isRecurring: false,
  recurringConfig?: {
    intervalSeconds: 3600,
    totalOccurrences: 10,
    currentOccurrence: 1,
    nextScheduledFor: "2026-02-17T08:45:00-05:00",
    lastSentAt: null,
    completedCancelsRecurring: true
  }
}
```

See [notifications.md](./notifications.md) for full notification system details.

## Error Handling

### Common Errors

**Google Calendar API Errors**:
- `401 Unauthorized` - Token expired, refresh required
- `403 Forbidden` - Calendar access denied
- `404 Not Found` - Calendar or event doesn't exist
- `429 Too Many Requests` - Rate limit exceeded

**Firestore Errors**:
- `permission-denied` - User lacks permissions
- `not-found` - Document doesn't exist
- `unavailable` - Network/server issues

**Handling**:
```javascript
try {
  await updateEvent({...});
} catch (error) {
  if (error.code === 'permission-denied') {
    Alert.alert('Error', 'You do not have permission to edit this event');
  } else if (error.code === 'unavailable') {
    Alert.alert('Error', 'Network error. Please try again.');
  } else {
    Alert.alert('Error', 'An unexpected error occurred: ' + error.message);
  }
}
```

## Performance Optimizations

### Monthly Partitioning
Events are stored by month to:
- Reduce query size (only fetch current/nearby months)
- Prevent document size limits
- Improve calendar view rendering speed

### Reminder Change Detection
Only update notifications when reminder actually changes:
```javascript
const reminderChanged = oldReminderISO !== newReminderISO;
if (reminderChanged) {
  // Only then delete and reschedule
}
```

Avoids unnecessary Firestore writes and notification churn.

### Activity Cleaning
Remove undefined values before storing:
```javascript
const cleanedActivities = activities.map(cleanUndefined);
```

Reduces document size and prevents schema inconsistencies.

## Testing Checklist

### Event Creation
- [ ] Create internal calendar event
- [ ] Create group calendar event
- [ ] Create Google Calendar event
- [ ] Create all-day event
- [ ] Create event with reminder
- [ ] Create event with activity (checklist)
- [ ] Create shared event (multi-user)

### Event Editing
- [ ] Edit event title
- [ ] Change event time (start/end)
- [ ] Move event to different day
- [ ] Change calendar
- [ ] Add reminder to event without one
- [ ] Change existing reminder time
- [ ] Remove reminder
- [ ] Toggle recurring reminder
- [ ] Edit event activities
- [ ] Edit shared event (verify all users notified)

### Event Deletion
- [ ] Delete internal event
- [ ] Delete Google event
- [ ] Delete event with reminder (verify notification deleted)
- [ ] Delete shared event
- [ ] Delete recurring event

### Error Cases
- [ ] Try to edit event without permission
- [ ] Edit event with expired Google token
- [ ] Edit event while offline
- [ ] Edit deleted event (race condition)

---

**Last Updated**: 2026-02-16
**Status**: Active, recently fixed notification deletion bug
**Related Docs**: [notifications.md](./notifications.md), [schedule-templates.md](./schedule-templates.md)
