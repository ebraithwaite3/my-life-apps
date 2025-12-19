import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { DateTime } from 'luxon';
import SpinnerPicker from './SpinnerPicker';

/**
 * CustomTimePicker - Always stores as absolute time (ISO string)
 * No more "minutes before" logic - everything is a specific date/time
 */
const CustomTimePicker = ({ 
  visible, 
  eventStartTime,
  selectedTime, // ISO string or null
  onConfirm, 
  onClose,
}) => {
  const { theme, getSpacing, getBorderRadius, getTypography } = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());

  useEffect(() => {
    if (visible) {
      if (selectedTime) {
        // Use existing reminder time
        setSelectedDateTime(new Date(selectedTime));
      } else if (eventStartTime && eventStartTime instanceof Date && !isNaN(eventStartTime.getTime())) {
        // Default to 1 hour before event
        const eventDt = DateTime.fromJSDate(eventStartTime);
        const defaultReminder = eventDt.minus({ hours: 1 });
        setSelectedDateTime(defaultReminder.toJSDate());
      } else {
        // Default to tomorrow at 9 AM
        const tomorrow = DateTime.now().plus({ days: 1 }).set({ hour: 9, minute: 0, second: 0 });
        setSelectedDateTime(tomorrow.toJSDate());
      }
    }
  }, [visible, eventStartTime, selectedTime]);

  const handleDateConfirm = (newDate) => {
    // Update date but keep time
    const oldDt = DateTime.fromJSDate(selectedDateTime);
    const newDt = DateTime.fromJSDate(newDate);
    const updated = newDt.set({ 
      hour: oldDt.hour, 
      minute: oldDt.minute 
    });
    setSelectedDateTime(updated.toJSDate());
    setShowDatePicker(false);
  };

  const handleTimeConfirm = (newDate) => {
    // Update time but keep date
    const oldDt = DateTime.fromJSDate(selectedDateTime);
    const newDt = DateTime.fromJSDate(newDate);
    const updated = oldDt.set({ 
      hour: newDt.hour, 
      minute: newDt.minute 
    });
    setSelectedDateTime(updated.toJSDate());
    setShowTimePicker(false);
  };

  const handleConfirm = () => {
    // Always return ISO string
    onConfirm(selectedDateTime.toISOString());
    onClose();
  };

  const formatDateDisplay = (date) => {
    return DateTime.fromJSDate(date).toFormat('EEE, MMM d, yyyy');
  };

  const formatTimeDisplay = (date) => {
    return DateTime.fromJSDate(date).toFormat('h:mm a');
  };

  const formatFullDisplay = () => {
    return DateTime.fromJSDate(selectedDateTime).toFormat("EEE, MMM d 'at' h:mm a");
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      width: '85%',
      maxWidth: 400,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    doneButton: {
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.sm,
    },
    doneButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.primary,
    },
    content: {
      padding: getSpacing.lg,
    },
    section: {
      marginBottom: getSpacing.lg,
    },
    sectionLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.xs,
      fontWeight: '600',
    },
    timeButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.sm,
      padding: getSpacing.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    timeButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    chevron: {
      color: theme.text.secondary,
    },
    displayContainer: {
      backgroundColor: theme.primary + '10',
      borderRadius: getBorderRadius.md,
      padding: getSpacing.md,
      borderWidth: 1,
      borderColor: theme.primary + '40',
    },
    displayText: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: '600',
      color: theme.primary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
      marginTop: getSpacing.xs,
    },
  });

  if (!visible) return null;

  return (
    <>
      <Modal
        transparent
        visible={visible && !showDatePicker && !showTimePicker}
        onRequestClose={onClose}
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.container}>
                <View style={styles.header}>
                  <View style={{ width: 60 }} />
                  <Text style={styles.headerTitle}>Set Reminder</Text>
                  <TouchableOpacity 
                    style={styles.doneButton} 
                    onPress={handleConfirm}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.content}>
                  {/* Date Selection */}
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>DATE</Text>
                    <TouchableOpacity 
                      style={styles.timeButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={styles.timeButtonText}>
                        {formatDateDisplay(selectedDateTime)}
                      </Text>
                      <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Time Selection */}
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>TIME</Text>
                    <TouchableOpacity 
                      style={styles.timeButton}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text style={styles.timeButtonText}>
                        {formatTimeDisplay(selectedDateTime)}
                      </Text>
                      <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Display */}
                  <View style={styles.displayContainer}>
                    <Text style={styles.displayText}>
                      Reminder Set
                    </Text>
                    <Text style={styles.subtitle}>
                      {formatFullDisplay()}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Date Picker */}
      <SpinnerPicker
        visible={showDatePicker}
        mode="date"
        value={selectedDateTime}
        onConfirm={handleDateConfirm}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Time Picker */}
      <SpinnerPicker
        visible={showTimePicker}
        mode="time"
        value={selectedDateTime}
        onConfirm={handleTimeConfirm}
        onClose={() => setShowTimePicker(false)}
      />
    </>
  );
};

export default CustomTimePicker;