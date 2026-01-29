import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@my-apps/contexts";
import { PageHeader, SelectModal } from "@my-apps/ui";

import { useUserSettings } from "../components/contexts/UserSettingsContext"; // <- adjust path if needed

const PreferencesScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { studyPreferences, updateStudyPreferences, loading, error } =
    useUserSettings();

  // ✅ Ensure we always have a full, safe object (even during first render)
  const initialStudyPrefs = useMemo(
    () =>
      studyPreferences || {
        quiz: { counts: { 1: 5, 2: 5, 3: 5 } },
      },
    [studyPreferences]
  );

  // Local editable state
  const [draftPrefs, setDraftPrefs] = useState(initialStudyPrefs);

  // ✅ Only allow Save/Cancel after we've loaded Firestore once
  const [didInitFromServer, setDidInitFromServer] = useState(false);

  // Sync local draft when Firestore prefs change (first load, or after save)
  useEffect(() => {
    setDraftPrefs(initialStudyPrefs);

    // Mark that we’ve initialized from server once loading finishes
    if (!loading) setDidInitFromServer(true);
  }, [initialStudyPrefs, loading]);

  // Detect changes (but only after init)
  const hasChanges = useMemo(() => {
    if (!didInitFromServer) return false;
    return JSON.stringify(draftPrefs) !== JSON.stringify(initialStudyPrefs);
  }, [draftPrefs, initialStudyPrefs, didInitFromServer]);

  // Helpers
  const setCount = (level, value) => {
    const num = Number(value);
    setDraftPrefs((prev) => ({
      ...prev,
      quiz: {
        ...(prev?.quiz || {}),
        counts: {
          ...(prev?.quiz?.counts || {}),
          [level]: Number.isFinite(num) ? num : 0,
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      // ✅ (Optional) enforce at least 1 question total
      const c = draftPrefs?.quiz?.counts || {};
      const total = (c[1] || 0) + (c[2] || 0) + (c[3] || 0);
      if (total <= 0) {
        Alert.alert("Invalid quiz", "Please select at least 1 question.");
        return;
      }

      await updateStudyPreferences(draftPrefs);
      Alert.alert("Saved", "Study preferences updated.");
    } catch (e) {
      console.error("Failed to save studyPreferences:", e);
      Alert.alert("Error", "Failed to save. Please try again.");
    }
  };

  const handleCancel = () => setDraftPrefs(initialStudyPrefs);

  // Options for question counts
  const countOptions = [
    { label: "0", value: 0 },
    { label: "1", value: 1 },
    { label: "2", value: 2 },
    { label: "3", value: 3 },
    { label: "4", value: 4 },
    { label: "5", value: 5 },
    { label: "6", value: 6 },
    { label: "7", value: 7 },
    { label: "8", value: 8 },
    { label: "9", value: 9 },
    { label: "10", value: 10 }
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: getSpacing.md,
      paddingBottom: getSpacing.xl,
      gap: getSpacing.lg,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: getSpacing.md,
      gap: getSpacing.md,
    },
    sectionHeaderText: {
      ...getTypography.body,
      fontWeight: "800",
      color: theme.text.primary,
    },
    helperText: {
      ...getTypography.bodySmall,
      color: theme.text.secondary,
      marginTop: 2,
    },
    row: {
      flexDirection: "row",
      gap: getSpacing.md,
    },
    field: {
      flex: 1,
      gap: getSpacing.sm,
    },
    label: {
      ...getTypography.body,
      color: theme.text.secondary,
      fontWeight: "600",
    },
    error: {
      ...getTypography.bodySmall,
      color: theme.error,
    },

    stickyFooter: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-around",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      paddingBottom: getSpacing.xl,
      backgroundColor: theme.surface || theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 5,
    },
    button: {
      flex: 1,
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: getSpacing.xs,
    },
    saveButton: {
      backgroundColor: theme.button.primary,
      opacity: hasChanges ? 1 : 0.6,
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    buttonText: {
      ...getTypography.button,
      color: theme.text.inverse,
    },
    cancelButtonText: {
      ...getTypography.button,
      color: theme.text.primary,
    },
    bottomSpacer: {
      height: 110,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <PageHeader
        showBackButton={false}
        showNavArrows={false}
        title="Preferences"
        subtext="Study settings"
        icons={[]}
      />

      <ScrollView
        showsVerticalScrollIndicator
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View>
            <Text style={styles.sectionHeaderText}>Quiz Defaults</Text>
            <Text style={styles.helperText}>
              Choose how many questions to pull from each level when starting a quiz.
            </Text>

            <Text style={styles.helperText}>
              Quiz experience (V1): no results/rationales during the quiz — review everything at the end.
            </Text>
          </View>

          {loading && <Text style={styles.helperText}>Loading…</Text>}
          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Level 1</Text>
              <SelectModal
                title="Level 1 Count"
                value={draftPrefs?.quiz?.counts?.[1] ?? 10}
                options={countOptions}
                getLabel={(o) => o.label}
                getValue={(o) => o.value}
                onSelect={(v) => setCount(1, v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Level 2</Text>
              <SelectModal
                title="Level 2 Count"
                value={draftPrefs?.quiz?.counts?.[2] ?? 10}
                options={countOptions}
                getLabel={(o) => o.label}
                getValue={(o) => o.value}
                onSelect={(v) => setCount(2, v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Level 3</Text>
              <SelectModal
                title="Level 3 Count"
                value={draftPrefs?.quiz?.counts?.[3] ?? 10}
                options={countOptions}
                getLabel={(o) => o.label}
                getValue={(o) => o.value}
                onSelect={(v) => setCount(3, v)}
              />
            </View>
          </View>
        </View>

        {hasChanges && <View style={styles.bottomSpacer} />}
      </ScrollView>

      {hasChanges && (
        <View style={styles.stickyFooter}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={[styles.buttonText, styles.cancelButtonText]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={!hasChanges}
          >
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default PreferencesScreen;
