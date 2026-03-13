import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "@my-apps/contexts";

/**
 * Always-visible definition display for the quiz tab.
 * Shows "Definition:" label above the definition text.
 * Scrollable for long definitions.
 *
 * Props:
 *   definition {string} - The definition to display
 */
const VocabDefinitionDisplay = ({ definition }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: getBorderRadius.lg,
      padding: getSpacing.md,
      marginBottom: getSpacing.lg,
      backgroundColor: theme.surface,
      maxHeight: 160,
    },
    label: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "700",
      color: theme.text.secondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: getSpacing.xs,
    },
    text: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      lineHeight: 22,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Definition</Text>
      <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <Text style={styles.text}>{definition || "—"}</Text>
      </ScrollView>
    </View>
  );
};

export default VocabDefinitionDisplay;
