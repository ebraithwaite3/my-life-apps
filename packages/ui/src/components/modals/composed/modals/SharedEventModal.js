import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useTheme } from "@my-apps/contexts";
import { ModalHeader } from "../../../headers";
import {
  TextInputRow,
  SelectorRow,
  DateTimeSelector,
  ReminderSelector,
} from "../../../forms";
import { ReminderPicker } from "../../../dropdowns";
import { ModalWrapper } from "../../base";
import { OptionsSelectionModal } from "../pickers";
import { useAuth } from "@my-apps/contexts";
import { LoadingScreen } from "../../../general";
import {
  useEventFormState,
  useEventValidation,
  useEventCreation,
  useEventUpdate,
} from "@my-apps/hooks";

/**
 * SharedEventModal - Universal event creation/editing modal
 *
 * Used by ALL apps (checklist, workout, golf, etc.)
 * Accepts activity configurations to customize behavior per app
 */
const SharedEventModal = ({
  isVisible,
  onClose,
  event = null,
  userCalendars = [],
  groups = [],
  initialDate = null,
  user,

  // App-specific configuration
  appName = "app", // For notifications (e.g., "checklist", "workout")
  eventTitles = { new: "New Event", edit: "Edit Event" }, // Modal titles
  defaultTitle = "Event", // Default event title

  // Activity configurations
  activities = [], // Array of activity configs
}) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();
  const { db } = useAuth();

  // Refs for embedded editors (one per activity)
  const editorRefs = useRef({});

  // HOOK 1: Form state (shared)
  const formState = useEventFormState({
    isVisible,
    event,
    initialDate,
    userCalendars,
    groups,
    defaultTitle,
    userPreferences: user?.preferences,
  });

  // HOOK 2: Validation (shared)
  const { validateEvent } = useEventValidation();

  // HOOK 3: Event creation (shared)
  const { createEvent } = useEventCreation({ user, db });

  // HOOK 4: Event update (shared)
  const { updateEvent } = useEventUpdate({ user, db });

  // Modal state
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [currentTemplateActivity, setCurrentTemplateActivity] = useState(null);

  // Handle calendar selector press
  const handleCalendarSelectorPress = () => {
    if (formState.isEditing || formState.availableCalendars?.length <= 1) {
      return;
    }
    setShowCalendarModal(true);
  };

  // Handle calendar selection
  const handleCalendarSelect = (option) => {
    formState.handleCalendarSelect(option);
    setShowCalendarModal(false);
  };

  // Handle activity selector press
  const handleActivitySelectorPress = (activityConfig) => {
    // If activity already selected, go directly to editor
    if (activityConfig.selectedActivity) {
      formState.setCurrentScreen(activityConfig.type);
      return;
    }

    // If templates exist, show template picker
    if (activityConfig.editorProps?.templates?.length > 0) {
      setCurrentTemplateActivity(activityConfig);
      setShowTemplateModal(true);
      return;
    }

    // No templates, go directly to editor
    formState.setCurrentScreen(activityConfig.type);
  };

  // Handle template selection (Handles multiple types of activities, coming from each apps CalendarScreen)
