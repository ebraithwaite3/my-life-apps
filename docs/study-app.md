# Study App Overview

## Purpose
Learning and studying app with modules, quizzes, progress tracking, and customizable study preferences. Designed for structured learning with summaries and multi-level assessments.

## App Identity
- **Name**: MyStudying
- **Slug**: `my-studying`
- **Bundle ID (iOS)**: `com.ebraithwaite3.mystudying`
- **Package (Android)**: `com.ebraithwaite3.mystudying`
- **Deep Link Scheme**: `mystudying://`
- **EAS Project ID**: `598271a6-9d37-4879-b7a3-70879175d9f0`

## Navigation Structure

### Bottom Tab Navigation (2 tabs)
1. **📚 Learning** - LearningStack
   - **LearningMain**: StudyingHomeScreen (module catalog)
   - **ModuleDetails**: ModuleDetailsScreen (selected module)
   - Deep link: `mystudying://learn/module/{moduleId}`

2. **⚙️ Settings** - PreferencesStack
   - PreferencesScreen
   - User preferences and quiz settings
   - Deep link: `mystudying://settings`

### Stack Navigation
Learning tab uses stack navigation to navigate between:
- Module catalog (home)
- Individual module details

## Key Features

### Module System
- **Topics**: Top-level categorization (e.g., "workshops-prepare-to-teach")
- **Sections**: Modules grouped by section with ordering
- **Modules**: Individual learning units with:
  - Summary content (blocks)
  - Quiz questions (3 difficulty levels)
  - Progress tracking
  - Published/unpublished status

### Study Content Structure
Each module contains:
1. **Summary**: Text blocks for reading/learning
   - Stored in Firestore: `modules/{moduleId}/content/summary`
   - Structure: `{ version: 1, blocks: [...] }`

2. **Question Banks**: Three difficulty levels
   - **Level 1** (L1): `modules/{moduleId}/content/questions_l1`
   - **Level 2** (L2): `modules/{moduleId}/content/questions_l2`
   - **Level 3** (L3): `modules/{moduleId}/content/questions_l3`
   - Each contains array of questions

### Quiz System
- **Configurable question counts** per level (default: 5 each)
- **Quiz modes**:
  - `endReviewOnly` - Review answers at end (V1 default)
  - Future: immediate feedback mode
- **Question shuffling** - Random selection from banks
- **Progress tracking** - Record quiz results to Firestore
- **Session state management** - Track current question, answers, score

### Progress Tracking
- Per-user, per-module progress stored in Firestore
- Path: `users/{uid}/studyProgress/{moduleId}`
- Tracks:
  - Module visits
  - Quiz results
  - Completion status

### User Settings
- Quiz preferences (question counts, mode)
- Stored in user document: `users/{uid}`
- Real-time sync via UserSettingsContext
- Default preferences if not set

## Custom Contexts

### StudyContext
**Location**: `src/components/contexts/StudyContext.js`

**State Management**:
- `modules` - Array of all published modules for active topics
- `modulesBySection` - Modules grouped and sorted by section
- `progressByModule` - User progress map by moduleId
- `activeModuleId` - Currently selected module
- `activeModuleMeta` - Metadata for active module
- `summaryBlocks` - Summary content for active module
- `questionBanks` - Question arrays by level (1, 2, 3)
- `quizSession` - Active quiz state (questions, answers, current index)

**Methods**:
- `loadModule(moduleId)` - Fetch and set active module content
- `startQuiz(counts)` - Initialize quiz session with question counts
- `answerQuestion(index, answer)` - Record quiz answer
- `finishQuiz()` - Complete quiz and save results
- `resetQuiz()` - Clear quiz session
- `refreshModules()` - Reload module catalog

**Helpers**:
- `groupModulesBySection()` - Organize modules by section
- `shuffleArray()` - Randomize question order
- `pickNFrom(arr, n)` - Select N random items

### UserSettingsContext
**Location**: `src/components/contexts/UserSettingsContext.js`

**State Management**:
- `userDoc` - Full user document from Firestore
- `studyPreferences` - Quiz settings (counts, mode)
- Real-time listener to `users/{uid}`

**Default Settings**:
```javascript
{
  quiz: {
    counts: { 1: 5, 2: 5, 3: 5 },
    mode: "endReviewOnly"
  }
}
```

