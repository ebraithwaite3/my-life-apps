import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@my-apps/contexts";

/**
 * Shuffle and Reverse toggle options for flash cards.
 *
 * Props:
 *   shuffleOn       {boolean}
 *   reverseOn       {boolean}
 *   onShuffleToggle {function}
 *   onReverseToggle {function}
 */
const FlashCardOptions = ({ shuffleOn, reverseOn, onShuffleToggle, onReverseToggle }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      gap: getSpacing.sm,
      marginBottom: getSpacing.md,
    },
    toggleButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.full,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    toggleButtonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + "15",
    },
    toggleText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    toggleTextActive: {
      color: theme.primary,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.border,
    },
    dotActive: {
      backgroundColor: theme.primary,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.toggleButton, shuffleOn && styles.toggleButtonActive]}
        onPress={onShuffleToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.dot, shuffleOn && styles.dotActive]} />
        <Text style={[styles.toggleText, shuffleOn && styles.toggleTextActive]}>
          Shuffle
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.toggleButton, reverseOn && styles.toggleButtonActive]}
        onPress={onReverseToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.dot, reverseOn && styles.dotActive]} />
        <Text style={[styles.toggleText, reverseOn && styles.toggleTextActive]}>
          Reverse
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default FlashCardOptions;
