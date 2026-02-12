import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@my-apps/contexts";
// CORRECT Import for Expo/Managed projects:
import { Ionicons } from "@expo/vector-icons";

/**
 * FilterChips - Toggleable filter chips for calendar views
 * * @param {Array} filters - Array of filter objects
 * [{ label: "Checklists Only", active: false, onPress: () => {} }]
 */
const FilterChips = ({ filters, marginTop = 0, chipMarginBottom = 0 }) => {
  const { theme, getSpacing } = useTheme();

  if (!filters || filters.length === 0) {
    return null; // Don't render anything if no filters
  }

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.sm,
      gap: getSpacing.sm,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginTop: marginTop,
      marginBottom: getSpacing.sm,
    },
    chip: {
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      borderRadius: 16,
      borderWidth: 1,
      // Ensure content is in a row for icon + text
      flexDirection: "row",
      alignItems: "center",
      marginBottom: chipMarginBottom,
    },
    chipInactive: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
    },
    chipActive: {
      backgroundColor: theme.primarySoft,
      borderColor: theme.primary,
    },
    // Style to separate the icon from the text
    iconStyle: {
      marginRight: getSpacing.sm * 0.5,
    },
    labelInactive: {
      fontSize: 14,
      color: theme.text.secondary,
      fontWeight: "500",
    },
    labelActive: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: "600",
    },
  });

  return (
    <View style={styles.container}>
      {filters.map((filter, index) => {
        // Determine the icon and color based on the filter's state
        const iconName = filter.active
          ? "checkmark-circle-sharp" // A strong, checked icon
          : "ellipse-outline"; // An outline circle for unchecked

        const iconColor = filter.active ? theme.primary : theme.text.secondary;

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.chip,
              filter.active ? styles.chipActive : styles.chipInactive,
            ]}
            onPress={filter.onPress}
            {...(filter.onLongPress && { onLongPress: filter.onLongPress })} // ← Only add if exists
            activeOpacity={0.7}
          >
            {/* 1. The Ionicons component for checked/unchecked state */}
            <Ionicons
              name={iconName}
              size={16}
              color={iconColor}
              style={styles.iconStyle}
            />

            {/* 2. The filter label text */}
            <Text
              style={filter.active ? styles.labelActive : styles.labelInactive}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default FilterChips;
