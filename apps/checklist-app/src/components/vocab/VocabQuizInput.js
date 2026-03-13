import React, { forwardRef } from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTheme } from "@my-apps/contexts";

/**
 * Text input + Check button for Solo mode.
 *
 * Props:
 *   value        {string}
 *   onChangeText {function}
 *   onSubmit     {function}
 *   disabled     {boolean}  - Disables Check button when true
 */
const VocabQuizInput = forwardRef(({ value, onChangeText, onSubmit, disabled }, ref) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      marginBottom: getSpacing.md,
    },
    textInput: {
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.md,
      fontSize: 22,
      fontWeight: "600",
      color: theme.text.primary,
      textAlign: "center",
    },
    checkButton: {
      marginTop: getSpacing.sm,
      paddingVertical: getSpacing.md,
      borderRadius: getBorderRadius.lg,
      backgroundColor: theme.primary,
      alignItems: "center",
    },
    checkButtonDisabled: {
      backgroundColor: theme.border,
    },
    checkButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: "#FFFFFF",
    },
  });

  return (
    <View style={styles.container}>
      <TextInput
        ref={ref}
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholder="Type the word..."
        placeholderTextColor={theme.text.tertiary}
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize="none"
        autoComplete="off"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        enablesReturnKeyAutomatically
      />
      <TouchableOpacity
        style={[styles.checkButton, disabled && styles.checkButtonDisabled]}
        onPress={onSubmit}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={styles.checkButtonText}>Check</Text>
      </TouchableOpacity>
    </View>
  );
});

export default VocabQuizInput;
