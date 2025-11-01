import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
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
  const [showChecklistPicker, setShowChecklistPicker] = useState(false);
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
    setShowChecklistPicker(false);
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

    // Validate that if addChecklistToWorkout is true, checklistId must be set
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
    // Optional: You can refresh data or show a success message
    console.log("Checklist saved successfully!");
    // The DataContext should automatically update with the new checklist
  };

  // Check if save button should be disabled
  const isSaveDisabled = () => {
    if (!hasChanges) return true;
    
    // If addChecklistToWorkout is enabled but no checklist selected, disable save
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
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      marginBottom: getSpacing.xl,
    },
    settingTitle: {
      ...getTypography.h3,
      color: theme.text.primary,
      fontWeight: "bold",
    },
    subHeaderText: {
      ...getTypography.body,
      color: theme.text.secondary,
      marginBottom: getSpacing.sm,
    },
    checklistButton: {
      width: "100%",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.surface || theme.background,
      paddingVertical: 12,
      paddingHorizontal: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    checklistButtonText: {
      fontSize: 16,
      color: theme.text.primary,
    },
    checklistPlaceholder: {
      fontSize: 16,
      color: theme.text.secondary,
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
    checklistPickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    checklistPickerModal: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      width: "90%",
      maxHeight: "60%",
      marginHorizontal: getSpacing.lg,
    },
    checklistPickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    checklistPickerTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
    },
    checklistPickerDone: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.primary,
    },
    checklistOption: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    selectedChecklistOption: {
      backgroundColor: theme.primary + "20",
    },
    checklistOptionText: {
      fontSize: getTypography.body.fontSize,
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
          <View style={styles.settingRow}>
            <Text style={styles.settingTitle}>Sync Workouts to Calendar</Text>
            <Switch
              onValueChange={(value) =>
                handleToggle("syncWorkoutsToCalendar", value)
              }
              value={
                updatedPreferences.workoutPreferences?.syncWorkoutsToCalendar ||
                false
              }
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={
                updatedPreferences.workoutPreferences?.syncWorkoutsToCalendar
                  ? theme.text.inverse
                  : theme.border
              }
            />
          </View>

          {updatedPreferences.workoutPreferences?.syncWorkoutsToCalendar && (
            <>
              <View style={styles.settingRow}>
                <Text style={styles.settingTitle}>Add Checklist To Workout</Text>
                <Switch
                  onValueChange={(value) =>
                    handleToggle("addChecklistToWorkout", value)
                  }
                  value={
                    updatedPreferences.workoutPreferences
                      ?.addChecklistToWorkout || false
                  }
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={
                    updatedPreferences.workoutPreferences?.addChecklistToWorkout
                      ? theme.text.inverse
                      : theme.border
                  }
                />
              </View>

              {updatedPreferences.workoutPreferences?.addChecklistToWorkout && (
                <View style={{ width: "100%", marginTop: 0 }}>
                  <Text style={styles.subHeaderText}>Select Checklist</Text>

                  {user?.savedChecklists?.length > 0 ? (
                    <>
                      <TouchableOpacity
                        style={styles.checklistButton}
                        onPress={() => setShowChecklistPicker(true)}
                      >
                        <Text
                          style={
                            selectedChecklist
                              ? styles.checklistButtonText
                              : styles.checklistPlaceholder
                          }
                        >
                          {selectedChecklist?.name || "— Pick a checklist —"}
                        </Text>
                        <Text style={styles.checklistButtonText}>›</Text>
                      </TouchableOpacity>
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
          <View style={[styles.settingRow, { marginTop: getSpacing.xl }]}>
            <Text style={styles.settingTitle}>Track Rep Goals</Text>
            <Switch
              onValueChange={(value) =>
                handleToggle("trackRepGoals", value)
              }
              value={
                updatedPreferences.workoutPreferences?.trackRepGoals ||
                false
              }
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={
                updatedPreferences.workoutPreferences?.trackRepGoals
                  ? theme.text.inverse
                  : theme.border
              }
            />
          </View>
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

      {/* Checklist Picker Modal */}
      {showChecklistPicker && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showChecklistPicker}
          onRequestClose={() => setShowChecklistPicker(false)}
        >
          <TouchableWithoutFeedback
            onPress={() => setShowChecklistPicker(false)}
          >
            <View style={styles.checklistPickerOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.checklistPickerModal}>
                  <View style={styles.checklistPickerHeader}>
                    <Text style={styles.checklistPickerTitle}>
                      Select Checklist
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowChecklistPicker(false)}
                    >
                      <Text style={styles.checklistPickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView>
                    {user?.savedChecklists?.map((checklist) => (
                      <TouchableOpacity
                        key={checklist.id}
                        style={[
                          styles.checklistOption,
                          String(checklist.id) === selectedChecklistId &&
                            styles.selectedChecklistOption,
                        ]}
                        onPress={() =>
                          handleChecklistSelect(String(checklist.id))
                        }
                      >
                        <Text style={styles.checklistOptionText}>
                          {checklist.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Edit Checklist Modal */}
      <EditChecklist
        isVisible={showEditChecklist}
        onClose={() => setShowEditChecklist(false)}
        checklist={null} // null = creating new checklist
        user={user}
        onSave={handleChecklistSaved}
      />
    </View>
  );
};

export default PreferencesScreen;