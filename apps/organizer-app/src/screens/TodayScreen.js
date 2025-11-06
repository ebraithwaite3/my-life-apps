import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@my-apps/contexts";
import { PageHeader } from "@my-apps/ui";

const TodayScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingHorizontal: getSpacing.lg, // only side padding
      paddingBottom: getSpacing.lg,     // bottom spacing
    },
    title: {
      ...getTypography.h1,
      color: theme.text.primary,
      marginVertical: getSpacing.md,
    },
  });
  

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
  {/* Fixed header at the top */}
  <PageHeader title="Today's Events" subtitle={`Hello, 'User'!`} />

  {/* Scrollable content below */}
  <ScrollView contentContainerStyle={styles.scrollContent}>
    <Text style={styles.title}>📅 Today's Events</Text>
  </ScrollView>
</SafeAreaView>
  );
};

export default TodayScreen;