import { useState, useEffect } from 'react';
import * as Crypto from 'expo-crypto';

// Reset yesNo answered state so carried-over items start fresh each day
const resetYesNoConfig = (config) => {
  if (!config) return null;
  const { answered: _a, answer: _b, ...rest } = config;
  return { ...rest, answered: false, answer: null };
};

export const useChecklistFormState = (checklist, prefilledTitle, isTemplate, isEditing, carryoverItems = []) => {
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
      const mappedItems = checklist.items?.map((item, index) => ({
        id: item.id || String(Date.now() + index),
        name: item.name || "",
        completed: isTemplate ? false : item.completed ?? false,
        itemType: item.itemType || "checkbox",
        requiredForScreenTime: item.requiredForScreenTime ?? false,
        requiresParentApproval: item.requiresParentApproval ?? false,
        yesNoConfig: item.yesNoConfig || null,
        subItems: item.subItems || [],
        parentId: item.parentId || null,
        ...(item.sourceChecklistId && { sourceChecklistId: item.sourceChecklistId }),
        ...(item.sourceItemId && { sourceItemId: item.sourceItemId }),
      }));
      // [] is truthy so `|| fallback` won't trigger — check length explicitly
      return (mappedItems && mappedItems.length > 0) ? mappedItems : [
        {
          id: uuidv4(),
          name: "",
          completed: false,
          itemType: "checkbox",
          subItems: [],
        },
      ];
    } else {
      console.log('[CARRYOVER] getInitialItems called, carryoverItems:', carryoverItems.length, carryoverItems.map(i => i.name));
      if (carryoverItems.length > 0) {
        const carried = carryoverItems.map(item => ({
          id: uuidv4(),
          name: item.name || "",
          completed: false,
          itemType: item.itemType || "checkbox",
          requiredForScreenTime: item.requiredForScreenTime ?? false,
          requiresParentApproval: item.requiresParentApproval ?? false,
          yesNoConfig: resetYesNoConfig(item.yesNoConfig),
          subItems: (item.subItems || []).filter(sub => !sub.completed).map(sub => ({
            ...sub,
            id: uuidv4(),
            completed: false,
            yesNoConfig: resetYesNoConfig(sub.yesNoConfig),
          })),
          parentId: null,
          ...(item.sourceChecklistId && { sourceChecklistId: item.sourceChecklistId }),
          ...(item.sourceItemId && { sourceItemId: item.sourceItemId }),
        }));
        return [
          ...carried,
          { id: uuidv4(), name: "", completed: false, itemType: "checkbox", subItems: [] },
        ];
      }
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