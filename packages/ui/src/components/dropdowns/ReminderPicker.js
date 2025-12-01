import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useTheme } from '@my-apps/contexts';
import CustomTimePicker from './CustomTimePicker';

const STANDARD_OPTIONS = [
  { label: "No Alert", value: null, minutes: null },
  { label: "At time of event", value: 0, minutes: 0 },
  { label: "15 minutes before", value: 15, minutes: 15 },
  { label: "30 minutes before", value: 30, minutes: 30 },
  { label: "1 hour before", value: 60, minutes: 60 },
];

const formatDuration = (totalMinutes) => {
  if (totalMinutes === null || totalMinutes === 0) return null;
  
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  
  return parts.join(' ') + ' before';
};

const ReminderPicker = ({ visible, selectedMinutes, onSelect, onClose, eventStartTime }) => {
  const { theme, getSpacing, getBorderRadius, getTypography } = useTheme();
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const handleStandardSelect = (option) => {
    onSelect(option.value);
    onClose();
  };

  const handleCustomSelect = () => {
    setShowCustomPicker(true);
  };

  const handleCustomConfirm = (minutes) => {
    onSelect(minutes);
    setShowCustomPicker(false);
    onClose();
  };

  const getSelectedLabel = () => {
    if (selectedMinutes === null) return "No Alert";
    
    const standardOption = STANDARD_OPTIONS.find(opt => opt.value === selectedMinutes);
    if (standardOption) {
      return standardOption.label;
    }
    
    // Custom duration
    return formatDuration(selectedMinutes);
  };

  // Check if current selection is custom
  const isCustomSelected = selectedMinutes !== null && 
    !STANDARD_OPTIONS.some(opt => opt.value === selectedMinutes);

  const styles = StyleSheet.create({
    overlay: {
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
      maxHeight: '60%',
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
    option: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    optionText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    selectedOption: {
      backgroundColor: theme.primary + '20',
    },
    selectedOptionText: {
      color: theme.primary,
      fontWeight: '600',
    },
    customOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    customLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    customValue: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: 4,
    },
  });

  if (!visible) return null;

  return (
    <>
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible && !showCustomPicker}
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.container}>
                <View style={styles.header}>
                  <View style={{ width: 60 }} />
                  <Text style={styles.headerTitle}>Reminder</Text>
                  <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView>
                  {STANDARD_OPTIONS.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.option,
                        selectedMinutes === option.value && styles.selectedOption,
                      ]}
                      onPress={() => handleStandardSelect(option)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedMinutes === option.value && styles.selectedOptionText,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  
                  {/* Custom Option */}
                  <TouchableOpacity
                    style={[
                      styles.option,
                      isCustomSelected && styles.selectedOption,
                      { borderBottomWidth: 0 }
                    ]}
                    onPress={handleCustomSelect}
                  >
                    <View style={styles.customOption}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.customLabel,
                            isCustomSelected && styles.selectedOptionText,
                          ]}
                        >
                          Custom
                        </Text>
                        {isCustomSelected && (
                          <Text style={styles.customValue}>
                            {formatDuration(selectedMinutes)}
                          </Text>
                        )}
                      </View>
                      <Text style={{ color: theme.text.secondary }}>›</Text>
                    </View>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Custom Time Picker Modal */}
      <CustomTimePicker
        visible={showCustomPicker}
        eventStartTime={eventStartTime}
        onConfirm={handleCustomConfirm}
        onClose={() => setShowCustomPicker(false)}
      />
    </>
  );
};

export default ReminderPicker;