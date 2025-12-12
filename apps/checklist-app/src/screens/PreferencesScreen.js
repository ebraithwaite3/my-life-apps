import React, { useState, useEffect, useMemo } from "react";
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
import { SelectModal, CommunicationPreferences, PageHeader } from "@my-apps/ui";
import { useData } from "@my-apps/contexts";
import { useAuth } from "@my-apps/contexts";
import { updateDocument } from "@my-apps/services";
import { doc, updateDoc, getDoc } from "firebase/firestore";

const defaultPreferences = {
  workoutPreferences: {
    syncWorkoutsToCalendar: false,
    addChecklistToWorkout: false,
    checklistId: "",
  },
  defaultCalendarView: "day",
  communicationPreferences: {
    notifications: {
      active: true,
      notifyFor: {
        creation: {
          events: true,
          activities: true,
        },
        edits: {
          events: true,
          activities: true,
        },
        deletions: {
          events: true,
          activities: true,
        },
        reminders: {
          events: true,
          activities: true,
        },
        messages: {
          events: true,
          activities: true,
        },
      },
    },
    messages: {
      active: true,
      notifyFor: {
        creation: {
          events: true,
          activities: true,
        },
        edits: {
          events: true,
          activities: true,
        },
        deletions: {
          events: true,
          activities: true,
        },
        reminders: {
          events: true,
          activities: true,
        },
        messages: {
          events: true,
          activities: true,
        },
      },
    },
  },
};

const PreferencesScreen = ({ navigation, route }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { db } = useAuth();
  const { preferences, user, groups } = useData();

  // Use Memo to see if the user is just a 'member' role in any groups
  const isMemberInAnyGroup = useMemo(() => {
    if (!user || !groups) return false;

    return groups.some((group) => {
      const member = group.members.find((m) => m.userId === user.userId);
      return member && member.role === "member";
    });
  }, [user, groups]);

  // Merge saved preferences with defaults
  const initialPrefs =
    preferences && Object.keys(preferences).length
      ? {
          ...defaultPreferences,
          ...preferences,
          communicationPreferences: {
            ...defaultPreferences.communicationPreferences,
            ...preferences.communicationPreferences,
          },
        }
      : defaultPreferences;

  const [updatedPreferences, setUpdatedPreferences] = useState(initialPrefs);
  const [hasChanges, setHasChanges] = useState(false);

  // Detect changes
  useEffect(() => {
    const currentBase =
      preferences && Object.keys(preferences).length
        ? {
            ...defaultPreferences,
            ...preferences,
            communicationPreferences: {
              ...defaultPreferences.communicationPreferences,
              ...preferences.communicationPreferences,
            },
          }
        : defaultPreferences;

    const changesMade =
      JSON.stringify(currentBase) !== JSON.stringify(updatedPreferences);
    setHasChanges(changesMade);
  }, [preferences, updatedPreferences]);

  // 📅 Calendar View Handler
  const handleCalendarViewChange = (value) => {
    setUpdatedPreferences((prev) => ({
      ...prev,
      defaultCalendarView: value,
    }));
  };

  // 🔔 Communication Preferences Handler
  const handleCommunicationUpdate = (newCommPrefs) => {
    setUpdatedPreferences((prev) => ({
      ...prev,
      communicationPreferences: newCommPrefs,
    }));
  };

  // 💾 Save
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

    try {
      // Update user preferences
      await updateDocument("users", user.userId, {
        preferences: updatedPreferences,
      });
      console.log("User preferences updated successfully!");

      // Update communication preferences in all groups the user belongs to
      if (user.groups && user.groups.length > 0) {
        console.log("Updating preferences in groups:", user.groups);

        const groupUpdatePromises = user.groups.map(async (groupId) => {
          try {
            // Get fresh group data from Firestore
            const groupDocRef = doc(db, "groups", groupId);
            const groupDocSnap = await getDoc(groupDocRef);

            if (groupDocSnap.exists()) {
              const groupData = groupDocSnap.data();

              if (groupData.members) {
                // Update the member's preferences in the group
                const updatedMembers = groupData.members.map((member) => {
                  if (member.userId === user.userId) {
                    return {
                      ...member,
                      preferences: updatedPreferences.communicationPreferences,
                    };
                  }
                  return member;
                });

                // Update the group document
                await updateDoc(groupDocRef, { members: updatedMembers });
                console.log(
                  `Updated preferences in group: ${groupData.name || groupId}`
                );
              }
            }
          } catch (error) {
            console.error(`Failed to update group ${groupId}:`, error);
          }
        });

        await Promise.all(groupUpdatePromises);
        console.log("All group preferences updated successfully!");
      }

      Alert.alert("Success", "Preferences saved successfully!");
    } catch (error) {
      console.error("Failed to save preferences:", error);
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    }
  };

  // ❌ Cancel
  const handleCancel = () => {
    const merged =
      preferences && Object.keys(preferences).length
        ? {
            ...defaultPreferences,
            ...preferences,
            communicationPreferences: {
              ...defaultPreferences.communicationPreferences,
              ...preferences.communicationPreferences,
            },
          }
        : defaultPreferences;
    setUpdatedPreferences(merged);
  };

  // Custom categories for organizer app
  const categories = [
    {
      key: "creation",
      label: "Created",
      description: "New events or activities",
    },
    {
      key: "edits",
      label: "Edited",
      description: "Changes to events or activities",
    },
    {
      key: "deletions",
      label: "Deleted",
      description: "Removed events or activities",
    },
    {
      key: "reminders",
      label: "Reminders",
      description: "Upcoming event reminders",
    },
    {
      key: "messages",
      label: "Messages",
      description: "Notes and messages on items",
    },
  ];

  const itemTypes = [
    { key: "events", label: "Calendar Events" },
    { key: "activities", label: "Group Activities" },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      alignItems: "center",
      padding: getSpacing.md,
      paddingTop: getSpacing.md,
      paddingBottom: getSpacing.md,
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
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.1,
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

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <PageHeader
        showBackButton={false}
        showNavArrows={false}
        title="Preferences"
        subtext="Customize your app experience"
        icons={[]}
      />

      <ScrollView
        showsVerticalScrollIndicator
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 📅 Calendar Preferences */}
        <View style={styles.settingContainer}>
          <Text style={styles.subHeaderText}>Calendar</Text>
          <SelectModal
            title="Default Calendar View"
            value={updatedPreferences.defaultCalendarView || "day"}
            options={[
              { label: "Day View", value: "day" },
              { label: "Month View", value: "month" },
            ]}
            getLabel={(option) => option.label}
            getValue={(option) => option.value}
            onSelect={handleCalendarViewChange}
          />
        </View>

        {/* 🔔 Communication Preferences */}
        <View style={styles.settingContainer}>
          <CommunicationPreferences
            preferences={updatedPreferences.communicationPreferences}
            onUpdate={handleCommunicationUpdate}
            categories={categories}
            itemTypes={itemTypes}
            isMemberInAnyGroup={isMemberInAnyGroup}
          />
        </View>

        {/* Add bottom padding when buttons are showing */}
        {hasChanges && <View style={{ height: 100 }} />}
      </ScrollView>

      {/* Sticky Save/Cancel Footer */}
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