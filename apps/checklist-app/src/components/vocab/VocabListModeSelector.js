import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@my-apps/contexts";

/**
 * Three-way selector for list cycling modes.
 *
 * Props:
 *   mode     {string}   - "once" | "loop" | "add-missed"
 *   onSelect {function} - Called with the new mode value
 */
const VocabListModeSelector = ({ mode, onSelect }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      borderRadius: getBorderRadius.full,
      borderWidth: 1.5,
      borderColor: theme.border,
      overflow: "hidden",
    },
    button: {
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    activeButton: {
      backgroundColor: theme.primary,
    },
    buttonText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    activeText: {
      color: "#FFFFFF",
    },
  });

  const options = [
    { label: "Once", value: "once" },
    { label: "Loop", value: "loop" },
    { label: "Add Missed", value: "add-missed" },
  ];

  return (
    <View style={styles.container}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.button, mode === opt.value && styles.activeButton]}
          onPress={() => onSelect(opt.value)}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.buttonText, mode === opt.value && styles.activeText]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default VocabListModeSelector;
