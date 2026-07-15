import { useState, useEffect } from 'react';
import { Alert, Keyboard } from 'react-native';
import { DateTime } from 'luxon';
import { calculateChecklistProgress, showSuccessToast } from '@my-apps/utils';
import { useData } from '@my-apps/contexts';
import { updateDocument } from '@my-apps/services';

const DAY_TO_WEEKDAY = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };

const TEN_MIN_MS = 10 * 60 * 1000;
function roundUpToTenMinutes(date) {
  return new Date(
    Math.ceil((date.getTime() - 5 * 60 * 1000) / TEN_MIN_MS) * TEN_MIN_MS
  );
}

const computeNextOccurrence = (reminder) => {
  const now = new Date();

  // New schema — recurrence object
  if (reminder.recurrence) {
    if (reminder.recurrence.oneTime) return null;

    if (reminder.recurrence.everyNMinutes) {
      const n = reminder.recurrence.everyNMinutes.n;
      return roundUpToTenMinutes(
        new Date(now.getTime() + n * 60_000)
      ).toISOString();
    }

    if (reminder.recurrence.everyNDays) {
      const { n, time, timezone } = reminder.recurrence.everyNDays;
      const [hour, minute] = time.split(':').map(Number);
      return DateTime.fromJSDate(now)
        .setZone(timezone)
        .plus({ days: n })
        .set({ hour, minute, second: 0, millisecond: 0 })
        .toISO();
    }

    if (reminder.recurrence.scheduleByDay) {
      const schedule = reminder.recurrence.scheduleByDay;
      let soonest = null;
      for (const entry of schedule) {
        const tz = entry.timezone || 'America/New_York';
        const [hour, minute] = entry.time.split(':').map(Number);
        const nowInZone = DateTime.fromJSDate(now).setZone(tz);
        let candidate = nowInZone.set({ hour, minute, second: 0, millisecond: 0 });
        if (candidate <= nowInZone) candidate = candidate.plus({ days: 1 });
        let iterations = 0;
        while (candidate.toFormat('EEE').toUpperCase().slice(0, 2) !== entry.day && iterations < 14) {
          candidate = candidate.plus({ days: 1 });
          iterations++;
        }
        if (!soonest || candidate < DateTime.fromISO(soonest)) {
          soonest = candidate.toISO();
        }
      }
      return soonest;
    }

    return null;
  }

  // Old schema — flat fields
  const base = reminder.scheduledTime
    ? DateTime.fromISO(reminder.scheduledTime, { zone: 'utc' })
    : DateTime.now();
  if (reminder.recurringIntervalMinutes) {
    return base.plus({ minutes: reminder.recurringIntervalMinutes }).toUTC().toISO();
  }
  if (reminder.recurringIntervalDays) {
    return base.plus({ days: reminder.recurringIntervalDays }).toUTC().toISO();
  }
  if (reminder.recurringSchedule?.length) {
    const candidates = reminder.recurringSchedule
      .map(({ day, time, timezone }) => {
        const targetWeekday = DAY_TO_WEEKDAY[day];
        if (!targetWeekday) return null;
        const [h, m] = (time || '09:00').split(':').map(Number);
        const tz = timezone || 'America/New_York';
        const nowDt = DateTime.now().setZone(tz);
        const candidate = nowDt.set({ hour: h, minute: m, second: 0, millisecond: 0 });
        const daysUntil = (targetWeekday - nowDt.weekday + 7) % 7;
        if (daysUntil === 0 && candidate <= nowDt) {
          return candidate.plus({ days: 7 }).toUTC().toISO();
        }
        return candidate.plus({ days: daysUntil }).toUTC().toISO();
      })
      .filter(Boolean);

    if (!candidates.length) return null;
    return candidates.sort()[0];
  }
  return null;
};

