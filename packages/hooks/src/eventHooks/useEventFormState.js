import { useState, useEffect, useMemo } from "react";
import { DateTime } from "luxon";
import { useData } from "@my-apps/contexts";

const getStartOfDay = (date = null) =>
  (date ? DateTime.fromJSDate(date) : DateTime.local())
    .startOf("day")
    .toJSDate();

const getEndOfDay = (date = null) =>
  (date ? DateTime.fromJSDate(date) : DateTime.local()).endOf("day").toJSDate();

// Round to nearest 30 minutes
const getRoundedToNearestHalfHour = (date = null) => {
  const dt = date ? DateTime.fromJSDate(date) : DateTime.now();
  const minutes = dt.minute;

  let roundedMinutes;
  if (minutes < 15) {
    roundedMinutes = 0;
  } else if (minutes < 45) {
    roundedMinutes = 30;
  } else {
    return dt
      .plus({ hours: 1 })
      .set({ minute: 0, second: 0, millisecond: 0 })
      .toJSDate();
  }

  return dt
    .set({ minute: roundedMinutes, second: 0, millisecond: 0 })
    .toJSDate();
};

// Get 1 hour after rounded time
const getOneHourAfterRounded = (date = null) => {
  const rounded = getRoundedToNearestHalfHour(date);
  return DateTime.fromJSDate(rounded).plus({ hours: 1 }).toJSDate();
};

// NEW: Normalize reminder to consistent object format
const normalizeReminder = (reminder) => {
  if (!reminder) return null;
  if (typeof reminder === "string") {
    return {
      scheduledFor: reminder,
      isRecurring: false,
    };
  }
  return reminder;
};

/**
 * useEventFormState - Shared form state for EventModal
 * Manages all form state (title, dates, calendar, etc.)
 * Used by ALL app EventModals
 */
