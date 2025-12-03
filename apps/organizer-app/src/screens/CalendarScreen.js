import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { PageHeader } from "@my-apps/ui";
import { useData } from "@my-apps/contexts";
import {
  formatShortDate,
  formatMonthAbbreviation,
  formatMonthYearAbbreviation,
} from "@my-apps/utils";
import { DayView, MonthView } from "@my-apps/ui";
import EventModal from "../components/modals/EventModal";
import { DateTime } from "luxon";
import {
  useDeleteFromGoogleCalendar,
  useDeleteInternalEvent,
  useDeleteIcalEvent,
  useUpdateExternalActivities,
  useUpdateInternalActivities,
} from "@my-apps/hooks";

const CalendarScreen = ({ filterActivitiesFor, navigation, route }) => {
  console.log(
    "Rendering CalendarScreen with filterActivitiesFor:",
    filterActivitiesFor
  );
  const { theme, getSpacing, getTypography } = useTheme();
  const {
    selectedDate,
    selectedMonth,
    selectedYear,
    navigateToNextDay,
    navigateToPreviousDay,
    navigateToToday,
    navigateToPreviousMonth,
    navigateToNextMonth,
    navigateToDate,
    getEventsForDay,
    getActivitiesForDay,
    currentDate,
    user,
    preferences,
    groups,
  } = useData();
  console.log("User Calendars in CalendarScreen:", user?.calendars);
  console.log("Route params in CalendarScreen:", route.params);

  // Handle nav params for date + view switch
useEffect(() => {
  const { date, view } = route.params || {};
  
  if (date) {
    console.log('📅 Nav param date detected:', date, 'View:', view);
    navigateToDate(date);  // Sets selectedDate globally via useData
    
    if (view === 'day') {
      console.log('🔄 Switching to day view');
      setSelectedView('day');  // Local state toggle to DayView component
    } else if (view === 'month') {
      setSelectedView('month');  // Optional: Explicit month switch
    }
    
    // Clear to avoid re-triggers on tab re-focus
    navigation.setParams({ date: undefined, view: undefined });
  }
}, [route.params, navigateToDate, setSelectedView, navigation]);  // Add deps for safety

  const [selectedView, setSelectedView] = useState(
    preferences?.defaultCalendarView || "day"
  );
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showDeletedEvents, setShowDeletedEvents] = useState(false);

  // Hooks for event operations
  const deleteFromGoogleCalendar = useDeleteFromGoogleCalendar();
  const deleteInternalEvent = useDeleteInternalEvent();
  const deleteIcalEvent = useDeleteIcalEvent();
  const updateExternalActivities = useUpdateExternalActivities();
  const updateInternalActivities = useUpdateInternalActivities();

  // Get the joinedApps count from the user
  const joinedAppsCount = useMemo(() => {
    return user?.joinedApps ? Object.keys(user.joinedApps).length : 0;
  }, [user]);

  // Get events and sort them from earlier to later in the day by their startTime
  const todaysEvents = useMemo(() => {
    const events = getEventsForDay(selectedDate) || [];
    const internalActivities = (getActivitiesForDay(selectedDate) || []).filter(
      (activity) => activity.calendarId === "internal"
    );

    const combined = [...events, ...internalActivities];
    combined.sort((a, b) => {
      const timeA = a.startTime || "00:00";
      const timeB = b.startTime || "00:00";
      return timeA.localeCompare(timeB);
    });

    return combined;
  }, [selectedDate, getEventsForDay, getActivitiesForDay]);

  // Filter events based on deleted flag and activity type
  const filteredTodaysEvents = useMemo(() => {
    let events = todaysEvents;

    if (!showDeletedEvents) {
      events = events.filter((event) => !event.deleted);
    }

    if (filterActivitiesFor && !showAllEvents) {
      events = events.filter((event) => {
        return event.activities?.some(
          (activity) => activity.activityType === filterActivitiesFor
        );
      });
    }

    return events;
  }, [todaysEvents, filterActivitiesFor, showAllEvents, showDeletedEvents]);

  // Deleted Events Count
  const deletedEventsCount = useMemo(() => {
    return todaysEvents.filter((event) => event.deleted).length;
  }, [todaysEvents]);

  const allEventsForMonth = useMemo(() => {
    if (!selectedMonth || !selectedYear) return [];

    const monthStart = DateTime.fromObject({
      year: selectedYear,
      month: DateTime.fromFormat(selectedMonth, "LLLL").month,
    }).startOf("month");

    const monthEnd = monthStart.endOf("month");

    let events = [];
    let currentDay = monthStart;

    while (currentDay <= monthEnd) {
      const dayEvents = getEventsForDay(currentDay.toISODate()) || [];
      const dayActivities = (
        getActivitiesForDay(currentDay.toISODate()) || []
      ).filter((activity) => activity.calendarId === "internal");
      events.push(...dayEvents, ...dayActivities);
      currentDay = currentDay.plus({ days: 1 });
    }

    if (!showDeletedEvents) {
      events = events.filter((event) => !event.deleted);
    }

    if (filterActivitiesFor && !showAllEvents) {
      events = events.filter((event) => {
        return event.activities?.some(
          (activity) => activity.activityType === filterActivitiesFor
        );
      });
    }

    return events;
  }, [
    selectedMonth,
    selectedYear,
    getEventsForDay,
    getActivitiesForDay,
    filterActivitiesFor,
    showAllEvents,
    showDeletedEvents,
  ]);

  // ========================================
  // EVENT HANDLERS (App-specific logic)
  // ========================================

  const handleDeleteEvent = async (event) => {
    console.log("handleDeleteEvent called for event:", event);
    
    const calendar = user?.calendars?.find(cal => cal.calendarId === event.calendarId);
    
    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete the event: "${event.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Handle internal calendar events (personal AND group)
              if (event.calendarId === 'internal') {
                const groupId = event.groupId || null; // ← Add this
                const result = await deleteInternalEvent(
                  event.eventId, 
                  event.startTime,
                  groupId // ← Pass groupId
                );
                
                if (result.success) {
                  Alert.alert("Success", `Event "${event.title}" deleted successfully.`);
                } else {
                  Alert.alert("Error", `Error deleting event: ${result.error}`);
                }
                return;
              }
              
              // Handle iCal calendar events
              if (calendar?.calendarType === 'ical') {
                const result = await deleteIcalEvent(event.eventId, event.calendarId, event.startTime);
                if (result.success) {
                  Alert.alert("Success", `Event "${event.title}" marked as deleted successfully.`);
                } else {
                  Alert.alert("Error", `Error deleting event: ${result.error}`);
                }
                return;
              }
              
              // Handle Google Calendar events
              const result = await deleteFromGoogleCalendar(event.eventId, event.calendarId);
              if (result.success) {
                Alert.alert("Success", `Event "${event.title}" deleted successfully.`);
              } else {
                Alert.alert("Error", `Error deleting event: ${result.error}`);
              }
            } catch (error) {
              console.error("Unexpected error deleting event:", error);
              Alert.alert("Error", `Unexpected error deleting event: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const handleAddActivity = async (event) => {
    console.log("Add Activity clicked for event:", event);

    // Sample activities for testing
    const sampleActivities = [
      {
        activityId: "activity1",
        title: "Sample Activity 1",
        description: "This is a sample activity.",
        timestamp: new Date().toISOString(),
      },
      {
        activityId: "activity2",
        title: "Sample Activity 2",
        description: "This is another sample activity.",
        timestamp: new Date().toISOString(),
      },
    ];

    try {
      let result;
      if (event.calendarId === "internal") {
        result = await updateInternalActivities(
          event.eventId,
          event.startTime,
          sampleActivities
        );
      } else {
        result = await updateExternalActivities(
          event.eventId,
          event.calendarId,
          event.startTime,
          sampleActivities
        );
      }

      if (result.success) {
        Alert.alert("Success", `Activities added to "${event.title}"`);
      } else {
        Alert.alert("Error", `Error adding activities: ${result.error}`);
      }
    } catch (error) {
      console.error("Unexpected error updating activities:", error);
      Alert.alert("Error", `Unexpected error: ${error.message}`);
    }
  };

  const handleEditEvent = (event) => {
    console.log("Edit event:", event);
    // TODO: Implement edit functionality
    setSelectedEvent(event);
    setEventModalVisible(true);
  };

  // Swipe gesture handlers
  const swipeGesture = Gesture.Pan().onEnd((event) => {
    const SWIPE_THRESHOLD = 50;
    const VELOCITY_THRESHOLD = 500;

    const isSwipe =
      Math.abs(event.translationX) > SWIPE_THRESHOLD ||
      Math.abs(event.velocityX) > VELOCITY_THRESHOLD;

    if (isSwipe) {
      const isGoingLeft = event.translationX < 0 || event.velocityX < 0;

      if (isGoingLeft) {
        selectedView === "day" ? navigateToNextDay() : navigateToNextMonth();
      } else {
        selectedView === "day"
          ? navigateToPreviousDay()
          : navigateToPreviousMonth();
      }
    }
  });

  const icons = [
    {
      icon: "add",
      action: () => {
        console.log("Add pressed");
        setEventModalVisible(true);
      },
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      flex: 1,
    },
    filtersRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.sm,
      backgroundColor: theme.surface || theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: getSpacing.lg,
    },
    filterItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
    },
    filterText: {
      ...getTypography.caption,
      color: theme.text.secondary,
    },
    todayButton: {
      position: "absolute",
      bottom: 20,
      right: 20,
      zIndex: 10,
      backgroundColor: theme.primary,
      borderRadius: 30,
      padding: 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    todayButtonText: {
      color: "#fff",
      ...getTypography.button,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <PageHeader
        showBackButton={selectedView === "day"}
        backButtonText={
          selectedView === "day" ? formatMonthAbbreviation(selectedDate) : ""
        }
        onBackPress={() => setSelectedView("month")}
        showNavArrows={true}
        onPreviousPress={
          selectedView === "day"
            ? navigateToPreviousDay
            : navigateToPreviousMonth
        }
        onNextPress={
          selectedView === "day" ? navigateToNextDay : navigateToNextMonth
        }
        title={
          selectedView === "day"
            ? formatShortDate(selectedDate)
            : formatMonthYearAbbreviation(selectedDate)
        }
        subtext={
          selectedView === "day"
            ? `${filteredTodaysEvents?.length || 0} ${
                filteredTodaysEvents?.length === 1 ? "Event" : "Events"
              }${
                deletedEventsCount > 0 ? ` | ${deletedEventsCount} Deleted` : ""
              }`
            : ""
        }
        icons={icons}
      />

      {((filterActivitiesFor && joinedAppsCount > 1) ||
        deletedEventsCount > 0) && (
        <View style={styles.filtersRow}>
          {filterActivitiesFor && (
            <TouchableOpacity
              style={styles.filterItem}
              onPress={() => setShowAllEvents(!showAllEvents)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showAllEvents ? "checkbox-outline" : "square-outline"}
                size={20}
                color={theme.text.secondary}
              />
              <Text style={styles.filterText}>Show All</Text>
            </TouchableOpacity>
          )}

          {deletedEventsCount > 0 && (
            <TouchableOpacity
              style={styles.filterItem}
              onPress={() => setShowDeletedEvents(!showDeletedEvents)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showDeletedEvents ? "checkbox-outline" : "square-outline"}
                size={20}
                color={theme.text.secondary}
              />
              <Text style={styles.filterText}>
                Deleted ({deletedEventsCount})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <GestureDetector gesture={swipeGesture}>
        <View style={styles.contentContainer}>
          {selectedView === "day" ? (
            <DayView
              appName="workout"
              date={selectedDate}
              events={filteredTodaysEvents}
              userCalendars={user?.calendars || []}
              onDeleteEvent={handleDeleteEvent}
              onAddActivity={handleAddActivity}
              onEditEvent={handleEditEvent}
            />
          ) : (
            <MonthView
              month={selectedMonth}
              year={selectedYear}
              events={allEventsForMonth}
              onDayPress={(dateISO) => {
                navigateToDate(dateISO);
                setSelectedView("day");
              }}
            />
          )}
        </View>
      </GestureDetector>

      {currentDate !== selectedDate && (
        <TouchableOpacity
          style={styles.todayButton}
          onPress={() => {
            navigateToToday();
            setSelectedView("day");
          }}
        >
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      )}

      <EventModal
        isVisible={eventModalVisible}
        onClose={() => setEventModalVisible(false)}
        event={selectedEvent}
        userCalendars={user?.calendars || []}
        groups={groups || []}
        initialDate={selectedDate}
      />
    </SafeAreaView>
  );
};

export default CalendarScreen;
