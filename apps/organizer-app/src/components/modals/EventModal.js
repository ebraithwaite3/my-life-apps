import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useTheme } from "@my-apps/contexts";
import { DateTime } from "luxon";
import {
  ModalDropdown,
  SpinnerPicker,
  ReminderPicker,
  TextInputRow,
  CalendarSelector,
  ModalHeader,
  DateTimeSelector,
  ReminderSelector,
} from "@my-apps/ui";
import { useSaveInternalEvent, useSaveToGoogleCalendar } from "@my-apps/hooks";
import { useAuth } from "@my-apps/contexts";
import { LoadingScreen } from "@my-apps/screens";

const EventModal = ({
  isVisible,
  onClose,
  event = null,
  availableCalendars = [],
  initialDate = null,
}) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();
  const isEditing = event !== null;
  const { db } = useAuth();

  const saveInternalEvent = useSaveInternalEvent();
  const saveToGoogleCalendar = useSaveToGoogleCalendar();

  // Form state
  const [title, setTitle] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
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

  // Add to available calendars [] with a "Internal Calendar" option
  availableCalendars = availableCalendars || [];
  if (
    !availableCalendars.find((cal) =>
      cal.name?.toLowerCase().includes("internal")
    )
  ) {
    availableCalendars.unshift({
      calendarId: "internal",
      name: "Internal Calendar",
      color: "#4CAF50", // Green
      calendarType: "internal",
    });
  }

  // Initialize form when modal opens
  useEffect(() => {
    if (isVisible) {
      if (isEditing && event) {
        setTitle(event.title || "");
        setIsAllDay(event.isAllDay || false);
        setSelectedCalendarId(event.calendarId || "");
        setDescription(event.description || "");
        setReminderMinutes(event.reminderMinutes || null);
        if (event.startTime) setStartDate(new Date(event.startTime));
        if (event.endTime) setEndDate(new Date(event.endTime));
      } else {
        // New event - default to "Internal Calendar"
        const baseDate =
          initialDate && DateTime.fromISO(initialDate).isValid
            ? DateTime.fromISO(initialDate)
            : DateTime.local().startOf("day");

        const now = DateTime.local();
        const roundedHour = now.hour + (now.minute >= 30 ? 1 : 0);

        const defaultStartDate = baseDate
          .set({ hour: roundedHour, minute: 0, second: 0, millisecond: 0 })
          .toJSDate();

        const defaultEndDate = DateTime.fromJSDate(defaultStartDate)
          .plus({ hours: 1 })
          .toJSDate();

        setTitle("");
        setIsAllDay(false);
        setStartDate(defaultStartDate);
        setEndDate(defaultEndDate);
        setReminderMinutes(null); // Default to "No Alert"

        // Default to Internal Calendar
        const internalCalendar = availableCalendars.find((cal) =>
          cal.name?.toLowerCase().includes("internal")
        );
        setSelectedCalendarId(
          internalCalendar?.calendarId ||
            availableCalendars[0]?.calendarId ||
            ""
        );
        setDescription("");
      }
      setErrors([]);
    }
  }, [isVisible, event, initialDate, availableCalendars?.length]);

  const openPicker = (target, mode) => {
    setPickerTarget(target);
    setPickerMode(mode);
    setShowPicker(true);
  };

  const onPickerConfirm = (selectedDate) => {
    if (selectedDate) {
      if (pickerTarget === "start") {
        setStartDate(selectedDate);
        if (selectedDate > endDate) {
          setEndDate(new Date(selectedDate.getTime() + 60 * 60 * 1000));
        }
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const closePicker = () => setShowPicker(false);

  const validateForm = () => {
    const newErrors = [];
    if (!title.trim()) newErrors.push("Title is required");
    if (!startDate) newErrors.push("Start date is required");
    if (!endDate) newErrors.push("End date is required");
    if (startDate && endDate && endDate <= startDate) {
      newErrors.push("End time must be after start time");
    }
    setErrors(newErrors);
    if (newErrors.length > 0) console.log("❌ Validation errors:", newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      console.log("❌ Validation errors:", errors);
      return;
    }

    setIsLoading(true);

    // Format for Google Calendar API
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

    const fakeActivityData = [{ id: "activity-1", type: "workout" }];

    // ========================================
    // EDITING MODE - Update existing event
    // ========================================
    if (isEditing && event) {
      console.log("✏️ Updating existing event:", event.eventId);

      if (selectedCalendarId === "internal") {
        try {
          // TODO: Create useUpdateInternalEvent hook
          console.log("💾 Updating internal event:", eventData);
          Alert.alert("Info", "Internal event editing not yet implemented");
        } catch (error) {
          console.error("❌ Error updating internal event:", error);
          Alert.alert("Error", "Failed to update internal event");
        }
      } else {
        try {
          // TODO: Create useUpdateGoogleCalendarEvent hook
          console.log("💾 Updating Google Calendar event:", eventData);
          Alert.alert(
            "Info",
            "Google Calendar event editing not yet implemented"
          );
        } catch (error) {
          console.error("❌ Error updating Google Calendar event:", error);
          Alert.alert("Error", "Failed to update event");
        }
      }

      setIsLoading(false);
      handleClose();
      return;
    }

    // ========================================
    // CREATE MODE - Save new event
    // ========================================
    if (selectedCalendarId === "internal") {
      eventData.activities = fakeActivityData;
      console.log("💾 Saving event to Internal Calendar:", eventData);

      try {
        const result = await saveInternalEvent({
          ...eventData,
          reminderMinutes,
        });
      } catch (error) {
        console.error("❌ Error saving event to Internal Calendar:", error);
      }
    } else {
      try {
        console.log("💾 Saving event to Google Calendar:", eventData);
        const result = await saveToGoogleCalendar(
          eventData,
          selectedCalendarId,
          db,
          reminderMinutes,
          fakeActivityData
        );

        if (result.success) {
          console.log(
            "✅ Event saved to Google Calendar with ID:",
            result.eventId
          );
        } else {
          console.error(
            "❌ Error saving event to Google Calendar:",
            result.error
          );
          Alert.alert(
            "Error",
            "There was an error saving the event to Google Calendar."
          );
        }
      } catch (error) {
        console.error("❌ Error saving event to Google Calendar:", error);
        Alert.alert(
          "Error",
          "There was an error saving the event to Google Calendar."
        );
      }
    }

    setIsLoading(false);
    handleClose();
  };

  const handleClose = () => {
    setTitle("");
    setIsAllDay(false);
    setStartDate(new Date());
    setEndDate(new Date());
    setSelectedCalendarId("");
    setDescription("");
    setReminderMinutes(null);
    setErrors([]);
    setShowCalendarDropdown(false);
    setShowReminderPicker(false);
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
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
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
            {/* Header */}
            <ModalHeader
              leftText="Cancel"
              leftColor={theme.error}
              onLeftPress={handleClose}
              title={isEditing ? "Edit Event" : "New Event"}
              rightText={isEditing ? "Update" : "Add"}
              rightColor={theme.primary}
              onRightPress={handleSave}
            />

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Title */}
              <TextInputRow
                label="Title"
                placeholder="Event title"
                value={title}
                onChangeText={setTitle}
                autoCapitalize="words"
              />

              {/* Description */}
              <TextInputRow
                label="Description"
                placeholder="Add notes or description"
                value={description}
                onChangeText={setDescription}
              />

              {/* Calendar Selection */}
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

              {/* Schedule */}
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

              {/* Reminder */}
              <ReminderSelector
                label="Reminder"
                reminderMinutes={reminderMinutes}
                onPress={() => setShowReminderPicker(true)}
              />

              {/* Errors */}
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

            {/* SpinnerPicker for Date/Time */}
            <SpinnerPicker
              visible={showPicker}
              mode={pickerMode}
              value={pickerTarget === "start" ? startDate : endDate}
              onConfirm={onPickerConfirm}
              onClose={closePicker}
            />

            {/* Reminder Picker */}
            <ReminderPicker
              visible={showReminderPicker}
              selectedMinutes={reminderMinutes}
              onSelect={setReminderMinutes}
              onClose={() => setShowReminderPicker(false)}
              eventStartTime={startDate}
            />

            {/* Calendar Dropdown */}
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
    </Modal>
  );
};

export default EventModal;