export const usePinnedChecklistModal = (handleSaveChecklist) => {
  const { masterConfigReminders, user } = useData();
  const [checklistMode, setChecklistMode] = useState("complete");
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [updatedItems, setUpdatedItems] = useState([]);
  const [isDirtyComplete, setIsDirtyComplete] = useState(false);
  const [workingChecklist, setWorkingChecklist] = useState(null);
  const [initialChecklist, setInitialChecklist] = useState(null);

  // Initialize working checklist when selected
  useEffect(() => {
    if (selectedChecklist) {
      setWorkingChecklist(selectedChecklist);
      setUpdatedItems(selectedChecklist.items || []);
      setInitialChecklist(JSON.parse(JSON.stringify(selectedChecklist)));
      setIsDirtyComplete(false);
    }
  }, [selectedChecklist]);

  // Detect changes in complete mode
  useEffect(() => {
    if (checklistMode !== "complete" || !initialChecklist) return;

    const originalItems = initialChecklist.items || [];
    const hasChanges = JSON.stringify(updatedItems) !== JSON.stringify(originalItems);
    
    setIsDirtyComplete(hasChanges);
  }, [updatedItems, initialChecklist, checklistMode]);

  const closeChecklistModal = (onClose) => {
    if (isDirtyComplete && selectedChecklist) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to close?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              resetModalState();
              onClose();
            },
          },
        ]
      );
    } else {
      resetModalState();
      onClose();
    }
  };

  const resetModalState = () => {
    setSelectedChecklist(null);
    setChecklistMode("complete");
    setUpdatedItems([]);
    setIsDirtyComplete(false);
    setWorkingChecklist(null);
    setInitialChecklist(null);
  };

  const getCancelText = () => {
    return isDirtyComplete ? "Cancel" : "Close";
  };

  const handleUpdateFromCompleteMode = async () => {
    // Diff to find items that just flipped to completed
    const oldItems = initialChecklist?.items || [];
    const newlyCompletedIds = new Set(
      updatedItems
        .filter((item) => {
          const old = oldItems.find((o) => o.id === item.id);
          return item.completed && old && !old.completed;
        })
        .map((item) => item.id)
    );

    // Process any reminders linked to newly-completed items
    if (newlyCompletedIds.size > 0 && masterConfigReminders?.length) {
      const matched = masterConfigReminders.filter(
        (r) => r.linkedItem?.itemId && newlyCompletedIds.has(r.linkedItem.itemId)
      );

      if (matched.length > 0) {
        const now = new Date().toISOString();
        let updatedReminders = [...masterConfigReminders];

        for (const reminder of matched) {
          if (reminder.onTodoComplete === 'delete') {
            updatedReminders = updatedReminders.filter((r) => r.id !== reminder.id);
          } else if (reminder.onTodoComplete === 'pause') {
            updatedReminders = updatedReminders.map((r) =>
              r.id !== reminder.id ? r : { ...r, paused: true, acknowledgedAt: now }
            );
          } else if (reminder.onTodoComplete === 'reschedule') {
            const nextTime = computeNextOccurrence(reminder);
            if (nextTime) {
              updatedReminders = updatedReminders.map((r) =>
                r.id !== reminder.id ? r : {
                  ...r,
                  scheduledTime: nextTime,
                  scheduledAlertTime: nextTime,
                  acknowledgedAt: null,
                  ...(r.notification && { notification: { ...r.notification, scheduledTime: nextTime } }),
                }
              );
            }
          }
        }

        const userId = user?.userId;
        if (userId) {
          try {
            await updateDocument('masterConfig', userId, { reminders: updatedReminders });
          } catch (err) {
            console.error('❌ onTodoComplete: failed to update reminders:', err);
          }
        }
      }
    }

    const updatedChecklist = {
      ...selectedChecklist,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };
    await handleSaveChecklist(updatedChecklist);

    Keyboard.dismiss();
    setTimeout(() => {
      showSuccessToast("Checklist saved", "", 2000, "top");
    }, 100);

    setIsDirtyComplete(false);
  };

  const getActionDisabled = () => {
    if (checklistMode === "edit") {
      return false;
    }
    return !isDirtyComplete;
  };

  const progress =
    checklistMode === "complete" && updatedItems.length > 0
      ? calculateChecklistProgress(updatedItems)
      : { completed: 0, total: 0 };

  return {
    // State
    checklistMode,
    setChecklistMode,
    selectedChecklist,
    setSelectedChecklist,
    updatedItems,
    setUpdatedItems,
    isDirtyComplete,
    setIsDirtyComplete,
    workingChecklist,
    setWorkingChecklist,
    progress,
    
    // Handlers
    closeChecklistModal,
    getCancelText,
    handleUpdateFromCompleteMode,
    getActionDisabled,
  };
};