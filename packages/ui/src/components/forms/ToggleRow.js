// packages/ui/src/components/ToggleRow.js
import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '@my-apps/contexts';

/**
 * ToggleRow - A reusable row with a label and toggle switch
 * 
 * @param {string} title - Main title text (required)
 * @param {boolean} value - Current switch value (required)
 * @param {function} onValueChange - Handler when switch toggles (required)
 * @param {string} subtitle - Optional subtitle/description text
 * @param {boolean} disabled - Whether the switch is disabled
 * @param {object} containerStyle - Optional style override for container
 * @param {object} titleStyle - Optional style override for title
 */
const ToggleRow = ({ 
  title,
  value,
  onValueChange,
  subtitle,
  disabled = false,
  containerStyle,
  titleStyle,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      marginBottom: getSpacing.xl,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    textContainer: {
      flex: 1,
      marginRight: getSpacing.md,
    },
    title: {
      ...getTypography.h3,
      color: theme.text.primary,
      fontWeight: 'bold',
    },
    subtitle: {
      ...getTypography.bodySmall,
      color: theme.text.secondary,
      marginTop: getSpacing.xs,
    },
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.row}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, titleStyle]}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <Switch
          onValueChange={onValueChange}
          value={value}
          disabled={disabled}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={value ? theme.text.inverse : theme.border}
        />
      </View>
    </View>
  );
};

export default ToggleRow;