import { useState, useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';

const getStartOfDay = (date = null) =>
  (date ? DateTime.fromJSDate(date) : DateTime.local()).startOf("day").toJSDate();

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
    return dt.plus({ hours: 1 }).set({ minute: 0, second: 0, millisecond: 0 }).toJSDate();
  }
  
  return dt.set({ minute: roundedMinutes, second: 0, millisecond: 0 }).toJSDate();
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

    return [
      ...externalAndGroupCalendars,
      internalCalendar,
    ];
  }, [userCalendars, groups]);
  console.log("✅ useEventFormState - availableCalendars:", availableCalendars);

  const defaultCalendarId = useMemo(() => {
    const preferenceId = userPreferences?.defaultCalendarId;
    
    if (preferenceId && availableCalendars.some(cal => cal.calendarId === preferenceId)) {
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
  
  const [selectedCalendarId, setSelectedCalendarId] = useState(defaultCalendarId);
  
  const membersToNotify = useMemo(() => {
    let memberIds = [];
    let targetGroup = null;
    let effectiveDontNotifyList = [];

    const selectedCalendar = availableCalendars.find(
        (cal) => cal.calendarId === selectedCalendarId
    );
    
    if (selectedCalendarId.startsWith('group-')) {
        const groupIdMatch = selectedCalendarId.replace('group-', '');
        targetGroup = groups.find((g) => g.groupId === groupIdMatch);
        effectiveDontNotifyList = targetGroup?.dontNotify || []; 
    } 
    else if (selectedCalendar && selectedCalendar.groupId) {
        targetGroup = groups.find((g) => g.groupId === selectedCalendar.groupId);
        effectiveDontNotifyList = selectedCalendar.dontNotify || [];
    }
    
    if (targetGroup) {
      console.log("1. TARGET GROUP ID:", targetGroup.groupId);
      console.log("2. ALL GROUP MEMBERS:", targetGroup.members.map(m => m.userId));
      console.log("3. EXCLUSION LIST:", effectiveDontNotifyList);
      
      const isTestUserInBase = targetGroup.members.some(m => m.userId === "eylhN1q46shFnFu6FdxgKqI2I1g2");
      console.log("4. IS TEST USER IN BASE MEMBERS LIST?", isTestUserInBase);
      
      const isTestUserExcluded = effectiveDontNotifyList.includes("eylhN1q46shFnFu6FdxgKqI2I1g2");
      console.log("5. IS TEST USER IN DONT NOTIFY LIST?", isTestUserExcluded);

      memberIds = targetGroup.members
          .filter((member) => !effectiveDontNotifyList.includes(member.userId))
          .map((member) => member.userId);
    }
    
    console.log(`➡️ membersToNotify calculated for ${selectedCalendarId}:`, memberIds);
    return memberIds;
  }, [selectedCalendarId, availableCalendars, groups]);
  
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

  if (isEditing && event) {
    setTitle(event.title || defaultTitle);
    setIsAllDay(event.isAllDay ?? false);
    setSelectedCalendarId(event.calendarId || defaultCalendarId); 
    setDescription(event.description || "");
    setReminderMinutes(event.reminderMinutes ?? null);

    if (event.startTime) setStartDate(new Date(event.startTime));
    if (event.endTime) setEndDate(new Date(event.endTime));
  } else {
    // NEW EVENT: Always use rounded current time
    let newStartDate, newEndDate;
    
    if (initialDate && DateTime.fromISO(initialDate).isValid) {
      // If initialDate provided, use that DATE but with current rounded TIME
      const targetDate = DateTime.fromISO(initialDate);
      const now = DateTime.now();
      const roundedNow = DateTime.fromJSDate(getRoundedToNearestHalfHour());
      
      // Combine target date with rounded current time
      newStartDate = targetDate.set({
        hour: roundedNow.hour,
        minute: roundedNow.minute,
        second: 0,
        millisecond: 0
      }).toJSDate();
      
      newEndDate = DateTime.fromJSDate(newStartDate).plus({ hours: 1 }).toJSDate();
    } else {
      // No initialDate: use rounded current time
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
}, [isVisible, event, initialDate, isEditing, defaultTitle, defaultCalendarId]);

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