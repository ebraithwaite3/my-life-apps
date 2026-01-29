import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useStudy } from "../../components/contexts/StudyContext"; // adjust if needed
import { useTheme } from "@my-apps/contexts";

const SummaryModalContent = () => {
  const { theme, getSpacing } = useTheme();
  const { activeModuleMeta, summaryBlocks, moduleContentLoading, moduleContentError } = useStudy();

  if (moduleContentLoading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.text?.secondary }}>Loading summary…</Text>
      </View>
    );
  }

  if (moduleContentError) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.error }}>Error: {moduleContentError}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: getSpacing?.md ?? 16 }}>
      <Text style={[styles.moduleTitle, { color: theme.text?.primary }]}>
        {activeModuleMeta?.title || "Summary"}
      </Text>

      {(!summaryBlocks || summaryBlocks.length === 0) ? (
        <Text style={{ color: theme.text?.secondary }}>No summary found.</Text>
      ) : (
        summaryBlocks.map((block, idx) => (
          <View
            key={`${block.heading || "block"}-${idx}`}
            style={[
              styles.block,
              { borderColor: theme.border, backgroundColor: theme.surface || "#fff" },
            ]}
          >
            <Text style={[styles.heading, { color: theme.text?.primary }]}>
              {block.heading}
            </Text>
            {(block.bullets || []).map((b, i) => (
              <Text key={`${idx}-b-${i}`} style={[styles.bullet, { color: theme.text?.primary }]}>
                • {b}
              </Text>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  moduleTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10 },
  block: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  heading: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  bullet: { fontSize: 14, lineHeight: 18, marginBottom: 4 },
});

export default SummaryModalContent;
