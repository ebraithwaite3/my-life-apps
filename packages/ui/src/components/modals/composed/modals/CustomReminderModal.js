import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ModalHeader } from "../../../headers";
import { PopUpModalWrapper } from "../../base";
import { useTheme } from "@my-apps/contexts";
import { DateTime } from "luxon";
import SpinnerPickerContent from "../../content/pickers/SpinnerPickerContent";

const CustomReminderModal = ({
  visible,
  onClose,
  reminder,
  eventStartDate,
  onConfirm,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  
  // Initialize with current reminder or default to 1 hour before event
  const getInitialTime = () => {
    if (reminder) {
      return DateTime.fromISO(reminder);
    }
    // Default to 1 hour before event
    return DateTime.fromJSDate(eventStartDate).minus({ hours: 1 });
  };

  const [selectedDate, setSelectedDate] = useState(getInitialTime().toJSDate());
  const [selectedHour, setSelectedHour] = useState(() => {
    const time = getInitialTime();
    return time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
  });
  const [selectedMinute, setSelectedMinute] = useState(() => getInitialTime().minute);
  const [selectedPeriod, setSelectedPeriod] = useState(() => getInitialTime().hour >= 12 ? 'PM' : 'AM');

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      const initTime = getInitialTime();
      
      setSelectedDate(initTime.toJSDate());
      setSelectedHour(initTime.hour === 0 ? 12 : initTime.hour > 12 ? initTime.hour - 12 : initTime.hour);
      setSelectedMinute(initTime.minute);
      setSelectedPeriod(initTime.hour >= 12 ? 'PM' : 'AM');
    }
  }, [visible, reminder, eventStartDate]);

  const handleConfirm = () => {
    let hour24 = selectedHour;
    if (selectedPeriod === 'PM' && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedPeriod === 'AM' && selectedHour === 12) {
      hour24 = 0;
    }
    
    const finalTime = DateTime.fromJSDate(selectedDate).set({
      hour: hour24,
      minute: selectedMinute,
    });
    
    console.log('Custom reminder set to:', finalTime.toISO());
    onConfirm(finalTime.toISO());
  };

  // Generate date options with smart range
  const dateOptions = useMemo(() => {
    const eventDt = DateTime.fromJSDate(eventStartDate);
    const now = DateTime.now().startOf('day');
    
    // Start from 2 weeks before event (but not before today)
    const twoWeeksBeforeEvent = eventDt.minus({ weeks: 2 }).startOf('day');
    const startDate = twoWeeksBeforeEvent > now ? twoWeeksBeforeEvent : now;
    
    // End at 7 days after event
    const endDate = eventDt.plus({ days: 7 }).startOf('day');
    
    // Calculate number of days in range
    const daysDiff = Math.ceil(endDate.diff(startDate, 'days').days) + 1;
    
    return Array.from({ length: daysDiff }, (_, i) => {
      const date = startDate.plus({ days: i });
      return {
        label: date.toFormat("MMM d, yyyy"),
        value: date.toFormat("yyyy-MM-dd"),
      };
    });
  }, [eventStartDate]);

  const hours = Array.from({ length: 12 }, (_, i) => ({
    label: String(i + 1).padStart(2, '0'),
    value: i + 1,
  }));

  // Get minutes array, BUT only every 5 minutes for brevity
const minutes = Array.from({ length: 12 }, (_, i) => {
    const value = i * 5;
    return {
      label: String(value).padStart(2, '0'),
      value: value,
    };
  });

  const periods = [
    { label: 'AM', value: 'AM' },
    { label: 'PM', value: 'PM' },
  ];

  const styles = StyleSheet.create({
    container: {
      maxHeight: 450,
    },
    section: {
      marginBottom: getSpacing.md,
    },
    sectionTitle: {
      fontSize: getTypography.caption.fontSize,
      fontWeight: '600',
      color: theme.text.secondary,
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.sm,
      textTransform: 'uppercase',
    },
  });

  return (
    <PopUpModalWrapper visible={visible} onClose={onClose}>
      <ModalHeader
        title="Custom Alert"
        onCancel={onClose}
        cancelText="Cancel"
        onDone={handleConfirm}
        doneText="Done"
      />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <SpinnerPickerContent
            columns={[
              {
                items: dateOptions,
                selectedValue: DateTime.fromJSDate(selectedDate).toFormat("yyyy-MM-dd"),
                onValueChange: (value) => setSelectedDate(DateTime.fromFormat(value, "yyyy-MM-dd").toJSDate()),
                circular: false,
              },
            ]}
            theme={theme}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time</Text>
          <SpinnerPickerContent
            columns={[
              {
                items: hours,
                selectedValue: selectedHour,
                onValueChange: setSelectedHour,
                circular: true,
              },
              {
                items: minutes,
                selectedValue: selectedMinute,
                onValueChange: setSelectedMinute,
                circular: true,
              },
              {
                items: periods,
                selectedValue: selectedPeriod,
                onValueChange: setSelectedPeriod,
                circular: false,
              },
            ]}
            theme={theme}
          />
        </View>
      </ScrollView>
    </PopUpModalWrapper>
  );
};

export default CustomReminderModal;