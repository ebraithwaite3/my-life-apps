import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { ToggleRow, SelectModal } from "@my-apps/ui";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { updateUserDoc, updateDocument } from "../services/firestoreService";
import EditChecklist from "@my-apps/ui/src/components/checklists/EditChecklist";

const defaultPreferences = {
  workoutPreferences: {
    syncWorkoutsToCalendar: false,
    addChecklistToWorkout: false,
    checklistId: "",
  },
  defaultCalendarView: 'day',
  notifications: false,
  notifyFor: {
    calendarEvents: false,
    tasks: false,
    grocery: false,
    workout: false,
    reminders: false,
    groupActivity: false,
  },
};

const PreferencesScreen = ({ navigation, route }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { db } = useAuth();
  const { preferences, user, groups } = useData();

  const initialPrefs =
    preferences && Object.keys(preferences).length
      ? {
          ...defaultPreferences,
          ...preferences,
          notifyFor: {
            ...defaultPreferences.notifyFor,
            ...preferences.notifyFor,
          },
        }
      : defaultPreferences;

  const [updatedPreferences, setUpdatedPreferences] = useState(initialPrefs);
  const [hasChanges, setHasChanges] = useState(false);
  const [showEditChecklist, setShowEditChecklist] = useState(false);
  const [notificationDetailsOpen, setNotificationDetailsOpen] = useState(false);

  useEffect(() => {
    const currentBase =
      preferences && Object.keys(preferences).length
        ? {
            ...defaultPreferences,
            ...preferences,
            notifyFor: {
              ...defaultPreferences.notifyFor,
              ...preferences.notifyFor,
            },
          }
        : defaultPreferences;

    const changesMade =
      JSON.stringify(currentBase) !== JSON.stringify(updatedPreferences);
    setHasChanges(changesMade);
  }, [preferences, updatedPreferences]);

  // 🔧 Workout Preference Handlers
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
        ...prev.workoutPreferences,
        checklistId: checklistId || "",
      },
    }));
  };

  // 🔔 Notifications Handlers
  const handleNotificationsToggle = (value) => {
    setUpdatedPreferences((prev) => {
      const newPrefs = { ...prev, notifications: value };
      if (!value) {
        newPrefs.notifyFor = { ...defaultPreferences.notifyFor };
        setNotificationDetailsOpen(false);
      } else {
        newPrefs.notifyFor = {
          ...defaultPreferences.notifyFor,
          ...preferences.notifyFor,
        };
      }
      return newPrefs;
    });
  };

  const handleSpecificNotificationToggle = (key, value) => {
    setUpdatedPreferences((prev) => ({
      ...prev,
      notifyFor: {
        ...prev.notifyFor,
        [key]: value,
      },
    }));
  };

  // 💾 Save & Cancel
  const handleSave = async () => {
    if (!db || !user || !hasChanges) {
      console.warn("Cannot save: missing db/user or no changes.", db, user, hasChanges);
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
        ? {
            ...defaultPreferences,
            ...preferences,
            notifyFor: {
              ...defaultPreferences.notifyFor,
              ...preferences.notifyFor,
            },
          }
        : defaultPreferences;
    setUpdatedPreferences(merged);
    setNotificationDetailsOpen(false);
  };

  const notificationDetails = [
    { key: "calendarEvents", label: "Calendar Events" },
    { key: "tasks", label: "Tasks" },
    { key: "grocery", label: "Grocery" },
    { key: "workout", label: "Workout" },
    { key: "reminders", label: "Reminders" },
  ];

  if (groups && groups.length > 0) {
    notificationDetails.push({ key: "groupActivity", label: "Group Activity" });
  }

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
    notificationDetailsButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      paddingVertical: getSpacing.sm,
      marginTop: getSpacing.sm,
    },
    notificationDetailsText: {
      ...getTypography.body,
      color: theme.text.secondary,
    },
    notificationDetailsList: {
      marginTop: getSpacing.md,
      paddingLeft: getSpacing.md,
      borderLeftWidth: 2,
      borderLeftColor: theme.border,
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
      opacity: hasChanges ? 1 : 0.5,
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

  const isSaveDisabled =
    !hasChanges ||
    (updatedPreferences.workoutPreferences?.addChecklistToWorkout &&
      !updatedPreferences.workoutPreferences?.checklistId);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Preferences</Text>
        {/* 🔔 Notifications Preferences */}
        <View style={styles.settingContainer}>
          <ToggleRow
            title="Notifications"
            value={updatedPreferences.notifications || false}
            onValueChange={handleNotificationsToggle}
          />

          {updatedPreferences.notifications && (
            <>
              <TouchableOpacity
                style={styles.notificationDetailsButton}
                onPress={() => setNotificationDetailsOpen(!notificationDetailsOpen)}
              >
                <Text style={styles.notificationDetailsText}>
                  Edit Specific Notifications
                </Text>
                <Ionicons
                  name={notificationDetailsOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.text.secondary}
                />
              </TouchableOpacity>

              {notificationDetailsOpen && (
                <View style={styles.notificationDetailsList}>
                  {notificationDetails.map((item) => (
                    <ToggleRow
                      key={item.key}
                      title={item.label}
                      value={updatedPreferences.notifyFor?.[item.key] || false}
                      onValueChange={(value) =>
                        handleSpecificNotificationToggle(item.key, value)
                      }
                      containerStyle={{ marginTop: getSpacing.sm }}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {hasChanges && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { opacity: isSaveDisabled ? 0.5 : 1 }]}
              onPress={handleSave}
              disabled={isSaveDisabled}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Checklist Creation Modal */}
      <EditChecklist
        isVisible={showEditChecklist}
        onClose={() => setShowEditChecklist(false)}
        checklist={null}
        user={user}
        onSave={() => console.log("Checklist saved")}
        updateDocument={updateDocument}
      />
    </View>
  );
};

export default PreferencesScreen;
