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

const CustomTimePicker = ({ 
  visible, 
  eventStartTime, 
  onConfirm, 
  onClose,
  initialMinutes,
  isAllDay = false // For pinned checklists (no event)
}) => {
  const { theme, getSpacing, getBorderRadius, getTypography } = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());

  useEffect(() => {
    if (visible) {
      if (isAllDay) {
        // For pinned checklists, default to tomorrow at 9 AM
        const tomorrow = DateTime.now().plus({ days: 1 }).set({ hour: 9, minute: 0, second: 0 });
        setSelectedDateTime(tomorrow.toJSDate());
      } else if (eventStartTime) {
        // For event-based, calculate from initialMinutes
        if (initialMinutes !== null && initialMinutes !== undefined) {
          const eventDt = DateTime.fromJSDate(new Date(eventStartTime));
          const reminderDt = eventDt.minus({ minutes: initialMinutes });
          setSelectedDateTime(reminderDt.toJSDate());
        } else {
          // Default to 1 hour before event
          const eventDt = DateTime.fromJSDate(new Date(eventStartTime));
          const defaultReminder = eventDt.minus({ hours: 1 });
          setSelectedDateTime(defaultReminder.toJSDate());
        }
      }
    }
  }, [visible, eventStartTime, initialMinutes, isAllDay]);

  const calculateDifference = () => {
    // If no event (isAllDay for pinned checklists), always valid
    if (isAllDay || !eventStartTime) {
      return { isValid: true, totalMinutes: null };
    }
    
    const eventDt = DateTime.fromJSDate(new Date(eventStartTime));
    const reminderDt = DateTime.fromJSDate(selectedDateTime);
    
    const diff = eventDt.diff(reminderDt, ['days', 'hours', 'minutes']).toObject();
    
    return {
      days: Math.floor(diff.days || 0),
      hours: Math.floor(diff.hours || 0),
      minutes: Math.floor(diff.minutes || 0),
      totalMinutes: Math.floor(eventDt.diff(reminderDt, 'minutes').minutes),
      isValid: reminderDt < eventDt
    };
  };

  const formatDifference = () => {
    const diff = calculateDifference();
    if (!diff || !diff.isValid) return 'Invalid time (must be before event)';
    
    const parts = [];
    if (diff.days > 0) parts.push(`${diff.days} day${diff.days > 1 ? 's' : ''}`);
    if (diff.hours > 0) parts.push(`${diff.hours} hour${diff.hours > 1 ? 's' : ''}`);
    if (diff.minutes > 0) parts.push(`${diff.minutes} minute${diff.minutes > 1 ? 's' : ''}`);
    
    if (parts.length === 0) return 'At time of event';
    return parts.join(' ') + ' before';
  };

  const formatSelectedTime = () => {
    return DateTime.fromJSDate(selectedDateTime).toFormat('EEE, MMM d, yyyy \'at\' h:mm a');
  };

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
    if (isAllDay) {
      // For pinned checklists, return the ISO string of the selected date/time
      onConfirm(selectedDateTime.toISOString());
      onClose();
    } else {
      // For event-based, return minutes before
      const diff = calculateDifference();
      if (diff && diff.isValid) {
        onConfirm(diff.totalMinutes);
        onClose();
      } else {
        alert('Reminder time must be before the event');
      }
    }
  };

  const formatDateDisplay = (date) => {
    return DateTime.fromJSDate(date).toFormat('EEE, MMM d, yyyy');
  };

  const formatTimeDisplay = (date) => {
    return DateTime.fromJSDate(date).toFormat('h:mm a');
  };

  const diff = calculateDifference();
  const isValid = diff && diff.isValid;

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
    differenceContainer: {
      backgroundColor: isValid ? theme.primary + '10' : theme.error + '10',
      borderRadius: getBorderRadius.md,
      padding: getSpacing.md,
      borderWidth: 1,
      borderColor: isValid ? theme.primary + '40' : theme.error + '40',
    },
    differenceText: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: '600',
      color: isValid ? theme.primary : theme.error,
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
                  <Text style={styles.headerTitle}>
                    {isAllDay ? 'Set Reminder' : 'Custom Reminder'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.doneButton} 
                    onPress={handleConfirm}
                    disabled={!isValid}
                  >
                    <Text style={[
                      styles.doneButtonText,
                      !isValid && { color: theme.text.tertiary }
                    ]}>
                      Done
                    </Text>
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

                  {/* Difference Display */}
                  <View style={styles.differenceContainer}>
                    {isAllDay ? (
                      <>
                        <Text style={styles.differenceText}>
                          Reminder Set
                        </Text>
                        <Text style={styles.subtitle}>
                          {formatSelectedTime()}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.differenceText}>
                          {formatDifference()}
                        </Text>
                        <Text style={styles.subtitle}>
                          {isValid ? formatSelectedTime() : 'Select a time before the event'}
                        </Text>
                      </>
                    )}
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