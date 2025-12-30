import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
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
import { LoadingScreen } from "@my-apps/ui";
import { scheduleNotification } from '@my-apps/services';
import { showWarningToast } from '@my-apps/utils';

const EventModal = ({
  isVisible,
  onClose,
  event = null,
  userCalendars = [],
  groups = [],
  initialDate = null,
}) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();
  const isEditing = event !== null;
  const { db, user: currentUser } = useAuth();

  const saveInternalEvent = useSaveInternalEvent();
  const saveToGoogleCalendar = useSaveToGoogleCalendar();

  // Build available calendars from userCalendars and groups
  const availableCalendars = useMemo(() => {
    return [
      // Personal Calendar
      {
        calendarId: "internal",
        name: "Personal Calendar",
        color: "#4CAF50",
        calendarType: "internal",
        groupId: null,
      },
      
      // Group Calendars
      ...groups.map(group => ({
        calendarId: `group-${group.groupId}`,
        name: `${group.name} Calendar`,
        color: group.color || "#2196F3",
        calendarType: "group",
        groupId: group.groupId,
      })),
      
      // User's External Calendars (Google only)
      ...userCalendars.filter(
        cal => cal.calendarType === "google"
      ),
    ];
  }, [userCalendars, groups]);

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
        // New event - default to "Personal Calendar"
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
        setReminderMinutes(null);

        // Default to Personal Calendar (internal)
        setSelectedCalendarId("internal");
        setDescription("");
      }
      setErrors([]);
    }
  }, [isVisible, event, initialDate]);

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

    // Find the selected calendar
    const selectedCalendar = availableCalendars.find(
      cal => cal.calendarId === selectedCalendarId
    );

    // Format event data
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
    // EDITING MODE
    // ========================================
    if (isEditing && event) {
      console.log("✏️ Updating existing event:", event.eventId);
      Alert.alert("Info", "Event editing not yet implemented");
      setIsLoading(false);
      handleClose();
      return;
    }

    // ========================================
    // CREATE MODE - Save new event
    // ========================================
    
    try {
      // INTERNAL CALENDARS (Personal or Group)
      if (selectedCalendarId === "internal" || selectedCalendar?.calendarType === "group") {
        const calendarName = selectedCalendar?.name || "Personal Calendar";
        const groupId = selectedCalendar?.groupId || null;
        
        console.log(`💾 Saving event to ${calendarName}:`, eventData);

        eventData.activities = fakeActivityData;
        eventData.groupId = groupId;

        const result = await saveInternalEvent({
          ...eventData,
          reminderMinutes,
        });
        
        if (result.success) {
          console.log(`✅ Event saved to ${calendarName}`);
          
          // SCHEDULE REMINDER (Fire and Forget)
          if (reminderMinutes !== null && reminderMinutes !== undefined) {
            const reminderTime = new Date(startDate);
            reminderTime.setMinutes(reminderTime.getMinutes() - reminderMinutes);
            
            // Only schedule if reminder time is in the future
            if (reminderTime > new Date()) {
              console.log(`⏰ Scheduling reminder for ${reminderMinutes} minutes before event`);
              
              // Fire and forget - don't await
              scheduleNotification(
                currentUser.uid,
                `Reminder: ${title.trim()}`,
                `Starting in ${reminderMinutes} minutes`,
                reminderTime,
                {
                  screen: 'Calendar',
                  // eventId: eventData.eventId,
                  app: 'organizer-app'
                }
              ).then(reminderResult => {
                if (reminderResult.success) {
                  console.log('✅ Reminder scheduled successfully');
                } else {
                  console.warn('⚠️ Failed to schedule reminder:', reminderResult.error);
                  showWarningToast('Reminder Failed', 'Event saved but reminder could not be scheduled');
                }
              }).catch(error => {
                console.error('❌ Error scheduling reminder:', error);
                showWarningToast('Reminder Failed', 'Event saved but reminder could not be scheduled');
              });
            } else {
              console.log('⚠️ Reminder time is in the past, skipping');
            }
          }
          
          Alert.alert("Success", `Event added to ${calendarName}`);
          
          // TODO: If it's a group event, notify members
          // if (groupId) {
          //   await notifyGroupMembers(groupId, title);
          // }
        } else {
          Alert.alert("Error", `Failed to save event: ${result.error}`);
        }
      }
      
      // GOOGLE CALENDAR
      else {
        console.log("💾 Saving event to Google Calendar:", eventData);
        const result = await saveToGoogleCalendar(
          eventData,
          selectedCalendarId,
          db,
          reminderMinutes,
          fakeActivityData
        );

        if (result.success) {
          console.log("✅ Event saved to Google Calendar with ID:", result.eventId);
          
          // SCHEDULE REMINDER FOR GOOGLE CALENDAR EVENTS TOO
          if (reminderMinutes !== null && reminderMinutes !== undefined) {
            const reminderTime = new Date(startDate);
            reminderTime.setMinutes(reminderTime.getMinutes() - reminderMinutes);
            
            if (reminderTime > new Date()) {
              console.log(`⏰ Scheduling reminder for Google Calendar event`);
              
              scheduleNotification(
                currentUser.uid,
                `Reminder: ${title.trim()}`,
                `Starting in ${reminderMinutes} minutes`,
                reminderTime,
                {
                  screen: 'Calendar',
                  eventId: result.eventId,
                  app: 'organizer-app'
                }
              ).then(reminderResult => {
                if (!reminderResult.success) {
                  console.warn('⚠️ Failed to schedule reminder:', reminderResult.error);
                  showWarningToast('Reminder Failed', 'Event saved but reminder could not be scheduled');
                }
              }).catch(error => {
                console.error('❌ Error scheduling reminder:', error);
                showWarningToast('Reminder Failed', 'Event saved but reminder could not be scheduled');
              });
            }
          }
        } else {
          console.error("❌ Error saving event to Google Calendar:", result.error);
          Alert.alert("Error", "There was an error saving the event to Google Calendar.");
        }
      }
    } catch (error) {
      console.error("❌ Error saving event:", error);
      Alert.alert("Error", "An unexpected error occurred while saving the event.");
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