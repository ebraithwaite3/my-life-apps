# Schedule Templates Feature

## Overview
Schedule Templates allow admins to create weekly schedule templates with events, then apply them to upcoming weeks with a single action. All events are created in Google Calendar and synced to Firestore with support for reminders and activities.

## User Flow

### Creating a Template
1. Admin navigates to **Preferences** screen
2. Scrolls to **Schedule Templates** section
3. Taps **Create New Template**
4. Opens visual week grid editor (Sunday-Saturday, 6am-11pm)
5. Taps time slots to add events
6. For each event, configures:
   - Title
   - Day of week
   - Start/End time
   - Calendar destination
   - Optional: Reminder (one-time or recurring)
   - Optional: Activities (e.g., checklist)
   - Optional: Description, Location
7. Taps **Save** to store template

### Applying a Template
1. Admin navigates to **Calendar** screen (day or week view)
2. Long-presses the **Schedule Templates** chip
3. Selects template from alert dialog
4. Backend creates all events for the upcoming week starting Sunday
5. Success alert shows: "Created X of Y events"

## Technical Architecture

### Frontend Components

#### ScheduleTemplateEditor
**Location**: `/packages/ui/src/components/preferences/ScheduleTemplateEditor.js`

**Purpose**: Visual week grid editor for creating/editing templates

**Key Features**:
- Week view grid (Sunday-Saturday)
- Hourly time slots (6am-11pm)
- Drag-free event placement (tap to add)
- Event editing (tap) and deletion (long-press)
- Template name and icon customization

**Data Flow**:
```javascript
// Save template
const templateRef = doc(db, 'users', user.uid, 'scheduleTemplates', templateId);
await setDoc(templateRef, {
  id: templateId,
  name: templateName,
  icon: templateIcon,
  events: [...], // Array of template events
  createdAt: ISO string,
  updatedAt: ISO string,
});
```

#### ScheduleDefaultEventModal
**Location**: `/packages/ui/src/components/modals/composed/modals/ScheduleDefaultEventModal.js`

**Purpose**: Modal for creating/editing individual events within a template

**Configurable Fields**:
- Title (required)
- Day of week (0-6, Sunday-Saturday)
- Start/End time (24hr format: "HH:mm")
- Calendar ID (which calendar to create event in)
- Reminder (template format with time and recurring config)
- Activities (checklist, etc.)
- Description, Location

**Event Data Structure**:
```javascript
{
  id: 'evt-{timestamp}',
  title: string,
  dayOfWeek: 0-6, // Sunday = 0
  startTime: "HH:mm", // e.g., "09:00"
  endTime: "HH:mm",
  calendarId: string, // Google Calendar ID
  reminder: {
    time: "HH:mm", // When to send reminder
    isRecurring: boolean,
    recurringConfig?: {
      frequency: 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly',
      interval: number,
      totalOccurrences?: number,
      completedCancelsRecurring?: boolean,
      daysOfWeek?: number[], // For weekly frequency
    }
  },
  activities: [{ activityType, ...activityData }],
  description?: string,
  location?: string,
}
```

#### SharedCalendarScreen
**Location**: `/packages/screens/src/SharedCalendarScreen.js`

**Scheduling Flow**:
```javascript
// User long-presses schedule chip
handleScheduleLongPress() → Shows template selection alert

// User selects template
handleAddSchedule(template) → Calls applyScheduleTemplate service

// Service calls Firebase function
applyScheduleTemplate(app, template.id, template.name)
```

### Service Layer

#### googleCalendarService
**Location**: `/packages/calendar-sync/src/googleCalendarService.js`

**Function**: `applyScheduleTemplate(app, templateId, templateName)`

**Purpose**: Wrapper for Firebase function call

**Implementation**:
```javascript
const functions = getFunctionsInstance(app);
const applyTemplate = httpsCallable(functions, 'applyScheduleTemplate');

const result = await applyTemplate({
  templateId,  // Direct document lookup
  templateName // For logging/error messages
});
```

### Backend (Firebase Function)

#### applyScheduleTemplate
**Location**: `/functions/src/calendar/applyScheduleTemplate.js`

**Type**: Callable HTTPS function (v2)

**Secrets Required**:
- `googleClientId`
- `googleClientSecret`
- `googleRefreshToken`

**Process Flow**:

1. **Fetch Template** (by ID - direct lookup)
   ```javascript
   const templateRef = firestore()
     .collection('users')
     .doc(userId)
     .collection('scheduleTemplates')
     .doc(templateId);

   const template = templateRef.get();
   ```

2. **Calculate Week Start**
   - Finds next Sunday from current date
   - Sets as week start at 00:00:00

3. **For Each Template Event**:
   - Calculate actual date/time for event
   - Find Firestore calendar ID from Google Calendar ID
   - Create event in Google Calendar via API
   - Store event in Firestore:
     ```
     calendars/{calendarId}/months/{YYYY-MM}/events/{eventId}
     ```
   - If reminder exists:
     - Convert template reminder to runtime format
     - Get all calendar subscribers
     - Create `pendingNotifications` for each subscriber

