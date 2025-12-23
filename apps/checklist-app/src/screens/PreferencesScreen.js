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
import * as Notifications from "expo-notifications";

const defaultPreferences = {
  workoutPreferences: {
    syncWorkoutsToCalendar: false,
    addChecklistToWorkout: false,
    checklistId: "",
  },
  defaultCalendarView: "day",
  // --- NEW DEFAULT PREFERENCE ---
  defaultCalendarId: "", 
  // ------------------------------
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

  const [debugInfo, setDebugInfo] = useState(null);

  const showDebug = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '27ef1245-fbc5-48b1-ad1a-2a9a04ecd642'
    });
    
    setDebugInfo({
      permission: status,
      token: token.data,
    });
  };

  // Use Memo to see if the user is just a 'member' role in any groups
  const isMemberInAnyGroup = useMemo(() => {
    if (!user || !groups) return false;

    return groups.some((group) => {
      const member = group.members.find((m) => m.userId === user.userId);
      return member && member.role === "member";
    });
  }, [user, groups]);
  
  // --- NEW: Generate options for the Default Calendar SelectModal ---
  const defaultCalendarOptions = useMemo(() => {
    // 1. Start with the "None" option
    const options = [{ label: "None", value: "" }];

    // 2. Add Group Calendars
    groups.forEach((group) => {
      options.push({
        label: `${group.name} Calendar`,
        value: `group-${group.groupId}`,
      });
    });

    // 3. Add Google Calendars
    user?.calendars
      ?.filter((cal) => cal.calendarType === "google")
      .forEach((cal) => {
        options.push({
          label: cal.name, // Use the calendar's actual name
          value: cal.calendarId,
        });
      });
      
    // 4. Add the Internal Calendar (Personal)
    options.push({
      label: "Personal Calendar",
      value: "internal",
    });

    return options;
  }, [groups, user?.calendars]);
  // ------------------------------------------------------------------

  // Merge saved preferences with defaults
  const initialPrefs = useMemo(() => {
    return preferences && Object.keys(preferences).length
      ? {
          ...defaultPreferences,
          ...preferences,
          // Ensure defaultCalendarId is merged if it exists on saved preferences
          defaultCalendarId: preferences.defaultCalendarId ?? "", 
          communicationPreferences: {
            ...defaultPreferences.communicationPreferences,
            ...preferences.communicationPreferences,
          },
        }
      : defaultPreferences;
  }, [preferences]);


  const [updatedPreferences, setUpdatedPreferences] = useState(initialPrefs);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Update state when initialPrefs changes (e.g., data loads)
  useEffect(() => {
    setUpdatedPreferences(initialPrefs);
  }, [initialPrefs]);


  // Detect changes
  useEffect(() => {
    // Use initialPrefs as the baseline for comparison
    const changesMade =
      JSON.stringify(initialPrefs) !== JSON.stringify(updatedPreferences);
    setHasChanges(changesMade);
  }, [initialPrefs, updatedPreferences]);


  // 📅 Calendar View Handler
  const handleCalendarViewChange = (value) => {
    setUpdatedPreferences((prev) => ({
      ...prev,
      defaultCalendarView: value,
    }));
  };

  // 📅 Default Calendar ID Handler (NEW)
  const handleDefaultCalendarIdChange = (value) => {
    setUpdatedPreferences((prev) => ({
      ...prev,
      defaultCalendarId: value,
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
      // 1. Update user preferences
      await updateDocument("users", user.userId, {
        preferences: updatedPreferences,
      });
      console.log("User preferences updated successfully!");

      // 2. Update communication preferences in all groups the user belongs to
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
    setUpdatedPreferences(initialPrefs);
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
    // Used for the main section headers (e.g., "Communication")
    sectionHeaderText: {
        ...getTypography.body,
        fontWeight: "700", // Bolder style
        color: theme.text.primary,
        marginBottom: getSpacing.sm,
    },
    // Used for the field labels above the input boxes (e.g., "Default Calendar")
    subHeaderText: {
      ...getTypography.body,
      color: theme.text.secondary,
      marginBottom: getSpacing.sm,
      marginTop: getSpacing.sm,
      // Removed marginBottom here, will add it to the SelectModal for spacing
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
        <TouchableOpacity onPress={showDebug}>
  <Text style={{ padding: 10, backgroundColor: '#007AFF', color: 'white', borderRadius: 5 }}>
    Show Debug Info
  </Text>
</TouchableOpacity>

{debugInfo && (
  <View style={{ padding: 10, backgroundColor: '#f5f5f5', marginTop: 10, borderRadius: 5 }}>
    <Text style={{ fontWeight: 'bold' }}>Permission: {debugInfo.permission}</Text>
    <Text style={{ fontWeight: 'bold', marginTop: 5 }}>Token:</Text>
    <Text style={{ fontSize: 10 }}>{debugInfo.token}</Text>
    <Text style={{ fontWeight: 'bold', marginTop: 5 }}>User ID:</Text>
    <Text style={{ fontSize: 10 }}>{debugInfo.userId}</Text>
    <Text style={{ fontWeight: 'bold', marginTop: 5 }}>Firestore Tokens:</Text>
    <Text style={{ fontSize: 10 }}>{JSON.stringify(debugInfo.firestoreTokens, null, 2)}</Text>
    {debugInfo.error && (
      <Text style={{ color: 'red', marginTop: 5 }}>Error: {debugInfo.error}</Text>
    )}
  </View>
)}
        {/* 📅 Calendar Preferences */}
        <View style={styles.settingContainer}>
          
          {/* SECTION HEADER: BOLD, like Communication */}
          <Text style={styles.sectionHeaderText}>Calendar Preferences</Text> 
          
          {/* Default Calendar View FIELD */}
          <Text style={styles.subHeaderText}>Default Calendar Screen View</Text>
          <SelectModal
            // Add margin to the bottom to separate it from the next label/field
            style={{ marginBottom: getSpacing.md }} 
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
          
          {/* Default Calendar FIELD */}
          <Text style={styles.subHeaderText}>Default Calendar</Text>
          <SelectModal
            // This modal is the last element in the section, no extra margin needed here
            title="Default Calendar"
            value={updatedPreferences.defaultCalendarId || ""}
            options={defaultCalendarOptions}
            getLabel={(option) => option.label}
            getValue={(option) => option.value}
            onSelect={handleDefaultCalendarIdChange}
            placeholder="None"
          />

        </View>

        {/* 🔔 Communication Preferences */}
        <View style={styles.settingContainer}>
          {/* Note: CommunicationPreferences component likely contains its own "Communication" header */}
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