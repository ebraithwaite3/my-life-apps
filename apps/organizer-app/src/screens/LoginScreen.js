import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@my-apps/contexts';

const LoginScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
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
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🔐 Login</Text>
      <Text style={styles.subtitle}>
        Authentication coming soon!
      </Text>
    </SafeAreaView>
  );
};

export default LoginScreen;