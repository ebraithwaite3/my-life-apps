# Checklist App Overview

## Purpose
Task and checklist management app with calendar integration, pinned checklists, templates, and notification support.

## App Identity
- **Name**: MyChecklists
- **Slug**: `my-checklist`
- **Bundle ID (iOS)**: `com.ebraithwaite3.mychecklist`
- **Package (Android)**: `com.ebraithwaite3.mychecklist`
- **Deep Link Scheme**: `mychecklist://`
- **EAS Project ID**: `27ef1245-fbc5-48b1-ad1a-2a9a04ecd642`

## Navigation Structure

### Bottom Tab Navigation (5 tabs)
1. **📆 Calendar** - ChecklistCalendarScreen
   - Main view for date-based checklist management
   - Calendar with daily checklist items
   - Deep link support: `mychecklist://calendar?date=YYYY-MM-DD&view=...`

2. **📌 Pinned** - PinnedScreen
   - Quick access to frequently used checklists
   - Supports custom sorting via `usePinnedSort` hook
   - Modal management via `usePinnedChecklistModal`
   - Operations via `usePinnedOperations`

3. **📋 Templates** - TemplatesScreen
   - Reusable checklist templates
   - Apply templates to calendar dates
   - TemplateCard components for display

4. **💬 Messages** - MessagesScreen
   - Notification center for app messages
   - Unread message badge on tab icon
   - Multi-user messaging support

5. **⚙️ Settings** - PreferencesScreen
   - User preferences and settings
   - Notification preferences
   - Account management

## Key Features

### Pinned Checklists
- Pin frequently used checklists for quick access
- Custom sorting and organization
- Card-based UI (`PinnedChecklistCard`)

### Calendar Integration
- Date-based checklist organization
- Navigate to specific dates via deep links
- Luxon for date handling
- Shared calendar support (multi-user)

### Templates
- Create reusable checklist templates
- Apply templates to calendar events
- Template library management

### Adding to Events
- Special "Adding to Event" mode
  - Hides tab bar when active
  - `AddingToEventBar` component
  - Context state: `addingToEvent.isActive`

### Notifications
- Push notifications via Expo Notifications
- Pending notifications in Firestore (`pendingNotifications` collection)
- Admin notification scheduling
- Deep linking from notifications

### Deep Linking
- Scheme: `mychecklist://`
- Calendar navigation with date parameters
- Tab navigation (pinned, templates, messages, preferences)
- Notification-triggered navigation

## Shared Packages Used
- `@my-apps/config` - Firebase and app configuration
- `@my-apps/contexts` - Auth, Data, Theme contexts
- `@my-apps/data-sync` - Firestore sync hooks
- `@my-apps/screens` - Shared screen components
- `@my-apps/ui` - UI components (AppHeader, LoadingScreen, AddingToEventBar)
- `@my-apps/utils` - Utility functions

## Custom Hooks
- `usePinnedSort()` - Handles sorting logic for pinned checklists
- `usePinnedChecklistModal()` - Modal state management
- `usePinnedOperations()` - CRUD operations for pinned items

## Services
- `notificationService.js` - Push notification handling and scheduling

## Firestore Collections
- `pendingNotifications` - Scheduled notifications queue
- User-specific calendar collections (via shared data-sync)
- Messages collection (via shared contexts)

## UI Patterns

### Theme Integration
- Uses shared `useTheme()` context
- Dynamic theming for tabs, cards, and surfaces
- Consistent color scheme across app

### Loading States
- Custom LoadingScreen with app icon
- Message: "Loading your checklists..."
- Auth and data loading states

### Header
- Shared AppHeader component
- App name: "MyChecklists"
- Calendar switcher (multi-user support)
- Logout menu item

### Tab Bar Customization
- Emoji-based icons
- Conditional hiding (when adding to event)
- Unread message badges
- Active state styling with soft primary color

## Special Behaviors
- Tab bar hides when `addingToEvent.isActive` is true
- Deep link listener updates selected date/month/year in data context
- Notification deep links navigate to specific calendar dates/views

## Development Notes
- Notification integration is active
- Multi-user calendar support via `allCalendars` from data context
- Deep linking fully configured for notifications and cross-app navigation

---

**Last Updated**: 2026-02-16
