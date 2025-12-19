import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";

/**
 * SelectorRow - Fully customizable selector component
 * Can display: color dots, icons, text values, with optional chevron
 * 
 * Usage examples:
 * - Calendar selection (color dot + name)
 * - Reminder selection (text only)
 * - Any other picker-style selection
 */
const SelectorRow = ({
  // Header
  label = "Select",           // Section header text
  
  // Row content
  rowLabel = null,            // Optional label inside row (left side)
  value = null,               // Main value text (center/right)
  placeholder = "Select...",  // Shown when no value
  
  // Left decorations (mutually exclusive)
  colorDot = null,            // Color string for dot (e.g., "#3B82F6")
  icon = null,                // Icon name for Ionicons (e.g., "time-outline")
  iconColor = null,           // Color for icon (defaults to theme.primary)
  iconSize = 20,              // Size for icon
  
  // Behavior
  onPress,                    // Function to call on press
  disabled = false,           // Disable interaction
  showChevron = true,         // Show chevron (usually true unless disabled)
  
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const isPlaceholder = !value || value === placeholder;
  const showChevronFinal = showChevron && !disabled;

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
    rowLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      minWidth: 80,
    },
    contentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flex: 1,
    },
    leftContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    colorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: getSpacing.sm,
    },
    iconContainer: {
      marginRight: getSpacing.sm,
    },
    valueText: {
      fontSize: getTypography.body.fontSize,
      color: isPlaceholder ? theme.text.tertiary : theme.text.primary,
      flex: 1,
    },
  });

  return (
    <>
      <Text style={styles.sectionHeader}>{label}</Text>
      <View style={styles.formSection}>
        <TouchableOpacity
          style={styles.formRow}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={disabled ? 1 : 0.7}
        >
          {/* Optional row label (left side) */}
          {rowLabel && <Text style={styles.rowLabel}>{rowLabel}</Text>}

          {/* Main content */}
          <View style={styles.contentRow}>
            <View style={styles.leftContent}>
              {/* Color dot (if provided) */}
              {colorDot && (
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: colorDot },
                  ]}
                />
              )}

              {/* Icon (if provided) */}
              {icon && (
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={icon}
                    size={iconSize}
                    color={iconColor || theme.primary}
                  />
                </View>
              )}

              {/* Value text */}
              <Text style={styles.valueText} numberOfLines={1}>
                {value || placeholder}
              </Text>
            </View>

            {/* Chevron */}
            {showChevronFinal && (
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

export default SelectorRow;