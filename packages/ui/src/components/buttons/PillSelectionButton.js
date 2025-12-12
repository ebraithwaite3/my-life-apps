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
      borderRadius: 8, // The outer shape determines the curve
      padding: 0,      // <--- CHANGED: Remove padding so children touch edges
      borderWidth: 2,
      borderColor: theme.border,
      overflow: 'hidden', // <--- ADDED: Clips the child background to the border radius
    },
    option: {
      flex: 1,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      // borderRadius: getBorderRadius.pill, // <--- REMOVED: Let the container handle the shape
      alignItems: 'center',
      justifyContent: 'center',
      // Optional: Add a border right to separate unselected items visually
      borderRightWidth: 0, 
    },
    selectedOption: {
      backgroundColor: theme.primary,
    },
    optionText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.secondary,
    },
    selectedOptionText: {
      color: '#FFFFFF',
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
            activeOpacity={0.7}
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