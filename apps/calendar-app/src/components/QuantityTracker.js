// QuantityTracker.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const QuantityTracker = ({ 
  value, 
  onUpdate, 
  min = 0, 
  max = null,
  step = 1,
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const handleDecrement = () => {
    const newValue = value - step;
    if (min === null || newValue >= min) {
      onUpdate(newValue);
    }
  };

  const handleIncrement = () => {
    const newValue = value + step;
    if (max === null || newValue <= max) {
      onUpdate(newValue);
    }
  };

  const isDecrementDisabled = min !== null && value <= min;
  const isIncrementDisabled = max !== null && value >= max;

  // Size configurations
  const sizeConfig = {
    small: {
      buttonSize: 28,
      iconSize: 16,
      fontSize: getTypography.bodySmall.fontSize,
      padding: getSpacing.xs,
      minWidth: 40,
    },
    medium: {
      buttonSize: 36,
      iconSize: 20,
      fontSize: getTypography.body.fontSize,
      padding: getSpacing.sm,
      minWidth: 50,
    },
    large: {
      buttonSize: 44,
      iconSize: 24,
      fontSize: getTypography.h4.fontSize,
      padding: getSpacing.md,
      minWidth: 60,
    },
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    button: {
      width: config.buttonSize,
      height: config.buttonSize,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
    },
    buttonLeft: {
      borderTopLeftRadius: getBorderRadius.md - 1,
      borderBottomLeftRadius: getBorderRadius.md - 1,
      borderRightWidth: 1,
      borderRightColor: theme.border,
    },
    buttonRight: {
      borderTopRightRadius: getBorderRadius.md - 1,
      borderBottomRightRadius: getBorderRadius.md - 1,
      borderLeftWidth: 1,
      borderLeftColor: theme.border,
    },
    buttonDisabled: {
      opacity: 0.3,
    },
    valueContainer: {
      paddingHorizontal: config.padding,
      minWidth: config.minWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    value: {
      fontSize: config.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          styles.buttonLeft,
          isDecrementDisabled && styles.buttonDisabled,
        ]}
        onPress={handleDecrement}
        disabled={isDecrementDisabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name="remove"
          size={config.iconSize}
          color={isDecrementDisabled ? theme.text.tertiary : theme.text.primary}
        />
      </TouchableOpacity>

      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          styles.buttonRight,
          isIncrementDisabled && styles.buttonDisabled,
        ]}
        onPress={handleIncrement}
        disabled={isIncrementDisabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name="add"
          size={config.iconSize}
          color={isIncrementDisabled ? theme.text.tertiary : theme.text.primary}
        />
      </TouchableOpacity>
    </View>
  );
};

export default QuantityTracker;