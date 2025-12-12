import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DoneButton = ({ onPress, theme, getSpacing, getTypography }) => {
  const styles = StyleSheet.create({
    doneButton: {
      position: 'absolute',
      top: getSpacing.md,
      left: '50%',
      transform: [{ translateX: -50 }], // Center it
      backgroundColor: theme.primary,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 1000,
      marginTop: 0,
    },
    doneButtonText: {
      color: '#fff',
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      marginLeft: getSpacing.xs,
    },
  });

  return (
    <TouchableOpacity style={styles.doneButton} onPress={onPress}>
      <Ionicons name="checkmark-circle" size={18} color="#fff" />
      <Text style={styles.doneButtonText}>Done</Text>
    </TouchableOpacity>
  );
};

export default DoneButton;