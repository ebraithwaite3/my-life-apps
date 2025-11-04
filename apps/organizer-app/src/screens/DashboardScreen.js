import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@my-apps/contexts';

const DashboardScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: getSpacing.lg,
    },
    title: {
      ...getTypography.h1,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
    },
    subtitle: {
      ...getTypography.body,
      color: theme.text.secondary,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🏠 Dashboard</Text>
        <Text style={styles.subtitle}>
          Your central hub - coming soon!
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;