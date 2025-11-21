import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useTheme } from "@my-apps/contexts";
import { PageHeader } from "@my-apps/ui";
import { useData } from "@my-apps/contexts";
import {
  formatShortDate,
  formatMonthAbbreviation,
  formatMonthYearAbbreviation,
} from "@my-apps/utils";
import { DayView } from "../components/calendar/DayView";
import { MonthView } from "../components/calendar/MonthView";
import EventModal from "../components/calendar/EventModal";
import { DateTime } from "luxon";

const CalendarScreen = () => {
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
  } = useData();
console.log("PREFERENCES:", preferences);
  const [selectedView, setSelectedView] = useState("day"); // 'day', 'month'
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  console.log("Selected Date:", selectedDate);
  console.log("Selected View:", selectedView);
  console.log("EventModal Visible:", eventModalVisible);

  // Get events and sort them from earlier to later in the day by their startTime
  // Combine today's events with internal activities
const todaysEvents = useMemo(() => {
  // 1️⃣ Get all events for the day
  const events = getEventsForDay(selectedDate) || [];

  // 2️⃣ Get all activities for the day, but only those with calendarId === 'internal'
  const internalActivities = (getActivitiesForDay(selectedDate) || []).filter(
    (activity) => activity.calendarId === 'internal'
  );

  // 3️⃣ Merge and sort chronologically by startTime
  const combined = [...events, ...internalActivities];

  combined.sort((a, b) => {
    const timeA = a.startTime || "00:00";
    const timeB = b.startTime || "00:00";
    return timeA.localeCompare(timeB);
  });

  return combined;
}, [selectedDate, getEventsForDay, getActivitiesForDay]);

// Filter out events have a deleted: true flag
const filteredTodaysEvents = useMemo(() => {
  return todaysEvents.filter(event => !event.deleted);
}, [todaysEvents]);

// Deleted Events Count
const deletedEventsCount = useMemo(() => {
  return todaysEvents.length - filteredTodaysEvents.length;
}, [todaysEvents, filteredTodaysEvents]);

const allEventsForMonth = useMemo(() => {
  if (!selectedMonth || !selectedYear) return [];
  
  // Get all events for the entire month
  const monthStart = DateTime.fromObject({
    year: selectedYear,
    month: DateTime.fromFormat(selectedMonth, "LLLL").month,
  }).startOf('month');
  
  const monthEnd = monthStart.endOf('month');
  
  // Collect all events within this month range
  const events = [];
  let currentDay = monthStart;
  
  while (currentDay <= monthEnd) {
    const dayEvents = getEventsForDay(currentDay.toISODate()) || [];
    const dayActivities = (getActivitiesForDay(currentDay.toISODate()) || []).filter(
      (activity) => activity.calendarId === 'internal'
    );
    events.push(...dayEvents, ...dayActivities);
    currentDay = currentDay.plus({ days: 1 });
  }
  
  return events;
}, [selectedMonth, selectedYear, getEventsForDay, getActivitiesForDay]);


  // Swipe gesture handlers with velocity (fling)
  const swipeGesture = Gesture.Pan().onEnd((event) => {
    const SWIPE_THRESHOLD = 50; // Minimum distance for slow swipe
    const VELOCITY_THRESHOLD = 500; // Minimum velocity for fast fling (pixels/sec)

    // Check if it's a horizontal swipe (distance OR velocity)
    const isSwipe =
      Math.abs(event.translationX) > SWIPE_THRESHOLD ||
      Math.abs(event.velocityX) > VELOCITY_THRESHOLD;

    if (isSwipe) {
      // Determine direction from translation AND velocity
      const isGoingLeft = event.translationX < 0 || event.velocityX < 0;

      if (isGoingLeft) {
        // Swiped left → go to next
        selectedView === "day" ? navigateToNextDay() : navigateToNextMonth();
      } else {
        // Swiped right → go to previous
        selectedView === "day"
          ? navigateToPreviousDay()
          : navigateToPreviousMonth();
      }
    }
  });

  const icons = [
    { icon: 'add', action: () => {
        console.log('Add pressed');
        setEventModalVisible(true);
      }
    },
  ]

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      flex: 1,
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
      {/* Fixed header at the top */}
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
        subtext={selectedView === "day" ? `${filteredTodaysEvents?.length || 0} ${filteredTodaysEvents?.length === 1 ? 'Event' : 'Events'}${deletedEventsCount > 0 ? ` | ${deletedEventsCount} Deleted` : ''}` : ""}
        icons={icons}
      />

      {/* Swipeable content */}
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.contentContainer}>
          {selectedView === "day" ? (
            <DayView
              date={selectedDate}
              events={todaysEvents}
              userCalendars={user?.calendars || []}
            />
          ) : (
            <MonthView
    month={selectedMonth}
    year={selectedYear}
    events={allEventsForMonth} // You'll need to create this
    onDayPress={(dateISO) => {
      navigateToDate(dateISO);
      setSelectedView("day");
    }}
  />
          )}
        </View>
      </GestureDetector>

      {/* Today button */}
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

      {/* Event Modal */}
      <EventModal
        isVisible={eventModalVisible}
        onClose={() => setEventModalVisible(false)}
        event={selectedEvent}
        availableCalendars={user?.calendars?.filter(cal => cal.calendarType === 'google')}
        initialDate={selectedDate}
      />

    </SafeAreaView>
  );
};

export default CalendarScreen;
