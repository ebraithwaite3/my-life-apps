import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { updateUserDoc } from "../services/firestoreService";
import ChecklistCard from "../components/cards/ChecklistCard/ChecklistCard";
import EditChecklist from "../components/cards/ChecklistCard/EditChecklist";

const PreferencesScreen = ({navigation, route}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { db } = useAuth();
  const { preferences, user, groups } = useData();
  const [updatedPreferences, setUpdatedPreferences] = useState(preferences);
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
    setUpdatedPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const changesMade =
      JSON.stringify(preferences) !== JSON.stringify(updatedPreferences);
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

  const handleRadioChange = (key, value) => {
    setUpdatedPreferences((prev) => ({
      ...prev,
      [key]: value,
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
          ...prev.notifyFor,
          groupActivity: false,
          newTasks: false,
          deletedTasks: false,
          newEvents: false,
          updatedEvents: false,
          deletedEvents: false,
        };
        setNotificationDetailsOpen(false);
      } else {
        if (preferences.notifications) {
          newPrefs.notifyFor = {
            ...prev.notifyFor,
            groupActivity: preferences.notifyFor?.groupActivity || false,
            newTasks: preferences.notifyFor?.newTasks || false,
            deletedTasks: preferences.notifyFor?.deletedTasks || false,
            newEvents: preferences.notifyFor?.newEvents || false,
            updatedEvents: preferences.notifyFor?.updatedEvents || false,
            deletedEvents: preferences.notifyFor?.deletedEvents || false,
          };
        } else {
          newPrefs.notifyFor = {
            ...prev.notifyFor,
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
    setUpdatedPreferences(preferences);
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
    settingHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: getSpacing.sm,
    },
    settingTitle: {
      ...getTypography.h3,
      color: theme.text.primary,
      fontWeight: "bold",
    },
    optionsContainer: {
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
    },
    radioOption: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: getSpacing.lg,
      paddingVertical: getSpacing.sm,
    },
    radioCircle: {
      height: 20,
      width: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: getSpacing.sm,
    },
    selectedRadioCircle: {
      borderColor: theme.primary,
    },
    radioInnerCircle: {
      height: 10,
      width: 10,
      borderRadius: 5,
      backgroundColor: theme.primary,
    },
    radioLabel: {
      ...getTypography.body,
      color: theme.text.primary,
    },
    notificationMainRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
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
    notificationDetailItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: getSpacing.sm,
    },
    notificationDetailLabel: {
      ...getTypography.body,
      color: theme.text.primary,
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
  });

  const RadioButton = ({ label, value, selectedValue, onSelect }) => (
    <TouchableOpacity
      style={styles.radioOption}
      onPress={() => onSelect(value)}
      accessible={true}
      accessibilityLabel={label}
      accessibilityState={{ selected: value === selectedValue }}
    >
      <View
        style={[
          styles.radioCircle,
          value === selectedValue && styles.selectedRadioCircle,
        ]}
      >
        {value === selectedValue && <View style={styles.radioInnerCircle} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );

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
          <View style={styles.optionsContainer}>
            {defaultLoadingPageOptions.map((option) => (
              <RadioButton
                key={option.value}
                label={option.label}
                value={option.value}
                selectedValue={updatedPreferences.defaultLoadingPage}
                onSelect={(val) => handleRadioChange("defaultLoadingPage", val)}
              />
            ))}
          </View>
        </View>

        <View style={styles.settingContainer}>
          <View style={styles.notificationMainRow}>
            <Text style={styles.settingTitle}>Notifications</Text>
            <Switch
              onValueChange={handleNotificationsToggle}
              value={updatedPreferences.notifications}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={
                updatedPreferences.notifications
                  ? theme.text.inverse
                  : theme.border
              }
            />
          </View>

          {updatedPreferences.notifications && (
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
          )}

          {updatedPreferences.notifications && notificationDetailsOpen && (
            <View style={styles.notificationDetailsList}>
              {notificationDetails.map((item) => (
                <View key={item.key} style={styles.notificationDetailItem}>
                  <Text style={styles.notificationDetailLabel}>{item.label}</Text>
                  <Switch
                    onValueChange={(value) =>
                      handleSpecificNotificationToggle(item.key, value)
                    }
                    value={updatedPreferences.notifyFor?.[item.key] || false}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor={
                      updatedPreferences.notifyFor?.[item.key]
                        ? theme.text.inverse
                        : theme.border
                    }
                  />
                </View>
              ))}
            </View>
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