import { useCallback } from 'react';
import { Alert } from 'react-native';

/**
 * useEventValidation - Shared validation logic for EventModal
 * 
 * Validates event form data
 * Used by ALL app EventModals
 */
export const useEventValidation = () => {
  const validateEvent = useCallback(({
    title,
    startDate,
    endDate,
    selectedActivity,
    activityRequired = true,
    activityName = "activity",
  }) => {
    const errors = [];

    // Title validation
    if (!title || !title.trim()) {
      errors.push("Title is required");
    }

    // Activity validation (if required)
    if (activityRequired) {
      if (!selectedActivity) {
        errors.push(`Please select or create a ${activityName}`);
      } else if (selectedActivity.items && selectedActivity.items.length === 0) {
        errors.push(`${activityName.charAt(0).toUpperCase() + activityName.slice(1)} must have at least one item`);
      }
    }

    // Date validation
    if (!startDate) {
      errors.push("Start date is required");
    }
    if (!endDate) {
      errors.push("End date is required");
    }
    if (startDate && endDate && endDate <= startDate) {
      errors.push("End time must be after start time");
    }

    // Show first error to user
    if (errors.length > 0) {
      Alert.alert("Validation Error", errors[0]);
      console.log("❌ Validation errors:", errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  return { validateEvent };
};