import React, { useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";

const CalendarSelector = ({
  label = "Calendar",
  selectedCalendar,
  availableCalendars = [],
  isEditing = false,
  onPress,
  disabled = false,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const buttonRef = useRef(null);

  const handlePress = () => {
    if (disabled || isEditing) return;
    
    if (onPress && buttonRef.current) {
      buttonRef.current.measureInWindow((x, y, width, height) => {
        onPress({ x, y, width, height });
      });
    }
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
    calendarRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flex: 1,
    },
    calendarInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    calendarDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: getSpacing.sm,
    },
    calendarName: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
  });

  const showChevron = !isEditing && availableCalendars.length > 1 && !disabled;

  return (
    <>
      <Text style={styles.sectionHeader}>{label}</Text>
      <View style={styles.formSection}>
        <TouchableOpacity
          ref={buttonRef}
          style={styles.formRow}
          onPress={handlePress}
          disabled={isEditing || disabled}
          activeOpacity={isEditing || disabled ? 1 : 0.7}
        >
          <Text style={styles.formLabel}>{label}</Text>
          <View style={styles.calendarRow}>
            <View style={styles.calendarInfo}>
              <View
                style={[
                  styles.calendarDot,
                  {
                    backgroundColor: selectedCalendar?.color || theme.primary,
                  },
                ]}
              />
              <Text style={styles.calendarName}>
                {selectedCalendar?.name || "Select calendar"}
              </Text>
            </View>
            {showChevron && (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.text.secondary}
              />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default CalendarSelector;