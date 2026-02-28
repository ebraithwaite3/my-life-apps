import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "@my-apps/contexts";

/**
 * Shown when a session ends (queue exhausted in Once or Add Missed mode).
 *
 * Props:
 *   sessionResults    {object}   - { correct, incorrect, skipped, troubleWords, getUpdatedItemsWithStats }
 *   totalSessions     {number}   - All-time session count (post this session)
 *   onPracticeAgain   {function} - Restart the session
 *   updatedItems      {object[]} - Items with this session's stats merged in (for all-time ratios)
 */
const SpellingSessionSummary = ({
  sessionResults,
  totalSessions,
  onPracticeAgain,
  updatedItems,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const { correct, incorrect, skipped, troubleWords } = sessionResults;

  // Build a map from item id -> updated stats for the all-time ratio display
  const statsMap = {};
  (updatedItems || []).forEach((item) => {
    statsMap[item.id] = item;
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: getSpacing.lg,
    },
    title: {
      fontSize: getTypography.h1.fontSize * 0.7,
      fontWeight: "700",
      color: theme.text.primary,
      textAlign: "center",
      marginBottom: getSpacing.lg,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: getSpacing.md,
      marginBottom: getSpacing.lg,
    },
    statPill: {
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.full,
      alignItems: "center",
      minWidth: 80,
    },
    correctPill: {
      backgroundColor: theme.success,
    },
    incorrectPill: {
      backgroundColor: theme.error,
    },
    skippedPill: {
      backgroundColor: theme.border,
    },
    statEmoji: {
      fontSize: 20,
    },
    statCount: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    statLabel: {
      fontSize: getTypography.caption.fontSize,
      color: "#FFFFFF",
    },
    sessionsText: {
      textAlign: "center",
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.lg,
    },
    sectionTitle: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    troubleItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    troubleWord: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
    },
    ratioText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
    },
    practiceAgainButton: {
      marginTop: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderRadius: getBorderRadius.lg,
      backgroundColor: theme.primary,
      alignItems: "center",
    },
    practiceAgainText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    noTroubleText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      fontStyle: "italic",
    },
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Session Complete!</Text>

      <View style={styles.statsRow}>
        <View style={[styles.statPill, styles.correctPill]}>
          <Text style={styles.statEmoji}>✅</Text>
          <Text style={styles.statCount}>{correct}</Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={[styles.statPill, styles.incorrectPill]}>
          <Text style={styles.statEmoji}>❌</Text>
          <Text style={styles.statCount}>{incorrect}</Text>
          <Text style={styles.statLabel}>Wrong</Text>
        </View>
        <View style={[styles.statPill, styles.skippedPill]}>
          <Text style={styles.statEmoji}>➡️</Text>
          <Text style={[styles.statCount, { color: theme.text.primary }]}>{skipped}</Text>
          <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Skipped</Text>
        </View>
      </View>

      <Text style={styles.sessionsText}>
        Total sessions completed: {totalSessions}
      </Text>

      <Text style={styles.sectionTitle}>Trouble Words</Text>
      {troubleWords.length === 0 ? (
        <Text style={styles.noTroubleText}>None — great job!</Text>
      ) : (
        troubleWords.map((item) => {
          const stats = statsMap[item.id] || item;
          const allTimeCorrect = stats.correct || 0;
          const allTimeIncorrect = stats.incorrect || 0;
          return (
            <View key={item.id} style={styles.troubleItem}>
              <Text style={styles.troubleWord}>{item.name}</Text>
              <Text style={styles.ratioText}>
                {allTimeCorrect}✓ / {allTimeIncorrect}✗ all-time
              </Text>
            </View>
          );
        })
      )}

      <TouchableOpacity
        style={styles.practiceAgainButton}
        onPress={onPracticeAgain}
        activeOpacity={0.8}
      >
        <Text style={styles.practiceAgainText}>Practice Again</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default SpellingSessionSummary;
