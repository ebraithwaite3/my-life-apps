# Spelling Practice Feature — Context Document

> **Purpose**: This document describes the Spelling Practice feature in the `my-life-apps` monorepo (checklist-app). Use it to discuss new feature ideas with an AI assistant, then bring implementation decisions back to Claude Code.

---

## What Is This App?

`my-life-apps` is a React Native / Expo monorepo. The **checklist-app** contains multiple features including a **Pinned Screen** that shows "pinned" checklists. Any checklist whose name contains the substring `"spelling list"` (case-insensitive) automatically opens the Spelling Practice modal instead of the regular checklist editor.

---

## How Spelling Lists Work

### Data Model

Each spelling checklist is a standard checklist stored in Firebase, but with per-word stats accumulated over time:

```js
// Checklist
{
  id: string,
  name: string,           // Must contain "spelling list" to trigger spelling UI
  items: [WordItem],
  totalSessions: number,
  updatedAt: ISO string,
}

// WordItem
{
  id: string,
  name: string,           // The word to practice
  correct: number,        // All-time correct count
  incorrect: number,      // All-time incorrect count
  skipped: number,        // All-time skipped count
}
```

Stats are cumulative — they persist across sessions in Firebase, attached to each individual word item.

---

## Component Architecture

```
PinnedScreen
└── SpellingTestModal          ← main container (tabs: Practice / Stats / Edit)
    ├── SpellingListContent    ← "Practice" tab, owns session UI
    │   ├── useSpellingSession ← queue management, session state
    │   ├── useSpellingSpeech  ← text-to-speech (expo-speech)
    │   ├── SpellingModeSelector     ← Solo vs Parent toggle
    │   ├── SpellingListModeSelector ← Once / Loop / Add Missed toggle
    │   ├── SpellingWordDisplay      ← shows word (Parent mode only)
    │   ├── SpellingTestControls     ← Right / Wrong / Skip buttons (Parent mode)
    │   └── SpellingSessionSummary  ← end-of-session recap screen
    ├── SpellingStatsView      ← "Stats" tab, per-word accuracy table
    └── EditChecklistContent   ← "Edit" tab, reuses existing checklist editor
```

**Key design note**: Stats saves do NOT reset the session (practiceKey stays the same). Editing the word list DOES reset the session (practiceKey increments).

---

## Practice Modes

### Spelling Mode

| Mode | How it works |
|------|--------------|
| **Solo** | Word is hidden. User taps Speak, types their guess, taps Check. Auto-graded by exact (case-insensitive) string comparison. |
| **Parent** | Word is always visible. A parent/teacher presses Right / Wrong / Skip buttons manually. No text input. |

### List Mode

| Mode | Behavior |
|------|----------|
| **Once** | Go through the list once, then show the session summary. |
| **Loop** | Restart from the beginning indefinitely. |
| **Add Missed** *(default)* | Wrong answers are appended to the end of the queue. Session extends until all are answered correctly (or skipped). |

---

## Text-to-Speech

- Uses `expo-speech`
- iOS: `playsInSilentModeIOS: true` — audio works even when device is on silent
- No voice/language/accent selection — uses device default
- Speak button shows "Speaking..." while audio plays

---

## Session Flow

1. User opens a "spelling list" checklist from Pinned Screen
2. SpellingTestModal opens, defaulting to Practice tab
3. User picks Spelling Mode (Solo/Parent) and List Mode
4. User taps **Speak** to hear the word
5. Solo: types answer → Check → sees result → Next Word
6. Parent: taps Right/Wrong/Skip directly
7. When queue is exhausted (Once or Add Missed):
   - **SpellingSessionSummary** screen appears
   - Shows: ✅ Correct | ❌ Wrong | ➡️ Skipped counts
   - Lists "Trouble Words" — any word wrong at least once this session
   - Shows all-time accuracy % for each trouble word
8. User can tap **Practice Again** to reset session

---

## Stats & Scoring

### All-Time Accuracy (per word)
```
accuracy = correct / (correct + incorrect) * 100
```
- ≥ 80% → green
- ≥ 50% → yellow
- < 50% → red
- No attempts → gray with "—"

### Stats View (Stats tab)
A table with columns: **Word | ✓ Correct | ✗ Wrong | → Skipped | Score%**
Each row is colored by accuracy. Appears only after at least one session.

### Stats Persistence
After a session ends, the updated per-word counts are saved back to Firebase (merges into the existing checklist document). This happens without remounting the session, so the summary screen stays visible.

---

## Current Limitations

These are known gaps in the current implementation — good candidates for new feature discussion:

1. **Grading is exact match only** — no fuzzy matching, no typo tolerance, no phonetic similarity (e.g., "recieve" vs "receive")
2. **No adaptive difficulty** — all words treated equally; no spaced repetition or smart retry logic
3. **No session history** — only cumulative all-time stats stored; no per-session archives or trends over time
4. **No voice/language selection** — always uses device default TTS voice
5. **No session pause/resume** — state is lost if modal closes mid-session
6. **No progress visualization** — stats view is a static table; no charts, streaks, or trends
7. **Skipped words are just counted** — skipped words don't auto-retry in any mode
8. **No word difficulty levels** — no tagging words as easy/medium/hard
9. **No per-attempt timing** — no record of how long each answer took
10. **Add Missed can loop forever** — if a word is consistently wrong, it just keeps appending

---

## Files Reference

All spelling files live in:
```
apps/checklist-app/src/components/spelling/
  SpellingListContent.js       ← main practice tab UI + session orchestration
  SpellingListModeSelector.js  ← Once/Loop/Add Missed picker
  SpellingModeSelector.js      ← Solo/Parent picker
  SpellingSessionSummary.js    ← end-of-session results screen
  SpellingStatsView.js         ← all-time stats table
  SpellingTestControls.js      ← Right/Wrong/Skip buttons (parent mode)
  SpellingTestModal.js         ← top-level modal (tabs container)
  SpellingWordDisplay.js       ← word visibility in parent mode
  useSpellingSession.js        ← queue + session state hook
  useSpellingSpeech.js         ← expo-speech wrapper hook

apps/checklist-app/src/screens/
  PinnedScreen.js              ← entry point, isSpellingList() detection

apps/checklist-app/src/utils/
  pinnedChecklistUtils.js      ← isSpellingList() helper + updatePinnedChecklist()
```

---

## Questions to Explore With Claude (Web)

Use this section as a starting point for your discussion. Replace or add to these based on what you want to build:

- **What new feature do you want to add?** (e.g., spaced repetition, session history, better grading, gamification, etc.)
- What constraints should it respect? (e.g., offline-first, no backend changes, works for kids)
- Should it change the data model? If yes, consider migration for existing data.
- Should it change the UI flow? Where should new UI elements live?
- Are there third-party libraries we should use or avoid?

---

## Returning to Claude Code

When you return with a feature plan, share:
1. The feature goal (one sentence)
2. The agreed approach / design decisions
3. Any specific files to modify or create
4. Any new dependencies needed

Claude Code will have access to the actual source files for implementation.
