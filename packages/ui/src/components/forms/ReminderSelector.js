import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "@my-apps/contexts";
import { DateTime } from "luxon";

const ReminderSelector = ({
  label = "Reminder",
  reminderMinutes,
  reminderTime, // NEW: for absolute time reminders (pinned checklists)
  onPress,
  isAllDay = false,
  eventStartTime,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  // Standard reminder options (these will show as "X before")
  const STANDARD_OPTIONS = [null, 0, 15, 30, 60];

  const getReminderLabel = (minutes) => {
    // NEW: If we have reminderTime instead of reminderMinutes, show the absolute time
    if (reminderTime && !minutes) {
      const dt = DateTime.fromISO(reminderTime);
      return dt.toFormat("EEE, MMM d 'at' h:mm a");
    }

    if (minutes === null) return "No Alert";

    console.log('getReminderLabel:', { 
      minutes, 
      eventStartTime, 
      isValid: eventStartTime instanceof Date,
      isStandard: STANDARD_OPTIONS.includes(minutes)
    });
    
    
    // For standard options, always show "X before" format
    if (STANDARD_OPTIONS.includes(minutes)) {
      if (minutes === 0) return "At time of event";
      
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      const mins = minutes % 60;

      const parts = [];
      if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
      if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
      if (mins > 0) parts.push(`${mins} minute${mins > 1 ? "s" : ""}`);

      return parts.join(" ") + " before";
    }

    // For ALL custom reminders (any event type), show the actual time
    if (eventStartTime) {
      const eventDt = DateTime.fromJSDate(new Date(eventStartTime));
      const reminderDt = eventDt.minus({ minutes });
      return reminderDt.toFormat("EEE, MMM d 'at' h:mm a");
    }

    // Fallback (shouldn't happen if eventStartTime is provided)
    return "Custom reminder";
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
      marginRight: getSpacing.sm,
      minWidth: 0,     // allow shrinking instead of forcing 80
    },
    reminderButton: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.sm,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      flex: 1,               // takes all remaining space
      alignItems: "center",  // centers text
      marginLeft: getSpacing.sm,
    },    
    reminderButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      flexShrink: 1,  // allow text to shrink if needed
    },
  });

  return (
    <>
      <Text style={styles.sectionHeader}>{label}</Text>
      <View style={styles.formSection}>
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Remind</Text>
          <TouchableOpacity style={styles.reminderButton} onPress={onPress}>
            <Text style={styles.reminderButtonText} numberOfLines={1} ellipsizeMode="tail">
              {getReminderLabel(reminderMinutes)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default ReminderSelector;