## Modal Components

### SummaryModalContent
- Displays module summary blocks
- Scrollable content view
- Shows module title and formatted text
- Loading and error states

### QuizModalContent
- Interactive quiz interface
- Question navigation
- Answer selection (via SelectModal from @my-apps/ui)
- Progress tracking
- Score calculation and results
- End-of-quiz review (based on mode)

## Services

### studyFirestore.js
**Location**: `src/services/studyFirestore.js`

**Functions**:
- `fetchPublishedModulesForActiveTopics(db)` - Get all published modules for active topics
- `fetchModuleContent(db, moduleId)` - Load summary + all question banks
- `fetchStudyProgressForModules(db, uid, moduleIds)` - Get progress for multiple modules
- `recordModuleVisit(db, uid, moduleId)` - Track module access
- `recordQuizResult(db, uid, moduleId, result)` - Save quiz completion

**Constants**:
- `ACTIVE_TOPIC_IDS` - Currently: `["workshops-prepare-to-teach"]`

### notificationService.js
Push notification handling (standard across apps).

## Firestore Data Model

### Collections
1. **modules** (root collection)
   - Documents: `{moduleId}`
   - Fields:
     - `topicId` - Parent topic
     - `sectionId` - Section grouping
     - `sectionTitle` - Display name for section
     - `sectionOrder` - Section sort order
     - `order` - Module order within section
     - `title` - Module display name
     - `published` - Boolean visibility flag

2. **modules/{moduleId}/content** (subcollection)
   - `summary` - Text blocks for learning
   - `questions_l1` - Level 1 quiz questions
   - `questions_l2` - Level 2 quiz questions
   - `questions_l3` - Level 3 quiz questions

3. **users/{uid}/studyProgress** (subcollection)
   - Documents: `{moduleId}`
   - Tracks visits, quiz scores, completion

4. **users/{uid}** (user settings)
   - `preferences.study` - Quiz preferences

## Shared Packages Used
- `@my-apps/config` - Firebase configuration
- `@my-apps/contexts` - Auth, Theme contexts (NOT using data-sync)
- `@my-apps/screens` - Shared screen components
- `@my-apps/ui` - UI components (AppHeader, LoadingScreen, SelectModal)

## Special Dependencies
- **react-native-toast-message** - Toast notifications
- **expo-clipboard** - Copy/paste functionality
- **@react-native-community/datetimepicker** - Date/time picker
- **@react-native-picker/picker** - Native picker component
- **luxon** - Date/time utilities

## UI Patterns

### Theme Integration
- Uses shared `useTheme()` context
- Consistent styling across modals and screens

### Loading States
- LoadingScreen: "Loading your study data..."
- Icon: MyStudyingIcon.png

### Header
- AppHeader component
- App name: "MyStudying"
- Simple logout menu

### Context Provider Wrapping
Authenticated users are wrapped in:
```javascript
<UserSettingsProvider>
  <StudyProvider>
    <TabNavigator />
  </StudyProvider>
</UserSettingsProvider>
```

## Special Behaviors

### Module Loading
- Modules auto-load when user logs in
- Progress loads after modules are fetched
- Real-time updates via Firestore listeners

### Quiz Flow
1. User opens module
2. Views summary (SummaryModalContent)
3. Starts quiz (configurable question counts)
4. Questions shuffled and selected randomly
5. Answer questions
6. Review at end (based on mode)
7. Results saved to Firestore

### Deep Linking
- Direct link to specific module: `mystudying://learn/module/{moduleId}`
- Opens module in ModuleDetailsScreen
- Useful for notifications or cross-app navigation

## Development Notes
- **Topic filtering**: Currently hardcoded to `workshops-prepare-to-teach`
- **Quiz V1**: End-review only, no immediate feedback (yet)
- **No calendar integration**: Unlike other apps, this is module-focused
- **No messages tab**: Focused learning experience
- **Simpler navigation**: Only 2 tabs vs 5 in other apps

## Possible Future Enhancements
- Multiple active topics (remove hardcoded filter)
- Immediate feedback quiz mode
- Bookmarks/favorites
- Study streaks
- Spaced repetition scheduling
- Community features (comments, discussions)

---

**Last Updated**: 2026-02-16
