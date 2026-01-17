import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DoneButton = ({ 
  onPress, 
  text = 'Done',
  icon = 'checkmark-circle',
  theme, 
  getSpacing, 
  getTypography 
}) => {
  const styles = StyleSheet.create({
    doneButton: {
      position: 'absolute',
      bottom: 0, // Changed from top to bottom
      left: '50%',
      marginLeft: -75,
      width: 150,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 1000,
    },
    doneButtonText: {
      fontSize: 14,
      color: '#000000',
      fontWeight: '600',
      marginLeft: getSpacing.xs,
    },
  
  });

  return (
    <TouchableOpacity style={styles.doneButton} onPress={onPress}>
      <Ionicons name={icon} size={24} color="#000000" />
      <Text style={styles.doneButtonText}>{text}</Text>
    </TouchableOpacity>
  );
};

export default DoneButton;