export const useEventFormState = ({
  isVisible,
  event = null,
  initialDate = null,
  userCalendars = [],
  groups = [],
  defaultTitle = "Event",
  userPreferences = {},
}) => {
  console.log("Groups in useEventFormState:", groups);
  const { allCalendars: fullCalendars } = useData();

  const isEditing = event !== null;

  // Build available calendars
  const availableCalendars = useMemo(() => {
    const internalCalendar = {
      calendarId: "internal",
      name: "Personal Calendar",
      color: "#4CAF50",
      calendarType: "internal",
      groupId: null,
    };

    const externalAndGroupCalendars = [
      ...groups.map((group) => ({
        calendarId: `group-${group.groupId}`,
        name: `${group.name} Calendar`,
        color: group.color || "#2196F3",
        calendarType: "group",
        groupId: group.groupId,
      })),
      ...userCalendars.filter((cal) => cal.calendarType === "google"),
    ];

    return [...externalAndGroupCalendars, internalCalendar];
  }, [userCalendars, groups]);

  const defaultCalendarId = useMemo(() => {
    const preferenceId = userPreferences?.defaultCalendarId;

    if (
      preferenceId &&
      availableCalendars.some((cal) => cal.calendarId === preferenceId)
    ) {
      return preferenceId;
    }

    if (availableCalendars.length > 0) {
      return availableCalendars[0].calendarId;
    }

    return "internal";
  }, [availableCalendars, userPreferences?.defaultCalendarId]);

  // Form state
  const [title, setTitle] = useState(defaultTitle);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState(getRoundedToNearestHalfHour);
  const [endDate, setEndDate] = useState(getOneHourAfterRounded);
  const [selectedCalendarId, setSelectedCalendarId] = useState(defaultCalendarId);

  const membersToNotify = useMemo(() => {
    if (!fullCalendars || !selectedCalendarId) {
      return [];
    }

    const fullCalendar = fullCalendars[selectedCalendarId];

    if (!fullCalendar) {
      console.log("No full calendar found for:", selectedCalendarId);
      const groupId =
        selectedCalendarId.startsWith("group-") &&
        selectedCalendarId.replace("group-", "");
      const group = groups.find((g) => g.groupId === groupId);
      if (group) {
        const memberIds = group.members
          ? group.members.map((member) => member.userId)
          : [];
        console.log(`➡️ Group members for ${selectedCalendarId}:`, memberIds);
        return memberIds;
      }
      return [];
    }

    const subscribers = fullCalendar.subscribingUsers || [];
    console.log(`➡️ Calendar subscribers for ${selectedCalendarId}:`, subscribers);
    return subscribers;
  }, [selectedCalendarId, fullCalendars, groups]);

  console.log("✅ useEventFormState - membersToNotify:", membersToNotify);
  console.log("✅ useEventFormState - selectedCalendarId:", selectedCalendarId);

  const [description, setDescription] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState(null);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Dropdown states
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);
  const [calendarAnchorPosition, setCalendarAnchorPosition] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // Picker states
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("date");
  const [pickerTarget, setPickerTarget] = useState("start");
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  // Screen navigation (for multi-screen modals)
  const [currentScreen, setCurrentScreen] = useState("event");

  // Activity state (managed by each app differently)
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Initialize form when modal opens
  useEffect(() => {
    if (!isVisible) return;

    if (event) {
      console.log("📅 Initializing with event data:", event.calendarId);
      setTitle(event.title || defaultTitle);
      setIsAllDay(event.isAllDay ?? false);
      
      // ✅ FIX: Check for groupId first to determine correct calendar
      if (event.groupId) {
        // Group event - use group calendar ID
        setSelectedCalendarId(`group-${event.groupId}`);
        console.log("📅 Group event detected, using calendar:", `group-${event.groupId}`);
      } else {
        // Personal or Google calendar event
        setSelectedCalendarId(event.calendarId || defaultCalendarId);
        console.log("📅 Personal event, using calendar:", event.calendarId);
      }
      
      setDescription(event.description || "");
      
      // ✅ NORMALIZE REMINDER HERE
      setReminderMinutes(normalizeReminder(event.reminderMinutes));
    
      if (event.startTime) setStartDate(new Date(event.startTime));
      if (event.endTime) setEndDate(new Date(event.endTime));
    } else {
      // NEW EVENT: No event object, use defaults
      let newStartDate, newEndDate;

      if (initialDate && DateTime.fromISO(initialDate).isValid) {
        const targetDate = DateTime.fromISO(initialDate);
        const now = DateTime.now();
        const roundedNow = DateTime.fromJSDate(getRoundedToNearestHalfHour());

        newStartDate = targetDate
          .set({
            hour: roundedNow.hour,
            minute: roundedNow.minute,
            second: 0,
            millisecond: 0,
          })
          .toJSDate();

        newEndDate = DateTime.fromJSDate(newStartDate)
          .plus({ hours: 1 })
          .toJSDate();
      } else {
        newStartDate = getRoundedToNearestHalfHour();
        newEndDate = getOneHourAfterRounded();
      }

      setStartDate(newStartDate);
      setEndDate(newEndDate);
      setTitle(defaultTitle);
      setIsAllDay(false);
      setReminderMinutes(null);
      setSelectedCalendarId(defaultCalendarId);
      setDescription("");
      setSelectedActivity(null);
    }

    setErrors([]);
    setCurrentScreen("event");
  }, [isVisible, event, initialDate, defaultTitle, defaultCalendarId]);

  // Picker handlers
  const openPicker = (target, mode) => {
    setPickerTarget(target);
    setPickerMode(mode);
    setShowPicker(true);
  };

  const closePicker = () => setShowPicker(false);

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

  // Calendar selector
  const handleCalendarSelect = (option) => {
    setSelectedCalendarId(option.value);
    setShowCalendarDropdown(false);
  };

  const selectedCalendar = availableCalendars.find(
    (cal) => cal.calendarId === selectedCalendarId
  );

  const calendarOptions = availableCalendars.map((cal) => ({
    label: cal.name,
    value: cal.calendarId,
    color: cal.color,
  }));

  // Reset form
  const resetForm = () => {
    setTitle(defaultTitle);
    setIsAllDay(false);
    setStartDate(getRoundedToNearestHalfHour());
    setEndDate(getOneHourAfterRounded());
    setSelectedCalendarId(defaultCalendarId);
    setDescription("");
    setReminderMinutes(null);
    setSelectedActivity(null);
    setErrors([]);
    setShowCalendarDropdown(false);
    setShowReminderPicker(false);
    setCurrentScreen("event");
  };

  return {
    // Form state
    title,
    setTitle,
    isAllDay,
    setIsAllDay,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedCalendarId,
    setSelectedCalendarId,
    description,
    setDescription,
    reminderMinutes,
    setReminderMinutes,
    errors,
    setErrors,
    isLoading,
    setIsLoading,
    membersToNotify,

    // Calendar
    availableCalendars,
    selectedCalendar,
    calendarOptions,
    showCalendarDropdown,
    setShowCalendarDropdown,
    calendarAnchorPosition,
    setCalendarAnchorPosition,
    handleCalendarSelect,

    // Pickers
    showPicker,
    setShowPicker,
    pickerMode,
    pickerTarget,
    openPicker,
    closePicker,
    onPickerConfirm,
    showReminderPicker,
    setShowReminderPicker,

    // Screen navigation
    currentScreen,
    setCurrentScreen,

    // Activity (app-specific)
    selectedActivity,
    setSelectedActivity,

    // Metadata
    isEditing,

    // Actions
    resetForm,
  };
};