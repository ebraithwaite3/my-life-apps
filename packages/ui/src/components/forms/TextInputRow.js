import React from "react";
import { View, Text, TextInput as TextInput, StyleSheet } from "react-native";
import { useTheme } from "@my-apps/contexts";

const TextInputRow = ({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = "sentences",
  multiline = false,
  ...rest
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const styles = StyleSheet.create({
    sectionHeader: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      marginTop: getSpacing.lg,
      marginBottom: getSpacing.sm,
      marginHorizontal: getSpacing.lg,
    },
    inputSection: {
      backgroundColor: theme.background,
      marginHorizontal: getSpacing.lg,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      padding: getSpacing.md,
    },
    textInput: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      padding: 0,
      margin: 0,
    },
  });

  return (
    <>
      <Text style={styles.sectionHeader}>{label}</Text>
      <View style={styles.inputSection}>
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor={theme.text.tertiary}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          {...rest}
        />
      </View>
    </>
  );
};

export default TextInputRow;