4. **Return Results**
   ```javascript
   {
     success: true,
     message: "Created X of Y events",
     results: [{ success, title, error? }]
   }
   ```

**Helper Functions**:
- `getCalendarSubscribers(firestoreCalendarId)` - Get users subscribed to calendar
- `findFirestoreCalendarId(googleCalendarId)` - Map Google ID to Firestore ID
- `convertTemplateReminder(templateReminder, eventDate)` - Convert template reminder format to runtime format

## Data Model

### Template Storage
**Path**: `users/{userId}/scheduleTemplates/{templateId}`

**Document Structure**:
```javascript
{
  id: "template-{timestamp}",
  name: "Weekly Work Schedule",
  icon: "calendar-week",
  events: [
    {
      id: "evt-{timestamp}",
      title: "Team Standup",
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      endTime: "09:30",
      calendarId: "primary",
      reminder: {
        time: "08:45",
        isRecurring: false
      },
      activities: [],
      description: "Daily standup meeting",
      location: "Conference Room A"
    }
  ],
  createdAt: "2026-02-16T...",
  updatedAt: "2026-02-16T..."
}
```

### Created Events Storage
**Path**: `calendars/{calendarId}/months/{YYYY-MM}/events/{eventId}`

**Document Structure**:
```javascript
{
  "{googleEventId}@google.com-{timestamp}": {
    calendarId: firestoreCalendarId,
    title: "Team Standup",
    description: "",
    location: "",
    startTime: "2026-02-17T09:00:00...",
    endTime: "2026-02-17T09:30:00...",
    source: "google",
    isAllDay: false,
    isRecurring: false,
    activities: [],
    reminder: {
      scheduledFor: "2026-02-17T08:45:00...",
      isRecurring: false,
      recurringConfig?: {
        intervalSeconds: number,
        totalOccurrences?: number,
        currentOccurrence: 1,
        nextScheduledFor: ISO string,
        lastSentAt: null,
        completedCancelsRecurring?: boolean
      }
    }
  }
}
```

### Pending Notifications
**Path**: `pendingNotifications/{notificationId}` (root collection)

**Document Structure** (if reminder exists):
```javascript
{
  userId: "subscriberId",
  eventId: "googleEventId@google.com-timestamp",
  title: "Reminder: Team Standup",
  body: "Team Standup",
  scheduledFor: "2026-02-17T08:45:00...",
  createdAt: "2026-02-16T...",
  data: {
    screen: "Calendar",
    eventId: "googleEventId@google.com-timestamp",
    app: "checklist-app",
    date: "2026-02-17T09:00:00..."
  },
  isRecurring?: true,
  recurringConfig?: {
    intervalSeconds: number,
    currentOccurrence: 1,
    nextScheduledFor: ISO string,
    lastSentAt: null,
    totalOccurrences?: number,
    completedCancelsRecurring?: boolean
  }
}
```

## Recent Fixes (2026-02-16)

### Bug: "not-found" Error When Scheduling
**Issue**: Template scheduling worked in Expo Go (emulator) but failed in production with error "not-found"

**Root Cause**:
1. Firebase function was never deployed to production
2. Function was using fragile name-based search: `.where("name", "==", templateName)`

**Fix**:
1. Changed to ID-based lookup (faster, more reliable):
   ```javascript
   // OLD: Search by name
   .where("name", "==", templateName)

   // NEW: Direct lookup by ID
   .doc(templateId).get()
   ```

2. Updated data flow to pass template ID:
   - `SharedCalendarScreen`: Pass full `template` object with ID
   - `googleCalendarService`: Accept `templateId` and `templateName`
   - `applyScheduleTemplate` function: Use `templateId` for direct lookup

**Benefits**:
- ✅ No name matching issues (spaces, case, special characters)
- ✅ Faster (direct document lookup vs collection query)
- ✅ Better error messages (shows ID and userId)

**Deployment Required**:
```bash
cd functions
firebase deploy --only functions:applyScheduleTemplate
```

## Permissions
- **Template Creation/Editing**: Admin only
- **Template Application**: Admin only
- **Viewing Created Events**: All calendar subscribers

## Limitations & Future Improvements
- Templates are always applied starting from next Sunday
- No support for multi-week templates
- No template preview before applying
- No undo after applying (must manually delete events)
- Template reminder times are static (not relative to event time)

## Testing Checklist
- [ ] Create template with events
- [ ] Edit existing template
- [ ] Delete template
- [ ] Apply template to week
- [ ] Verify events created in Google Calendar
- [ ] Verify events appear in app calendar
- [ ] Test with reminders (one-time)
- [ ] Test with recurring reminders
- [ ] Test with activities (checklist)
- [ ] Test multi-user notifications (calendar subscribers)
- [ ] Test error handling (no calendar access, etc.)

---

**Last Updated**: 2026-02-16
**Status**: Deployed to production
**Author**: Eric Braithwaite + Claude
