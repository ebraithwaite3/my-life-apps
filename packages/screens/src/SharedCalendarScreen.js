import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@my-apps/contexts";
import { PageHeader, FilterChips } from "@my-apps/ui";
import DayView from "../../ui/src/components/calendar/DayView";
import MonthView from "../../ui/src/components/calendar/MonthView";
import FloatingActionButton from "../../ui/src/components/buttons/FloatingActionButton";
import {
  formatShortDate,
  formatMonthAbbreviation,
  formatMonthYearAbbreviation,
} from "@my-apps/utils";
import { DateTime } from 'luxon';

const SharedCalendarScreen = ({ 
  filterActivitiesFor, 
  navigation, 
  route,
  
  // STATE: Passed from parent (ChecklistCalendarScreen)
  selectedView,
  setSelectedView,
  eventModalVisible,
  setEventModalVisible,
  showOnlyFilteredActivities,
  setShowOnlyFilteredActivities,
  showDeletedEvents,        // ← ADD
  setShowDeletedEvents,     // ← ADD
  
  // DATA: Passed from parent
  selectedDate,
  selectedMonth,
  selectedYear,
  currentDate,
  navigateToNextDay,
  navigateToPreviousDay,
  navigateToPreviousMonth,
  navigateToNextMonth,
  navigateToDate,
  navigateToToday,
  filteredTodaysEvents,
  deletedEventsCount,       // ← ADD
  allEventsForMonth,
  joinedAppsCount,
  user,
  
  // HANDLERS: Event handlers from app
  onDeleteEvent,
  onEditEvent,
  onAddActivity,
  onActivityPress,
  onActivityDelete,
  
  // MODAL STATE: To hide button when modals open
  addChecklistModalVisible,
  showChecklistModal,
}) => {
  const { theme } = useTheme();

  // Helper to capitalize activity type for display
  const activityLabel = useMemo(() => {
    if (!filterActivitiesFor) return "";
    return filterActivitiesFor.charAt(0).toUpperCase() + filterActivitiesFor.slice(1) + "s";
  }, [filterActivitiesFor]);

  // Check if viewing current month
  const isViewingCurrentMonth = useMemo(() => {
    const now = DateTime.now();
    const currentMonth = now.toFormat('LLLL');
    const currentYear = now.year;
    
    return selectedMonth === currentMonth && selectedYear === currentYear;
  }, [selectedMonth, selectedYear]);

  // Show "Today" button logic
  const showTodayButton = useMemo(() => {
    if (addChecklistModalVisible || showChecklistModal || eventModalVisible) {
      return false;
    }

    if (selectedView === 'day') {
      return currentDate !== selectedDate;
    }

    if (selectedView === 'month') {
      return !isViewingCurrentMonth;
    }

    return false;
  }, [
    selectedView, 
    currentDate, 
    selectedDate, 
    isViewingCurrentMonth,
    addChecklistModalVisible,
    showChecklistModal,
    eventModalVisible,
  ]);

  const icons = [
    {
      icon: "add",
      action: () => {
        console.log("Add pressed");
        setEventModalVisible(true);
      },
    },
  ];

  // Build filter chips array
  const filters = useMemo(() => {
    const chips = [];

    // "Checklists Only" filter (only if user has multiple apps)
    if (joinedAppsCount > 1 && filterActivitiesFor) {
      chips.push({
        label: `${activityLabel} Only`,
        active: showOnlyFilteredActivities,
        onPress: () => {
          console.log("Filter toggled:", !showOnlyFilteredActivities);
          setShowOnlyFilteredActivities(!showOnlyFilteredActivities);
        },
      });
    }

    // "Deleted" filter (only if there are deleted events)
    if (deletedEventsCount > 0) {
      chips.push({
        label: `Deleted (${deletedEventsCount})`,
        active: showDeletedEvents,
        onPress: () => {
          console.log("Deleted toggled:", !showDeletedEvents);
          setShowDeletedEvents(!showDeletedEvents);
        },
      });
    }

    return chips.length > 0 ? chips : undefined;
  }, [
    joinedAppsCount, 
    filterActivitiesFor,
    activityLabel, 
    showOnlyFilteredActivities, 
    setShowOnlyFilteredActivities,
    deletedEventsCount,
    showDeletedEvents,
    setShowDeletedEvents,
  ]);

  // Build PageHeader subtext for day view
  const dayViewSubtext = useMemo(() => {
    if (selectedView !== 'day') return undefined;

    const eventCount = filteredTodaysEvents.length;
    const eventWord = eventCount === 1 ? 'Event' : 'Events';
    let text = `${eventCount} ${eventWord}`;

    // Add deleted count if there are deleted events AND not showing them
    if (deletedEventsCount > 0 && !showDeletedEvents) {
      text += ` | ${deletedEventsCount} Deleted`;
    }

    return text;
  }, [selectedView, filteredTodaysEvents, deletedEventsCount, showDeletedEvents]);

  // Handle day press from month view
  const handleDayPress = (dateISO) => {
    console.log("Day pressed:", dateISO);
    navigateToDate(dateISO);
    setSelectedView("day");
  };

  // Handle Today button press
  const handleTodayPress = () => {
    navigateToToday();
    setSelectedView("day");
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Page Header */}
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
        subtext={dayViewSubtext}
        icons={icons}
      />

      {/* Filter Chips (directly under PageHeader) */}
      <FilterChips filters={filters} />
      
      {/* Main Content */}
      {selectedView === "day" && (
        <DayView
          appName={filterActivitiesFor || "app"}
          date={selectedDate}
          events={filteredTodaysEvents}
          userCalendars={user?.calendars || []}
          onDeleteEvent={onDeleteEvent}
          onEditEvent={onEditEvent}
          onAddActivity={onAddActivity}
          onActivityPress={onActivityPress}
          onActivityDelete={onActivityDelete}
          onSwipeLeft={navigateToNextDay}
          onSwipeRight={navigateToPreviousDay}
          navigation={navigation}
        />
      )}

      {selectedView === "month" && (
        <MonthView
          month={selectedMonth}
          year={selectedYear}
          events={allEventsForMonth}
          onDayPress={handleDayPress}
          onSwipeLeft={navigateToNextMonth}
          onSwipeRight={navigateToPreviousMonth}
        />
      )}

      {/* Floating "Today" Button */}
      <FloatingActionButton
        visible={showTodayButton}
        label="Today"
        icon="calendar"
        position="bottom-right"
        onPress={handleTodayPress}
      />
    </SafeAreaView>
  );
};

export default SharedCalendarScreen;