import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "@my-apps/contexts";
import { DateTime } from "luxon";
import CalendarPickerContent from "../modals/content/pickers/CalendarPickerContent";
import SpinnerPickerContent from "../modals/content/pickers/SpinnerPickerContent";

const SimpleDateTimeSelector = ({
    label = "Date & Time",
    selectedDate,
    onDateChange,
    hideDate = false, // ✅ Already added
  }) => {
    const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  
    const [expandedPicker, setExpandedPicker] = useState(null);
  
    // Time picker state
    const dt = DateTime.fromJSDate(selectedDate);
    const hour12 = dt.hour === 0 ? 12 : dt.hour > 12 ? dt.hour - 12 : dt.hour;
    const [selectedHour, setSelectedHour] = useState(hour12);
    const [selectedMinute, setSelectedMinute] = useState(dt.minute);
    const [selectedPeriod, setSelectedPeriod] = useState(dt.hour >= 12 ? "PM" : "AM");
  
    // Update parent when time values change
    useEffect(() => {
      if (expandedPicker !== "time") return;
  
      let hour24 = selectedHour;
      if (selectedPeriod === "PM" && selectedHour !== 12) {
        hour24 = selectedHour + 12;
      } else if (selectedPeriod === "AM" && selectedHour === 12) {
        hour24 = 0;
      }
  
      const newTime = DateTime.fromJSDate(selectedDate).set({
        hour: hour24,
        minute: selectedMinute,
      });
  
      onDateChange(newTime.toJSDate());
    }, [selectedHour, selectedMinute, selectedPeriod, expandedPicker]);
  
    const formatDateForDisplay = (date) => {
      if (!date) return "Select date";
      return DateTime.fromJSDate(date).toFormat("MMM d, yyyy");
    };
  
    const formatTimeForDisplay = (date) => {
      if (!date) return "Select time";
      return DateTime.fromJSDate(date).toFormat("h:mm a");
    };
  
    const handlePickerPress = (type) => {
      setExpandedPicker(expandedPicker === type ? null : type);
    };
  
    // Prepare column data for time picker
    const hours = Array.from({ length: 12 }, (_, i) => ({
      label: String(i + 1).padStart(2, "0"),
      value: i + 1,
    }));
  
    const minutes = Array.from({ length: 12 }, (_, i) => {
      const value = i * 5;
      return {
        label: String(value).padStart(2, "0"),
        value: value,
      };
    });
  
    const periods = [
      { label: "AM", value: "AM" },
      { label: "PM", value: "PM" },
    ];
  
    const styles = StyleSheet.create({
      sectionHeader: {
        fontSize: getTypography.body.fontSize,
        fontWeight: "600",
        color: theme.text.primary,
        marginTop: getSpacing.lg,
        marginBottom: getSpacing.sm,
        marginHorizontal: getSpacing.lg,
      },
      formSection: {
        backgroundColor: theme.background,
        marginHorizontal: getSpacing.lg,
        borderRadius: getBorderRadius.md,
        overflow: "hidden",
      },
      formRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: getSpacing.sm,
        paddingVertical: getSpacing.sm,
        gap: getSpacing.xs,
      },
      dateButton: {
        backgroundColor: theme.surface,
        borderRadius: getBorderRadius.sm,
        paddingHorizontal: getSpacing.sm,
        paddingVertical: getSpacing.md,
        borderWidth: 1,
        borderColor: theme.border,
        flex: 1,
        alignItems: "center",
        minWidth: 140,
      },
      dateButtonActive: {
        borderColor: theme.primary,
        borderWidth: 2,
      },
      timeButton: {
        backgroundColor: theme.surface,
        borderRadius: getBorderRadius.sm,
        paddingHorizontal: getSpacing.sm,
        paddingVertical: getSpacing.md,
        borderWidth: 1,
        borderColor: theme.border,
        flex: 1,
        alignItems: "center",
        minWidth: 100,
      },
      timeButtonActive: {
        borderColor: theme.primary,
        borderWidth: 2,
      },
      buttonText: {
        fontSize: getTypography.body.fontSize,
        color: theme.text.primary,
      },
      pickerContainer: {
        overflow: "hidden",
      },
    });
  
    return (
      <>
        <Text style={styles.sectionHeader}>{label}</Text>
        <View style={styles.formSection}>
          {/* Date & Time Row */}
          <View style={styles.formRow}>
            {/* ✅ CONDITIONALLY RENDER DATE BUTTON */}
            {!hideDate && (
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  expandedPicker === "date" && styles.dateButtonActive,
                ]}
                onPress={() => handlePickerPress("date")}
              >
                <Text style={styles.buttonText}>
                  {formatDateForDisplay(selectedDate)}
                </Text>
              </TouchableOpacity>
            )}
  
            <TouchableOpacity
              style={[
                styles.timeButton,
                expandedPicker === "time" && styles.timeButtonActive,
              ]}
              onPress={() => handlePickerPress("time")}
            >
              <Text style={styles.buttonText}>
                {formatTimeForDisplay(selectedDate)}
              </Text>
            </TouchableOpacity>
          </View>
  
          {/* ✅ ONLY SHOW DATE PICKER IF NOT HIDDEN */}
          {!hideDate && expandedPicker === "date" && (
            <View style={styles.pickerContainer}>
              <CalendarPickerContent
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  onDateChange(date);
                  setExpandedPicker(null);
                }}
              />
            </View>
          )}
  
          {/* Inline Time Picker */}
          {expandedPicker === "time" && (
            <View style={styles.pickerContainer}>
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
          )}
        </View>
      </>
    );
  };
  
  export default SimpleDateTimeSelector;