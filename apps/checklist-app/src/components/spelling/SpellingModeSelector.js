import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@my-apps/contexts";

/**
 * Toggle between Solo and Parent spelling modes.
 * Solo (default): word is hidden, no Skip button.
 * Parent: word always visible, Skip button available.
 */
const SpellingModeSelector = ({ mode, onSelect }) => {
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
      paddingHorizontal: getSpacing.md,
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
    { label: "Solo", value: "solo" },
    { label: "Parent", value: "parent" },
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

export default SpellingModeSelector;
