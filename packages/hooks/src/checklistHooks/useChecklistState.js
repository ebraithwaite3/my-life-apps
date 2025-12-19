import { useState, useEffect, useRef } from 'react';
import { isChecklistComplete } from '../../../utils/src/checklistUtils';

/**
 * useChecklistState - Track checklist state changes and completion status
 * 
 * Usage:
 * const { wasJustCompleted, completionChanged, resetCompletionTracking } = useChecklistState(checklist);
 */
export const useChecklistState = (checklist) => {
  const previousComplete = useRef(null);
  const [wasJustCompleted, setWasJustCompleted] = useState(false);
  const [completionChanged, setCompletionChanged] = useState(false);

  useEffect(() => {
    if (!checklist) {
      previousComplete.current = null;
      setWasJustCompleted(false);
      setCompletionChanged(false);
      return;
    }

    const currentlyComplete = isChecklistComplete(checklist);

    // First time seeing this checklist
    if (previousComplete.current === null) {
      previousComplete.current = currentlyComplete;
      return;
    }

    // Check if completion status changed
    if (previousComplete.current !== currentlyComplete) {
      setCompletionChanged(true);

      // Check if it JUST became complete (was incomplete, now complete)
      if (!previousComplete.current && currentlyComplete) {
        setWasJustCompleted(true);
        console.log('🎉 Checklist just completed!');
      } else {
        setWasJustCompleted(false);
      }

      previousComplete.current = currentlyComplete;
    }
  }, [checklist]);

  const resetCompletionTracking = () => {
    previousComplete.current = null;
    setWasJustCompleted(false);
    setCompletionChanged(false);
  };

  return {
    wasJustCompleted,      // true only when transitioning incomplete → complete
    completionChanged,     // true when completion status changed at all
    isCurrentlyComplete: previousComplete.current,
    resetCompletionTracking,
  };
};