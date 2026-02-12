import React, { useState } from "react";
import OptionsSelectionModal from "../modals/composed/pickers/OptionsSelectionModal";
import SelectorRow from "./SelectorRow";
import CustomReminderModal from "../modals/composed/modals/CustomReminderModal";
import { DateTime } from "luxon";

const ReminderSelector = ({ 
  reminder, 
  onReminderChange, 
  eventStartDate,
  isAllDay = false,
  isTemplateMode = false, // ← NEW PROP (defaults to false)
}) => {
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);

  // ✅ Handle both runtime format AND template format
  const formatReminderDisplay = () => {
    if (!reminder) return "None";
    
    // ✅ TEMPLATE MODE: reminder has { time: "HH:mm", isRecurring, recurringConfig }
    if (isTemplateMode && typeof reminder === 'object' && reminder.time) {
      const [hours, minutes] = reminder.time.split(':').map(Number);
      const recurringText = reminder.isRecurring ? " (Recurring)" : "";
      
      // Format for display
      const period = hours < 12 ? 'AM' : 'PM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}${recurringText}`;
    }
    
    // ✅ RUNTIME MODE: existing logic (handles ISO strings and {scheduledFor} objects)
    let reminderTimeISO = reminder;
    let isRecurring = false;
    
    if (typeof reminder === 'object' && reminder?.scheduledFor) {
      reminderTimeISO = reminder.scheduledFor;
      isRecurring = reminder.isRecurring || false;
    }
    
    const reminderTime = DateTime.fromISO(reminderTimeISO);
    
    if (!reminderTime.isValid) {
      console.error("Invalid reminder time:", reminder);
      return "Invalid DateTime";
    }
    
    const recurringText = isRecurring ? " (Recurring)" : "";
    
    // Always show the actual time
    if (isAllDay) {
      return reminderTime.toFormat("MMM d 'at' h:mm a") + recurringText;
    } else {
      // For timed events, show time (and date if not today)
      const now = DateTime.now();
      if (reminderTime.hasSame(now, 'day')) {
        return reminderTime.toFormat("h:mm a") + recurringText;
      } else {
        return reminderTime.toFormat("MMM d 'at' h:mm a") + recurringText;
      }
    }
  };

  const getPresetOptions = () => {
    if (isAllDay) {
      return [
        { id: "none", label: "None", value: null },
        { id: "custom", label: "Custom...", value: "CUSTOM" },
      ];
    }
    
    return [
      { id: "none", label: "None", value: null },
      { id: "at-time", label: "At time of event", minutes: 0 },
      { id: "5-min", label: "5 minutes before", minutes: 5 },
      { id: "15-min", label: "15 minutes before", minutes: 15 },
      { id: "30-min", label: "30 minutes before", minutes: 30 },
      { id: "1-hour", label: "1 hour before", minutes: 60 },
      { id: "1-day", label: "1 day before", minutes: 1440 },
      { id: "2-days", label: "2 days before", minutes: 2880 },
      { id: "1-week", label: "1 week before", minutes: 10080 },
      { id: "custom", label: "Custom...", value: "CUSTOM" },
    ];
  };

  const getCurrentPresetId = () => {
    if (!reminder) return "none";
    
    // ✅ Extract ISO string from object if needed
    let reminderTimeISO = reminder;
    if (typeof reminder === 'object' && reminder?.scheduledFor) {
      reminderTimeISO = reminder.scheduledFor;
    }
    
    if (isAllDay) return "custom";
  
    const reminderTime = DateTime.fromISO(reminderTimeISO);
    if (!reminderTime.isValid) return "custom";
    
    const eventTime = DateTime.fromJSDate(eventStartDate);
    const diffMinutes = Math.round(eventTime.diff(reminderTime, "minutes").minutes);
  
    for (const preset of getPresetOptions()) {
      if (preset.minutes === diffMinutes) return preset.id;
    }
  
    return "custom";
  };

  const handlePresetSelect = (item) => {
    if (item.value === "CUSTOM") {
      setOptionsModalVisible(false);
      setCustomModalVisible(true);
    } else if (item.value === null) {
      onReminderChange(null);
      setOptionsModalVisible(false);
    } else {
      const eventTime = DateTime.fromJSDate(eventStartDate);
      const reminderTime = eventTime.minus({ minutes: item.minutes });
      
      // ✅ Return object format (will be normalized by parent)
      onReminderChange({
        scheduledFor: reminderTime.toISO(),
        isRecurring: false,
      });
      setOptionsModalVisible(false);
    }
  };

  const handleCustomConfirm = (customTimeData) => {
    // ✅ Already in correct normalized format from CustomReminderModal
    onReminderChange(customTimeData);
    setCustomModalVisible(false);
  };

  return (
    <>
      <SelectorRow
        label="Alert"
        value={formatReminderDisplay()}
        onPress={() => setOptionsModalVisible(true)}
        icon="notifications-outline"
      />
      
      <OptionsSelectionModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        title="Alert"
        options={getPresetOptions()}
        selectedValue={getCurrentPresetId()}
        onSelect={handlePresetSelect}
      />
      
      <CustomReminderModal
        visible={customModalVisible}
        onClose={() => setCustomModalVisible(false)}
        reminder={reminder}
        eventStartDate={eventStartDate}
        isAllDay={isAllDay}
        onConfirm={handleCustomConfirm}
      />
    </>
  );
};

export default ReminderSelector;