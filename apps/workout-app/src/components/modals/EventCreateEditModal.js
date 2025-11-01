import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { DateTime } from "luxon";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useCalendarActions } from "../../hooks";

const EventCreateEditModal = ({
  isVisible,
  onClose,
  onSave,
  event = null,
  availableCalendars = [],
  initialDate = null,
  groups = [],
  preferences = {},
  myWorkoutTemplates = [],
}) => {
  console.log("Preferences in EventCreateEditModal:", preferences);
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const isEditing = event !== null;
  const { addEventToCalendar, updateEventInCalendar } = useCalendarActions();
  console.log(
    "AVAILABLE CALENDARS:",
    availableCalendars,
    "Initial Date:",
    initialDate
  );

  // Form state
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState([]);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

  // Date/Time picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("date");
  const [pickerTarget, setPickerTarget] = useState("start");

  const syncEventsToCalendar = useMemo(() => {
    return preferences.syncWorkoutsToCalendar ?? true;
  }, [preferences]);
  console.log("Sync Events to Calendar preference:", syncEventsToCalendar);

  // Initialize form when modal opens
  useEffect(() => {
    if (isVisible) {
      if (isEditing && event) {
        setSelectedCalendarId(event.calendarId || "");
        setDescription(event.description || "");

        if (event.startTime) {
          setStartDate(new Date(event.startTime));
        }

        if (event.endTime) {
          setEndDate(new Date(event.endTime));
        }
      } else {
        // Parse initialDate, fallback to today if invalid
        const baseDate =
          initialDate &&
          DateTime.fromISO(initialDate, { zone: "local" }).isValid
            ? DateTime.fromISO(initialDate, { zone: "local" })
            : DateTime.local().startOf("day");

        // Get current time and round to nearest hour
        const now = DateTime.local();
        const roundedHour = now.hour + (now.minute >= 30 ? 1 : 0);
        const adjustedHour = roundedHour >= 24 ? 0 : roundedHour;

        // Combine baseDate with rounded current time
        const defaultStartDate = baseDate
          .set({
            hour: adjustedHour,
            minute: 0,
            second: 0,
            millisecond: 0,
          })
          .toJSDate();

        // Set end date to 1 hour later
        const defaultEndDate = DateTime.fromJSDate(defaultStartDate)
          .plus({ hours: 1 })
          .toJSDate();

        setStartDate(defaultStartDate);
        setEndDate(defaultEndDate);
        if (syncEventsToCalendar) {
          setSelectedCalendarId(availableCalendars[0]?.calendarId || "");
        } else {
          setSelectedCalendarId("");
        }
        setDescription("");
      }
      setErrors([]);
    }
  }, [isVisible, event, isEditing, initialDate, availableCalendars, syncEventsToCalendar]);

  // Open date/time picker
  const openPicker = (target, mode) => {
    setPickerTarget(target);
    setPickerMode(mode);
    setShowPicker(true);
  };

  // Handle date change (preserves time)
  const handleDateChange = (target, selected) => {
    if (!selected) return;
    const current = target === "start" ? startDate : endDate;
    const newDate = new Date(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
      current.getHours(),
      current.getMinutes(),
      current.getSeconds(),
      0
    );
    if (target === "start") {
      setStartDate(newDate);
      if (!syncEventsToCalendar) {
        // For non-sync, always set end to start + 1 hour
        setEndDate(new Date(newDate.getTime() + 60 * 60 * 1000));
      } else if (newDate > endDate) {
        setEndDate(new Date(newDate.getTime() + 60 * 60 * 1000));
      }
    } else {
      setEndDate(newDate);
    }
  };

  // Handle time change (preserves date)
  const handleTimeChange = (target, selected) => {
    if (!selected) return;
    const current = target === "start" ? startDate : endDate;
    const newDate = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate(),
      selected.getHours(),
      selected.getMinutes(),
      0,
      0
    );
    if (target === "start") {
      setStartDate(newDate);
      if (newDate > endDate) {
        setEndDate(new Date(newDate.getTime() + 60 * 60 * 1000));
      }
    } else {
      setEndDate(newDate);
    }
  };

  // Handle picker value change
  const onPickerChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }

    if (selectedDate) {
      if (pickerMode === "date") {
        handleDateChange(pickerTarget, selectedDate);
      } else {
        handleTimeChange(pickerTarget, selectedDate);
      }
    }
  };

  // Close picker (iOS only)
  const closePicker = () => {
    setShowPicker(false);
  };

  const validateForm = () => {
    const newErrors = [];

    if (syncEventsToCalendar && !selectedCalendarId) {
      newErrors.push("Please select a calendar");
    }

    if (!startDate) {
      newErrors.push("Start date is required");
    }

    if (!endDate) {
      newErrors.push("End date is required");
    }

    if (startDate && endDate && endDate <= startDate) {
      newErrors.push("End time must be after start time");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
  
    const eventData = {
      title: "Workout", // Default title
      calendarId: syncEventsToCalendar ? selectedCalendarId : null,
      description: description.trim(),
      source: "user_created",
      startTime: DateTime.fromJSDate(startDate).toISO(),
      endTime: DateTime.fromJSDate(endDate).toISO(),
    };
  
    if (isEditing) {
      eventData.eventId = event.eventId;
    }
  
    const groupsWithSelectedCalendar = syncEventsToCalendar
      ? groups
          .filter(group => 
            group.calendars && 
            group.calendars.some(calendar => calendar.calendarId === selectedCalendarId)
          )
          .map(group => group.groupId)
      : [];
    console.log("Groups with selected calendar:", groupsWithSelectedCalendar, groups, selectedCalendarId);
  
    console.log("Saving event:", selectedCalendarId, eventData);
  
    try {
      if (syncEventsToCalendar) {
        if (isEditing) {
          await updateEventInCalendar(selectedCalendarId, eventData, groupsWithSelectedCalendar, groups);
        } else {
          await addEventToCalendar(selectedCalendarId, eventData, groupsWithSelectedCalendar, groups);
        }
      } else {
        if (onSave) {
          onSave(eventData);
        }
      }
      handleClose();
    } catch (error) {
      Alert.alert("Error", `Failed to save event: ${error.message}`);
      console.error("Failed to save event:", error);
    }
  };

  const handleClose = () => {
    setStartDate(new Date());
    setEndDate(new Date());
    setSelectedCalendarId("");
    setDescription("");
    setErrors([]);
    setShowCalendarPicker(false);
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

  const handleCalendarSelect = (calendarId) => {
    setSelectedCalendarId(calendarId);
    setShowCalendarPicker(false);
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "flex-end",
    },
    calendarPickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: getBorderRadius.lg,
      borderTopRightRadius: getBorderRadius.lg,
      width: "100%",
      height: "95%",
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
    formSection: {
      backgroundColor: theme.background,
      marginTop: getSpacing.sm,
      marginHorizontal: getSpacing.lg,
      borderRadius: getBorderRadius.md,
      overflow: "hidden",
    },
    formRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
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
    calendarRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
    notesSection: {
      backgroundColor: theme.background,
      marginHorizontal: getSpacing.lg,
      marginTop: getSpacing.md,
      marginBottom: getSpacing.lg,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      padding: getSpacing.md,
    },
    notesInput: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      minHeight: 100,
      maxHeight: 200,
      textAlignVertical: "top",
      padding: 0,
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
    calendarPickerModal: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      width: "90%",
      maxHeight: "50%",
      marginHorizontal: getSpacing.lg,
    },
    calendarPickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    calendarPickerTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
    },
    calendarOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    selectedCalendarOption: {
      backgroundColor: theme.primary + "20",
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
              {isEditing ? "Edit Event" : "New Workout"}
            </Text>

            <TouchableOpacity style={styles.headerButton} onPress={handleSave}>
              <Text style={[styles.headerButtonText, { color: theme.primary }]}>
                {isEditing ? "Save" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            keyboardDismissMode="interactive"
          >
            {/* Time Section */}
            <Text style={styles.sectionHeader}>Schedule</Text>
            <View style={styles.formSection}>
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
                  {syncEventsToCalendar && (
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

              {syncEventsToCalendar && (
                <View style={[styles.formRow, styles.lastFormRow]}>
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
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => openPicker("end", "time")}
                    >
                      <Text style={styles.timeButtonText}>
                        {formatTimeForDisplay(endDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Calendar Selection */}
            {syncEventsToCalendar && (
              <>
                <Text style={styles.sectionHeader}>Calendar</Text>
                <View style={styles.formSection}>
                  <TouchableOpacity
                    style={[styles.formRow, styles.lastFormRow]}
                    onPress={() =>
                      availableCalendars.length > 1 && setShowCalendarPicker(true)
                    }
                    disabled={availableCalendars.length <= 1}
                  >
                    <Text style={styles.formLabel}>Calendar</Text>
                    <View style={styles.calendarRow}>
                      <View style={styles.calendarInfo}>
                        <View
                          style={[
                            styles.calendarDot,
                            {
                              backgroundColor:
                                availableCalendars.find(
                                  (cal) => cal.calendarId === selectedCalendarId
                                )?.color || theme.primary,
                            },
                          ]}
                        />
                        <Text style={styles.calendarName}>
                          {availableCalendars.find(
                            (cal) => cal.calendarId === selectedCalendarId
                          )?.name || "Select calendar"}
                        </Text>
                      </View>
                      {availableCalendars.length > 1 && (
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={theme.text.secondary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Section to Select Workout Template */}
            <Text style={styles.sectionHeader}>Workout Template</Text>
            <View style={styles.formSection}>
              {myWorkoutTemplates.length === 0 ? (
                <View style={[styles.formRow, styles.lastFormRow]}>
                  <Text style={styles.formLabel}>No templates available.  Create one to be able to add to a workout.</Text>
                </View>
              ) : (
                myWorkoutTemplates.map((template, index) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.formRow,
                      index === myWorkoutTemplates.length - 1 && styles.lastFormRow,
                    ]}
                    onPress={() => {
                      setDescription(template.description || "");
                    }}
                  >
                    <Text style={styles.formLabel}>{template.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View> 

            {/* Notes Section */}
            <Text style={styles.sectionHeader}>Notes</Text>
            <View style={styles.notesSection}>
              <TextInput
                style={styles.notesInput}
                placeholder="Add notes or description"
                placeholderTextColor={theme.text.tertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                scrollEnabled={false}
              />
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
          {showPicker && (
            <DateTimePicker
              value={pickerTarget === "start" ? startDate : endDate}
              mode={pickerMode}
              is24Hour={false}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onPickerChange}
              onTouchCancel={closePicker}
            />
          )}

          {/* iOS Picker Overlay */}
          {showPicker && Platform.OS === "ios" && (
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={closePicker}>
                    <Text
                      style={[
                        styles.pickerHeaderButton,
                        { color: theme.primary },
                      ]}
                    >
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

          {/* Calendar Picker Modal */}
          {showCalendarPicker && (
            <Modal
              animationType="slide"
              transparent={true}
              visible={showCalendarPicker}
              onRequestClose={() => setShowCalendarPicker(false)}
            >
              <TouchableWithoutFeedback
                onPress={() => setShowCalendarPicker(false)}
              >
                <View style={styles.calendarPickerOverlay}>
                  <TouchableWithoutFeedback>
                    <View style={styles.calendarPickerModal}>
                      <View style={styles.calendarPickerHeader}>
                        <Text style={styles.calendarPickerTitle}>
                          Select Calendar
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowCalendarPicker(false)}
                        >
                          <Text
                            style={[
                              styles.pickerHeaderButton,
                              { color: theme.primary },
                            ]}
                          >
                            Done
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <ScrollView>
                        {availableCalendars.map((calendar) => (
                          <TouchableOpacity
                            key={calendar.calendarId}
                            style={[
                              styles.calendarOption,
                              selectedCalendarId === calendar.calendarId &&
                                styles.selectedCalendarOption,
                            ]}
                            onPress={() =>
                              handleCalendarSelect(calendar.calendarId)
                            }
                          >
                            <View style={styles.calendarInfo}>
                              <View
                                style={[
                                  styles.calendarDot,
                                  {
                                    backgroundColor:
                                      calendar.color || theme.primary,
                                  },
                                ]}
                              />
                              <Text style={styles.calendarName}>
                                {calendar.name}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default EventCreateEditModal;