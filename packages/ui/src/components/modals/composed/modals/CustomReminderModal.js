import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { ModalHeader } from "../../../headers";
import { ModalWrapper } from "../../base";
import { useTheme, useData } from "@my-apps/contexts";
import { DateTime } from "luxon";
import SimpleDateTimeSelector from "../../../forms/SimpleDateTimeSelector";

const CustomReminderModal = ({
  visible,
  onClose,
  reminder,
  eventStartDate,
  onConfirm,
  hideDate = false,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { isUserAdmin } = useData();
  
  // ✅ FIX 1: Round to 5-minute intervals and zero seconds/milliseconds
  const getInitialTime = () => {
    if (reminder?.scheduledFor) {
      // Editing existing reminder - use its time
      return DateTime.fromISO(reminder.scheduledFor);
    }
    
    // Creating new reminder - round to next 5 minutes
    const baseTime = eventStartDate 
      ? DateTime.fromJSDate(eventStartDate).minus({ hours: 1 }) 
      : DateTime.now();
    
    const currentMinutes = baseTime.minute;
    const roundedMinutes = Math.ceil(currentMinutes / 5) * 5;
    
    return baseTime.set({
      minute: roundedMinutes,
      second: 0,
      millisecond: 0
    });
  };

  const [selectedDateTime, setSelectedDateTime] = useState(getInitialTime().toJSDate());
  const [isRecurring, setIsRecurring] = useState(reminder?.isRecurring || false);
  const [intervalSeconds, setIntervalSeconds] = useState(reminder?.recurringConfig?.intervalSeconds || 3600);
  
  const [intervalValue, setIntervalValue] = useState("1");
  const [intervalUnit, setIntervalUnit] = useState(3600);

  const [isUnlimited, setIsUnlimited] = useState(reminder?.recurringConfig?.totalOccurrences === null);
  const [occurrenceCount, setOccurrenceCount] = useState(String(reminder?.recurringConfig?.totalOccurrences || 5));
  const [cancelOnCompletion, setCancelOnCompletion] = useState(reminder?.recurringConfig?.completedCancelsRecurring ?? true);

  const units = [
    { label: 'min', value: 60 },
    { label: 'hrs', value: 3600 },
    { label: 'days', value: 86400 },
    { label: 'wks', value: 604800 },
  ];

  useEffect(() => {
    if (visible) {
      const totalSecs = reminder?.recurringConfig?.intervalSeconds || 3600;
      const unit = units.slice().reverse().find(u => totalSecs % u.value === 0) || units[0];
      setIntervalValue(String(totalSecs / unit.value));
      setIntervalUnit(unit.value);
      
      setIsRecurring(reminder?.isRecurring || false);
      setIsUnlimited(reminder?.recurringConfig?.totalOccurrences === null);
      setOccurrenceCount(String(reminder?.recurringConfig?.totalOccurrences || 5));
      setCancelOnCompletion(reminder?.recurringConfig?.completedCancelsRecurring ?? true);
      
      // ✅ Reset selected time when modal opens
      setSelectedDateTime(getInitialTime().toJSDate());
    }
  }, [visible]);

  useEffect(() => {
    const numericValue = parseInt(intervalValue, 10) || 1;
    setIntervalSeconds(numericValue * intervalUnit);
  }, [intervalValue, intervalUnit]);

  // UI Helper: Adjusts numeric values via +/- buttons
  const adjustNumericValue = (current, setter, delta) => {
    const newVal = Math.max(1, (parseInt(current, 10) || 0) + delta);
    setter(String(newVal));
  };

  // ✅ FIX 2: Zero out seconds and milliseconds when saving
  const handleConfirm = () => {
    const finalTime = DateTime.fromJSDate(selectedDateTime).set({
      second: 0,
      millisecond: 0
    });
    
    const result = {
      scheduledFor: finalTime.toISO(),
      isRecurring: isUserAdmin ? isRecurring : false,
    };

    if (isUserAdmin && isRecurring) {
      result.recurringConfig = {
        intervalSeconds,
        totalOccurrences: isUnlimited ? null : parseInt(occurrenceCount, 10),
        currentOccurrence: 1,
        completedCancelsRecurring: cancelOnCompletion,
        nextScheduledFor: finalTime.toISO(),
        lastSentAt: null,
      };
    }
    onConfirm(result);
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: getBorderRadius.lg,
      borderTopRightRadius: getBorderRadius.lg,
      width: "100%",
      height: "90%",
    },
    content: { flex: 1 },
    scrollContainer: {
      flexGrow: 1,
      paddingBottom: getSpacing.xl * 2,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text.secondary,
      paddingHorizontal: getSpacing.lg,
      paddingTop: getSpacing.xl,
      paddingBottom: getSpacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    formSection: {
      backgroundColor: theme.background,
      marginHorizontal: getSpacing.lg,
      borderRadius: getBorderRadius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
    },
    formRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: getSpacing.md,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    stepperRow: {
      paddingHorizontal: getSpacing.md,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    stepperHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    stepperControls: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.border,
    },
    stepperBtn: {
      width: 32,
      height: 32,
      borderRadius: 6,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperBtnText: {
      fontSize: 18,
      color: theme.primary,
      fontWeight: '600',
    },
    formLabel: {
      fontSize: 16,
      color: theme.text.primary,
      fontWeight: '600',
    },
    formLabelSubtext: {
      fontSize: 13,
      color: theme.text.secondary,
      marginTop: 2,
    },
    pillContainer: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      padding: 3,
      borderWidth: 1,
      borderColor: theme.border,
    },
    pillTab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: getBorderRadius.md - 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillTabActive: {
      backgroundColor: theme.primary + "30", // This is the smidge brighter blue tint you wanted
    },
    pillTabText: {
      fontSize: 11,
      color: theme.text.secondary,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    pillTabTextActive: {
      color: theme.primary,
    },
    numericInput: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text.primary,
      width: 45,
      textAlign: 'center',
    },
  });

  const renderStepper = (value, setter) => (
    <View style={styles.stepperControls}>
      <TouchableOpacity 
        style={styles.stepperBtn} 
        onPress={() => adjustNumericValue(value, setter, -1)}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.numericInput}
        value={value}
        onChangeText={setter}
        keyboardType="number-pad"
        maxLength={3}
        selectTextOnFocus
      />
      <TouchableOpacity 
        style={styles.stepperBtn} 
        onPress={() => adjustNumericValue(value, setter, 1)}
      >
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ModalWrapper visible={visible} onClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ModalHeader
            title="Custom Alert"
            onCancel={onClose}
            onDone={handleConfirm}
          />

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContainer}>
            <SimpleDateTimeSelector
              label="Alert Time"
              selectedDate={selectedDateTime}
              onDateChange={setSelectedDateTime}
              hideDate={hideDate}
            />

            {isUserAdmin && (
              <>
                <Text style={styles.sectionTitle}>Recurring Options</Text>
                <View style={styles.formSection}>
                  
                  <View style={styles.formRow}>
                    <Text style={styles.formLabel}>Recurring Reminder</Text>
                    <Switch
                      value={isRecurring}
                      onValueChange={setIsRecurring}
                      trackColor={{ false: theme.border, true: theme.primary + "40" }}
                      thumbColor={isRecurring ? theme.primary : "#f4f3f4"}
                    />
                  </View>

                  {isRecurring && (
                    <>
                      <View style={styles.stepperRow}>
                        <View style={styles.stepperHeader}>
                          <Text style={styles.formLabel}>Repeat Every</Text>
                          {renderStepper(intervalValue, setIntervalValue)}
                        </View>
                        
                        <View style={styles.pillContainer}>
                          {units.map((u) => (
                            <TouchableOpacity
                              key={u.label}
                              style={[styles.pillTab, intervalUnit === u.value && styles.pillTabActive]}
                              onPress={() => setIntervalUnit(u.value)}
                            >
                              <Text style={[styles.pillTabText, intervalUnit === u.value && styles.pillTabTextActive]}>
                                {u.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.stepperRow}>
                        <View style={styles.stepperHeader}>
                           <View>
                                <Text style={styles.formLabel}>Occurrences</Text>
                                <Text style={styles.formLabelSubtext}>
                                    {isUnlimited ? 'Runs indefinitely' : `Ends after ${occurrenceCount} times`}
                                </Text>
                           </View>
                           {!isUnlimited && renderStepper(occurrenceCount, setOccurrenceCount)}
                        </View>
                        
                        <View style={styles.pillContainer}>
                          <TouchableOpacity
                            style={[styles.pillTab, !isUnlimited && styles.pillTabActive]}
                            onPress={() => setIsUnlimited(false)}
                          >
                            <Text style={[styles.pillTabText, !isUnlimited && styles.pillTabTextActive]}>Limit Count</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.pillTab, isUnlimited && styles.pillTabActive]}
                            onPress={() => setIsUnlimited(true)}
                          >
                            <Text style={[styles.pillTabText, isUnlimited && styles.pillTabTextActive, { fontSize: 18, lineHeight: 18 }]}>∞</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={[styles.formRow, { borderBottomWidth: 0 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.formLabel}>Cancel on Completion</Text>
                          <Text style={styles.formLabelSubtext}>Stop when checklist is done</Text>
                        </View>
                        <Switch
                          value={cancelOnCompletion}
                          onValueChange={setCancelOnCompletion}
                          trackColor={{ false: theme.border, true: theme.primary + "40" }}
                          thumbColor={cancelOnCompletion ? theme.primary : "#f4f3f4"}
                        />
                      </View>
                    </>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ModalWrapper>
  );
};

export default CustomReminderModal;