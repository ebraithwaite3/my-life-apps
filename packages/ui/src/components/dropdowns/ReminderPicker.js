import React, { useEffect } from 'react';
import { useTheme } from '@my-apps/contexts';
import CustomTimePicker from './CustomTimePicker';

/**
 * ReminderPicker - Now always shows CustomTimePicker (no standard options)
 * Always stores reminders as absolute times (ISO strings)
 */
const ReminderPicker = ({ 
  visible, 
  selectedMinutes, // Now always ISO string or null
  onSelect, 
  onClose, 
  eventStartTime,
}) => {
  const { theme } = useTheme();

  return (
    <CustomTimePicker
      visible={visible}
      eventStartTime={eventStartTime}
      selectedTime={selectedMinutes} // Pass ISO string directly
      onConfirm={onSelect}
      onClose={onClose}
    />
  );
};

export default ReminderPicker;