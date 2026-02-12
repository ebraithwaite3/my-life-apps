import React, { useMemo } from "react";
import { StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@my-apps/contexts";
import { PageHeader, FilterChips } from "@my-apps/ui";
import DayView from "../../ui/src/components/calendar/DayView";
import MonthView from "../../ui/src/components/calendar/MonthView";
import WeekView from "../../ui/src/components/calendar/WeekView";
import FloatingActionButton from "../../ui/src/components/buttons/FloatingActionButton";
import {
  formatShortDate,
  formatMonthAbbreviation,
  formatMonthYearAbbreviation,
} from "@my-apps/utils";
import { DateTime } from "luxon";
import { applyScheduleTemplate } from "@my-apps/calendar-sync";
import { app } from '@my-apps/services'
import { useData } from "@my-apps/contexts";

// Add after imports, before component
const formatWeekRange = (dateISO) => {
  const dt = DateTime.fromISO(dateISO);
  const weekStart = dt.startOf("week"); // Monday
  const weekEnd = dt.endOf("week"); // Sunday

  // If same month: "Jan 1 - 7"
  if (weekStart.month === weekEnd.month) {
    return `${weekStart.toFormat("MMM d")} - ${weekEnd.toFormat("d")}`;
  }

  // Different months: "Jan 29 - Feb 4"
  return `${weekStart.toFormat("MMM d")} - ${weekEnd.toFormat("MMM d")}`;
};

const SharedCalendarScreen = ({
  filterActivitiesFor,
  navigation,
  route,
  addingToEvent,
  setAddingToEvent,

  // STATE: Passed from parent (ChecklistCalendarScreen)
  selectedView,
  setSelectedView,
  eventModalVisible,
  setEventModalVisible,
  showOnlyFilteredActivities,
  setShowOnlyFilteredActivities,
  showDeletedEvents, // ← ADD
  setShowDeletedEvents, // ← ADD
  setSelectedChecklist, // ← ADD

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
  navigateToNextWeek, // ← ADD
  navigateToPreviousWeek, // ← ADD
  getEventsForWeek, // ← ADD
  filteredTodaysEvents,
  deletedEventsCount, // ← ADD
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
  const { templates, templatesLoading } = useData();

  // Helper to capitalize activity type for display
  const activityLabel = useMemo(() => {
    if (!filterActivitiesFor) return "";
    return (
      filterActivitiesFor.charAt(0).toUpperCase() +
      filterActivitiesFor.slice(1) +
      "s"
    );
  }, [filterActivitiesFor]);

  // Check if viewing current month
  const isViewingCurrentMonth = useMemo(() => {
    const now = DateTime.now();
    const currentMonth = now.toFormat("LLLL");
    const currentYear = now.year;

    return selectedMonth === currentMonth && selectedYear === currentYear;
  }, [selectedMonth, selectedYear]);

  // Show "Today" button logic
  const showTodayButton = useMemo(() => {
    if (addChecklistModalVisible || showChecklistModal || eventModalVisible) {
      return false;
    }

    if (selectedView === "day") {
      return currentDate !== selectedDate;
    }

    if (selectedView === "week") {
      // ← ADD THIS
      // Show if selected date is not in current week
      // (We'll implement proper week checking later)
      return currentDate !== selectedDate;
    }

    if (selectedView === "month") {
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

  // Calculate week events
  const weekEvents = useMemo(() => {
    if (selectedView !== "week") return [];
    return getEventsForWeek(selectedDate);
  }, [selectedView, selectedDate, getEventsForWeek]);

  const handleAddDefaultSchedule = async () => {
    console.log('📅 Applying default schedule...');
    
    try {
      const result = await applyScheduleTemplate(app, 'New Schedule test');
      
      if (result.success) {
        console.log('✅ Result:', result);
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('❌ Error applying schedule:', error);
      Alert.alert('Error', error.message || 'Failed to apply schedule');
    }
  };

  const handleAddSchedule = async (templateName) => {
    console.log('📅 Applying schedule:', templateName);
    
    try {
      const result = await applyScheduleTemplate(app, templateName);
      
      if (result.success) {
        console.log('✅ Result:', result);
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('❌ Error applying schedule:', error);
      Alert.alert('Error', error.message || 'Failed to apply schedule');
    }
  };

  const handleScheduleLongPress = () => {
    if (!templates || templates.length === 0) {
      Alert.alert('No Templates', 'No schedule templates found. Create one first.');
      return;
    }
    
    // Build buttons array - one for each template + Cancel
    const buttons = [
      ...templates.map(template => ({
        text: template.name,
        onPress: () => handleAddSchedule(template.name)
      })),
      {
        text: 'Cancel',
        style: 'cancel'
      }
    ];
    
    Alert.alert(
      'Select Schedule Template',
      'Choose a template to apply to this week:',
      buttons,
      { cancelable: true }
    );
  };
  

  const icons = [
    // Week/Day toggle icon (admin only, not shown in adding mode or when modals open)
    ...(user?.admin &&
    !addingToEvent?.isActive &&
    !addChecklistModalVisible &&
    !showChecklistModal &&
    !eventModalVisible
      ? [
          {
            icon:
              selectedView === "week" ? "calendar-number-outline" : "calendar", // Toggle icon
            action: () => {
              if (selectedView === "week") {
                setSelectedView("day");
              } else {
                setSelectedView("week");
              }
            },
          },
        ]
      : []),
    {
      icon: "add",
      action: () => {
        if (addingToEvent.isActive) {
          // Create checklist from items
          const checklist = {
            id: `checklist_${Date.now()}`,
            name: "Checklist",
            items: addingToEvent.itemsToMove.map((item, index) => ({
              ...item,
              id: item.id || `item_${Date.now()}_${index}`,
              completed: false,
            })),
            createdAt: Date.now(),
          };

          // Pre-populate and open modal
          setSelectedChecklist(checklist);
          setEventModalVisible(true);
        } else {
          // Normal flow
          setEventModalVisible(true);
        }
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

    if (user?.admin && selectedView === "week") {
      chips.push({
        label: "Schedule",
        active: false,
        onPress: () => {
          handleScheduleLongPress();
        }
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
    selectedView,
    user,
  ]);

  // Build PageHeader subtext for day view
  const dayViewSubtext = useMemo(() => {
    if (selectedView !== "day") return undefined;

    const eventCount = filteredTodaysEvents.length;
    const eventWord = eventCount === 1 ? "Event" : "Events";
    let text = `${eventCount} ${eventWord}`;

    // Add deleted count if there are deleted events AND not showing them
    if (deletedEventsCount > 0 && !showDeletedEvents) {
      text += ` | ${deletedEventsCount} Deleted`;
    }

    return text;
  }, [
    selectedView,
    filteredTodaysEvents,
    deletedEventsCount,
    showDeletedEvents,
  ]);

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
        showBackButton={selectedView === "day" || selectedView === "week"}
        backButtonText={
          selectedView === "day" || selectedView === "week"
            ? formatMonthAbbreviation(selectedDate)
            : ""
        }
        onBackPress={() => setSelectedView("month")}
        showNavArrows={true}
        onPreviousPress={
          selectedView === "day"
            ? navigateToPreviousDay
            : selectedView === "week" // ← ADD THIS
            ? navigateToPreviousWeek // ← ADD THIS
            : navigateToPreviousMonth
        }
        onNextPress={
          selectedView === "day"
            ? navigateToNextDay
            : selectedView === "week" // ← ADD THIS
            ? navigateToNextWeek // ← ADD THIS
            : navigateToNextMonth
        }
        title={
          selectedView === "day"
            ? formatShortDate(selectedDate)
            : selectedView === "week" // ← ADD THIS
            ? formatWeekRange(selectedDate) // ← ADD THIS
            : formatMonthYearAbbreviation(selectedDate)
        }
        subtext={dayViewSubtext}
        icons={icons}
        addingToEvent={addingToEvent}
        setAddingToEvent={setAddingToEvent}
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

      {selectedView === "week" && (
        <WeekView
          weekData={weekEvents} // ← Changed from date/events
          userCalendars={user?.calendars || []}
          onDayPress={(dateISO) => {
            navigateToDate(dateISO);
            setSelectedView("day");
          }}
          onSwipeLeft={navigateToNextWeek}
          onSwipeRight={navigateToPreviousWeek}
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
