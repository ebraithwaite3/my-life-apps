import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "@my-apps/contexts";

const ReminderSelector = ({
  label = "Reminder",
  reminderMinutes,
  onPress,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const getReminderLabel = (minutes) => {
    if (minutes === null) return "No Alert";
    if (minutes === 0) return "At time of event";

    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
    if (mins > 0) parts.push(`${mins} minute${mins > 1 ? "s" : ""}`);

    return parts.join(" ") + " before";
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
      borderBottomWidth: 0,
    },
    formLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      minWidth: 80,
    },
    reminderButton: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.sm,
      paddingHorizontal: getSpacing.sm,
      paddingVertical: getSpacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      flex: 1,
      alignItems: "center",
      marginLeft: getSpacing.sm,
    },
    reminderButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
  });

  return (
    <>
      <Text style={styles.sectionHeader}>{label}</Text>
      <View style={styles.formSection}>
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Remind me</Text>
          <TouchableOpacity style={styles.reminderButton} onPress={onPress}>
            <Text style={styles.reminderButtonText}>
              {getReminderLabel(reminderMinutes)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default ReminderSelector;