const handleTemplateSelect = (option) => {
  setShowTemplateModal(false);

  if (option.value === "new") {
    formState.setCurrentScreen(currentTemplateActivity.type);
    return;
  }

  const template = option.template;
  const activityConfig = currentTemplateActivity;

  // Use activity-specific transformer OR fallback to generic
  const newActivity = activityConfig.transformTemplate
    ? activityConfig.transformTemplate(template)
    : {
        id: `${activityConfig.type}_${Date.now()}`,
        name: template.name,
        ...template,
        createdAt: Date.now(),
      };

  activityConfig.onSelectActivity(newActivity);

  // Set reminder from template if provided
  if (template.defaultReminderTime) {
    const [hours, minutes] = template.defaultReminderTime.split(":").map(Number);
    const reminderDate = formState.startDate
      ? new Date(formState.startDate)
      : new Date();
    reminderDate.setHours(hours, minutes, 0, 0);
    formState.setReminderMinutes(reminderDate.toISOString());
  }

  setCurrentTemplateActivity(null);
};

  // Handle save
  const handleSave = async () => {
    console.log('💾 SharedEventModal: handleSave called');
    console.log('Activity that are being saved: ', activities);
    formState.setErrors([]);

    // Check if all required activities are selected
    const requiredActivities = activities.filter((a) => a.required);
    const missingActivities = requiredActivities.filter(
      (a) => !a.selectedActivity
    );

    if (missingActivities.length > 0 && !formState.isEditing) {
      const missingNames = missingActivities.map((a) => a.label).join(", ");
      formState.setErrors([`Please select: ${missingNames}`]);
      return;
    }

    // Validate
    const { isValid, errors } = validateEvent({
      title: formState.title,
      startDate: formState.startDate,
      endDate: formState.endDate,
      selectedActivity: requiredActivities[0]?.selectedActivity, // Check first required activity
      activityRequired: !formState.isEditing && requiredActivities.length > 0,
      activityName: requiredActivities[0]?.label || "activity",
    });

    if (!isValid) {
      formState.setErrors(errors);
      return;
    }

    formState.setIsLoading(true);

    // Build activities array from all selected activities
    const activitiesData = formState.isEditing
  ? event.activities || []
  : activities
      .filter((a) => a.selectedActivity)
      .map((a) => ({
        ...a.selectedActivity, // ← Spread FIRST (gets everything)
        activityType: a.type,   // ← Override to ensure correct type
      }));

    // Create or update event
    const result = formState.isEditing
      ? await updateEvent({
          eventId: event.eventId,
          originalStartTime: event.startTime,
          title: formState.title,
          description: formState.description,
          startDate: formState.startDate,
          endDate: formState.endDate,
          isAllDay: formState.isAllDay,
          selectedCalendarId: formState.selectedCalendarId,
          selectedCalendar: formState.selectedCalendar,
          reminderMinutes: formState.reminderMinutes,
          activities: activitiesData,
          appName,
          membersToNotify: formState.membersToNotify,
        })
      : await createEvent({
          title: formState.title,
          description: formState.description,
          startDate: formState.startDate,
          endDate: formState.endDate,
          isAllDay: formState.isAllDay,
          selectedCalendarId: formState.selectedCalendarId,
          selectedCalendar: formState.selectedCalendar,
          reminderMinutes: formState.reminderMinutes,
          activities: activitiesData,
          appName,
          membersToNotify: formState.membersToNotify,
        });

    formState.setIsLoading(false);

    if (result.success) {
      // Clear all activity selections
      activities.forEach((a) => a.onSelectActivity(null));
      formState.resetForm();
      onClose();
    }
  };

  // Handle close
  const handleClose = () => {
    // Clear all activity selections
    activities.forEach((a) => a.onSelectActivity(null));
    formState.resetForm();
    onClose();
  };

  // Build template options for current activity
  const templateOptions = currentTemplateActivity
    ? [
        {
          id: "new",
          label: `➕ New ${currentTemplateActivity.label}`,
          value: "new",
        },
        ...(currentTemplateActivity.editorProps?.templates || []).map(
          (template) => ({
            id: template.id,
            label: template.name,
            value: template.id,
            template: template,
          })
        ),
      ]
    : [];

  // Styles
  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: getBorderRadius.lg,
      borderTopRightRadius: getBorderRadius.lg,
      width: "100%",
      height: "90%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    content: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
      paddingBottom: getSpacing.xl * 2,
    },
  });

  if (!isVisible) return null;

  return (
    <ModalWrapper visible={isVisible} onClose={handleClose}>
      {/* Event Form Screen */}
      {formState.currentScreen === "event" && (
        <>
          {formState.isLoading ? (
            <LoadingScreen
              message={
                formState.isEditing ? "Updating event..." : "Creating event..."
              }
              icon="📅"
            />
          ) : (
            <View style={styles.overlay}>
              <KeyboardAvoidingView
                style={styles.modalContainer}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? -100 : 20}
              >
                <ModalHeader
                  title={
                    formState.isEditing ? eventTitles.edit : eventTitles.new
                  }
                  onCancel={handleClose}
                  onDone={handleSave}
                  doneText={formState.isEditing ? "Update" : "Add"}
                />

                <ScrollView
                  style={styles.content}
                  contentContainerStyle={styles.scrollContainer}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <TextInputRow
                    label="Title"
                    placeholder="Event title"
                    value={formState.title}
                    onChangeText={formState.setTitle}
                    autoCapitalize="words"
                  />

                  {/* Render all activity selectors (only when not editing) */}
                  {!formState.isEditing &&
                    activities.map((activityConfig) => {
                      const SelectorComponent =
                        activityConfig.SelectorComponent;
                      return (
                        <SelectorComponent
                          key={activityConfig.type}
                          label={activityConfig.label}
                          selectedChecklist={activityConfig.selectedActivity}
                          savedChecklists={
                            activityConfig.editorProps?.templates || []
                          }
                          onPress={() =>
                            handleActivitySelectorPress(activityConfig)
                          }
                          onClear={() => activityConfig.onSelectActivity(null)}
                        />
                      );
                    })}

                  <SelectorRow
                    label="Calendar"
                    rowLabel="Calendar"
                    value={formState.selectedCalendar?.name}
                    placeholder="Select calendar"
                    colorDot={
                      formState.selectedCalendar?.color || theme.primary
                    }
                    onPress={handleCalendarSelectorPress}
                    disabled={formState.availableCalendars?.length <= 1}
                    showChevron={
                      !formState.isEditing &&
                      formState.availableCalendars?.length > 1
                    }
                  />

                  <DateTimeSelector
                    label="Schedule"
                    isAllDay={formState.isAllDay}
                    onAllDayChange={formState.setIsAllDay}
                    startDate={formState.startDate}
                    endDate={formState.endDate}
                    onStartDateChange={formState.setStartDate}
                    onStartTimeChange={formState.setStartDate}
                    onEndDateChange={formState.setEndDate}
                    onEndTimeChange={formState.setEndDate}
                  />

                  <ReminderSelector
                    reminder={formState.reminderMinutes}
                    onReminderChange={formState.setReminderMinutes}
                    eventStartDate={formState.startDate}
                    isAllDay={formState.isAllDay}
                  />
                </ScrollView>

                {/* Reminder Picker Modal */}
                <ReminderPicker
                  visible={formState.showReminderPicker}
                  selectedMinutes={formState.reminderMinutes}
                  onSelect={formState.setReminderMinutes}
                  onClose={() => formState.setShowReminderPicker(false)}
                  eventStartTime={formState.startDate}
                  isAllDay={formState.isAllDay}
                />

                {/* Calendar selection modal */}
                <OptionsSelectionModal
                  visible={showCalendarModal}
                  title="Select Calendar"
                  options={formState.calendarOptions}
                  onSelect={handleCalendarSelect}
                  onClose={() => setShowCalendarModal(false)}
                />

                {/* Template selection modal */}
                <OptionsSelectionModal
                  visible={showTemplateModal}
                  title={`Select ${
                    currentTemplateActivity?.label || "Activity"
                  }`}
                  options={templateOptions}
                  onSelect={handleTemplateSelect}
                  onClose={() => {
                    setShowTemplateModal(false);
                    setCurrentTemplateActivity(null);
                  }}
                />
              </KeyboardAvoidingView>
            </View>
          )}
        </>
      )}

      {/* Activity Editors - Render based on currentScreen */}
      {activities.map((activityConfig) => {
  if (formState.currentScreen !== activityConfig.type) return null;

  const EditorComponent = activityConfig.EditorComponent;
  if (!EditorComponent) return null;

  return (
    <View
      key={activityConfig.type}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* ✅ ADD KeyboardAvoidingView HERE */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ width: "100%", height: "90%" }}
      >
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 12,
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <ModalHeader
            title={
              activityConfig.selectedActivity
                ? `Edit ${activityConfig.label}`
                : `New ${activityConfig.label}`
            }
            onCancel={() => formState.setCurrentScreen("event")}
            onDone={() => editorRefs.current[activityConfig.type]?.save()}
            doneText={activityConfig.selectedActivity ? "Update" : "Create"}
          />

          <EditorComponent
            ref={(ref) => (editorRefs.current[activityConfig.type] = ref)}
            checklist={activityConfig.selectedActivity}
            onSave={(activity, shouldSaveAsTemplate) => {
              // Save the activity
              activityConfig.onSelectActivity(activity);

              // If "Save as Template" toggle was ON, save as template
              if (
                shouldSaveAsTemplate &&
                activityConfig.editorProps?.onSaveTemplate
              ) {
                activityConfig.editorProps.promptForContext?.(
                  async (context) => {
                    const success =
                      await activityConfig.editorProps.onSaveTemplate(
                        activity,
                        context
                      );
                    if (success) {
                      Alert.alert(
                        "Success",
                        `Template "${activity.name}" saved successfully`
                      );
                    }
                  }
                );
              }

              // Return to event screen
              formState.setCurrentScreen("event");
            }}
            {...activityConfig.editorProps}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
        );
      })}
    </ModalWrapper>
  );
};

export default SharedEventModal;
