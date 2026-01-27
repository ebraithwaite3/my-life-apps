import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@my-apps/contexts';

const PillSelectionButton = ({ 
  options = [], // Array of { label: string, value: any }
  selectedValue, 
  onSelect,
  style 
}) => {
  const { theme, getSpacing, getBorderRadius, getTypography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md, 
      padding: 3, // Slight padding to create the "inset" look for the pills
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    option: {
      flex: 1,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.md - 2, // Matches the container curve
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedOption: {
      // Soft tint background instead of solid primary
      backgroundColor: theme.primary + "30", 
    },
    optionText: {
      fontSize: 12, // Standardized for pill labels
      fontWeight: '700',
      color: theme.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    selectedOptionText: {
      // Primary color text for legibility against the tint
      color: theme.primary, 
    },
  });

  return (
    <View style={[styles.container, style]}>
      {options.map((option, index) => {
        const isSelected = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={option.value || index}
            style={[
              styles.option,
              isSelected && styles.selectedOption,
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.optionText,
                isSelected && styles.selectedOptionText,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default PillSelectionButton;