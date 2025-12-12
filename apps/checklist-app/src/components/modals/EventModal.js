import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useTheme } from "@my-apps/contexts";
import { DateTime } from "luxon";
import {
  ModalWrapper,
  ModalDropdown,
  SpinnerPicker,
  ReminderPicker,
  TextInputRow,
  CalendarSelector,
  ModalHeader,
  DateTimeSelector,
  ReminderSelector,
  ChecklistSelector,
  EditChecklistContent,
} from "@my-apps/ui";
import { useSaveInternalEvent, useSaveToGoogleCalendar } from "@my-apps/hooks";
import { useAuth } from "@my-apps/contexts";
import { LoadingScreen } from "@my-apps/screens";
import { scheduleNotification } from "@my-apps/services";

// --------------------------------------
// Helper functions for all-day handling
// --------------------------------------
const getStartOfDay = (date = null) =>
  (date ? DateTime.fromJSDate(date) : DateTime.local()).startOf("day").toJSDate();

const getEndOfDay = (date = null) =>
  (date ? DateTime.fromJSDate(date) : DateTime.local()).endOf("day").toJSDate();

const EventModal = ({
  isVisible,
  onClose,
  event = null,
  userCalendars = [],
  groups = [],
  initialDate = null,
  user,
  updateDocument,
}) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();
  const isEditing = event !== null;
  const { db, user: currentUser } = useAuth();
  const editChecklistRef = useRef(null);

  const saveInternalEvent = useSaveInternalEvent();
  const saveToGoogleCalendar = useSaveToGoogleCalendar();

  // Build available calendars from userCalendars and groups
  const availableCalendars = useMemo(() => {
    return [
      {
        calendarId: "internal",
        name: "Personal Calendar",
        color: "#4CAF50",
        calendarType: "internal",
        groupId: null,
      },
      ...groups.map((group) => ({
        calendarId: `group-${group.groupId}`,
        name: `${group.name} Calendar`,
        color: group.color || "#2196F3",
        calendarType: "group",
        groupId: group.groupId,
      })),
      ...userCalendars.filter((cal) => cal.calendarType === "google"),
    ];
  }, [userCalendars, groups]);

  // ------------------------
  // Form state
  // ------------------------
  const [title, setTitle] = useState("Checklist");
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState(getStartOfDay);
  const [endDate, setEndDate] = useState(getEndOfDay);
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [description, setDescription] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState(null);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Calendar dropdown state
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);
  const [calendarAnchorPosition, setCalendarAnchorPosition] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // Date/Time picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("date");
  const [pickerTarget, setPickerTarget] = useState("start");

  // Reminder picker state
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  // Modal screen state
  const [currentScreen, setCurrentScreen] = useState("event");
  const [selectedChecklist, setSelectedChecklist] = useState(null);

  // --------------------------------------
  // Initialize form when modal opens
  // --------------------------------------
  useEffect(() => {
    if (!isVisible) return;

    if (isEditing && event) {
      setTitle(event.title || "Checklist");
      setIsAllDay(event.isAllDay ?? true);
      setSelectedCalendarId(event.calendarId || "");
      setDescription(event.description || "");
      setReminderMinutes(event.reminderMinutes ?? null);

      if (event.startTime) setStartDate(new Date(event.startTime));
      if (event.endTime) setEndDate(new Date(event.endTime));
    } else {
      const baseDate =
        initialDate && DateTime.fromISO(initialDate).isValid
          ? DateTime.fromISO(initialDate).toJSDate()
          : null;

      setStartDate(getStartOfDay(baseDate));
      setEndDate(getEndOfDay(baseDate));
      setTitle("Checklist");
      setIsAllDay(true);
      setReminderMinutes(null);
      setSelectedCalendarId("internal");
      setDescription("");
    }

    setErrors([]);
    setCurrentScreen("event");
  }, [isVisible, event, initialDate, isEditing]);

  // ------------------------
  // Picker handlers
  // ------------------------
  const openPicker = (target, mode) => {
    setPickerTarget(target);
    setPickerMode(mode);
    setShowPicker(true);
  };

  const onPickerConfirm = (selectedDate) => {
    if (!selectedDate) return;

    if (pickerTarget === "start") {
      setStartDate(selectedDate);
      if (selectedDate > endDate) {
        setEndDate(new Date(selectedDate.getTime() + 60 * 60 * 1000));
      }
    } else {
      setEndDate(selectedDate);
    }
  };

  const closePicker = () => setShowPicker(false);

  const closeChecklistModal = () => {
    setCurrentScreen("event");
  };

  // ------------------------
  // Validation
  // ------------------------
  const validateForm = () => {
    const newErrors = [];
    
    if (!title.trim()) newErrors.push("Title is required");
    if (!selectedChecklist) newErrors.push("Please select or create a checklist");
    else if (!selectedChecklist.items || selectedChecklist.items.length === 0) 
      newErrors.push("Checklist must have at least one item");
    if (!startDate) newErrors.push("Start date is required");
    if (!endDate) newErrors.push("End date is required");
    if (startDate && endDate && endDate <= startDate)
      newErrors.push("End time must be after start time");
  
    setErrors(newErrors);
    
    if (newErrors.length > 0) {
      Alert.alert("Validation Error", newErrors[0]);
      console.log("❌ Validation errors:", newErrors);
    }
    
    return newErrors.length === 0;
  };

  // ------------------------
  // Save Event
  // ------------------------
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    const selectedCalendar = availableCalendars.find(
      (cal) => cal.calendarId === selectedCalendarId
    );

    const eventData = {
      summary: title.trim(),
      description: description.trim(),
      calendarId: selectedCalendarId,
    };

    if (isAllDay) {
      eventData.start = {
        date: DateTime.fromJSDate(startDate).toFormat("yyyy-MM-dd"),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      eventData.end = {
        date: DateTime.fromJSDate(endDate).toFormat("yyyy-MM-dd"),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } else {
      eventData.start = {
        dateTime: DateTime.fromJSDate(startDate).toISO(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      eventData.end = {
        dateTime: DateTime.fromJSDate(endDate).toISO(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    const activityData = selectedChecklist
      ? [
          {
            id: selectedChecklist.id,
            activityType: "checklist",
            name: selectedChecklist.name,
            items: selectedChecklist.items,
            createdAt: selectedChecklist.createdAt,
          },
        ]
      : [];

    if (isEditing && event) {
      Alert.alert("Info", "Event editing not yet implemented");
      setIsLoading(false);
      handleClose();
      return;
    }

    try {
      // INTERNAL CALENDAR
      if (
        selectedCalendarId === "internal" ||
        selectedCalendar?.calendarType === "group"
      ) {
        const calendarName = selectedCalendar?.name || "Personal Calendar";
        const groupId = selectedCalendar?.groupId || null;

        eventData.activities = activityData;
        eventData.groupId = groupId;

        const result = await saveInternalEvent({
          ...eventData,
          reminderMinutes,
        });

        if (result.success) {
          if (reminderMinutes != null) {
            const reminderTime = new Date(startDate);
            reminderTime.setMinutes(reminderTime.getMinutes() - reminderMinutes);

            if (reminderTime > new Date()) {
              scheduleNotification(
                currentUser.uid,
                `Reminder: ${title.trim()}`,
                `Starting in ${reminderMinutes} minutes`,
                result.eventId,
                reminderTime,
                {
                  screen: "Calendar",
                  eventId: result.eventId,
                  app: "checklist-app",
                }
              ).catch(console.error);
            }
          }

          Alert.alert("Success", `Event added to ${calendarName}`);
        } else {
          Alert.alert("Error", `Failed to save event: ${result.error}`);
        }
      }
      // GOOGLE CALENDAR
      else {
        const result = await saveToGoogleCalendar(
          eventData,
          selectedCalendarId,
          db,
          reminderMinutes,
          activityData
        );

        if (result.success && reminderMinutes != null) {
          const reminderTime = new Date(startDate);
          reminderTime.setMinutes(reminderTime.getMinutes() - reminderMinutes);

          if (reminderTime > new Date()) {
            scheduleNotification(
              currentUser.uid,
              `Reminder: ${title.trim()}`,
              `Starting in ${reminderMinutes} minutes`,
              result.eventId,
              reminderTime,
              { screen: "Calendar", eventId: result.eventId, app: "checklist-app" }
            ).catch(console.error);
          }
        } else if (!result.success) {
          Alert.alert("Error", "Error saving event to Google Calendar.");
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unexpected error while saving the event.");
    }

    setIsLoading(false);
    handleClose();
  };

  // ------------------------
  // Save Checklist
  // ------------------------
  const handleSaveChecklist = (checklist, onCloseCallback) => {
    console.log("✅ Checklist saved:", checklist);
    setSelectedChecklist(checklist);
    if (onCloseCallback) {
      onCloseCallback();
    }
  };

  // ------------------------
  // Close / Reset
  // ------------------------
  const handleClose = () => {
    setTitle("Checklist");
    setIsAllDay(true);
    setStartDate(getStartOfDay());
    setEndDate(getEndOfDay());
    setSelectedCalendarId("");
    setDescription("");
    setReminderMinutes(null);
    setSelectedChecklist(null);
    setErrors([]);
    setShowCalendarDropdown(false);
    setShowReminderPicker(false);
    setCurrentScreen("event");
    onClose();
  };

  const handleCalendarSelect = (option) => {
    setSelectedCalendarId(option.value);
    setShowCalendarDropdown(false);
  };

  const calendarOptions = availableCalendars.map((cal) => ({
    label: cal.name,
    value: cal.calendarId,
    color: cal.color,
  }));

  const selectedCalendar = availableCalendars.find(
    (cal) => cal.calendarId === selectedCalendarId
  );

  // ------------------------
  // Styles
  // ------------------------
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
    errorContainer: {
      margin: getSpacing.lg,
      padding: getSpacing.md,
      backgroundColor: theme.error + "20",
      borderRadius: getBorderRadius.md,
    },
    errorText: {
      fontSize: 14,
      color: theme.error,
      marginBottom: getSpacing.xs,
    },
  });

  if (!isVisible) return null;

  return (
    <ModalWrapper visible={isVisible} onClose={handleClose}>
      {/* Event Form Screen */}
      {currentScreen === "event" && (
        <>
          {isLoading ? (
            <LoadingScreen
              message={isEditing ? "Updating event..." : "Creating event..."}
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
                  title={isEditing ? "Edit List" : "New List"}
                  onCancel={handleClose}
                  onAction={handleSave}
                  actionText={isEditing ? "Update" : "Add"}
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
                    value={title}
                    onChangeText={setTitle}
                    autoCapitalize="words"
                  />

                  <ChecklistSelector
                    label="Checklist"
                    selectedChecklist={selectedChecklist}
                    savedChecklists={user?.savedChecklists || []}
                    onPress={() => setCurrentScreen("checklist")}
                    onClear={() => setSelectedChecklist(null)}
                  />

                  <CalendarSelector
                    label="Calendar"
                    selectedCalendar={selectedCalendar}
                    availableCalendars={availableCalendars}
                    isEditing={isEditing}
                    onPress={(position) => {
                      setCalendarAnchorPosition(position);
                      setShowCalendarDropdown(true);
                    }}
                    disabled={availableCalendars?.length <= 1}
                  />

                  <DateTimeSelector
                    label="Schedule"
                    isAllDay={isAllDay}
                    onAllDayChange={setIsAllDay}
                    startDate={startDate}
                    endDate={endDate}
                    onStartDatePress={() => openPicker("start", "date")}
                    onStartTimePress={() => openPicker("start", "time")}
                    onEndDatePress={() => openPicker("end", "date")}
                    onEndTimePress={() => openPicker("end", "time")}
                  />

                  <ReminderSelector
                    label="Reminder"
                    reminderMinutes={reminderMinutes}
                    eventStartTime={startDate}
                    onPress={() => setShowReminderPicker(true)}
                  />

                  {errors.length > 0 && (
                    <View style={styles.errorContainer}>
                      {errors.map((error, index) => (
                        <Text key={index} style={styles.errorText}>
                          • {error}
                        </Text>
                      ))}
                    </View>
                  )}
                </ScrollView>

                <SpinnerPicker
                  visible={showPicker}
                  mode={pickerMode}
                  value={pickerTarget === "start" ? startDate : endDate}
                  onConfirm={onPickerConfirm}
                  onClose={closePicker}
                />

                <ReminderPicker
                  visible={showReminderPicker}
                  selectedMinutes={reminderMinutes}
                  onSelect={setReminderMinutes}
                  onClose={() => setShowReminderPicker(false)}
                  eventStartTime={startDate}
                  isAllDay={isAllDay}
                />

                <ModalDropdown
                  visible={showCalendarDropdown}
                  options={calendarOptions}
                  onSelect={handleCalendarSelect}
                  onClose={() => setShowCalendarDropdown(false)}
                  anchorPosition={calendarAnchorPosition}
                />
              </KeyboardAvoidingView>
            </View>
          )}
        </>
      )}

      {/* Checklist Screen */}
      {currentScreen === "checklist" && (
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
              title={selectedChecklist ? "Edit Checklist" : "New Checklist"}
              onCancel={closeChecklistModal}
              onAction={() => editChecklistRef.current?.save()}
              actionText={selectedChecklist ? "Update" : "Create"}
            />

            <EditChecklistContent
              ref={editChecklistRef}
              checklist={selectedChecklist}
              onSave={(checklist) => handleSaveChecklist(checklist, closeChecklistModal)}
              prefilledTitle="Checklist"
              isUserAdmin={user?.admin === true}
            />
          </View>
        </View>
      )}
    </ModalWrapper>
  );
};

export default EventModal;