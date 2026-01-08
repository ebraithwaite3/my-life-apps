import React, { useMemo, useEffect, useState } from "react";
import { Alert } from "react-native";
import { SharedCalendarScreen } from "@my-apps/screens";
import {
  ChecklistModal,
  SharedEventModal,
  ChecklistSelector,
  EditChecklistContent,
} from "@my-apps/ui";
import { useData } from "@my-apps/contexts";
import {
  useCalendarState,
  useCalendarEvents,
  useCalendarHandlers,
  useChecklistTemplates,
  useUpdateInternalActivities,
  useUpdateExternalActivities,
} from "@my-apps/hooks";
import WorkoutSelector from "../components/modals/WorkoutSelector";
import EditWorkoutTemplate from "../components/modals/EditWorkoutTemplate";
import WorkoutModal from "../components/modals/WorkoutModal";
import { useWorkoutTemplates } from "../hooks/useWorkoutTemplates";
import { useWorkoutData } from "../contexts/WorkoutDataContext";
import { useAuth } from "@my-apps/contexts";
import { updateWorkoutHistory } from "../utils/workoutHistory";

/**
 * WorkoutsCalendarScreen - Calendar for workout app
 *
 * Features:
 * ✅ Navigation params handling (deep links)
 * ✅ Deleted events filter
 * ✅ Today button
 * ✅ Swipe gestures
 * ✅ MonthView
 * ✅ Filters for "workout" activities
 * ✅ Workout completion modal
 * ✅ Checklist functionality (workouts can have checklists)
 * ✅ Add workout to existing event
 */
