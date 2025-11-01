import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const ColorSelector = ({ 
  selectedColor, 
  onColorSelect, 
  usedColors = [], 
  label = "Display Color",
  disabled = false,
  showUsedIndicator = true 
}) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const availableColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#84CC16', // Lime
    '#06B6D4', // Cyan
    '#8B5A2B', // Brown
  ];

  const isColorUsed = (color) => usedColors.includes(color);
  const isColorSelected = (color) => selectedColor === color;

  const handleColorPress = (color) => {
    if (disabled) return;
    
    // Allow selecting already used colors if it's currently selected (for editing)
    if (isColorUsed(color) && !isColorSelected(color)) {
      return; // Don't allow selecting used colors
    }
    
    onColorSelect(color);
  };

  const styles = {
    container: {
      marginBottom: getSpacing.md,
    },
    label: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    colorContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: getSpacing.sm,
    },
    colorOption: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 3,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    colorOptionSelected: {
      borderColor: theme.text.primary,
      borderWidth: 4,
    },
    colorOptionUsed: {
      opacity: 0.4,
    },
    colorOptionDisabled: {
      opacity: 0.3,
    },
    usedIndicator: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: 2,
    },
    selectedIndicator: {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: 12,
      padding: 2,
    },
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.colorContainer}>
        {availableColors.map((color) => {
          const used = isColorUsed(color);
          const selected = isColorSelected(color);
          const canSelect = !used || selected;

          return (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                selected && styles.colorOptionSelected,
                used && !selected && styles.colorOptionUsed,
                disabled && styles.colorOptionDisabled,
              ]}
              onPress={() => handleColorPress(color)}
              disabled={disabled || (!canSelect)}
              activeOpacity={canSelect ? 0.7 : 1}
            >
              {/* Selected indicator */}
              {selected && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark" size={16} color={theme.text.primary} />
                </View>
              )}
              
              {/* Used indicator */}
              {used && !selected && showUsedIndicator && (
                <View style={styles.usedIndicator}>
                  <Ionicons name="ban" size={12} color={theme.text.tertiary} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Helper text */}
      {usedColors.length > 0 && (
        <Text style={{
          fontSize: getTypography.bodySmall.fontSize,
          color: theme.text.tertiary,
          marginTop: getSpacing.xs,
          fontStyle: 'italic'
        }}>
          {usedColors.length > 0 && "Faded colors are already in use"}
        </Text>
      )}
    </View>
  );
};

export default ColorSelector;