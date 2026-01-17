import { useCallback } from 'react';
import { Alert } from 'react-native';
import { canSaveAsTemplate } from '@my-apps/utils'; // ✅ From your existing file
import { buildChecklistObject } from '@my-apps/utils';

export const useChecklistSave = ({
  checklistName,
  items,
  reminderMinutes,
  reminderTime,
  notifyAdminOnCompletion,
  defaultNotifyAdmin,
  defaultReminderTime,
  isEditing,
  isTemplate,
  hasEventTime,
  checklist,
  onSave,
  saveAsTemplateEnabled,
  eventStartTime,
}) => {
  const validateForm = useCallback(() => {
    const errors = [];

    if (!checklistName.trim()) {
      errors.push("Checklist name is required.");
    }

    if (items.filter((i) => i.name.trim()).length === 0) {
      errors.push("At least one checklist item is required.");
    }
    
    if (errors.length > 0) {
      Alert.alert(
        "Cannot Save",
        errors.join("\n"),
        [{ text: "OK" }]
      );
    }
    
    return errors.length === 0;
  }, [checklistName, items]);

  const handleSave = useCallback(() => {
    if (!validateForm()) {
      console.log("❌ Validation failed");
      return;
    }

    if (saveAsTemplateEnabled) {
      const currentChecklist = {
        name: checklistName,
        items: items,
        notifyAdmin: notifyAdminOnCompletion,
      };
      
      const validation = canSaveAsTemplate(currentChecklist); // ✅ From your existing utils
      if (!validation.valid) {
        Alert.alert(
          "Cannot Save as Template",
          validation.errors.join("\n") +
            "\n\nPlease fix these issues before saving with 'Save as Template' enabled."
        );
        console.log("❌ Template validation failed");
        return;
      }
    }

    try {
      const newChecklist = buildChecklistObject({
        checklistName,
        items,
        isEditing,
        isTemplate,
        checklist,
        reminderMinutes,
        reminderTime,
        notifyAdminOnCompletion,
        defaultNotifyAdmin,
        defaultReminderTime,
        hasEventTime,
        eventStartTime,
      });
      
      onSave?.(newChecklist, saveAsTemplateEnabled);
      
      console.log("✅ onSave completed");
    } catch (error) {
      console.error("❌ Error in handleSave:", error);
      Alert.alert("Error", "Failed to save checklist: " + error.message);
    }
  }, [
    checklistName,
    items,
    reminderMinutes,
    reminderTime,
    notifyAdminOnCompletion,
    defaultNotifyAdmin,
    defaultReminderTime,
    isEditing,
    isTemplate,
    hasEventTime,
    checklist,
    onSave,
    saveAsTemplateEnabled,
    eventStartTime,
    validateForm,
  ]);

  return {
    handleSave,
    validateForm,
  };
};