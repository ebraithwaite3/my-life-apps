import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useTheme } from "@my-apps/contexts";
import { ToggleRow, SelectModal } from "@my-apps/ui";  // 👈 Import both components
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { updateUserDoc } from "../services/firestoreService";
import EditChecklist from "../components/cards/ChecklistCard/EditChecklist";

const defaultPreferences = {
  workoutPreferences: {
    syncWorkoutsToCalendar: false,
    addChecklistToWorkout: false,
    checklistId: "",
  },
};

const PreferencesScreen = ({ navigation, route }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { db } = useAuth();
  const { preferences, user } = useData();

  const initialPrefs =
    preferences && Object.keys(preferences).length
      ? { ...defaultPreferences, ...preferences }
      : defaultPreferences;

  const [updatedPreferences, setUpdatedPreferences] = useState(initialPrefs);
  const [hasChanges, setHasChanges] = useState(false);
  const [showEditChecklist, setShowEditChecklist] = useState(false);

  useEffect(() => {
    const currentBase =
      preferences && Object.keys(preferences).length
        ? { ...defaultPreferences, ...preferences }
        : defaultPreferences;
    const changesMade =
      JSON.stringify(currentBase) !== JSON.stringify(updatedPreferences);
    setHasChanges(changesMade);
  }, [preferences, updatedPreferences]);

  const handleToggle = (key, value) => {
    setUpdatedPreferences((prev) => ({
      ...prev,
      workoutPreferences: {
        ...((prev && prev.workoutPreferences) ||
          defaultPreferences.workoutPreferences),
        [key]: value,
      },
    }));
  };

  const handleChecklistSelect = (checklistId) => {
    setUpdatedPreferences((prev) => ({
      ...prev,
      workoutPreferences: {
        ...((prev && prev.workoutPreferences) ||
          defaultPreferences.workoutPreferences),
        checklistId: checklistId || "",
      },
    }));
  };

  const handleSave = async () => {
    if (!db || !user || !hasChanges) {
      console.warn(
        "Cannot save: missing db/user or no changes.",
        db,
        user,
        hasChanges
      );
      return;
    }

    if (
      updatedPreferences.workoutPreferences?.addChecklistToWorkout &&
      !updatedPreferences.workoutPreferences?.checklistId
    ) {
      Alert.alert(
        "Checklist Required",
        "Please select a checklist before saving, or disable 'Add Checklist To Workout'."
      );
      return;
    }

    try {
      await updateUserDoc(db, user.userId, { preferences: updatedPreferences });
      console.log("User preferences updated successfully!");
      Alert.alert("Success", "Preferences saved successfully!");
    } catch (error) {
      console.error("Failed to save preferences:", error);
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    }
  };

  const handleCancel = () => {
    const merged =
      preferences && Object.keys(preferences).length
        ? { ...defaultPreferences, ...preferences }
        : defaultPreferences;
    setUpdatedPreferences(merged);
  };

  const handleChecklistSaved = () => {
    console.log("Checklist saved successfully!");
  };

  const isSaveDisabled = () => {
    if (!hasChanges) return true;
    
    if (
      updatedPreferences.workoutPreferences?.addChecklistToWorkout &&
      !updatedPreferences.workoutPreferences?.checklistId
    ) {
      return true;
    }
    
    return false;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      alignItems: "center",
      padding: getSpacing.md,
      paddingTop: getSpacing.xl,
      paddingBottom: getSpacing.xxl,
    },
    title: {
      ...getTypography.h2,
      color: theme.text.primary,
      marginBottom: getSpacing.lg,
    },
    settingContainer: {
      width: "100%",
      paddingHorizontal: getSpacing.md,
      marginBottom: getSpacing.xl,
    },
    subHeaderText: {
      ...getTypography.body,
      color: theme.text.secondary,
      marginBottom: getSpacing.sm,
    },
    createChecklistButton: {
      width: "100%",
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 8,
      backgroundColor: theme.surface || theme.background,
      paddingVertical: 12,
      paddingHorizontal: 10,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    createChecklistButtonText: {
      fontSize: 16,
      color: theme.primary,
      fontWeight: "600",
    },
    warningText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.error || "#ef4444",
      marginTop: getSpacing.sm,
      fontStyle: "italic",
    },
    buttonContainer: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "space-around",
      marginTop: getSpacing.xxl,
    },
    button: {
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.xl,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
    },
    saveButton: {
      backgroundColor: theme.button.primary,
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
  });

  const selectedChecklistId = String(
    updatedPreferences?.workoutPreferences?.checklistId || ""
  );

  const selectedChecklist = user?.savedChecklists?.find(
    (checklist) => String(checklist.id) === selectedChecklistId
  );

  const saveButtonDisabled = isSaveDisabled();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Preferences</Text>

        <View style={styles.settingContainer}>
          {/* 👇 REPLACED: Old verbose switch with clean ToggleRow */}
          <ToggleRow
            title="Sync Workouts to Calendar"
            value={updatedPreferences.workoutPreferences?.syncWorkoutsToCalendar || false}
            onValueChange={(value) => handleToggle("syncWorkoutsToCalendar", value)}
          />

          {updatedPreferences.workoutPreferences?.syncWorkoutsToCalendar && (
            <>
              {/* 👇 REPLACED: Another clean ToggleRow */}
              <ToggleRow
                title="Add Checklist To Workout"
                value={updatedPreferences.workoutPreferences?.addChecklistToWorkout || false}
                onValueChange={(value) => handleToggle("addChecklistToWorkout", value)}
              />

              {updatedPreferences.workoutPreferences?.addChecklistToWorkout && (
                <View style={{ width: "100%", marginTop: 0 }}>
                  <Text style={styles.subHeaderText}>Select Checklist</Text>

                  {user?.savedChecklists?.length > 0 ? (
                    <>
                      {/* 👇 CLEAN: Self-contained SelectModal - no state management needed! */}
                      <SelectModal
                        title="Select Checklist"
                        placeholder="— Pick a checklist —"
                        value={selectedChecklistId}
                        options={user?.savedChecklists || []}
                        onSelect={handleChecklistSelect}
                        getLabel={(item) => item.name}
                        getValue={(item) => String(item.id)}
                      />
                      {!selectedChecklistId && (
                        <Text style={styles.warningText}>
                          ⚠️ Please select a checklist to save
                        </Text>
                      )}
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.createChecklistButton}
                        onPress={() => setShowEditChecklist(true)}
                      >
                        <Text style={styles.createChecklistButtonText}>
                          Create A Checklist
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.warningText}>
                        ⚠️ You must create a checklist to save
                      </Text>
                    </>
                  )}
                </View>
              )}
            </>
          )}

          {/* 👇 REPLACED: Third ToggleRow with optional subtitle */}
          <ToggleRow
            title="Track Rep Goals"
            subtitle="Keep track of your target reps for each exercise"
            value={updatedPreferences.workoutPreferences?.trackRepGoals || false}
            onValueChange={(value) => handleToggle("trackRepGoals", value)}
            containerStyle={{ marginTop: getSpacing.xl }}
          />
        </View>

        {hasChanges && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={!hasChanges}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button, 
                styles.saveButton,
                { opacity: saveButtonDisabled ? 0.5 : 1 }
              ]}
              onPress={handleSave}
              disabled={saveButtonDisabled}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Checklist Modal */}
      <EditChecklist
        isVisible={showEditChecklist}
        onClose={() => setShowEditChecklist(false)}
        checklist={null}
        user={user}
        onSave={handleChecklistSaved}
      />
    </View>
  );
};

export default PreferencesScreen;