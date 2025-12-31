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
  console.log("Selected Date:", selectedDate, selectedMonth, selectedYear);

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
  }, [user?.groups?.length, user?.groups?.join(',')]);

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

  console.log("👤 User:", user?.userId, "Loading:", loading, "Full User", user);
  if (userError) console.error("❌ User error:", userError);

  console.log(
    "💬 Messages:",
    messages?.messages?.length,
    "Loading:",
    messagesLoading,
    "Full Messages",
    messages
  );
  if (messagesError) console.error("❌ Messages error:", messagesError);

  console.log(
    "👥 Groups:",
    groups?.length,
    "Loading:",
    groupsLoading,
    "Full Groups",
    groups
  );
  if (groupsError) console.error("❌ Groups error:", groupsError);

  console.log(
    "📅 Calendar shards:",
    Object.keys(allCalendars || {}).length,
    "Loading:",
    calendarsLoading,
    "Full Calendars",
    allCalendars
  );
  if (calendarsError) console.error("❌ Calendars error:", calendarsError);

  console.log(
    "🏃 Activities loaded:",
    Object.keys(allActivities || {}).length,
    "Loading:",
    activitiesLoading,
    "Full Activities",
    allActivities
  );
  if (activitiesError) console.error("❌ Activities error:", activitiesError);


  console.log("📊 DataContext State:", {
    loading,
    userLoaded: !!user,
    groupsCount: groups?.length,
    messagesCount: messages?.messages?.length,
    unreadMessagesCount: messages?.messages?.filter((m) => !m.read).length || 0,
  });

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
    console.log("➡️ Navigating to next day:", date);
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
  setSelectedDate(dateISO);
}, []);
console.log("All Calendars:", allCalendars);

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
      dataLoading: calendarsLoading || groupsLoading || messagesLoading || activitiesLoading,
      isAnyLoading: loading || calendarsLoading || groupsLoading || messagesLoading || activitiesLoading,
  
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
      getEventsForCalendar,
      getEventsForMonth,
      getEventsForDay,
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
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
