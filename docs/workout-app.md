# Workout App Overview

## Purpose
Fitness tracking app with workout templates, exercise library, history tracking, calendar integration, and YouTube video support.

## App Identity
- **Name**: MyWorkouts
- **Slug**: `my-workouts`
- **Bundle ID (iOS)**: `com.ebraithwaite3.myworkout`
- **Package (Android)**: `com.ebraithwaite3.myworkout`
- **Deep Link Scheme**: `myworkout://`
- **EAS Project ID**: `3e8b9d7c-b983-4e3f-9743-72312fd124ee`

## Navigation Structure

### Bottom Tab Navigation (5 tabs)
1. **📆 Calendar** - WorkoutsCalendarScreen
   - Date-based workout schedule
   - View and log workouts by date
   - Deep link: `myworkout://calendar?date=YYYY-MM-DD&activityId=...&eventId=...&openWorkout=true`
   - Activity deep link: `myworkout://activity/workout-123?eventId=xyz`

2. **📋 Templates** - WorkoutTemplatesScreen
   - Library of workout templates
   - Create and edit workout templates
   - WorkoutTemplateCard components
   - Apply templates to calendar

3. **🏋️ Exercises** - ExercisesScreen
   - Exercise library/catalog
   - Browse available exercises
   - Exercise details and instructions

4. **📊 History** - WorkoutHistoryScreen
   - Workout completion history
   - Progress tracking
   - Historical workout data

5. **⚙️ Settings** - PreferencesScreen
   - User preferences
   - Notification settings
   - Account management

### Messages Tab (Currently Disabled)
- Commented out in navigation
- Can be re-enabled for notifications/messaging

## Key Features

### Workout Templates
- Create reusable workout routines
- Template library management
- Apply templates to specific dates
- Edit and customize templates
- Hook: `useWorkoutTemplates()`

### Exercise Catalog
- Centralized exercise library
- Stored in Firestore: `admin/workoutCatalog`
- Managed via WorkoutDataContext
- Exercises with details and instructions

### YouTube Video Integration
- **NEW**: YouTubeVideoModal component
- Embed YouTube videos for exercise demonstrations
- React Native YouTube iframe player
- WebView support for video playback

### Workout Tracking
- Log workouts on calendar
- Track sets, reps, weight
- Workout completion history
- WorkoutModal for workout entry
- EditWorkoutTemplate for modifications

### Calendar Integration
- Luxon for date handling
- Date-based workout scheduling
- Navigate to specific workout dates
- Multi-user calendar support

### Deep Linking
- **Activity deep links**: `myworkout://activity/{activityId}?eventId={eventId}`
  - Opens specific workout in calendar view
  - Navigates and opens workout automatically
- **Calendar deep links**: `myworkout://calendar?date=...&openWorkout=true`
- Tab navigation (templates, exercises, history, preferences)
- Notification-triggered workout views

## Custom Context: WorkoutDataContext

Located at: `src/contexts/WorkoutDataContext.js`

### Purpose
Manages workout-specific data separately from shared data context.

### State
- `workoutCatalog` - Exercise library from `admin/workoutCatalog`
- `workoutHistory` - User's workout completion history
- `loading` - Catalog loading state
- `historyLoading` - History loading state
- `error` - Error state

### Firestore Listeners
- Real-time subscription to `admin/workoutCatalog` document
- Real-time subscription to user's workout history
- Automatic cleanup on unmount

### Usage
```javascript
const { workoutCatalog, workoutHistory, loading } = useWorkoutData();
```

## Shared Packages Used
- `@my-apps/config` - Firebase configuration
- `@my-apps/contexts` - Auth, Data, Theme contexts
- `@my-apps/data-sync` - Firestore sync utilities
- `@my-apps/screens` - Shared screen components
- `@my-apps/ui` - UI components (AppHeader, LoadingScreen)
- `@my-apps/utils` - Utility functions

## App-Specific Utilities
- `workoutHistory.js` - History data processing
- `exerciseUtils.js` - Exercise-related utilities

## Custom Hooks
- `useWorkoutTemplates()` - Template management
- Uses shared hooks from data-sync package

## Components

### Modals
- `WorkoutModal` - Main workout entry/editing
- `WorkoutContent` - Workout detail display
- `EditWorkoutTemplate` - Template editor
- `WorkoutSelector` - Choose workout from templates
- `YouTubeVideoModal` - **NEW** - Video player for exercises

### Cards
- `WorkoutTemplateCard` - Template list item
- `WorkoutRow` - Individual workout entry

## Services
- `notificationService.js` - Push notification handling

## Firestore Data Model

### Collections
- `admin/workoutCatalog` - Global exercise library
  - Contains `workouts` array with all exercises
  - Shared across all users

- User-specific workout data (via data-sync)
- Activity documents for scheduled workouts
- Calendar events with workout details

## UI Patterns

### Theme Integration
- Shared theme context
- Consistent styling with other apps
- Primary color highlights

### Loading States
- Custom LoadingScreen
- Message: "Loading your workouts..."
- Icon: MyWorkoutsIcon.png

### Header
- AppHeader component
- App name: "MyWorkouts"
- Calendar switcher for multi-user
- Simple logout menu

### Tab Bar
- Emoji-based icons
- Active state styling
- Unread message badges (when Messages enabled)

## Special Dependencies
- **react-native-youtube-iframe** - YouTube video embedding
- **react-native-webview** - WebView for video player
- **luxon** - Date/time manipulation

## Recent Updates
- ✅ YouTube video modal integration
- ✅ Workout content improvements
- ✅ Enhanced deep linking for activities
- ✅ Notification scheduling support

## Deep Link Behavior
1. **Activity links** (`myworkout://activity/{id}`)
   - Intercepts and transforms to calendar link
   - Auto-opens workout modal

2. **Calendar links**
   - Sets selected date in context
   - Updates month and year
   - Optional workout auto-open

## Development Notes
- Messages tab is disabled but infrastructure remains
- Notification system is configured but not actively used
- Multi-user support via shared calendars
- Exercise catalog is admin-managed (single source of truth)

---

**Last Updated**: 2026-02-16
