// src/screens/AddScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const AddScreen = ({ navigation }) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: getSpacing.md,
    },
    title: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: getTypography.h2.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
    },
    subtitle: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
      marginBottom: getSpacing.xl,
    },
    backButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderRadius: 12,
    },
    backButtonText: {
      fontSize: getTypography.button.fontSize,
      fontWeight: getTypography.button.fontWeight,
      color: theme.text.inverse,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Screen</Text>
      <Text style={styles.subtitle}>Add screen coming soon...</Text>
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddScreen;