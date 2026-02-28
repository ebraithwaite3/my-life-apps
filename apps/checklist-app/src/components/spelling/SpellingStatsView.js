import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "@my-apps/contexts";

/**
 * Stats tab — shows per-word accuracy across all sessions.
 *
 * Props:
 *   list {object} - The full checklist object (items with correct/incorrect/skipped, totalSessions)
 */
const SpellingStatsView = ({ list }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const items = list?.items || [];
  const totalSessions = list?.totalSessions || 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: getSpacing.lg,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: getSpacing.lg,
    },
    title: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: theme.text.primary,
    },
    sessionsText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
    },
    tableHeader: {
      flexDirection: "row",
      paddingBottom: getSpacing.sm,
      borderBottomWidth: 2,
      borderBottomColor: theme.border,
      marginBottom: getSpacing.xs,
    },
    colWord: { flex: 2 },
    colStat: { flex: 1, alignItems: "center" },
    colScore: { flex: 1, alignItems: "flex-end" },
    headerText: {
      fontSize: getTypography.caption.fontSize,
      fontWeight: "700",
      color: theme.text.tertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    wordText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
    },
    statText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      textAlign: "center",
    },
    scorePill: {
      paddingHorizontal: getSpacing.sm,
      paddingVertical: 2,
      borderRadius: getBorderRadius.full,
      alignItems: "center",
      minWidth: 44,
    },
    scoreText: {
      fontSize: getTypography.caption.fontSize,
      fontWeight: "700",
    },
    emptyText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      fontStyle: "italic",
      textAlign: "center",
      marginTop: getSpacing.xl,
    },
    noDataText: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.tertiary,
      textAlign: "center",
    },
  });

  const getScoreStyle = (pct) => {
    if (pct === null) return { bg: theme.border, text: theme.text.tertiary };
    if (pct >= 80) return { bg: theme.success, text: "#FFFFFF" };
    if (pct >= 50) return { bg: theme.warning, text: "#FFFFFF" };
    return { bg: theme.error, text: "#FFFFFF" };
  };

  const hasAnyStats = items.some(
    (i) => (i.correct || 0) + (i.incorrect || 0) + (i.skipped || 0) > 0
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Word Statistics</Text>
        <Text style={styles.sessionsText}>
          {totalSessions} session{totalSessions !== 1 ? "s" : ""}
        </Text>
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>
          No words yet — add words using the Edit tab.
        </Text>
      ) : !hasAnyStats ? (
        <Text style={styles.emptyText}>
          No practice data yet.{"\n"}Complete a session to see stats here.
        </Text>
      ) : (
        <>
          <View style={styles.tableHeader}>
            <View style={styles.colWord}>
              <Text style={styles.headerText}>Word</Text>
            </View>
            <View style={styles.colStat}>
              <Text style={styles.headerText}>✓</Text>
            </View>
            <View style={styles.colStat}>
              <Text style={styles.headerText}>✗</Text>
            </View>
            <View style={styles.colStat}>
              <Text style={styles.headerText}>→</Text>
            </View>
            <View style={styles.colScore}>
              <Text style={styles.headerText}>Score</Text>
            </View>
          </View>

          {items.map((item) => {
            const correct = item.correct || 0;
            const incorrect = item.incorrect || 0;
            const skipped = item.skipped || 0;
            const attempted = correct + incorrect;
            const pct = attempted > 0 ? Math.round((correct / attempted) * 100) : null;
            const scoreStyle = getScoreStyle(pct);

            return (
              <View key={item.id} style={styles.row}>
                <View style={styles.colWord}>
                  <Text style={styles.wordText}>{item.name}</Text>
                </View>
                <View style={styles.colStat}>
                  <Text style={styles.statText}>{correct}</Text>
                </View>
                <View style={styles.colStat}>
                  <Text style={styles.statText}>{incorrect}</Text>
                </View>
                <View style={styles.colStat}>
                  <Text style={styles.statText}>{skipped}</Text>
                </View>
                <View style={styles.colScore}>
                  <View
                    style={[
                      styles.scorePill,
                      { backgroundColor: scoreStyle.bg },
                    ]}
                  >
                    <Text style={[styles.scoreText, { color: scoreStyle.text }]}>
                      {pct !== null ? `${pct}%` : "—"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
};

export default SpellingStatsView;
