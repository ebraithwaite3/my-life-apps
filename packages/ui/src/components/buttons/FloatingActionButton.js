import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';

/**
 * FloatingActionButton - Reusable floating action button
 * 
 * Can display icon, text, or both
 * Used for: "Today" button, "Add" FAB, etc.
 */
const FloatingActionButton = ({
  onPress,
  icon,        // Ionicons name (e.g., 'calendar', 'add')
  label,       // Text label (e.g., 'Today')
  position = 'bottom-right', // 'bottom-right' | 'bottom-left' | 'bottom-center'
  visible = true,
  backgroundColor, // Optional override
  iconColor,       // Optional override
  textColor,       // Optional override
}) => {
  const { theme, getTypography } = useTheme();

  if (!visible) return null;

  // Position styles
  const positionStyles = {
    'bottom-right': { bottom: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'bottom-center': { bottom: 20, alignSelf: 'center' },
  };

  const styles = StyleSheet.create({
    button: {
      position: 'absolute',
      zIndex: 10,
      backgroundColor: backgroundColor || theme.primary,
      borderRadius: 30,
      paddingVertical: icon && label ? 12 : 15,
      paddingHorizontal: icon && label ? 20 : 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      ...positionStyles[position],
    },
    label: {
      color: textColor || '#fff',
      ...getTypography.button,
      fontWeight: '600',
    },
  });

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={label ? 20 : 24}
          color={iconColor || '#fff'}
        />
      )}
      {label && <Text style={styles.label}>{label}</Text>}
    </TouchableOpacity>
  );
};

export default FloatingActionButton;