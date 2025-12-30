import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { PopUpModalWrapper } from "../../base";
import ModalHeader from "../../../headers/ModalHeader";
import { useTheme } from "@my-apps/contexts";
import SpinnerPickerContent from "../../content/pickers/SpinnerPickerContent";

const TimePickerModal = ({
  visible,
  onClose,
  initialTime, // "09:00" or null
  onConfirm,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  
  const [selectedHour, setSelectedHour] = useState(() => {
    if (!initialTime) return 9;
    const [hours] = initialTime.split(":");
    const hour24 = parseInt(hours);
    return hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  });
  
  const [selectedMinute, setSelectedMinute] = useState(() => {
    if (!initialTime) return 0;
    const [, minutes] = initialTime.split(":");
    return parseInt(minutes);
  });
  
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    if (!initialTime) return 'AM';
    const [hours] = initialTime.split(":");
    return parseInt(hours) >= 12 ? 'PM' : 'AM';
  });

  useEffect(() => {
    if (visible && initialTime) {
      const [hours, minutes] = initialTime.split(":");
      const hour24 = parseInt(hours);
      setSelectedHour(hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24);
      setSelectedMinute(parseInt(minutes));
      setSelectedPeriod(hour24 >= 12 ? 'PM' : 'AM');
    }
  }, [visible, initialTime]);

  const handleConfirm = () => {
    let hour24 = selectedHour;
    if (selectedPeriod === 'PM' && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedPeriod === 'AM' && selectedHour === 12) {
      hour24 = 0;
    }
    
    const timeString = `${String(hour24).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    console.log('Time selected:', timeString);
    onConfirm(timeString);
    onClose();
  };

  const hours = Array.from({ length: 12 }, (_, i) => ({
    label: String(i + 1).padStart(2, '0'),
    value: i + 1,
  }));

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
      paddingVertical: getSpacing.md,
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
        title="Default Reminder Time"
        onCancel={onClose}
        cancelText="Cancel"
        onDone={handleConfirm}
        doneText="Done"
      />
      <View style={styles.container}>
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
    </PopUpModalWrapper>
  );
};

export default TimePickerModal;