import { useState, useEffect } from 'react';
import * as Crypto from 'expo-crypto';

export const useChecklistFormState = (checklist, prefilledTitle, isTemplate, isEditing) => {
  const uuidv4 = () => Crypto.randomUUID();
  
  const [checklistName, setChecklistName] = useState(prefilledTitle);
  const [reminderMinutes, setReminderMinutes] = useState(null);
  const [reminderTime, setReminderTime] = useState(null);
  const [notifyAdminOnCompletion, setNotifyAdminOnCompletion] = useState(false);
  const [defaultNotifyAdmin, setDefaultNotifyAdmin] = useState(false);
  const [defaultReminderTime, setDefaultReminderTime] = useState(null);
  const [defaultIsRecurring, setDefaultIsRecurring] = useState(false);
  const [defaultRecurringConfig, setDefaultRecurringConfig] = useState(null);
  const [saveAsTemplateEnabled, setSaveAsTemplateEnabled] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedItemForConfig, setSelectedItemForConfig] = useState(null);

  // Initialize form from checklist
  useEffect(() => {
    if (isEditing && checklist) {
      setChecklistName(checklist.name || prefilledTitle);
      setNotifyAdminOnCompletion(checklist.notifyAdmin ?? false);
      setDefaultNotifyAdmin(checklist.defaultNotifyAdmin ?? false);
      setDefaultReminderTime(checklist.defaultReminderTime ?? null);
      setDefaultIsRecurring(checklist.defaultIsRecurring ?? false);
      setDefaultRecurringConfig(checklist.defaultRecurringConfig ?? null);
    } else {
      setChecklistName(prefilledTitle);
      setReminderMinutes(null);
      setReminderTime(null);
      setNotifyAdminOnCompletion(false);
      setDefaultNotifyAdmin(false);
      setDefaultReminderTime(null);
      setDefaultIsRecurring(false);
      setDefaultRecurringConfig(null);
    }

    setSaveAsTemplateEnabled(false);
  }, [checklist, isEditing, isTemplate, prefilledTitle]);

  // Get initial items for useChecklistItems hook
  const getInitialItems = () => {
    if (isEditing && checklist) {
      return checklist.items?.map((item, index) => ({
        id: item.id || String(Date.now() + index),
        name: item.name || "",
        completed: isTemplate ? false : item.completed ?? false,
        itemType: item.itemType || "checkbox",
        requiredForScreenTime: item.requiredForScreenTime ?? false,
        requiresParentApproval: item.requiresParentApproval ?? false,
        yesNoConfig: item.yesNoConfig || null,
        subItems: item.subItems || [],
        parentId: item.parentId || null,
      })) || [
        {
          id: uuidv4(),
          name: "",
          completed: false,
          itemType: "checkbox",
          subItems: [],
        },
      ];
    } else {
      return [
        {
          id: uuidv4(),
          name: "",
          completed: false,
          itemType: "checkbox",
          subItems: [],
        },
      ];
    }
  };

  // Format time display for templates
  const formatTemplateTime = (timeString) => {
    if (!timeString) return "Not set";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Get current state for imperative handle
  const getCurrentState = () => ({
    name: checklistName,
    reminderMinutes,
    reminderTime,
    notifyAdmin: notifyAdminOnCompletion,
    defaultNotifyAdmin,
    defaultReminderTime,
    defaultIsRecurring,
    defaultRecurringConfig,
  });

  return {
    // State
    checklistName,
    setChecklistName,
    reminderMinutes,
    setReminderMinutes,
    reminderTime,
    setReminderTime,
    notifyAdminOnCompletion,
    setNotifyAdminOnCompletion,
    defaultNotifyAdmin,
    setDefaultNotifyAdmin,
    defaultReminderTime,
    setDefaultReminderTime,
    defaultIsRecurring,
    setDefaultIsRecurring,
    defaultRecurringConfig,
    setDefaultRecurringConfig,
    saveAsTemplateEnabled,
    setSaveAsTemplateEnabled,
    showReminderPicker,
    setShowReminderPicker,
    showConfigModal,
    setShowConfigModal,
    selectedItemForConfig,
    setSelectedItemForConfig,
    
    // Helpers
    getInitialItems,
    formatTemplateTime,
    getCurrentState,
  };
};