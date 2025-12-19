import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { useTheme } from "@my-apps/contexts";
import { DateTime } from "luxon";
import CalendarPickerContent from "../modals/content/pickers/CalendarPickerContent";
import SpinnerPickerContent from "../modals/content/pickers/SpinnerPickerContent";

const DateTimeSelector = ({
  label = "Schedule",
  isAllDay = false,
  onAllDayChange,
  startDate,
  endDate,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
  defaultDuration = 60, // minutes - auto-update end time when start changes
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const [expandedPicker, setExpandedPicker] = useState(null);
  // Values: null | 'startDate' | 'startTime' | 'endDate' | 'endTime'

  // Track if user has manually edited end time (disables auto-duration)
  const [endTimeManuallyEdited, setEndTimeManuallyEdited] = useState(false);
  const isInitialMount = useRef(true);

  // Time picker state for start time
  const startDt = DateTime.fromJSDate(startDate);
  const startHour12 =
    startDt.hour === 0
      ? 12
      : startDt.hour > 12
      ? startDt.hour - 12
      : startDt.hour;
  const [selectedStartHour, setSelectedStartHour] = useState(startHour12);
  const [selectedStartMinute, setSelectedStartMinute] = useState(
    startDt.minute
  );
  const [selectedStartPeriod, setSelectedStartPeriod] = useState(
    startDt.hour >= 12 ? "PM" : "AM"
  );

  // Time picker state for end time
  const endDt = DateTime.fromJSDate(endDate);
  const endHour12 =
    endDt.hour === 0 ? 12 : endDt.hour > 12 ? endDt.hour - 12 : endDt.hour;
  const [selectedEndHour, setSelectedEndHour] = useState(endHour12);
  const [selectedEndMinute, setSelectedEndMinute] = useState(endDt.minute);
  const [selectedEndPeriod, setSelectedEndPeriod] = useState(
    endDt.hour >= 12 ? "PM" : "AM"
  );

  // Auto-update end time when start time changes (only if not manually edited)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!endTimeManuallyEdited && expandedPicker === "startTime") {
      const newEndTime = DateTime.fromJSDate(startDate).plus({
        minutes: defaultDuration,
      });
      onEndTimeChange(newEndTime.toJSDate());

      // Update end time picker state
      const endHour12 =
        newEndTime.hour === 0
          ? 12
          : newEndTime.hour > 12
          ? newEndTime.hour - 12
          : newEndTime.hour;
      setSelectedEndHour(endHour12);
      setSelectedEndMinute(newEndTime.minute);
      setSelectedEndPeriod(newEndTime.hour >= 12 ? "PM" : "AM");
    }
  }, [startDate, endTimeManuallyEdited, defaultDuration, expandedPicker]);

  // Update parent when start time values change
  useEffect(() => {
    if (expandedPicker !== "startTime") return;

    let hour24 = selectedStartHour;
    if (selectedStartPeriod === "PM" && selectedStartHour !== 12) {
      hour24 = selectedStartHour + 12;
    } else if (selectedStartPeriod === "AM" && selectedStartHour === 12) {
      hour24 = 0;
    }

    const newTime = DateTime.fromJSDate(startDate).set({
      hour: hour24,
      minute: selectedStartMinute,
    });

    onStartTimeChange(newTime.toJSDate());
  }, [
    selectedStartHour,
    selectedStartMinute,
    selectedStartPeriod,
    expandedPicker,
  ]);

  // Update parent when end time values change
  useEffect(() => {
    if (expandedPicker !== "endTime") return;

    let hour24 = selectedEndHour;
    if (selectedEndPeriod === "PM" && selectedEndHour !== 12) {
      hour24 = selectedEndHour + 12;
    } else if (selectedEndPeriod === "AM" && selectedEndHour === 12) {
      hour24 = 0;
    }

    const newTime = DateTime.fromJSDate(endDate).set({
      hour: hour24,
      minute: selectedEndMinute,
    });

    onEndTimeChange(newTime.toJSDate());
  }, [selectedEndHour, selectedEndMinute, selectedEndPeriod, expandedPicker]);

  const formatDateForDisplay = (date) => {
    if (!date) return "Select date";
    return DateTime.fromJSDate(date).toFormat("MMM d, yyyy");
  };

  const formatTimeForDisplay = (date) => {
    if (!date) return "Select time";
    return DateTime.fromJSDate(date).toFormat("h:mm a");
  };

  const handleDatePress = (type) => {
    const newExpandedState = expandedPicker === type ? null : type;

    // Mark end time as manually edited when user opens end time picker
    if (type === "endTime" && newExpandedState === "endTime") {
      setEndTimeManuallyEdited(true);
    }

    setExpandedPicker(newExpandedState);
  };

  // Prepare column data for time pickers
  const hours = Array.from({ length: 12 }, (_, i) => ({
    label: String(i + 1).padStart(2, "0"),
    value: i + 1,
  }));

  // Get minutes array, BUT only every 5 minutes for brevity
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
      justifyContent: "space-between",
      paddingHorizontal: getSpacing.sm,
      paddingVertical: getSpacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    lastFormRow: {
      borderBottomWidth: 0,
    },
    formLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      minWidth: 80,
    },
    timeInputs: {
      flexDirection: "row",
      flex: 1,
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
    timeButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    pickerContainer: {
      // Stable container to prevent layout jumping
      overflow: "hidden",
    },
  });

  return (
    <>
      <Text style={styles.sectionHeader}>{label}</Text>
      <View style={styles.formSection}>
        {/* All Day Toggle */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>All-day</Text>
          <Switch
            value={isAllDay}
            onValueChange={onAllDayChange}
            trackColor={{
              false: theme.border,
              true: theme.primary + "50",
            }}
            thumbColor={isAllDay ? theme.primary : theme.text.secondary}
          />
        </View>

        {/* Start Time */}
        <View style={[styles.formRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.formLabel}>Starts</Text>
          <View style={styles.timeInputs}>
            <TouchableOpacity
              style={[
                styles.dateButton,
                expandedPicker === "startDate" && styles.dateButtonActive,
              ]}
              onPress={() => handleDatePress("startDate")}
            >
              <Text style={styles.timeButtonText}>
                {formatDateForDisplay(startDate)}
              </Text>
            </TouchableOpacity>
            {!isAllDay && (
              <TouchableOpacity
                style={[
                  styles.timeButton,
                  expandedPicker === "startTime" && styles.timeButtonActive,
                ]}
                onPress={() => handleDatePress("startTime")}
              >
                <Text style={styles.timeButtonText}>
                  {formatTimeForDisplay(startDate)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Inline Start Date Picker */}
        {expandedPicker === "startDate" && (
          <View style={styles.pickerContainer}>
            <CalendarPickerContent
              selectedDate={startDate}
              onSelectDate={(date) => {
                onStartDateChange(date);
                setExpandedPicker(null);
              }}
            />
          </View>
        )}

        {/* Inline Start Time Picker */}
        {expandedPicker === "startTime" && !isAllDay && (
          <View style={styles.pickerContainer}>
            <SpinnerPickerContent
              columns={[
                {
                  items: hours,
                  selectedValue: selectedStartHour,
                  onValueChange: setSelectedStartHour,
                  circular: true,
                },
                {
                  items: minutes,
                  selectedValue: selectedStartMinute,
                  onValueChange: setSelectedStartMinute,
                  circular: true,
                },
                {
                  items: periods,
                  selectedValue: selectedStartPeriod,
                  onValueChange: setSelectedStartPeriod,
                  circular: false,
                },
              ]}
              theme={theme}
            />
          </View>
        )}

        {/* End Time */}
        <View
          style={[
            styles.formRow,
            {
              borderBottomWidth: 0,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.border,
            },
          ]}
        >
          <Text style={styles.formLabel}>Ends</Text>
          <View style={styles.timeInputs}>
            <TouchableOpacity
              style={[
                styles.dateButton,
                expandedPicker === "endDate" && styles.dateButtonActive,
              ]}
              onPress={() => handleDatePress("endDate")}
            >
              <Text style={styles.timeButtonText}>
                {formatDateForDisplay(endDate)}
              </Text>
            </TouchableOpacity>
            {!isAllDay && (
              <TouchableOpacity
                style={[
                  styles.timeButton,
                  expandedPicker === "endTime" && styles.timeButtonActive,
                ]}
                onPress={() => handleDatePress("endTime")}
              >
                <Text style={styles.timeButtonText}>
                  {formatTimeForDisplay(endDate)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Inline End Date Picker */}
        {expandedPicker === "endDate" && (
          <View style={styles.pickerContainer}>
            <CalendarPickerContent
              selectedDate={endDate}
              onSelectDate={(date) => {
                onEndDateChange(date);
                setExpandedPicker(null);
              }}
              disablePreviousDates={true}
            />
          </View>
        )}

        {/* Inline End Time Picker */}
        {expandedPicker === "endTime" && !isAllDay && (
          <View style={styles.pickerContainer}>
            <SpinnerPickerContent
              columns={[
                {
                  items: hours,
                  selectedValue: selectedEndHour,
                  onValueChange: setSelectedEndHour,
                  circular: true,
                },
                {
                  items: minutes,
                  selectedValue: selectedEndMinute,
                  onValueChange: setSelectedEndMinute,
                  circular: true,
                },
                {
                  items: periods,
                  selectedValue: selectedEndPeriod,
                  onValueChange: setSelectedEndPeriod,
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

export default DateTimeSelector;
