import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { DateTime } from "luxon";
import { useTheme } from "@my-apps/contexts";
import {
  ModalWrapper,
  OptionsSelectionModal,
  ReminderPicker,
  TextInputRow,
  SelectorRow,
  ModalHeader,
  DateTimeSelector,
  ChecklistSelector,
  EditChecklistContent,
  ReminderSelector,
} from "@my-apps/ui";
import { useAuth } from "@my-apps/contexts";
import { LoadingScreen } from "@my-apps/screens";
import {
  useEventFormState,
  useEventValidation,
  useEventCreation,
  useChecklistTemplates,
} from "@my-apps/hooks";

/**
 * ChecklistEventModal - Simplified with shared hooks + template support
 */
const ChecklistEventModal = ({
  isVisible,
  onClose,
  event = null,
  userCalendars = [],
  groups = [],
  initialDate = null,
  user,
}) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();
  const { db } = useAuth();
  const editChecklistRef = useRef(null);

  // Use the template hook
  const { allTemplates, saveTemplate, promptForContext } = useChecklistTemplates();

  // HOOK 1: Form state (shared)
  const formState = useEventFormState({
    isVisible,
    event,
    initialDate,
    userCalendars,
    groups,
    defaultTitle: "Checklist",
    userPreferences: user?.preferences,
  });

  // HOOK 2: Validation (shared)
  const { validateEvent } = useEventValidation();

  // HOOK 3: Event creation (shared)
  const { createEvent } = useEventCreation({ user, db });

  // Modal state
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Build template options (using allTemplates from hook)
  const templateOptions = [
    {
      id: "new",
      label: "➕ New Checklist",
      value: "new",
    },
    ...allTemplates.map((template) => ({
      id: template.id,
      label: template.name,
      value: template.id,
      template: template,
    })),
  ];

  // Helper function to format reminder time
  const getReminderLabel = (reminderISO) => {
    if (!reminderISO) return "No Alert";
    try {
      const dt = DateTime.fromISO(reminderISO);
      if (dt.isValid) return dt.toFormat("EEE, MMM d 'at' h:mm a");
    } catch (error) {
      console.error("Error parsing reminder:", error);
    }
    return "No Alert";
  };

  // Handle calendar selector press
  const handleCalendarSelectorPress = () => {
    if (formState.isEditing || formState.availableCalendars?.length <= 1) {
      return;
    }
    setShowCalendarModal(true);
  };

  // Handle checklist selector press
  const handleChecklistSelectorPress = () => {
    if (formState.selectedActivity) {
      formState.setCurrentScreen("checklist");
      return;
    }

    if (allTemplates.length === 0) {
      formState.setCurrentScreen("checklist");
      return;
    }

    setShowTemplateModal(true);
  };

  // Handle calendar selection
  const handleCalendarSelect = (option) => {
    formState.handleCalendarSelect(option);
    setShowCalendarModal(false);
  };

  // Handle template selection
  const handleTemplateSelect = (option) => {
    setShowTemplateModal(false);

    if (option.value === "new") {
      formState.setCurrentScreen("checklist");
      return;
    }

    // Create checklist from template
    const template = option.template;
    const newChecklist = {
      id: `checklist_${Date.now()}`,
      name: template.name,
      items: template.items.map((item, index) => ({
        id: item.id || `item_${Date.now()}_${index}`,
        name: item.name,
        completed: false,
        requiredForScreenTime: item.requiredForScreenTime || false,
      })),
      createdAt: Date.now(),
      ...(template.defaultNotifyAdmin && { notifyAdmin: true }),
    };

    formState.setSelectedActivity(newChecklist);

    // Set reminder from template if provided
    if (template.defaultReminderTime) {
      const [hours, minutes] = template.defaultReminderTime
        .split(":")
        .map(Number);
      const reminderDate = formState.startDate
        ? new Date(formState.startDate)
        : new Date();
      reminderDate.setHours(hours, minutes, 0, 0);
      formState.setReminderMinutes(reminderDate.toISOString());
    }
  };

  // Handle save
  const handleSave = async () => {
    formState.setErrors([]);

    // Validate
    const { isValid, errors } = validateEvent({
      title: formState.title,
      startDate: formState.startDate,
      endDate: formState.endDate,
      selectedActivity: formState.selectedActivity,
      activityRequired: true,
      activityName: "checklist",
    });

    if (!isValid) {
      formState.setErrors(errors);
      return;
    }

    formState.setIsLoading(true);

    // Build activity data
    const activities = formState.selectedActivity
      ? [
          {
            id: formState.selectedActivity.id,
            activityType: "checklist",
            name: formState.selectedActivity.name,
            items: formState.selectedActivity.items,
            createdAt: formState.selectedActivity.createdAt,
            ...(formState.selectedActivity.notifyAdmin && {
              notifyAdmin: true,
            }),
          },
        ]
      : [];

    // Create event
    const result = await createEvent({
      title: formState.title,
      description: formState.description,
      startDate: formState.startDate,
      endDate: formState.endDate,
      isAllDay: formState.isAllDay,
      selectedCalendarId: formState.selectedCalendarId,
      selectedCalendar: formState.selectedCalendar,
      reminderMinutes: formState.reminderMinutes,
      activities,
      appName: "checklist",
      notifyAdmin: formState.selectedActivity?.notifyAdmin || false,
    });

    formState.setIsLoading(false);

    if (result.success) {
      formState.resetForm();
      onClose();
    }
  };

  // Handle close
  const handleClose = () => {
    formState.resetForm();
    onClose();
  };

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
                  title={formState.isEditing ? "Edit List" : "New List"}
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

                  <ChecklistSelector
                    label="Checklist"
                    selectedChecklist={formState.selectedActivity}
                    savedChecklists={allTemplates}
                    onPress={handleChecklistSelectorPress}
                    onClear={() => formState.setSelectedActivity(null)}
                  />

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
                  title="Select Checklist"
                  options={templateOptions}
                  onSelect={handleTemplateSelect}
                  onClose={() => setShowTemplateModal(false)}
                />
              </KeyboardAvoidingView>
            </View>
          )}
        </>
      )}

      {/* Checklist Screen */}
      {formState.currentScreen === "checklist" && (
        <View
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
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              width: "100%",
              height: "90%",
              overflow: "hidden",
            }}
          >
            <ModalHeader
              title={
                formState.selectedActivity ? "Edit Checklist" : "New Checklist"
              }
              onCancel={() => formState.setCurrentScreen("event")}
              onDone={() => editChecklistRef.current?.save()}
              doneText={formState.selectedActivity ? "Update" : "Create"}
            />

            <EditChecklistContent
              ref={editChecklistRef}
              checklist={formState.selectedActivity}
              onSave={(checklist, shouldSaveAsTemplate) => {
                // Save the checklist to the event
                formState.setSelectedActivity(checklist);
                
                // If "Save as Template" toggle was ON, save as template
                if (shouldSaveAsTemplate) {
                  promptForContext(async (context) => {
                    const success = await saveTemplate(checklist, context);
                    if (success) {
                      Alert.alert(
                        "Success", 
                        `Template "${checklist.name}" saved successfully`
                      );
                    }
                  });
                }
                
                // Return to event screen
                formState.setCurrentScreen("event");
              }}
              prefilledTitle="Checklist"
              isUserAdmin={user?.admin === true}
              templates={allTemplates}
            />
          </View>
        </View>
      )}
    </ModalWrapper>
  );
};

export default ChecklistEventModal;