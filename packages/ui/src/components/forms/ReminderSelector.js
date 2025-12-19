import React, { useState } from "react";
import { SelectorRow, OptionsSelectionModal } from "@my-apps/ui";
import CustomReminderModal from "../modals/composed/modals/CustomReminderModal";
import { DateTime } from "luxon";

const ReminderSelector = ({ 
  reminder, 
  onReminderChange, 
  eventStartDate,
  isAllDay = false, // NEW: Pass this from parent
}) => {
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);

  const formatReminderDisplay = () => {
    if (!reminder) return "None";
    
    const reminderTime = DateTime.fromISO(reminder);
    
    // For all-day events, just show the date/time
    if (isAllDay) {
      return reminderTime.toFormat("MMM d 'at' h:mm a");
    }
    
    // For timed events, check presets
    const eventTime = DateTime.fromJSDate(eventStartDate);
    const diffMinutes = Math.round(eventTime.diff(reminderTime, 'minutes').minutes);
    
    if (diffMinutes === 0) return "At time of event";
    if (diffMinutes === 5) return "5 minutes before";
    if (diffMinutes === 15) return "15 minutes before";
    if (diffMinutes === 30) return "30 minutes before";
    if (diffMinutes === 60) return "1 hour before";
    if (diffMinutes === 1440) return "1 day before";
    if (diffMinutes === 2880) return "2 days before";
    if (diffMinutes === 10080) return "1 week before";
    
    // Custom time
    return reminderTime.toFormat("MMM d 'at' h:mm a");
  };

  // Different presets for all-day vs timed events
  const getPresetOptions = () => {
    if (isAllDay) {
      // All-day events: Only None and Custom
      return [
        { id: "none", label: "None", value: null },
        { id: "custom", label: "Custom...", value: "CUSTOM" },
      ];
    }
    
    // Timed events: All the presets
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
    
    // For all-day, it's always custom (if set)
    if (isAllDay) return "custom";
    
    const reminderTime = DateTime.fromISO(reminder);
    const eventTime = DateTime.fromJSDate(eventStartDate);
    const diffMinutes = Math.round(eventTime.diff(reminderTime, 'minutes').minutes);
    
    const presetOptions = getPresetOptions();
    for (const preset of presetOptions) {
      if (preset.value === null && !reminder) return "none";
      if (preset.value === "CUSTOM") continue;
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
      // Calculate ISO string based on preset minutes
      const eventTime = DateTime.fromJSDate(eventStartDate);
      const reminderTime = eventTime.minus({ minutes: item.minutes });
      
      onReminderChange(reminderTime.toISO());
      setOptionsModalVisible(false);
    }
  };

  const handleCustomConfirm = (customTime) => {
    onReminderChange(customTime);
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