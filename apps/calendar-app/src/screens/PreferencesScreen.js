import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { ToggleRow, SelectModal } from "@my-apps/ui";  // 👈 Import shared components
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { updateUserDoc } from "../services/firestoreService";
import ChecklistCard from "../components/cards/ChecklistCard/ChecklistCard";
import EditChecklist from "../components/cards/ChecklistCard/EditChecklist";

const defaultPreferences = {
  defaultLoadingPage: "Today",
  notifications: false,
  notifyFor: {
    groupActivity: false,
    newTasks: false,
    deletedTasks: false,
    newEvents: false,
    updatedEvents: false,
    deletedEvents: false,
  },
};

const PreferencesScreen = ({navigation, route}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { db } = useAuth();
  const { preferences, user, groups } = useData();
  const initialPrefs =
    preferences && Object.keys(preferences).length
      ? { ...defaultPreferences, ...preferences, notifyFor: { ...defaultPreferences.notifyFor, ...preferences.notifyFor } }
      : defaultPreferences;
  const [updatedPreferences, setUpdatedPreferences] = useState(initialPrefs);
  const [hasChanges, setHasChanges] = useState(false);
  const [notificationDetailsOpen, setNotificationDetailsOpen] = useState(false);
  const [checklistsOpen, setChecklistsOpen] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  console.log(
    "DB In preferencesScreen:",
    db,
    "User:",
    user ? user.email || user.username : "No user",
    "Preferences:",
    preferences,
  );

  // Deconstruct checklistsOpen from navigation params if available
  const { openChecklists } = route.params || {};
  console.log("Navigation params:", route.params, "openChecklists:", openChecklists);

  // Use effect to open checklists section if param is set
  useEffect(() => {
    if (openChecklists) {
      setChecklistsOpen(true);
    }
  }, [openChecklists]);

  useEffect(() => {
    const mergedPrefs =
      preferences && Object.keys(preferences).length
        ? { ...defaultPreferences, ...preferences, notifyFor: { ...defaultPreferences.notifyFor, ...preferences.notifyFor } }
        : defaultPreferences;
    setUpdatedPreferences(mergedPrefs);
  }, [preferences]);

  useEffect(() => {
    const currentBase =
      preferences && Object.keys(preferences).length
        ? { ...defaultPreferences, ...preferences, notifyFor: { ...defaultPreferences.notifyFor, ...preferences.notifyFor } }
        : defaultPreferences;
    const changesMade =
      JSON.stringify(currentBase) !== JSON.stringify(updatedPreferences);
    setHasChanges(changesMade);
  }, [preferences, updatedPreferences]);

  const defaultLoadingPageOptions = [
    { label: "Today", value: "Today" },
    { label: "Calendar", value: "Calendar" },
  ];

  const openCreateModal = () => {
    setIsCreateModalVisible(true);
  };
  
  const closeCreateModal = () => {
    setIsCreateModalVisible(false);
  };

  const savedChecklists = useMemo(() => {
    const checklists = user?.savedChecklists || [];
    // Sort checklists: accepted: false first, then everything else
    return checklists.sort((a, b) => {
      if (a.accepted === false && b.accepted !== false) return -1;
      if (a.accepted !== false && b.accepted === false) return 1;
      return 0; // Keep original order for same type
    });
  }, [user]);
  console.log("Saved Checklists:", savedChecklists);

  const handleSelectDefaultPage = (value) => {
    setUpdatedPreferences((prev) => ({
      ...prev,
      defaultLoadingPage: value,
    }));
  };

  const handleNotificationsToggle = (value) => {
    setUpdatedPreferences((prev) => {
      const newPrefs = {
        ...prev,
        notifications: value,
      };
      if (!value) {
        newPrefs.notifyFor = {
          ...defaultPreferences.notifyFor,
        };
        setNotificationDetailsOpen(false);
      } else {
        if (preferences?.notifications) {
          newPrefs.notifyFor = {
            ...defaultPreferences.notifyFor,
            ...preferences.notifyFor,
          };
        } else {
          newPrefs.notifyFor = {
            ...defaultPreferences.notifyFor,
            groupActivity: true,
            newTasks: true,
            deletedTasks: true,
            newEvents: true,
            updatedEvents: true,
            deletedEvents: true,
          };
        }
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

  const handleSave = async () => {
    if (!db || !user || !hasChanges) {
      console.warn(
        "Cannot save: Database not initialized, no user, or no changes.",
        db,
        user,
        hasChanges
      );
      return;
    }
    console.log(
      "Saving preferences:",
      updatedPreferences,
      "With db and user:",
      db,
      user.userId
    );

    try {
      await updateUserDoc(db, user.userId, { preferences: updatedPreferences });
      console.log("User preferences updated successfully!");
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  };

  const handleCancel = () => {
    const merged =
      preferences && Object.keys(preferences).length
        ? { ...defaultPreferences, ...preferences, notifyFor: { ...defaultPreferences.notifyFor, ...preferences.notifyFor } }
        : defaultPreferences;
    setUpdatedPreferences(merged);
    setNotificationDetailsOpen(false);
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
      paddingBottom: getSpacing.xxl, // Extra bottom padding
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
    settingTitle: {
      ...getTypography.h3,
      color: theme.text.primary,
      fontWeight: "bold",
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
    // New styles for checklist section
    checklistsContainer: {
      width: "100%",
    },
    checklistsList: {
      width: "100%",
    },
    checklistCardWrapper: {
      marginBottom: getSpacing.md,
      width: "100%",
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
    createChecklistButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary + '15',
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.primary,
      marginBottom: getSpacing.md,
    },
    createChecklistButtonText: {
      ...getTypography.body,
      color: theme.primary,
      fontWeight: "600",
      marginLeft: getSpacing.xs,
    },
    emptyChecklistsText: {
      ...getTypography.body,
      color: theme.text.secondary,
      textAlign: "center",
      fontStyle: "italic",
      marginBottom: getSpacing.md,
    },
    titleWithIcon: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
      },
      notificationIcon: {
        marginLeft: getSpacing.sm,
      },
      settingHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: getSpacing.sm,
      },
  });

  const notificationDetails = [
    { key: "groupActivity", label: "Group Activity" },
    {key: "newTasks", label: "New Tasks" },
    { key: "deletedTasks", label: "Deleted Tasks" },
    { key: "newEvents", label: "New Events" },
  { key: "updatedEvents", label: "Updated Events" },
  { key: "deletedEvents", label: "Deleted Events" },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={false}
      >
        <Text style={styles.title}>Preferences</Text>

        <View style={styles.settingContainer}>
          <Text style={styles.settingTitle}>Default Loading Page</Text>
          {/* 👇 REPLACED: Radio buttons with clean SelectModal */}
          <SelectModal
            title="Default Loading Page"
            placeholder="— Select default page —"
            value={updatedPreferences.defaultLoadingPage || ""}
            options={defaultLoadingPageOptions}
            onSelect={handleSelectDefaultPage}
            getLabel={(item) => item.label}
            getValue={(item) => item.value}
          />
        </View>

        <View style={styles.settingContainer}>
          {/* 👇 REPLACED: Main Switch with clean ToggleRow */}
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
                      onValueChange={(value) => handleSpecificNotificationToggle(item.key, value)}
                      containerStyle={{ marginTop: getSpacing.sm }}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.settingContainer}>
        <TouchableOpacity
  style={styles.settingHeader}
  onPress={() => setChecklistsOpen(!checklistsOpen)}
>
  <View style={styles.titleWithIcon}>
    <Text style={styles.settingTitle}>
      Saved Checklist{savedChecklists.length !== 1 ? "s" : ""}
      {savedChecklists.length > 0 ? ` (${savedChecklists.length})` : ""}
    </Text>
    {/* Show notification icon if there are pending shared checklists */}
    {savedChecklists.some(checklist => checklist.accepted === false) && (
      <Ionicons
        name="notifications"
        size={18}
        color={theme.primary}
        style={styles.notificationIcon}
      />
    )}
  </View>
  <Ionicons
    name={checklistsOpen ? "chevron-up" : "chevron-down"}
    size={20}
    color={theme.text.secondary}
  />            
</TouchableOpacity>

          {(checklistsOpen || savedChecklists?.length === 0) && (
            <View style={styles.checklistsContainer}>
              {/* Create Button */}
              <TouchableOpacity 
                style={styles.createChecklistButton}
                onPress={openCreateModal}
              >
                <Ionicons name="add" size={18} color={theme.primary} />
                <Text style={styles.createChecklistButtonText}>
                  Create New Checklist
                </Text>
              </TouchableOpacity>

              {/* Checklist List */}
              {savedChecklists.length === 0 ? (
                <Text style={styles.emptyChecklistsText}>
                  No saved checklists yet. Create your first one above!
                </Text>
              ) : (
                <View style={styles.checklistsList}>
                  {savedChecklists.map((checklist, index) => (
                    <View key={checklist.id || index} style={styles.checklistCardWrapper}>
                      <ChecklistCard 
                        checklist={checklist} 
                        user={user} 
                        groups={groups}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
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
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={!hasChanges}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <EditChecklist
        isVisible={isCreateModalVisible}
        onClose={closeCreateModal}
        checklist={null}
        user={user}
      />
    </View>
  );
};

export default PreferencesScreen;