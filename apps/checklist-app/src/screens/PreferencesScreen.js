import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@my-apps/contexts";
import {
  SelectModal,
  PageHeader,
  ScheduleTemplateEditor,
  ChecklistSelector,
  EditChecklistContent,
  StandAloneReminderEditor,
  QuickSendModal,
} from "@my-apps/ui";
import { useData } from "@my-apps/contexts";
import { useAuth } from "@my-apps/contexts";
import { updateDocument } from "@my-apps/services";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useChecklistTemplates } from "@my-apps/hooks";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, addDoc } from "firebase/firestore";

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
    templates,
    templatesLoading,
    reminders,
    remindersLoading,
    toggleReminderActive,
    saveReminder,
    deleteReminder,
  } = useData();

  // View state management
  const [currentView, setCurrentView] = useState("preferences");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [showReminderEditor, setShowReminderEditor] = useState(false); // ← NEW
  const [showQuickSend, setShowQuickSend] = useState(false); // ← NEW
  const [quickSendMode, setQuickSendMode] = useState("now"); // 'now' or 'schedule'

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
  const { allTemplates, saveTemplate, promptForContext } =
    useChecklistTemplates();

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
  };

  // UPDATED: Reminder handlers use modal state instead of view switching
  const handleCreateReminder = () => {
    setSelectedReminder(null);
    setShowReminderEditor(true); // ← Changed
  };

  const handleReminderPress = (reminder) => {
    setSelectedReminder(reminder);
    setShowReminderEditor(true); // ← Changed
  };

  const handleToggleReminder = async (reminderId, isActive) => {
    console.log('🔄 Toggle called:', reminderId, 'to', isActive);
    try {
      await toggleReminderActive(reminderId, isActive);
      console.log('✅ Toggle successful');
    } catch (error) {
      console.error('❌ Toggle failed:', error);
      Alert.alert('Error', 'Failed to update reminder status.');
    }
  };

  const handleQuickSendNow = () => {
    setQuickSendMode('now');
    setShowQuickSend(true);
  };
  
  const handleQuickSendSchedule = () => {
    setQuickSendMode('schedule');
    setShowQuickSend(true);
  };

  const handleQuickSend = async (notificationData, mode) => {
    try {
      if (mode === 'now') {
        // SEND IMMEDIATELY - Call cloud function directly
        const functions = getFunctions();
        const sendBatch = httpsCallable(functions, 'sendBatchPushNotification');
        
        await sendBatch({
          userIds: notificationData.recipients,
          title: notificationData.title,
          body: notificationData.message,
          data: notificationData.data,
        });
  
        Alert.alert('Sent!', 'Notifications sent immediately to all recipients.');
      } else {
        // SCHEDULE FOR LATER - Create pendingNotifications
        const { recipients, schedule, title, message, data, isRecurring } = notificationData;
        const scheduledFor = new Date(schedule.scheduledFor);
  
        const promises = recipients.map(async (recipientId) => {
          const payload = {
            userId: recipientId,
            title,
            body: message,
            scheduledFor,
            createdAt: new Date(),
            type: 'quick_send',
            data,
          };
  
          if (isRecurring) {
            payload.isRecurring = true;
            payload.recurringConfig = schedule.recurringConfig;
          }
  
          const notificationsRef = collection(db, 'pendingNotifications');
          await addDoc(notificationsRef, payload);
        });
  
        await Promise.all(promises);
  
        const recurringText = isRecurring ? 'recurring ' : '';
        Alert.alert('Scheduled!', `${recurringText}Notification scheduled for all recipients.`);
      }
  
      setShowQuickSend(false);
    } catch (error) {
      console.error('Failed to send notification:', error);
      Alert.alert('Error', 'Failed to send notification. Please try again.');
    }
  };

  const activities = useMemo(
    () => [
      {
        type: "checklist",
        label: "Checklist",
        required: false,
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
    ],
    [selectedChecklist, allTemplates, user?.admin]
  );

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
    reminderCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: getSpacing.md,
      marginBottom: getSpacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    quickSendButtonsContainer: {
      flexDirection: 'row',
      gap: getSpacing.sm,
      marginTop: getSpacing.md,
    },
    quickSendButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: getSpacing.md,
      borderRadius: 8,
      gap: getSpacing.xs,
    },
    sendNowButton: {
      backgroundColor: theme.error || theme.primary,
    },
    scheduleButton: {
      backgroundColor: theme.primary,
    },
    quickSendButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
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

              <Text style={styles.subHeaderText}>
                Default Calendar Screen View
              </Text>
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
                          <Text style={styles.templateName}>
                            {template.name}
                          </Text>
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

            {/* 🔔 Standalone Reminders (Admin Only) */}
            {user?.admin && (
              <View style={styles.settingContainer}>
                <Text style={styles.sectionHeaderText}>Standalone Reminders</Text>
                <Text style={[styles.subHeaderText, { marginTop: 0 }]}>
                  Create recurring or one-time reminders for yourself and others
                </Text>

                {remindersLoading ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : reminders.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon
                      name="bell-outline"
                      size={48}
                      color={theme.text.secondary}
                    />
                    <Text style={styles.emptyText}>
                      No standalone reminders yet.{"\n"}Create your first one!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.templateListContainer}>
                    {reminders.map((reminder) => (
                      <TouchableOpacity
                        key={reminder.id}
                        style={styles.templateCard}
                        onPress={() => handleReminderPress(reminder)}
                      >
                        <View style={styles.iconContainer}>
                          <Icon
                            name={reminder.schedule?.isRecurring ? "bell-ring" : "bell"}
                            size={20}
                            color={reminder.isActive ? theme.primary : theme.text.secondary}
                          />
                        </View>
                        <View style={styles.templateInfo}>
                          <Text style={styles.templateName}>
                            {reminder.title}
                          </Text>
                          <Text style={styles.templateDetails}>
                            {reminder.recipients?.length || 0} recipient(s) • {reminder.schedule?.isRecurring ? 'Recurring' : 'One-time'}
                          </Text>
                        </View>
                        <Switch
                          value={reminder.isActive}
                          onValueChange={(val) => handleToggleReminder(reminder.id, val)}
                          trackColor={{ false: theme.border, true: theme.primary + '40' }}
                          thumbColor={reminder.isActive ? theme.primary : theme.text.secondary}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleCreateReminder}
                >
                  <Icon name="plus" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Create New Reminder</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 🚀 Quick Send (Admin Only) */}
{user?.admin && (
  <View style={styles.settingContainer}>
    <Text style={styles.sectionHeaderText}>Quick Notifications</Text>
    <Text style={[styles.subHeaderText, { marginTop: 0 }]}>
      Send one-time notifications immediately or scheduled
    </Text>

    <View style={styles.quickSendButtonsContainer}>
      <TouchableOpacity
        style={[styles.quickSendButton, styles.sendNowButton]}
        onPress={handleQuickSendNow}
      >
        <Icon name="send" size={20} color="#FFFFFF" />
        <Text style={styles.quickSendButtonText}>Send Now</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickSendButton, styles.scheduleButton]}
        onPress={handleQuickSendSchedule}
      >
        <Icon name="calendar-clock" size={20} color="#FFFFFF" />
        <Text style={styles.quickSendButtonText}>Schedule</Text>
      </TouchableOpacity>
    </View>
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
      ) : currentView === "templateEditor" ? (
        <View style={{ flex: 1 }}>
          {/* TEMPLATE EDITOR VIEW */}
          <ScheduleTemplateEditor
            template={selectedTemplate}
            userCalendars={user?.calendars || []}
            activities={activities}
            onClose={handleBackToPreferences}
          />
        </View>
      ) : null}

      {/* ⬇️⬇️⬇️ MODAL ALWAYS RENDERED - CONTROLLED BY visible PROP ⬇️⬇️⬇️ */}
      <StandAloneReminderEditor
        visible={showReminderEditor}
        onClose={() => {
          setShowReminderEditor(false);
          setSelectedReminder(null);
        }}
        reminder={selectedReminder}
        onSave={async (reminderData) => {
          try {
            await saveReminder(reminderData);
            Alert.alert('Success', 'Reminder saved successfully!');
            setShowReminderEditor(false);
            setSelectedReminder(null);
          } catch (error) {
            console.error('Failed to save reminder:', error);
            Alert.alert('Error', 'Failed to save reminder.');
          }
        }}
        onDelete={async (reminderId) => {
          try {
            await deleteReminder(reminderId);
            Alert.alert('Success', 'Reminder deleted successfully!');
            setShowReminderEditor(false);
            setSelectedReminder(null);
          } catch (error) {
            console.error('Failed to delete reminder:', error);
            Alert.alert('Error', 'Failed to delete reminder.');
          }
        }}
        allUsers={[
          // { userId: user?.userId, name: user?.username || 'You' },
          { userId: 'LCqH5hKx2bP8Q5gDGPmzRd65PB32', name: 'Me' },
          { userId: 'CjW9bPGIjrgEqkjE9HxNF6xuxfA3', name: 'Ellie' },
          { userId: 'ObqbPOKgzwYr2SmlN8UQOaDbkzE2', name: 'Jack' },
          { userId: 'iSI29yZ4OKQTSHONKPRxibrHZYx2', name: 'Sarah' },
        ]}
      />

<QuickSendModal
  visible={showQuickSend}
  mode={quickSendMode}
  onClose={() => setShowQuickSend(false)}
  onSend={handleQuickSend}
  allUsers={[
    // { userId: user?.userId, name: user?.username || 'You' },
    { userId: 'LCqH5hKx2bP8Q5gDGPmzRd65PB32', name: 'Me' },
    { userId: 'CjW9bPGIjrgEqkjE9HxNF6xuxfA3', name: 'Ellie' },
    { userId: 'ObqbPOKgzwYr2SmlN8UQOaDbkzE2', name: 'Jack' },
    { userId: 'iSI29yZ4OKQTSHONKPRxibrHZYx2', name: 'Sarah' },
  ]}
/>
    </SafeAreaView>
  );
};

export default PreferencesScreen;