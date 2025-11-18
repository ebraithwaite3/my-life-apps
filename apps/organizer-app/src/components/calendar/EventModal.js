import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { DateTime } from "luxon";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ModalDropdown } from "@my-apps/ui";
import { useSaveInternalEvent, useSaveToGoogleCalendar } from "@my-apps/hooks";
import { useAuth } from "@my-apps/contexts";

const REMINDER_OPTIONS = [
  { label: "No Alert", value: null },
  { label: "At time of event", value: 0 },
  { label: "5 minutes before", value: 5 },
  { label: "10 minutes before", value: 10 },
  { label: "15 minutes before", value: 15 },
  { label: "30 minutes before", value: 30 },
  { label: "1 hour before", value: 60 },
  { label: "2 hours before", value: 120 },
  { label: "1 day before", value: 1440 },
  { label: "2 days before", value: 2880 },
  { label: "1 week before", value: 10080 },
];

const EventModal = ({
  isVisible,
  onClose,
  event = null,
  availableCalendars = [],
  initialDate = null,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const isEditing = event !== null;
  const calendarButtonRef = useRef(null);
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
  console.log("Selected Calendar ID:", selectedCalendarId);

  // Calendar dropdown state
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);
  const [calendarAnchorPosition, setCalendarAnchorPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Date/Time picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("date");
  const [pickerTarget, setPickerTarget] = useState("start");

  // Reminder picker state
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  // Add to available calendars [] with a "Internal Calendar" option
  availableCalendars = availableCalendars || [];
  if (!availableCalendars.find(cal => cal.name?.toLowerCase().includes('internal'))) {
    availableCalendars.unshift({
      calendarId: "internal-calendar",
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
        const baseDate = initialDate && DateTime.fromISO(initialDate).isValid
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
        const internalCalendar = availableCalendars.find(cal => 
          cal.name?.toLowerCase().includes('internal')
        );
        setSelectedCalendarId(internalCalendar?.calendarId || availableCalendars[0]?.calendarId || "");
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

  const onPickerChange = (event, selectedDate) => {
    if (Platform.OS === "android") setShowPicker(false);

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

    // Format for Google Calendar API
    const eventData = {
      summary: title.trim(),
      description: description.trim(),
      calendarId: selectedCalendarId,
    };

    if (isAllDay) {
      eventData.start = {
        date: DateTime.fromJSDate(startDate).toFormat('yyyy-MM-dd'),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      eventData.end = {
        date: DateTime.fromJSDate(endDate).toFormat('yyyy-MM-dd'),
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

    const fakeActivityData = [
        { id: 'activity-1', type: 'workout' },
    ]

    if (selectedCalendarId === "internal-calendar") {
        eventData.activities = fakeActivityData;
        console.log("💾 Saving event to Internal Calendar:", eventData);
      
        try {
          const result = await saveInternalEvent({ ...eventData, reminderMinutes });
        } catch (error) {
          console.error("❌ Error saving event to Internal Calendar:", error);
        }
      } else {
        try {
          console.log("💾 Saving event to Google Calendar:", eventData);
          const result = await saveToGoogleCalendar(eventData, selectedCalendarId, db, reminderMinutes, fakeActivityData);
    
          if (result.success) {
            console.log("✅ Event saved to Google Calendar with ID:", result.eventId);
          } else {
            console.error("❌ Error saving event to Google Calendar:", result.error);
            Alert.alert("Error", "There was an error saving the event to Google Calendar.");
          }
        }
        catch (error) {
          console.error("❌ Error saving event to Google Calendar:", error);
          Alert.alert("Error", "There was an error saving the event to Google Calendar.");
        }
      }
    
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

  const formatDateForDisplay = (date) => {
    if (!date) return "Select date";
    return DateTime.fromJSDate(date).toFormat("MMM d, yyyy");
  };

  const formatTimeForDisplay = (date) => {
    if (!date) return "Select time";
    return DateTime.fromJSDate(date).toFormat("h:mm a");
  };

  const getReminderLabel = (minutes) => {
    const option = REMINDER_OPTIONS.find(opt => opt.value === minutes);
    return option ? option.label : "No Alert";
  };

  const handleCalendarButtonPress = () => {
    if (availableCalendars?.length <= 1) return;
    
    calendarButtonRef.current?.measureInWindow((x, y, width, height) => {
      setCalendarAnchorPosition({ x, y, width, height });
      setShowCalendarDropdown(true);
    });
  };

  const handleCalendarSelect = (option) => {
    setSelectedCalendarId(option.value);
    setShowCalendarDropdown(false);
  };

  const calendarOptions = availableCalendars.map(cal => ({
    label: cal.name,
    value: cal.calendarId,
    color: cal.color,
  }));

  const selectedCalendar = availableCalendars.find(
    cal => cal.calendarId === selectedCalendarId
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerButton: {
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.sm,
    },
    headerButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
    },
    headerTitle: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
    },
    content: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
      paddingBottom: getSpacing.xl * 2,
    },
    sectionHeader: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      marginTop: getSpacing.lg,
      marginBottom: getSpacing.sm,
      marginHorizontal: getSpacing.lg,
    },
    inputSection: {
      backgroundColor: theme.background,
      marginHorizontal: getSpacing.lg,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      padding: getSpacing.md,
    },
    textInput: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      padding: 0,
      margin: 0,
    },
    formSection: {
      backgroundColor: theme.background,
      marginHorizontal: getSpacing.lg,
      borderRadius: getBorderRadius.md,
      overflow: "hidden",
    },
    formRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    lastFormRow: {
      borderBottomWidth: 0,
    },
    formLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      minWidth: 80,
    },
    timeInputs: {
      flexDirection: "row",
      flex: 1,
      gap: getSpacing.xs,
    },
    dateButton: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.sm,
      paddingHorizontal: getSpacing.sm,
      paddingVertical: getSpacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      flex: 1,
      alignItems: "center",
      minWidth: 140,
    },
    timeButton: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.sm,
      paddingHorizontal: getSpacing.sm,
      paddingVertical: getSpacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      flex: 1,
      alignItems: "center",
      minWidth: 100,
    },
    timeButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    pickerOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    pickerContainer: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: getBorderRadius.lg,
      borderTopRightRadius: getBorderRadius.lg,
      maxHeight: "50%",
    },
    pickerHeader: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    pickerHeaderButton: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
    },
    reminderOption: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    reminderOptionText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    selectedReminderOption: {
      backgroundColor: theme.primary + "20",
    },
    calendarRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flex: 1,
    },
    calendarInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    calendarDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: getSpacing.sm,
    },
    calendarName: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    errorContainer: {
      margin: getSpacing.lg,
      padding: getSpacing.md,
      backgroundColor: theme.error + "20",
      borderRadius: getBorderRadius.md,
    },
    errorText: {
      fontSize: getTypography.bodySmall.fontSize,
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
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? -100 : 20}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
              <Text style={[styles.headerButtonText, { color: theme.error }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>
              {isEditing ? "Edit Event" : "New Event"}
            </Text>

            <TouchableOpacity style={styles.headerButton} onPress={handleSave}>
              <Text style={[styles.headerButtonText, { color: theme.primary }]}>
                Add
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <Text style={styles.sectionHeader}>Title</Text>
            <View style={styles.inputSection}>
              <TextInput
                style={styles.textInput}
                placeholder="Event title"
                placeholderTextColor={theme.text.tertiary}
                value={title}
                onChangeText={setTitle}
                autoCapitalize="words"
              />
            </View>

            {/* Description */}
            <Text style={styles.sectionHeader}>Description</Text>
            <View style={styles.inputSection}>
              <TextInput
                style={styles.textInput}
                placeholder="Add notes or description"
                placeholderTextColor={theme.text.tertiary}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Calendar Selection */}
            <Text style={styles.sectionHeader}>Calendar</Text>
            <View style={styles.formSection}>
              <TouchableOpacity
                ref={calendarButtonRef}
                style={[styles.formRow, styles.lastFormRow]}
                onPress={handleCalendarButtonPress}
                disabled={availableCalendars?.length <= 1}
              >
                <Text style={styles.formLabel}>Calendar</Text>
                <View style={styles.calendarRow}>
                  <View style={styles.calendarInfo}>
                    <View
                      style={[
                        styles.calendarDot,
                        {
                          backgroundColor: selectedCalendar?.color || theme.primary,
                        },
                      ]}
                    />
                    <Text style={styles.calendarName}>
                      {selectedCalendar?.name || "Select calendar"}
                    </Text>
                  </View>
                  {availableCalendars?.length > 1 && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={theme.text.secondary}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* All Day Toggle */}
            <Text style={styles.sectionHeader}>Schedule</Text>
            <View style={styles.formSection}>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>All-day</Text>
                <Switch
                  value={isAllDay}
                  onValueChange={setIsAllDay}
                  trackColor={{ false: theme.border, true: theme.primary + "50" }}
                  thumbColor={isAllDay ? theme.primary : theme.text.secondary}
                />
              </View>

              {/* Start Time */}
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Starts</Text>
                <View style={styles.timeInputs}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => openPicker("start", "date")}
                  >
                    <Text style={styles.timeButtonText}>
                      {formatDateForDisplay(startDate)}
                    </Text>
                  </TouchableOpacity>
                  {!isAllDay && (
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => openPicker("start", "time")}
                    >
                      <Text style={styles.timeButtonText}>
                        {formatTimeForDisplay(startDate)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* End Time */}
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Ends</Text>
                <View style={styles.timeInputs}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => openPicker("end", "date")}
                  >
                    <Text style={styles.timeButtonText}>
                      {formatDateForDisplay(endDate)}
                    </Text>
                  </TouchableOpacity>
                  {!isAllDay && (
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => openPicker("end", "time")}
                    >
                      <Text style={styles.timeButtonText}>
                        {formatTimeForDisplay(endDate)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Reminder - Always show */}
<View style={[styles.formRow, styles.lastFormRow]}>
  <Text style={styles.formLabel}>Remind me</Text>
  <TouchableOpacity
    style={[styles.dateButton, { flex: 1, marginLeft: getSpacing.sm }]}
    onPress={() => setShowReminderPicker(true)}
  >
    <Text style={styles.timeButtonText}>
      {getReminderLabel(reminderMinutes)}
    </Text>
  </TouchableOpacity>
</View>
            </View>

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

          {/* Date/Time Picker */}
          {showPicker && Platform.OS === "ios" && (
            <View style={styles.pickerOverlay}>
              <TouchableWithoutFeedback onPress={closePicker}>
                <View style={{ flex: 1 }} />
              </TouchableWithoutFeedback>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={closePicker}>
                    <Text style={[styles.pickerHeaderButton, { color: theme.primary }]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pickerTarget === "start" ? startDate : endDate}
                  mode={pickerMode}
                  is24Hour={false}
                  display="spinner"
                  onChange={onPickerChange}
                  textColor={theme.text.primary}
                />
              </View>
            </View>
          )}

          {showPicker && Platform.OS === "android" && (
            <DateTimePicker
              value={pickerTarget === "start" ? startDate : endDate}
              mode={pickerMode}
              is24Hour={false}
              display="default"
              onChange={onPickerChange}
            />
          )}

          {/* Reminder Picker */}
          {showReminderPicker && (
            <Modal
              animationType="slide"
              transparent={true}
              visible={showReminderPicker}
              onRequestClose={() => setShowReminderPicker(false)}
            >
              <View style={styles.pickerOverlay}>
                <TouchableWithoutFeedback onPress={() => setShowReminderPicker(false)}>
                  <View style={{ flex: 1 }} />
                </TouchableWithoutFeedback>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowReminderPicker(false)}>
                      <Text style={[styles.pickerHeaderButton, { color: theme.primary }]}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView>
                    {REMINDER_OPTIONS.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.reminderOption,
                          reminderMinutes === option.value && styles.selectedReminderOption,
                          index === REMINDER_OPTIONS.length - 1 && { borderBottomWidth: 0 }
                        ]}
                        onPress={() => {
                          setReminderMinutes(option.value);
                          setShowReminderPicker(false);
                        }}
                      >
                        <Text style={[
                          styles.reminderOptionText,
                          reminderMinutes === option.value && { color: theme.primary, fontWeight: "600" }
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          )}

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
    </Modal>
  );
};

export default EventModal;