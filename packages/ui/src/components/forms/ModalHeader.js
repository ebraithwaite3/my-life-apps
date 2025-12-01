import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "@my-apps/contexts";

const ModalHeader = ({
  leftText,
  leftColor,
  onLeftPress,
  title,
  rightText,
  rightColor,
  onRightPress,
  leftDisabled = false,
  rightDisabled = false,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerButton: {
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.sm,
    },
    headerButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
    },
    headerTitle: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
    },
  });

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={onLeftPress}
        disabled={leftDisabled}
      >
        <Text
          style={[
            styles.headerButtonText,
            { color: leftColor || theme.text.secondary },
            leftDisabled && { opacity: 0.5 },
          ]}
        >
          {leftText}
        </Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>{title}</Text>

      <TouchableOpacity
        style={styles.headerButton}
        onPress={onRightPress}
        disabled={rightDisabled}
      >
        <Text
          style={[
            styles.headerButtonText,
            { color: rightColor || theme.primary },
            rightDisabled && { opacity: 0.5 },
          ]}
        >
          {rightText}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ModalHeader;