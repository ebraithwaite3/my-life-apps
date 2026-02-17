# My Life Apps - Project Overview

## Project Type
Monorepo containing multiple React Native mobile applications with shared packages and Firebase backend.

## Tech Stack

### Frontend
- **React Native** 0.81.5
- **Expo** ~54.0
- **React** 19.1.0
- **React Navigation** 7.x (Stack & Bottom Tabs)
- **Expo Notifications** for push notifications
- **React Native WebView** & YouTube iframe support

### Backend
- **Firebase** 12.x
  - Firestore (database)
  - Firebase Functions (serverless backend)
  - Authentication
  - Cloud Messaging (notifications)

### Date/Time
- **Luxon** for date manipulation

## Monorepo Structure

```
my-life-apps/
├── apps/                    # Individual applications
│   ├── workout-app/        # Workout tracking and YouTube integration
│   ├── calendar-app/       # Calendar management
│   ├── study-app/          # Study tracking
│   ├── checklist-app/      # Task/checklist management
│   └── organizer-app/      # Organization/planning
│
├── packages/               # Shared code across apps
│   ├── @my-apps/config/           # Configuration (Firebase, etc.)
│   ├── @my-apps/contexts/         # React contexts (auth, data)
│   ├── @my-apps/data-sync/        # Firestore sync utilities
│   ├── @my-apps/screens/          # Shared screens
│   ├── @my-apps/ui/               # Shared UI components
│   ├── @my-apps/utils/            # Utility functions
│   ├── @my-apps/hooks/            # Custom React hooks
│   ├── @my-apps/services/         # API/service layers
│   └── @my-apps/calendar-sync/    # Calendar synchronization
│
└── functions/              # Firebase Cloud Functions (Node.js)
```

## Workspace Configuration
- Uses npm workspaces
- React Native and Expo are not hoisted (due to RN compatibility requirements)
- Shared packages use local workspace references (`"@my-apps/config": "*"`)

## Key Features Across Apps
- **Multi-user support** with Firebase Authentication
- **Real-time sync** via Firestore
- **Push notifications** via Expo Notifications
- **Scheduled reminders** (admin functionality)
- **Template-based workflows** (e.g., workout templates, schedule templates)
- **Cross-platform** (iOS & Android)

## Development Commands
```bash
npm run workout      # Start workout app
npm run calendar     # Start calendar app
npm run organizer    # Start organizer app
npm run functions:serve   # Run Firebase functions locally
npm run functions:deploy  # Deploy Firebase functions
```

## Platform Details
- **iOS**: Bundle ID `com.ebraithwaite3.*`
- **Android**: Package `com.ebraithwaite3.*`
- **Owner**: ebraithwaite3 (Expo account)

## Recent Work
- Added YouTube video modal integration to workout app
- Implemented standalone reminders system (admin only)
- Schedule template application with multi-user notifications
- Expo Notifications integration

## Architecture Principles
- **Shared-first**: Common functionality lives in packages/ for reuse
- **App-specific**: Each app can override or extend shared components
- **Firebase-centric**: Firestore is the source of truth
- **Real-time updates**: Apps subscribe to Firestore changes

---

**Last Updated**: 2026-02-16
**Claude**: This document serves as a reference to understand the project structure without re-exploring the entire codebase.
