import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@my-apps/contexts";
import { SelectModal, PageHeader, ScheduleTemplateEditor, ChecklistSelector, EditChecklistContent } from "@my-apps/ui";
import { useData } from "@my-apps/contexts";
import { useAuth } from "@my-apps/contexts";
import { updateDocument } from "@my-apps/services";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useChecklistTemplates } from "@my-apps/hooks";

const defaultPreferences = {
  defaultCalendarView: "day",
  defaultCalendarId: "",
};

const PreferencesScreen = ({ navigation, route }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { db } = useAuth();
  const { 
    preferences, 
    user, 
    groups,
    templates,              // ← FROM HOOK
    templatesLoading,       // ← FROM HOOK
  } = useData();

  // View state management
  const [currentView, setCurrentView] = useState("preferences");
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Generate options for the Default Calendar SelectModal
  const defaultCalendarOptions = useMemo(() => {
    const options = [{ label: "None", value: "" }];

    // Add Group Calendars
    groups.forEach((group) => {
      options.push({
        label: `${group.name} Calendar`,
        value: `group-${group.groupId}`,
      });
    });

    // Add Google Calendars
    user?.calendars
      ?.filter((cal) => cal.calendarType === "google")
      .forEach((cal) => {
        options.push({
          label: cal.name,
          value: cal.calendarId,
        });
      });

    // Add Internal Calendar (Personal)
    options.push({
      label: "Personal Calendar",
      value: "internal",
    });

    return options;
  }, [groups, user?.calendars]);

  // Merge saved preferences with defaults
  const initialPrefs = useMemo(() => {
    return preferences && Object.keys(preferences).length
      ? {
          ...defaultPreferences,
          ...preferences,
          defaultCalendarId: preferences.defaultCalendarId ?? "",
        }
      : defaultPreferences;
  }, [preferences]);

  // Add checklist templates hook
  const { allTemplates, saveTemplate, promptForContext } = useChecklistTemplates();
  
  // Add state for selected checklist
  const [selectedChecklist, setSelectedChecklist] = useState(null);

  const [updatedPreferences, setUpdatedPreferences] = useState(initialPrefs);
  const [hasChanges, setHasChanges] = useState(false);

  // Update state when initialPrefs changes
  useEffect(() => {
    setUpdatedPreferences(initialPrefs);
  }, [initialPrefs]);

  // Detect changes
  useEffect(() => {
    const changesMade =
      JSON.stringify(initialPrefs) !== JSON.stringify(updatedPreferences);
    setHasChanges(changesMade);
  }, [initialPrefs, updatedPreferences]);

  // Calendar View Handler
  const handleCalendarViewChange = (value) => {
    setUpdatedPreferences((prev) => ({
      ...prev,
      defaultCalendarView: value,
    }));
  };

  // Default Calendar ID Handler
  const handleDefaultCalendarIdChange = (value) => {
    setUpdatedPreferences((prev) => ({
      ...prev,
      defaultCalendarId: value,
    }));
  };

  // Save preferences
  const handleSave = async () => {
    if (!db || !user || !hasChanges) {
      console.warn("Cannot save: missing db/user or no changes.");
      return;
    }

    try {
      await updateDocument("users", user.userId, {
        preferences: updatedPreferences,
      });

      Alert.alert("Success", "Preferences saved successfully!");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save preferences:", error);
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    }
  };

  // Cancel changes
  const handleCancel = () => {
    setUpdatedPreferences(initialPrefs);
  };

  // Switch to template editor (new template)
  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setCurrentView("templateEditor");
  };

  // Switch to template editor (existing template)
  const handleTemplatePress = (template) => {
    setSelectedTemplate(template);
    setCurrentView("templateEditor");
  };

  // Return to preferences view
  const handleBackToPreferences = () => {
    setCurrentView("preferences");
    setSelectedTemplate(null);
    // No need to manually refresh - hook handles it!
  };

  const activities = useMemo(() => [
    {
      type: "checklist",
      label: "Checklist",
      required: false, // Optional in template events
      SelectorComponent: ChecklistSelector,
      EditorComponent: EditChecklistContent,
      selectedActivity: selectedChecklist,
      onSelectActivity: setSelectedChecklist,
      transformTemplate: (template) => ({
        id: `checklist_${Date.now()}`,
        name: template.name,
        items: template.items.map((item, index) => ({
          ...item,
          id: item.id || `item_${Date.now()}_${index}`,
          completed: false,
        })),
        createdAt: Date.now(),
      }),
      editorProps: {
        templates: allTemplates,
        onSaveTemplate: saveTemplate,
        promptForContext,
        isUserAdmin: user?.admin === true,
      },
    },
  ], [selectedChecklist, allTemplates, user?.admin]);

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
    sectionHeaderText: {
      ...getTypography.body,
      fontWeight: "700",
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    subHeaderText: {
      ...getTypography.body,
      color: theme.text.secondary,
      marginBottom: getSpacing.sm,
      marginTop: getSpacing.sm,
    },
    // Template list styles
    templateListContainer: {
      marginTop: getSpacing.md,
    },
    templateCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: getSpacing.md,
      marginBottom: getSpacing.sm,
      flexDirection: "row",
      alignItems: "center",
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginRight: getSpacing.sm,
    },
    templateInfo: {
      flex: 1,
    },
    templateName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text.primary,
      marginBottom: 2,
    },
    templateDetails: {
      fontSize: 13,
      color: theme.text.secondary,
    },
    addButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      padding: getSpacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: getSpacing.sm,
    },
    addButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "600",
      marginLeft: getSpacing.xs,
    },
    emptyState: {
      alignItems: "center",
      padding: getSpacing.lg,
    },
    emptyText: {
      fontSize: 14,
      color: theme.text.secondary,
      textAlign: "center",
      marginTop: getSpacing.sm,
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
      {currentView === "preferences" ? (
        <>
          {/* PREFERENCES VIEW */}
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
              <Text style={styles.sectionHeaderText}>Calendar Preferences</Text>

              <Text style={styles.subHeaderText}>Default Calendar Screen View</Text>
              <SelectModal
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

              <Text style={styles.subHeaderText}>Default Calendar</Text>
              <SelectModal
                title="Default Calendar"
                value={updatedPreferences.defaultCalendarId || ""}
                options={defaultCalendarOptions}
                getLabel={(option) => option.label}
                getValue={(option) => option.value}
                onSelect={handleDefaultCalendarIdChange}
                placeholder="None"
              />
            </View>

            {/* 📋 Schedule Templates (Admin Only) */}
            {user?.admin && (
              <View style={styles.settingContainer}>
                <Text style={styles.sectionHeaderText}>Schedule Templates</Text>

                {templatesLoading ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : templates.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon
                      name="calendar-blank"
                      size={48}
                      color={theme.text.secondary}
                    />
                    <Text style={styles.emptyText}>
                      No schedule templates yet.{"\n"}Create your first one!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.templateListContainer}>
                    {templates.map((template) => (
                      <TouchableOpacity
                        key={template.id}
                        style={styles.templateCard}
                        onPress={() => handleTemplatePress(template)}
                      >
                        <View style={styles.iconContainer}>
                          <Icon
                            name={template.icon || "calendar-week"}
                            size={20}
                            color={theme.primary}
                          />
                        </View>
                        <View style={styles.templateInfo}>
                          <Text style={styles.templateName}>{template.name}</Text>
                          <Text style={styles.templateDetails}>
                            {template.events?.length || 0} events
                          </Text>
                        </View>
                        <Icon
                          name="chevron-right"
                          size={20}
                          color={theme.text.secondary}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleCreateTemplate}
                >
                  <Icon name="plus" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Create New Template</Text>
                </TouchableOpacity>
              </View>
            )}

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
        </>
      ) : (
        <>
        {console.log('🎨 Rendering TEMPLATE EDITOR view')}
        {console.log('Selected template:', selectedTemplate)}
          <View style={{ flex: 1 }}>
    {/* TEMPLATE EDITOR VIEW */}
    <ScheduleTemplateEditor
      template={selectedTemplate}
      userCalendars={user?.calendars || []}
      activities={activities}
      onClose={handleBackToPreferences}
    />
  </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default PreferencesScreen;