import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';

const GroceryMealsScreen = ({ navigation }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { groceries, groceriesLoading } = useData();

    const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: getSpacing.md,
      padding: getSpacing.sm,
    },
    headerTitle: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    content: {
      flex: 1,
      padding: getSpacing.md,
    },
    section: {
      marginBottom: getSpacing.lg,
    },
    sectionTitle: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: getTypography.h2.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
    },
    // Added a style for the placeholder text
    placeholderText: {
      color: theme.text.secondary,
      fontSize: getTypography.body.fontSize,
      textAlign: 'center',
      padding: getSpacing.lg,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Grocery Meals</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Add action buttons here if needed */}
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {groceriesLoading ? (
          <Text style={styles.placeholderText}>Loading groceries...</Text>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Food Meals</Text>
            {/* Just a placeholder */}
            <Text style={styles.placeholderText}>Grocery items will be listed here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default GroceryMealsScreen;