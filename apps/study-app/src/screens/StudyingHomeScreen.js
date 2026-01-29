import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStudy } from "../components/contexts/StudyContext";
import { useTheme } from "@my-apps/contexts";
import { PageHeader } from "@my-apps/ui";

const StudyingHomeScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { modulesBySection, modulesLoading, modulesError, loadModule } =
    useStudy();

  const [selectedModuleId, setSelectedModuleId] = useState(null);

  const handleLoad = (moduleId) => {
    setSelectedModuleId(moduleId);

    // Start loading in background for a snappy details screen
    loadModule(moduleId);

    // Navigate immediately
    navigation.navigate("ModuleDetails", { moduleId });
  };

  return (
    <SafeAreaView 
      style={{ flex: 1, backgroundColor: theme.background || "#fff" }}
      edges={["left", "right"]}
    >
      <PageHeader
        title="Learn"
        subtext="Pick a module to study"
        showBackButton={false}
      />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.background || "#fff" },
        ]}
      >
        {modulesLoading && (
          <View style={styles.centerRow}>
            <ActivityIndicator />
            <Text style={[styles.muted, { color: theme.text?.secondary || "#666" }]}>
              {" "}
              Loading modules…
            </Text>
          </View>
        )}

        {!!modulesError && (
          <Text style={[styles.error, { color: theme.error || "#B00020" }]}>
            {modulesError}
          </Text>
        )}

        {!modulesLoading && !modulesError && (modulesBySection?.length ?? 0) === 0 && (
          <Text style={[styles.muted, { color: theme.text?.secondary || "#666" }]}>
            No published modules found.
          </Text>
        )}

        {!modulesLoading &&
          !modulesError &&
          modulesBySection?.map((section) => (
            <View
              key={section.sectionId}
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.surface || "#fff",
                  borderColor: theme.border || "rgba(0,0,0,0.08)",
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.text?.primary || "#111" },
                  ]}
                >
                  {section.sectionOrder}. {section.sectionTitle}
                </Text>
              </View>

              <View style={styles.sectionBody}>
                {section.modules.map((m) => {
                  const isSelected = selectedModuleId === m.moduleId;

                  return (
                    <Pressable
                      key={m.moduleId}
                      onPress={() => handleLoad(m.moduleId)}
                      style={({ pressed }) => [
                        styles.moduleRow,
                        {
                          backgroundColor: isSelected
                            ? theme.card || "rgba(0,0,0,0.04)"
                            : "transparent",
                          borderColor: isSelected
                            ? theme.primary || "#2196F3"
                            : "transparent",
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.moduleTitle,
                            { color: theme.text?.primary || "#111" },
                          ]}
                          numberOfLines={1}
                        >
                          {m.order}. {m.title}
                        </Text>

                        <Text
                          style={[
                            styles.moduleMeta,
                            { color: theme.text?.secondary || "#666" },
                          ]}
                          numberOfLines={1}
                        >
                          Q:{m.counts?.questionsTotal ?? "?"} • v{m.version ?? 1}
                        </Text>
                      </View>

                      <Text style={[styles.chevron, { color: theme.text?.secondary || "#999" }]}>
                        ›
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 30, flexGrow: 1, gap: 12 },
  centerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  muted: { fontSize: 14 },
  error: { marginBottom: 10, fontSize: 14 },

  sectionCard: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  sectionHeader: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  sectionBody: { padding: 10, gap: 6 },

  moduleRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12 },
  moduleTitle: { fontSize: 14, fontWeight: "700" },
  moduleMeta: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 22, marginLeft: 10 },
});

export default StudyingHomeScreen;
