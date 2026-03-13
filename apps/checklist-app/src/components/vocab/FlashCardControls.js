import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";

/**
 * Back / Flip / Forward navigation buttons for flash cards.
 *
 * Props:
 *   onBack       {function}
 *   onForward    {function}
 *   onFlip       {function}
 *   canGoBack    {boolean}
 *   canGoForward {boolean}
 */
const FlashCardControls = ({ onBack, onForward, onFlip, canGoBack, canGoForward }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      gap: getSpacing.sm,
    },
    navButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: getSpacing.xs,
      paddingVertical: getSpacing.md,
      borderRadius: getBorderRadius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    navButtonDisabled: {
      opacity: 0.35,
    },
    flipButton: {
      flex: 1.5,
      paddingVertical: getSpacing.md,
      borderRadius: getBorderRadius.lg,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    navButtonText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    flipButtonText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "700",
      color: "#FFFFFF",
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
        onPress={onBack}
        disabled={!canGoBack}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={16} color={theme.text.secondary} />
        <Text style={styles.navButtonText}>Back</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.flipButton}
        onPress={onFlip}
        activeOpacity={0.8}
      >
        <Text style={styles.flipButtonText}>Flip</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
        onPress={onForward}
        disabled={!canGoForward}
        activeOpacity={0.7}
      >
        <Text style={styles.navButtonText}>Next</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.text.secondary} />
      </TouchableOpacity>
    </View>
  );
};

export default FlashCardControls;
