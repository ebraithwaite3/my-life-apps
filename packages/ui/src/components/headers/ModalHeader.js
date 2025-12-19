import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@my-apps/contexts';

/**
 * ModalHeader - Unified header for all modals
 * Supports: custom colors, hiding buttons, disabling buttons, subtitles
 */
const ModalHeader = ({ 
  title,
  subtitle = null,
  
  // Left button (Cancel)
  onCancel,
  cancelText = 'Cancel',
  cancelColor = null,        // null = use theme.error (red)
  showCancel = true,
  cancelDisabled = false,
  
  // Right button (Done/Action)
  onDone,
  doneText = 'Done',
  doneColor = null,          // null = use theme.primary (blue)
  showDone = true,
  doneDisabled = false,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();

  // Determine button colors
  const leftColor = cancelColor || theme.error;
  const rightColor = doneDisabled 
    ? theme.text.tertiary 
    : (doneColor || theme.primary);

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      backgroundColor: theme.modal?.headerBackground || theme.header, // Fallback to header
    },
    buttonContainer: {
      minWidth: 70,
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
    },
    leftButton: {
      alignItems: 'flex-start',
    },
    rightButton: {
      alignItems: 'flex-end',
    },
    hiddenButton: {
      opacity: 0, // Keep space but invisible
    },
    buttonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
    },
    titleContainer: {
      flex: 1,
      marginHorizontal: getSpacing.sm,
      alignItems: 'center',
    },
    title: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
      marginTop: 2,
    },
  });

  return (
    <View style={styles.header}>
      {/* Left Button (Cancel) */}
      <View style={[styles.buttonContainer, styles.leftButton]}>
        {showCancel ? (
          <TouchableOpacity 
            onPress={onCancel}
            disabled={cancelDisabled}
          >
            <Text 
              style={[
                styles.buttonText, 
                { color: cancelDisabled ? theme.text.tertiary : leftColor }
              ]}
            >
              {cancelText}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.hiddenButton}>
            <Text style={styles.buttonText}> </Text>
          </View>
        )}
      </View>

      {/* Title (Center) */}
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Button (Done) */}
      <View style={[styles.buttonContainer, styles.rightButton]}>
        {showDone ? (
          <TouchableOpacity 
            onPress={onDone}
            disabled={doneDisabled}
          >
            <Text 
              style={[
                styles.buttonText, 
                { color: rightColor }
              ]}
            >
              {doneText}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.hiddenButton}>
            <Text style={styles.buttonText}> </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default ModalHeader;