import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@my-apps/contexts";

/**
 * Selector for list cycling mode.
 * Once: run through list once then show summary.
 * Loop: repeat continuously.
 * Add Missed (default): append wrong answers to end of queue.
 */
const SpellingListModeSelector = ({ mode, onSelect }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      borderRadius: getBorderRadius.full,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
      alignSelf: "center",
    },
    option: {
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
    },
    activeOption: {
      backgroundColor: theme.primary,
    },
    optionText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    activeOptionText: {
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
          style={[styles.option, mode === opt.value && styles.activeOption]}
          onPress={() => onSelect(opt.value)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.optionText,
              mode === opt.value && styles.activeOptionText,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default SpellingListModeSelector;
