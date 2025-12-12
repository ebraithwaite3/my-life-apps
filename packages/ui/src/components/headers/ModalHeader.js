import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@my-apps/contexts';

const ModalHeader = ({
  title,
  subtitle,
  onCancel,
  onAction,
  cancelText = 'Cancel',
  actionText = 'Done',
  actionDisabled = false,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerButton: {
      paddingVertical: getSpacing.sm,
      minWidth: 60,
    },
    cancelButton: {
      alignItems: 'flex-start',
    },
    actionButton: {
      alignItems: 'flex-end',
    },
    headerButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.primary,
    },
    cancelButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.error,
    },
    disabledButtonText: {
      color: theme.text.tertiary,
      opacity: 0.5,
    },
    headerTitle: {
      flex: 1,
      marginHorizontal: getSpacing.md,
    },
    title: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
      marginTop: getSpacing.xs,
    },
  });

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.headerButton, styles.cancelButton]}
        onPress={onCancel}
      >
        <Text style={styles.cancelButtonText}>{cancelText}</Text>
      </TouchableOpacity>

      <View style={styles.headerTitle}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.headerButton, styles.actionButton]}
        onPress={onAction}
        disabled={actionDisabled}
      >
        <Text
          style={[
            styles.headerButtonText,
            actionDisabled && styles.disabledButtonText,
          ]}
        >
          {actionText}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ModalHeader;