import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { useTheme } from "@my-apps/contexts";
import { DateTime } from "luxon";

const DateTimeSelector = ({
  label = "Schedule",
  isAllDay = false,
  onAllDayChange,
  startDate,
  endDate,
  onStartDatePress,
  onStartTimePress,
  onEndDatePress,
  onEndTimePress,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const formatDateForDisplay = (date) => {
    if (!date) return "Select date";
    return DateTime.fromJSDate(date).toFormat("MMM d, yyyy");
  };

  const formatTimeForDisplay = (date) => {
    if (!date) return "Select time";
    return DateTime.fromJSDate(date).toFormat("h:mm a");
  };

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
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.lg,
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
    timeButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
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
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Starts</Text>
          <View style={styles.timeInputs}>
            <TouchableOpacity style={styles.dateButton} onPress={onStartDatePress}>
              <Text style={styles.timeButtonText}>
                {formatDateForDisplay(startDate)}
              </Text>
            </TouchableOpacity>
            {!isAllDay && (
              <TouchableOpacity style={styles.timeButton} onPress={onStartTimePress}>
                <Text style={styles.timeButtonText}>
                  {formatTimeForDisplay(startDate)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* End Time */}
        <View style={[styles.formRow, styles.lastFormRow]}>
          <Text style={styles.formLabel}>Ends</Text>
          <View style={styles.timeInputs}>
            <TouchableOpacity style={styles.dateButton} onPress={onEndDatePress}>
              <Text style={styles.timeButtonText}>
                {formatDateForDisplay(endDate)}
              </Text>
            </TouchableOpacity>
            {!isAllDay && (
              <TouchableOpacity style={styles.timeButton} onPress={onEndTimePress}>
                <Text style={styles.timeButtonText}>
                  {formatTimeForDisplay(endDate)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </>
  );
};

export default DateTimeSelector;