const WorkoutsCalendarScreen = ({ navigation, route }) => {
  const {
    user,
    getSpacing,
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
    getEventsForDay,
    getActivitiesForDay,
    preferences,
    groups,
  } = useData();

  const { db } = useAuth();
  const { allExercises } = useWorkoutData();

  // Helper to determine calendar type
  const getCalendarType = (event) => {
    const calendarId = event?.calendarId;

    if (calendarId === "internal") {
      const groupId = event?.groupId || null;
      return { isInternal: true, isGroup: !!groupId, groupId };
    }

    if (calendarId?.startsWith("group-")) {
      return {
        isInternal: false,
        isGroup: true,
        groupId: calendarId.replace("group-", ""),
      };
    }

    return { isInternal: false, isGroup: false, groupId: null };
  };

  // Get the joinedApps count from the user
  const joinedAppsCount = useMemo(() => {
    return user?.joinedApps ? Object.keys(user.joinedApps).length : 0;
  }, [user]);

  // HOOK 1: Calendar UI state
  const calendarState = useCalendarState(preferences);

  // HOOK 2: Calendar events data - FILTER FOR WORKOUT ACTIVITIES
  const calendarEvents = useCalendarEvents({
    selectedDate,
    selectedMonth,
    selectedYear,
    getEventsForDay,
    getActivitiesForDay,
    filterActivitiesFor: "workout",
    showOnlyFilteredActivities: calendarState.showOnlyFilteredActivities,
    showDeletedEvents: calendarState.showDeletedEvents,
  });

  // HOOK 3: Calendar handlers
  const calendarHandlers = useCalendarHandlers({
    user,
    ...calendarState,
    selectedChecklist: calendarState.selectedChecklist,
    selectedChecklistEvent: calendarState.selectedChecklistEvent,
    selectedEvent: calendarState.selectedEvent,
    updatedItems: calendarState.updatedItems,
  });

  // Templates and selectors
  const {
    allTemplates,
    saveTemplate,
    promptForContext: promptForChecklistContext,
  } = useChecklistTemplates();
  const {
    allTemplates: allWorkoutTemplates,
    saveWorkoutTemplate,
    promptForContext: promptForWorkoutContext,
  } = useWorkoutTemplates();
  const updateInternalActivities = useUpdateInternalActivities();
  const updateExternalActivities = useUpdateExternalActivities();

  // Selected activities for modals
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  // Workout modal state - for viewing/completing existing workouts
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [selectedWorkoutActivity, setSelectedWorkoutActivity] = useState(null);
  const [selectedWorkoutEvent, setSelectedWorkoutEvent] = useState(null);

  // Add workout modal state - for adding new workouts to events
  const [addWorkoutModalVisible, setAddWorkoutModalVisible] = useState(false);

  // Handle navigation params for deep links (notifications, etc.)
  useEffect(() => {
    const { date, view } = route.params || {};

    if (date) {
      console.log("📅 Nav param date detected:", date, "View:", view);
      navigateToDate(date);

      if (view === "day") {
        console.log("🔄 Switching to day view");
        calendarState.setSelectedView("day");
      } else if (view === "month") {
        calendarState.setSelectedView("month");
      }

      // Clear params after handling
      navigation.setParams({ date: undefined, view: undefined });
    }
  }, [route.params, navigateToDate, navigation, calendarState]);

  // Handle adding a new workout to an existing event
  const handleAddWorkout = (event) => {
    console.log("🏋️ Add workout to event:", event);
    calendarState.setSelectedEvent(event);
    setAddWorkoutModalVisible(true);
  };

  // Handle saving a new workout to the event
  const handleSaveWorkout = async (workoutData) => {
    if (!calendarState.selectedEvent || !user) return;

    try {
      const newActivity = {
        id: workoutData.id,
        activityType: "workout",
        name: workoutData.name,
        exercises: workoutData.exercises,
        createdAt: workoutData.createdAt,
        startedAt: workoutData.startedAt,
        completedAt: workoutData.completedAt,
      };

      const updatedActivities = [
        ...(calendarState.selectedEvent.activities || []),
        newActivity,
      ];

      const { isInternal, isGroup, groupId } = getCalendarType(
        calendarState.selectedEvent
      );

      let result;
      if (isInternal || isGroup) {
        console.log(
          `📝 Adding ${isGroup ? "GROUP" : "USER"} workout (groupId: ${groupId})`
        );
        result = await updateInternalActivities(
          calendarState.selectedEvent.eventId,
          calendarState.selectedEvent.startTime,
          updatedActivities,
          groupId
        );
      } else {
        console.log("📝 Adding EXTERNAL workout");
        result = await updateExternalActivities(
          calendarState.selectedEvent.eventId,
          calendarState.selectedEvent.calendarId,
          calendarState.selectedEvent.startTime,
          updatedActivities
        );
      }

      if (result.success) {
        Alert.alert("Success", "Workout added to event");
        setAddWorkoutModalVisible(false);
        calendarState.setSelectedEvent(null);
      } else {
        Alert.alert("Error", `Failed to add workout: ${result.error}`);
      }
    } catch (error) {
      console.error("❌ Error adding workout:", error);
      Alert.alert("Error", "Failed to add workout. Please try again.");
    }
  };

  // Handle updating a workout activity in the calendar event
  const handleUpdateWorkout = async (updatedWorkout) => {
    if (!selectedWorkoutEvent || !user) return;

    try {
      // Find and update the workout activity
      const updatedActivities = selectedWorkoutEvent.activities.map(
        (activity) => {
          if (activity.id === updatedWorkout.id) {
            return { ...activity, ...updatedWorkout };
          }
          return activity;
        }
      );

      // Use helper to determine calendar type
      const { isInternal, isGroup, groupId } =
        getCalendarType(selectedWorkoutEvent);

      let result;
      if (isInternal || isGroup) {
        console.log(
          `📝 Updating ${
            isGroup ? "GROUP" : "USER"
          } workout (groupId: ${groupId})`
        );
        result = await updateInternalActivities(
          selectedWorkoutEvent.eventId,
          selectedWorkoutEvent.startTime,
          updatedActivities,
          groupId
        );
      } else {
        console.log("📝 Updating EXTERNAL workout");
        result = await updateExternalActivities(
          selectedWorkoutEvent.eventId,
          selectedWorkoutEvent.calendarId,
          selectedWorkoutEvent.startTime,
          updatedActivities
        );
      }

      if (result.success) {
        // Update workout history
        await updateWorkoutHistory(updatedWorkout, user.id, db);

        Alert.alert("Success", "Workout updated successfully");
        setWorkoutModalVisible(false);
        setSelectedWorkoutActivity(null);
        setSelectedWorkoutEvent(null);
      } else {
        Alert.alert("Error", `Failed to update workout: ${result.error}`);
      }
    } catch (error) {
      console.error("❌ Error updating workout:", error);
      Alert.alert("Error", "Failed to update workout. Please try again.");
    }
  };

  // Handle deleting a workout activity from calendar event
  const handleDeleteWorkout = async (activity, event) => {
    Alert.alert(
      "Delete Workout",
      "Are you sure you want to delete this workout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedActivities = event.activities.filter(
                (a) => a.id !== activity.id
              );

              // Use helper to determine calendar type
              const { isInternal, isGroup, groupId } = getCalendarType(event);

              let result;
              if (isInternal || isGroup) {
                console.log(
                  `📝 Deleting ${
                    isGroup ? "GROUP" : "USER"
                  } workout (groupId: ${groupId})`
                );
                result = await updateInternalActivities(
                  event.eventId,
                  event.startTime,
                  updatedActivities,
                  groupId
                );
              } else {
                result = await updateExternalActivities(
                  event.eventId,
                  event.calendarId,
                  event.startTime,
                  updatedActivities
                );
              }

              if (result.success) {
                Alert.alert("Success", "Workout deleted successfully");
              } else {
                Alert.alert(
                  "Error",
                  `Failed to delete workout: ${result.error}`
                );
              }
            } catch (error) {
              console.error("❌ Error deleting workout:", error);
              Alert.alert(
                "Error",
                "Failed to delete workout. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <>
      {/* Main Calendar Screen - FILTERS FOR WORKOUT ACTIVITIES */}
      <SharedCalendarScreen
        filterActivitiesFor="workout"
        navigation={navigation}
        route={route}
        // STATE: Pass from calendarState
        selectedView={calendarState.selectedView}
        setSelectedView={calendarState.setSelectedView}
        eventModalVisible={calendarState.eventModalVisible}
        setEventModalVisible={calendarState.setEventModalVisible}
        showOnlyFilteredActivities={calendarState.showOnlyFilteredActivities}
        setShowOnlyFilteredActivities={
          calendarState.setShowOnlyFilteredActivities
        }
        showDeletedEvents={calendarState.showDeletedEvents}
        setShowDeletedEvents={calendarState.setShowDeletedEvents}
        // DATA: Pass from useData and calendarEvents
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        currentDate={currentDate}
        navigateToNextDay={navigateToNextDay}
        navigateToPreviousDay={navigateToPreviousDay}
        navigateToPreviousMonth={navigateToPreviousMonth}
        navigateToNextMonth={navigateToNextMonth}
        navigateToDate={navigateToDate}
        navigateToToday={navigateToToday}
        filteredTodaysEvents={calendarEvents.filteredTodaysEvents}
        deletedEventsCount={calendarEvents.deletedEventsCount}
        allEventsForMonth={calendarEvents.allEventsForMonth}
        joinedAppsCount={joinedAppsCount}
        user={user}
        // MODAL STATE: For hiding Today button when modals open
        addChecklistModalVisible={calendarState.addChecklistModalVisible}
        showChecklistModal={calendarState.showChecklistModal}
        // HANDLERS: Distinguish between workout and checklist activities
        onDeleteEvent={calendarHandlers.handleDeleteEvent}
        onEditEvent={calendarHandlers.handleEditEvent}
        onAddActivity={handleAddWorkout} // ← Changed from handleAddChecklist
        onActivityPress={(activity, event) => {
          console.log("🎯 Activity pressed!");
          console.log("Activity:", activity);
          console.log("Event:", event);

          if (activity.activityType === "workout") {
            setSelectedWorkoutActivity(activity);
            setSelectedWorkoutEvent(event);
            setWorkoutModalVisible(true);
          } else if (activity.activityType === "checklist") {
            calendarHandlers.handleViewChecklist(event, activity);
          }
        }}
        onActivityDelete={(activity, event) => {
          if (activity.activityType === "workout") {
            handleDeleteWorkout(activity, event);
          } else if (activity.activityType === "checklist") {
            calendarHandlers.handleDeleteChecklist(activity, event);
          }
        }}
      />

      {/* Shared Event Modal - Using "workout" app name */}
      <SharedEventModal
        isVisible={calendarState.eventModalVisible}
        onClose={() => {
          calendarState.setSelectedEvent(null);
          calendarState.setEventModalVisible(false);
        }}
        event={calendarState.selectedEvent}
        userCalendars={user?.calendars || []}
        groups={groups || []}
        initialDate={selectedDate}
        user={user}
        // App-specific config
        appName="workout"
        eventTitles={{ new: "New Workout Event", edit: "Edit Workout Event" }}
        defaultTitle="Workout"
        // Activity configuration
        activities={[
          {
            type: "checklist",
            label: "Checklist",
            required: false,
            SelectorComponent: ChecklistSelector,
            EditorComponent: EditChecklistContent,
            selectedActivity: selectedChecklist,
            onSelectActivity: setSelectedChecklist,
            transformTemplate: (template) => ({
              id: `checklist_${Date.now()}`,
              name: template.name,
              items: template.items.map((item, index) => ({
                ...item,
                id: item.id || `item_${Date.now()}_${index}`,
                completed: false,
              })),
              createdAt: Date.now(),
              ...(template.defaultNotifyAdmin && { notifyAdmin: true }),
            }),
            editorProps: {
              templates: allTemplates,
              onSaveTemplate: saveTemplate,
              promptForContext: promptForChecklistContext,
              prefilledTitle: "Workout Checklist",
              isUserAdmin: user?.admin === true,
            },
          },
          {
            type: "workout",
            label: "Workout",
            required: false,
            SelectorComponent: WorkoutSelector,
            EditorComponent: EditWorkoutTemplate,
            selectedActivity: selectedWorkout,
            onSelectActivity: setSelectedWorkout,
            // Workout-specific transformer - Initialize with 1 empty set
            transformTemplate: (template) => ({
              id: `workout_${Date.now()}`,
              name: template.name,
              exercises: template.exercises.map((exercise, index) => {
                const ex = allExercises.find(
                  (e) => e.id === exercise.exerciseId
                );
                const setCount = exercise.setCount || 3; // Get from template

                return {
                  ...exercise,
                  sets: Array(setCount)
                    .fill(null)
                    .map((_, setIndex) => {
                      const emptySet = {
                        id: `set-${Date.now()}-${index}-${setIndex}`,
                        completed: false,
                      };

                      if (ex?.tracking?.includes("reps")) emptySet.reps = 0;
                      if (ex?.tracking?.includes("weight")) emptySet.weight = 0;
                      if (ex?.tracking?.includes("distance"))
                        emptySet.distance = 0;
                      if (ex?.tracking?.includes("time")) emptySet.time = 0;

                      return emptySet;
                    }),
                };
              }),
              createdAt: Date.now(),
            }),
            editorProps: {
              templates: allWorkoutTemplates,
              onSaveTemplate: saveWorkoutTemplate,
              promptForContext: promptForWorkoutContext,
              isUserAdmin: user?.admin === true,
            },
          },
        ]}
      />

      {/* Checklist Modal */}
      <ChecklistModal
        {...calendarState}
        {...calendarHandlers}
        user={user}
        getSpacing={getSpacing}
      />

      {/* Workout Modal - For viewing/completing existing workouts */}
      <WorkoutModal
        visible={workoutModalVisible}
        onClose={() => {
          setWorkoutModalVisible(false);
          setSelectedWorkoutActivity(null);
          setSelectedWorkoutEvent(null);
        }}
        mode="workout"
        workout={selectedWorkoutActivity}
        event={selectedWorkoutEvent}
        onUpdateWorkout={handleUpdateWorkout}
      />

      {/* Add Workout Modal - For adding new workouts to existing events */}
      <WorkoutModal
        visible={addWorkoutModalVisible}
        onClose={() => {
          setAddWorkoutModalVisible(false);
          calendarState.setSelectedEvent(null);
        }}
        mode="workout"
        workout={null} // null = creating new workout
        event={calendarState.selectedEvent}
        onSaveWorkout={handleSaveWorkout}
      />
    </>
  );
};

export default WorkoutsCalendarScreen;