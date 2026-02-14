import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { DateTime } from "luxon";
import {
  useUserDoc,
  useMessagesDoc,
  useGroupDocs,
  useCalendarDocs,
  useActivityDocs,
  useScheduleTemplates,
  useStandAloneReminders,
} from "@my-apps/data-sync";
import {
  navigateNextDay,
  navigatePreviousDay,
  navigateToday,
  navigateNextMonth,
  navigatePreviousMonth,
} from "@my-apps/utils";

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { user: authUser, db } = useAuth();

  // Date States (DEFINE FIRST)
  const [selectedDate, setSelectedDate] = useState(
    DateTime.local().toISODate()
  );
  const [selectedMonth, setSelectedMonth] = useState(
    DateTime.local().monthLong
  );
  const [selectedYear, setSelectedYear] = useState(DateTime.local().year);
  const [currentDate, setCurrentDate] = useState(DateTime.local().toISODate());
  //console.log("Selected Date:", selectedDate, selectedMonth, selectedYear);

  // State for adding a checklist to an event
  const [addingToEvent, setAddingToEvent] = useState({
    isActive: false,
    itemsToMove: [],
    returnPath: null,
    sourceInfo: null,
  });

  // USE HOOKS FOR ALL SUBSCRIPTIONS
  const { user, loading, error: userError } = useUserDoc(db, authUser?.uid);
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
  } = useMessagesDoc(db, user?.userId);
  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
  } = useGroupDocs(db, user?.groups);

  // Extract calendar IDs from user calendars
  const calendarIds = useMemo(() => {
    if (!user?.calendars) return [];
    return user.calendars.map((cal) => cal.calendarId).filter((id) => !!id);
  }, [user?.calendars]);

  // Extract group IDs from user groups
  const groupIds = useMemo(() => {
    if (!user?.groups) return [];
    return [...user.groups]; // Create new array only when content changes
  }, [user?.groups?.length, user?.groups?.join(",")]);

  // Calendar shards hook
  const {
    allCalendars,
    calendarsLoading,
    error: calendarsError,
    getEventsForCalendar,
    getEventsForMonth,
    getEventsForDay,
    getCurrentMonthEvents,
  } = useCalendarDocs(db, calendarIds, selectedMonth, selectedYear);

  // Activity shards hook
  const {
    allActivities,
    activitiesLoading,
    error: activitiesError,
    getActivitiesForMonth,
    getActivitiesForDay,
    getCurrentMonthActivities,
    getActivitiesForEntity,
    getActivitiesForEvent,
  } = useActivityDocs(db, user?.userId, groupIds, selectedMonth, selectedYear);

  // Schedule templates hook (admin only for now)
  const {
    templates,
    activeTemplate,
    activeTemplateId,
    setActiveTemplateId,
    getTemplateEventsForWeek,
    templatesLoading,
    error: templatesError,
  } = useScheduleTemplates(db, user?.userId, user?.admin);

  // Stand-alone reminders hook (admin only for now)
  const {
    reminders,
    remindersLoading,
    remindersError,
    saveReminder,
    deleteReminder,
    toggleReminderActive,
  } = useStandAloneReminders(db, user?.userId, user?.admin);
  console.log("📬 Reminders:", reminders, "Loading:", remindersLoading);

  console.log("👤 User:", user?.userId, "Loading:", loading, "Full User", user);
  if (userError) console.error("❌ User error:", userError);

  if (messagesError) console.error("❌ Messages error:", messagesError);

  if (groupsError) console.error("❌ Groups error:", groupsError);

  if (calendarsError) console.error("❌ Calendars error:", calendarsError);

  if (activitiesError) console.error("❌ Activities error:", activitiesError);

  // Hardcoded admin Id (for now testing but will change to MY user Id once ready for production)
  const adminUserId = "LCqH5hKx2bP8Q5gDGPmzRd65PB32";

  // Is User Admin
  const isUserAdmin = useMemo(() => {
    return user?.admin === true;
  }, [user]);

  // ===== HELPER FUNCTIONS =====
  const unreadMessagesCount = useMemo(() => {
    return messages?.messages?.filter((m) => !m.read).length || 0;
  }, [messages]);

  const unacceptedChecklistsCount = useMemo(() => {
    const checklists = user?.savedChecklists || [];
    return checklists.filter((cl) => cl.accepted === false).length;
  }, [user]);

  const messagesCount = useMemo(() => {
    return messages?.messages?.length || 0;
  }, [messages]);

  // ===== DATE NAVIGATION METHODS =====
  const navigateToNextDay = useCallback(() => {
    const { date, month, year } = navigateNextDay(selectedDate);
    //console.log("➡️ Navigating to next day:", date);
    setSelectedDate(date);
    setSelectedMonth(month);
    setSelectedYear(year);
  }, [selectedDate]);

  const navigateToPreviousDay = useCallback(() => {
    const { date, month, year } = navigatePreviousDay(selectedDate);
    setSelectedDate(date);
    setSelectedMonth(month);
    setSelectedYear(year);
  }, [selectedDate]);

  const navigateToToday = useCallback(() => {
    const { date, month, year } = navigateToday();
    setSelectedDate(date);
    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);

  const navigateToNextMonth = useCallback(() => {
    const { date, month, year } = navigateNextMonth(selectedDate); // ← Pass date
    setSelectedDate(date); // ← Update date too!
    setSelectedMonth(month);
    setSelectedYear(year);
  }, [selectedDate]);

  const navigateToPreviousMonth = useCallback(() => {
    const { date, month, year } = navigatePreviousMonth(selectedDate); // ← Pass date
    setSelectedDate(date); // ← Update date too!
    setSelectedMonth(month);
    setSelectedYear(year);
  }, [selectedDate]);

  const navigateToDate = useCallback((dateISO) => {
    //console.log("📅 Navigating to date:", dateISO);
    const dt = DateTime.fromISO(dateISO);
    setSelectedDate(dt.toISODate());
    setSelectedMonth(dt.monthLong);
    setSelectedYear(dt.year);
  }, []);

  const navigateToNextWeek = useCallback(() => {
    const dt = DateTime.fromISO(selectedDate);
    const nextWeek = dt.plus({ weeks: 1 });
    //console.log("➡️ Navigating to next week:", nextWeek.toISODate());
    setSelectedDate(nextWeek.toISODate());
    setSelectedMonth(nextWeek.monthLong);
    setSelectedYear(nextWeek.year);
  }, [selectedDate]);

  const navigateToPreviousWeek = useCallback(() => {
    const dt = DateTime.fromISO(selectedDate);
    const prevWeek = dt.minus({ weeks: 1 });
    //console.log("⬅️ Navigating to previous week:", prevWeek.toISODate());
    setSelectedDate(prevWeek.toISODate());
    setSelectedMonth(prevWeek.monthLong);
    setSelectedYear(prevWeek.year);
  }, [selectedDate]);

  const getEventsForWeek = useCallback(
    (dateISO) => {
      const dt = DateTime.fromISO(dateISO);

      // US-style week: Sunday (start) to Saturday (end)
      const weekStart = dt.minus({ days: dt.weekday % 7 }); // Go back to Sunday
      const weekEnd = weekStart.plus({ days: 6 }); // Saturday

      // Get all events for the week
      const weekEvents = [];
      let currentDay = weekStart;

      while (currentDay <= weekEnd) {
        const dayISO = currentDay.toISODate();
        const dayEvents = getEventsForDay(dayISO);
        weekEvents.push({
          date: dayISO,
          dayNumber: currentDay.day,
          isToday: currentDay.toISODate() === DateTime.local().toISODate(),
          events: dayEvents,
        });
        currentDay = currentDay.plus({ days: 1 });
      }

      return weekEvents;
    },
    [getEventsForDay]
  );
  //console.log("All Calendars:", allCalendars);

  // ===== CONTEXT VALUE =====
  const value = useMemo(
    () => ({
      // Core user data
      user,
      userLoading: loading,
      isUserAdmin,
      adminUserId,

      // Date states
      currentDate,
      selectedDate,
      setSelectedDate,
      selectedMonth,
      setSelectedMonth,
      selectedYear,
      setSelectedYear,

      // Counts
      unreadMessagesCount,
      unacceptedChecklistsCount,
      messagesCount,

      // Add Event States
      addingToEvent,
      setAddingToEvent,

      // Data from hooks
      groups,
      messages,
      allCalendars,
      allActivities,

      // Loading states - Individual
      calendarsLoading,
      groupsLoading,
      messagesLoading,
      activitiesLoading,

      // Loading states - Combined
      dataLoading:
        calendarsLoading ||
        groupsLoading ||
        messagesLoading ||
        activitiesLoading,
      isAnyLoading:
        loading ||
        calendarsLoading ||
        groupsLoading ||
        messagesLoading ||
        activitiesLoading,

      // Computed properties
      isDataLoaded: !loading && !!user,
      hasGroups: groups?.length > 0,

      // Legacy compatibility (from user doc)
      calendarsInfo: user?.calendars || [],
      groupsInfo: user?.groups || [],
      preferences: user?.preferences || {},
      myUsername: user?.username || "",
      myUserId: user?.userId || "",

      // Calendar helpers
      getEventsForCalendar,
      getEventsForMonth,
      getEventsForDay,
      getCurrentMonthEvents,
      getEventsForWeek,

      // Activity helpers
      getActivitiesForMonth,
      getActivitiesForDay,
      getCurrentMonthActivities,
      getActivitiesForEntity,
      getActivitiesForEvent,

      // Date navigation methods
      navigateToNextDay,
      navigateToPreviousDay,
      navigateToToday,
      navigateToNextMonth,
      navigateToPreviousMonth,
      navigateToDate,
      navigateToNextWeek,
      navigateToPreviousWeek,

      // Schedule template helpers (admin only for now)
      templates,
      activeTemplate,
      activeTemplateId,
      setActiveTemplateId,
      getTemplateEventsForWeek,
      templatesLoading,

      // Stand-alone reminders (admin only for now)
      reminders,
      remindersLoading,
      saveReminder,
      deleteReminder,
      toggleReminderActive,
    }),
    [
      user,
      loading,
      currentDate,
      groups,
      messages,
      allCalendars,
      allActivities,
      calendarsLoading,
      groupsLoading,
      messagesLoading,
      activitiesLoading,
      unreadMessagesCount,
      unacceptedChecklistsCount,
      messagesCount,
      isUserAdmin,
      adminUserId,
      selectedDate,
      selectedMonth,
      selectedYear,
      addingToEvent,
      getEventsForCalendar,
      getEventsForMonth,
      getEventsForDay,
      getEventsForWeek,
      getCurrentMonthEvents,
      getActivitiesForMonth,
      getActivitiesForDay,
      getCurrentMonthActivities,
      getActivitiesForEntity,
      getActivitiesForEvent,
      navigateToNextDay,
      navigateToPreviousDay,
      navigateToToday,
      navigateToNextMonth,
      navigateToPreviousMonth,
      navigateToDate,
      navigateToNextWeek,
      navigateToPreviousWeek,
      templates,
      activeTemplate,
      activeTemplateId,
      getTemplateEventsForWeek,
      templatesLoading,
      reminders,
      remindersLoading,
      saveReminder,
      deleteReminder,
      toggleReminderActive,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
