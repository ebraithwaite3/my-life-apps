import { useState, useEffect, useMemo } from "react";
import { DateTime } from "luxon";
import { useData } from "@my-apps/contexts";

const getStartOfDay = (date = null) =>
  (date ? DateTime.fromJSDate(date) : DateTime.local())
    .startOf("day")
    .toJSDate();

const getEndOfDay = (date = null) =>
  (date ? DateTime.fromJSDate(date) : DateTime.local()).endOf("day").toJSDate();

// NEW: Round to nearest 30 minutes
const getRoundedToNearestHalfHour = (date = null) => {
  const dt = date ? DateTime.fromJSDate(date) : DateTime.now();
  const minutes = dt.minute;

  let roundedMinutes;
  if (minutes < 15) {
    // 0-14 minutes → round down to :00
    roundedMinutes = 0;
  } else if (minutes < 45) {
    // 15-44 minutes → round to :30
    roundedMinutes = 30;
  } else {
    // 45-59 minutes → round up to next hour :00
    return dt
      .plus({ hours: 1 })
      .set({ minute: 0, second: 0, millisecond: 0 })
      .toJSDate();
  }

  return dt
    .set({ minute: roundedMinutes, second: 0, millisecond: 0 })
    .toJSDate();
};

// NEW: Get 1 hour after rounded time
const getOneHourAfterRounded = (date = null) => {
  const rounded = getRoundedToNearestHalfHour(date);
  return DateTime.fromJSDate(rounded).plus({ hours: 1 }).toJSDate();
};

/**
 * useEventFormState - Shared form state for EventModal
 * * Manages all form state (title, dates, calendar, etc.)
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
  console.log("GRoups in useEventFormState:", groups);
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

  // Form state - CHANGED: Use rounded current time as default
  const [title, setTitle] = useState(defaultTitle);
  const [isAllDay, setIsAllDay] = useState(false); // Already false, confirmed!
  const [startDate, setStartDate] = useState(getRoundedToNearestHalfHour);
  const [endDate, setEndDate] = useState(getOneHourAfterRounded);

  const [selectedCalendarId, setSelectedCalendarId] =
    useState(defaultCalendarId);

  const membersToNotify = useMemo(() => {
    // Safety check - fullCalendars might be undefined/loading
    if (!fullCalendars || !selectedCalendarId) {
      return [];
    }

    // Get the full calendar document (not just metadata)
    const fullCalendar = fullCalendars[selectedCalendarId];

    if (!fullCalendar) {
      console.log("No full calendar found for:", selectedCalendarId);
      // Find the group, based on selectedCalendarId with group- removed, in the groups array
      const groupId =
        selectedCalendarId.startsWith("group-") &&
        selectedCalendarId.replace("group-", "");
      const group = groups.find((g) => g.groupId === groupId);
      if (group) {
        // map through and create an array of member userIds
        const memberIds = group.members
          ? group.members.map((member) => member.userId)
          : [];
        console.log(
          `➡️ Group members for ${selectedCalendarId}:`,
          memberIds
        );
        return memberIds;
      }
      return [];
    }

    // Use calendar's subscribingUsers directly
    const subscribers = fullCalendar.subscribingUsers || [];

    console.log(
      `➡️ Calendar subscribers for ${selectedCalendarId}:`,
      subscribers
    );
    return subscribers;
  }, [selectedCalendarId, fullCalendars]);
  console.log("✅ useEventFormState - membersToNotify**:", membersToNotify);

  console.log(
    "✅ useEventFormState** - selectedCalendarId:",
    selectedCalendarId
  );
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

    // If we have an event (either editing OR adding activity to existing event)
    if (event) {
      console.log("📅 Initializing with event data:", event.calendarId);
      setTitle(event.title || defaultTitle);
      setIsAllDay(event.isAllDay ?? false);
      setSelectedCalendarId(event.calendarId || defaultCalendarId); // ← Use event's calendar!
      setDescription(event.description || "");
      setReminderMinutes(event.reminderMinutes ?? null);

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
      setSelectedCalendarId(defaultCalendarId); // ← Use default for NEW events
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
    setStartDate(getRoundedToNearestHalfHour()); // CHANGED
    setEndDate(getOneHourAfterRounded()); // CHANGED
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
