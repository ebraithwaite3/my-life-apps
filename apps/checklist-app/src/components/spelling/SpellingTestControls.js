import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@my-apps/contexts";

/**
 * Right / Wrong / Skip action buttons.
 * Skip is only rendered when mode === "parent".
 *
 * Props:
 *   mode    {"solo"|"parent"} - Current spelling mode
 *   onRight {function}
 *   onWrong {function}
 *   onSkip  {function}
 */
const SpellingTestControls = ({ mode, onRight, onWrong, onSkip }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const styles = StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "center",
      gap: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
    },
    button: {
      flex: 1,
      paddingVertical: getSpacing.md,
      borderRadius: getBorderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    rightButton: {
      backgroundColor: theme.success,
    },
    wrongButton: {
      backgroundColor: theme.error,
    },
    skipButton: {
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    buttonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    skipText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: theme.text.secondary,
    },
  });

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.button, styles.wrongButton]}
        onPress={onWrong}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>✗ Wrong</Text>
      </TouchableOpacity>

      {mode === "parent" && (
        <TouchableOpacity
          style={[styles.button, styles.skipButton]}
          onPress={onSkip}
          activeOpacity={0.8}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, styles.rightButton]}
        onPress={onRight}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>✓ Right</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SpellingTestControls;
