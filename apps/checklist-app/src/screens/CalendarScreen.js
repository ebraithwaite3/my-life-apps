import React, { useState, useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { PageHeader, EditChecklistContent, ModalWrapper, ModalHeader, PillSelectionButton, ChecklistContent } from "@my-apps/ui";
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
  useDeleteNotification,
} from "@my-apps/hooks";
import { useChecklistData } from "../contexts/ChecklistDataContext";
import { scheduleNotification } from "@my-apps/services";

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
    isUserAdmin,
  } = useData();
  const { testItem } = useChecklistData();
  const editContentRef = useRef(null); // Ref for EditChecklistContent

  // Handle nav params for date + view switch
  useEffect(() => {
    const { date, view } = route.params || {};

    if (date) {
      console.log("📅 Nav param date detected:", date, "View:", view);
      navigateToDate(date);

      if (view === "day") {
        console.log("🔄 Switching to day view");
        setSelectedView("day");
      } else if (view === "month") {
        setSelectedView("month");
      }

      navigation.setParams({ date: undefined, view: undefined });
    }
  }, [route.params, navigateToDate, navigation]);

  // Detect changes in complete mode
  useEffect(() => {
    if (checklistMode !== "complete" || !selectedChecklist) return;

    const originalItems = selectedChecklist.items || [];
    const hasChanges = updatedItems.some((item, index) => {
      const originalItem = originalItems[index];
      return originalItem ? item.completed !== originalItem.completed : false;
    });

    setIsDirtyComplete(hasChanges);
  }, [updatedItems, selectedChecklist, checklistMode]);

  const [selectedView, setSelectedView] = useState(
    preferences?.defaultCalendarView || "day"
  );
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showDeletedEvents, setShowDeletedEvents] = useState(false);
  const [addChecklistModalVisible, setAddChecklistModalVisible] =
    useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistMode, setChecklistMode] = useState("complete"); // 'complete' or 'edit'
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [selectedChecklistEvent, setSelectedChecklistEvent] = useState(null); // The event containing the checklist
  const [updatedItems, setUpdatedItems] = useState([]); // Track item changes in complete mode
  const [isDirtyComplete, setIsDirtyComplete] = useState(false); // Track if changes made in complete mode

  // Hooks for event operations
  const deleteFromGoogleCalendar = useDeleteFromGoogleCalendar();
  const deleteInternalEvent = useDeleteInternalEvent();
  const deleteIcalEvent = useDeleteIcalEvent();
  const updateExternalActivities = useUpdateExternalActivities();
  const updateInternalActivities = useUpdateInternalActivities();
  const deleteNotification = useDeleteNotification();

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

  const closeChecklistModal = () => {
    setAddChecklistModalVisible(false);
    setSelectedEvent(null);
  };

  const closeViewChecklistModal = () => {
    setShowChecklistModal(false);
    setSelectedChecklist(null);
    setSelectedChecklistEvent(null);
    setChecklistMode("complete");
    setUpdatedItems([]);
    setIsDirtyComplete(false);
  };

  const handleViewChecklist = (event, checklist) => {
    console.log("📋 Opening checklist:", checklist.name, "from event:", event.title);
    setSelectedChecklistEvent(event);
    setSelectedChecklist(checklist);
    setUpdatedItems(checklist.items || []); // Initialize with current items
    setIsDirtyComplete(false); // Reset dirty state
    setChecklistMode("complete"); // Always start in complete mode
    setShowChecklistModal(true);
  };

  const handleUpdateFromCompleteMode = async () => {
    // Save just the completion state changes
    const updatedChecklist = {
      ...selectedChecklist,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };
    await handleUpdateChecklist(updatedChecklist, closeViewChecklistModal);
  };

  const handleUpdateChecklist = async (updatedChecklist, onClose) => {
    try {
      console.log("💾 Updating checklist:", updatedChecklist.name);

      // Find the checklist in the event's activities and update it
      const currentActivities = selectedChecklistEvent?.activities || [];
      const updatedActivities = currentActivities.map((activity) => {
        if (activity.id === updatedChecklist.id) {
          const updated = {
            ...activity,
            name: updatedChecklist.name,
            items: updatedChecklist.items,
            notifyAdmin: updatedChecklist.notifyAdmin,
          };

          // Handle reminder based on event type
          if (selectedChecklistEvent.isAllDay) {
            // All-day event: use reminderTime
            if (updatedChecklist.reminderTime) {
              updated.reminderTime = updatedChecklist.reminderTime;
              delete updated.reminderMinutes; // Remove if exists
            } else {
              delete updated.reminderTime;
            }
          } else {
            // Timed event: use reminderMinutes
            if (updatedChecklist.reminderMinutes != null) {
              updated.reminderMinutes = updatedChecklist.reminderMinutes;
              delete updated.reminderTime; // Remove if exists
            } else {
              delete updated.reminderMinutes;
            }
          }

          return updated;
        }
        return activity;
      });

      let result;
      if (selectedChecklistEvent.calendarId === "internal") {
        result = await updateInternalActivities(
          selectedChecklistEvent.eventId,
          selectedChecklistEvent.startTime,
          updatedActivities
        );
      } else {
        result = await updateExternalActivities(
          selectedChecklistEvent.eventId,
          selectedChecklistEvent.calendarId,
          selectedChecklistEvent.startTime,
          updatedActivities
        );
      }

      if (result.success) {
        Alert.alert("Success", `Checklist "${updatedChecklist.name}" updated`);

        // Cancel old notification
        const notificationId = `${selectedChecklistEvent.eventId}-checklist-${updatedChecklist.id}`;
        await deleteNotification(notificationId);

        // Schedule new notification based on event type
        if (selectedChecklistEvent.isAllDay && updatedChecklist.reminderTime) {
          // All-day event: Schedule at absolute time
          const reminderTime = new Date(updatedChecklist.reminderTime);

          if (reminderTime > new Date()) {
            scheduleNotification(
              user.userId,
              `Checklist Reminder: ${updatedChecklist.name}`,
              `Complete checklist for "${selectedChecklistEvent.title}"`,
              notificationId,
              reminderTime,
              {
                screen: "Calendar",
                eventId: selectedChecklistEvent.eventId,
                checklistId: updatedChecklist.id,
                activityModalOpen: true,
                app: "checklist-app",
              }
            ).catch(console.error);

            console.log(`📅 Scheduled all-day reminder for ${reminderTime}`);
          }
        } else if (!selectedChecklistEvent.isAllDay && updatedChecklist.reminderMinutes != null) {
          // Timed event: Schedule relative to event start
          const eventStart = new Date(selectedChecklistEvent.startTime);
          const reminderTime = new Date(eventStart);
          reminderTime.setMinutes(
            reminderTime.getMinutes() - updatedChecklist.reminderMinutes
          );

          if (reminderTime > new Date()) {
            scheduleNotification(
              user.userId,
              `Checklist Reminder: ${updatedChecklist.name}`,
              `Complete checklist for "${selectedChecklistEvent.title}"`,
              notificationId,
              reminderTime,
              {
                screen: "Calendar",
                eventId: selectedChecklistEvent.eventId,
                checklistId: updatedChecklist.id,
                activityModalOpen: true,
                app: "checklist-app",
              }
            ).catch(console.error);

            console.log(`📅 Scheduled timed reminder for ${reminderTime}`);
          }
        }
      } else {
        Alert.alert("Error", `Error updating checklist: ${result.error}`);
      }

      // Close modal via callback
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Unexpected error updating checklist:", error);
      Alert.alert("Error", `Unexpected error: ${error.message}`);
    }
  };

  const handleDeleteActivity = async (event, activity) => {
    Alert.alert(
      "Delete Activity",
      `Are you sure you want to delete "${activity.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🗑️ Deleting activity:", activity.name);

              // Remove the activity from the event's activities array
              const currentActivities = event.activities || [];
              const updatedActivities = currentActivities.filter(
                (a) => a.id !== activity.id
              );

              let result;
              if (event.calendarId === "internal") {
                result = await updateInternalActivities(
                  event.eventId,
                  event.startTime,
                  updatedActivities
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
                // Delete notification if it exists (for checklists with reminders)
                if (activity.activityType === "checklist") {
                  const hasReminder = activity.reminderMinutes != null || activity.reminderTime != null;
                  
                  if (hasReminder) {
                    const notificationId = `${event.eventId}-checklist-${activity.id}`;
                    const notifResult = await deleteNotification(notificationId);
                    
                    if (notifResult.success && notifResult.deletedCount > 0) {
                      console.log(`🔕 Deleted ${notifResult.deletedCount} notification(s)`);
                    }
                  }
                }

                Alert.alert("Success", `"${activity.name}" deleted successfully`);
              } else {
                Alert.alert("Error", `Error deleting activity: ${result.error}`);
              }
            } catch (error) {
              console.error("Unexpected error deleting activity:", error);
              Alert.alert("Error", `Unexpected error: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const handleDeleteEvent = async (event) => {
    console.log("handleDeleteEvent called for event:", event);

    const calendar = user?.calendars?.find(
      (cal) => cal.calendarId === event.calendarId
    );

    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete the event: "${event.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              let result;

              // Handle internal calendar events (personal AND group)
              if (event.calendarId === "internal") {
                const groupId = event.groupId || null;
                result = await deleteInternalEvent(
                  event.eventId,
                  event.startTime,
                  groupId
                );
              }
              // Handle iCal calendar events
              else if (calendar?.calendarType === "ical") {
                result = await deleteIcalEvent(
                  event.eventId,
                  event.calendarId,
                  event.startTime
                );
              }
              // Handle Google Calendar events
              else {
                result = await deleteFromGoogleCalendar(
                  event.eventId,
                  event.calendarId
                );
              }

              if (result.success) {
                // Delete any scheduled notifications for this event
                const notificationResult = await deleteNotification(
                  event.eventId
                );

                if (
                  notificationResult.success &&
                  notificationResult.deletedCount > 0
                ) {
                  console.log(
                    `✅ Deleted ${notificationResult.deletedCount} notification(s)`
                  );
                  Alert.alert(
                    "Success",
                    `Event "${event.title}" deleted successfully.\n${notificationResult.deletedCount} reminder(s) canceled.`
                  );
                } else {
                  Alert.alert(
                    "Success",
                    `Event "${event.title}" deleted successfully.`
                  );
                }
              } else {
                Alert.alert("Error", `Error deleting event: ${result.error}`);
              }
            } catch (error) {
              console.error("Unexpected error deleting event:", error);
              Alert.alert(
                "Error",
                `Unexpected error deleting event: ${error.message}`
              );
            }
          },
        },
      ]
    );
  };

  const handleAddActivity = async (event) => {
    console.log("Add Activity clicked for event:", event);
    setSelectedEvent(event);
    setAddChecklistModalVisible(true);
  };

  const handleEditEvent = (event) => {
    console.log("Edit event:", event);
    setSelectedEvent(event);
    setEventModalVisible(true);
  };

  const handleUpdateDoc = (updatedEvent) => {
    console.log("Updated event document:", updatedEvent);
  };

  const handleSaveChecklist = async (checklist, onClose) => {
    try {
      console.log("✅ Checklist saved:", checklist);
      console.log("📋 Checklist reminderMinutes:", checklist.reminderMinutes);
      console.log("📋 Checklist reminderTime:", checklist.reminderTime);
      console.log("📋 Selected Event:", selectedEvent);
      console.log("📋 Is All Day?", selectedEvent?.isAllDay);

      // Create activity object
      const newActivity = {
        id: checklist.id,
        activityType: "checklist",
        name: checklist.name,
        items: checklist.items,
        createdAt: checklist.createdAt,
      };

      // Add reminder based on event type
      if (selectedEvent?.isAllDay) {
        // All-day events use reminderTime (absolute time)
        if (checklist.reminderTime) {
          newActivity.reminderTime = checklist.reminderTime;
          console.log("🕐 All-day event: Using reminderTime:", checklist.reminderTime);
        }
      } else {
        // Timed events use reminderMinutes (relative to event start)
        if (checklist.reminderMinutes != null) {
          newActivity.reminderMinutes = checklist.reminderMinutes;
          console.log("⏰ Timed event: Using reminderMinutes:", checklist.reminderMinutes);
        }
      }
      
      console.log("🎯 Final activity object:", newActivity);

      // Add to event's activities
      const currentActivities = selectedEvent?.activities || [];
      const updatedActivities = [...currentActivities, newActivity];

      let result;
      if (selectedEvent.calendarId === "internal") {
        result = await updateInternalActivities(
          selectedEvent.eventId,
          selectedEvent.startTime,
          updatedActivities
        );
      } else {
        result = await updateExternalActivities(
          selectedEvent.eventId,
          selectedEvent.calendarId,
          selectedEvent.startTime,
          updatedActivities
        );
      }

      if (result.success) {
        Alert.alert(
          "Success",
          `Checklist added to "${selectedEvent.title}"`
        );

        // Schedule notification based on event type
        if (selectedEvent.isAllDay && checklist.reminderTime) {
          // All-day event: Schedule at absolute time
          const reminderTime = new Date(checklist.reminderTime);

          if (reminderTime > new Date()) {
            scheduleNotification(
              user.userId,
              `Checklist Reminder: ${checklist.name}`,
              `Complete checklist for "${selectedEvent.title}"`,
              `${selectedEvent.eventId}-checklist-${checklist.id}`,
              reminderTime,
              {
                screen: "Calendar",
                eventId: selectedEvent.eventId,
                checklistId: checklist.id,
                activityModalOpen: true,
                app: "checklist-app",
              }
            ).catch(console.error);

            console.log(`📅 Scheduled all-day checklist reminder for ${reminderTime}`);
          }
        } else if (!selectedEvent.isAllDay && checklist.reminderMinutes != null) {
          // Timed event: Schedule relative to event start
          const eventStart = new Date(selectedEvent.startTime);
          const reminderTime = new Date(eventStart);
          reminderTime.setMinutes(
            reminderTime.getMinutes() - checklist.reminderMinutes
          );

          if (reminderTime > new Date()) {
            scheduleNotification(
              user.userId,
              `Checklist Reminder: ${checklist.name}`,
              `Complete checklist for "${selectedEvent.title}"`,
              `${selectedEvent.eventId}-checklist-${checklist.id}`,
              reminderTime,
              {
                screen: "Calendar",
                eventId: selectedEvent.eventId,
                checklistId: checklist.id,
                activityModalOpen: true,
                app: "checklist-app",
              }
            ).catch(console.error);

            console.log(
              `📅 Scheduled timed checklist reminder for ${reminderTime}`
            );
          }
        }
      } else {
        Alert.alert(
          "Error",
          `Error adding checklist: ${result.error}`
        );
      }

      // Close modal via callback
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Unexpected error adding checklist:", error);
      Alert.alert("Error", `Unexpected error: ${error.message}`);
    }
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
              onActivityPress={handleViewChecklist}
              onActivityDelete={handleDeleteActivity}
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

      {currentDate !== selectedDate && !addChecklistModalVisible && (
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
        user={user}
        updateDocument={handleUpdateDoc}
      />

      {/* Add Checklist Modal */}
      <ModalWrapper
        visible={addChecklistModalVisible}
        onClose={closeChecklistModal}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              width: "100%",
              height: "90%",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <ModalHeader
              title={selectedEvent ? `${selectedEvent.title} Checklist` : "New Checklist"}
              onCancel={closeChecklistModal}
              onAction={() => editContentRef.current?.save()}
              actionText="Create"
              actionDisabled={false}
            />

            {/* Checklist Edit Content */}
            <EditChecklistContent
              ref={editContentRef}
              addReminder={true}
              eventStartTime={
                selectedEvent && !selectedEvent.isAllDay
                  ? new Date(selectedEvent.startTime)
                  : null
              }
              checklist={null}
              onSave={(checklist) => handleSaveChecklist(checklist, closeChecklistModal)}
              prefilledTitle={
                selectedEvent ? `${selectedEvent.title} Checklist` : ""
              }
              isUserAdmin={isUserAdmin}
            />
          </View>
        </View>
      </ModalWrapper>

      {/* View/Complete Checklist Modal */}
      <ModalWrapper
        visible={showChecklistModal}
        onClose={closeViewChecklistModal}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              width: "100%",
              height: "90%",
              overflow: "hidden",
            }}
          >
            {/* Modal Header - Always visible */}
            <ModalHeader
              title={selectedChecklist?.name || "Checklist"}
              subtitle={
                checklistMode === "complete"
                  ? `${updatedItems.filter((i) => i.completed).length}/${
                      updatedItems.length
                    } Complete`
                  : undefined
              }
              onCancel={closeViewChecklistModal}
              onAction={
                checklistMode === "complete"
                  ? handleUpdateFromCompleteMode
                  : () => editContentRef.current?.save() // Trigger save via ref in edit mode
              }
              actionText="Update"
              actionDisabled={checklistMode === "complete" ? !isDirtyComplete : false}
            />

            {/* Pill Toggle - Always visible */}
            <View
              style={{
                paddingHorizontal: getSpacing.lg,
                paddingVertical: getSpacing.md,
                backgroundColor: theme.surface,
              }}
            >
              <PillSelectionButton
                options={[
                  { label: "Complete", value: "complete" },
                  { label: "Edit", value: "edit" },
                ]}
                selectedValue={checklistMode}
                onSelect={(value) => {
                  setChecklistMode(value);
                  if (value === "complete") {
                    setUpdatedItems(selectedChecklist?.items || []);
                    setIsDirtyComplete(false);
                  }
                }}
              />
            </View>

            {/* Conditional Content */}
            {checklistMode === "complete" ? (
              <ChecklistContent
                checklist={{ ...selectedChecklist, items: updatedItems }}
                onItemToggle={setUpdatedItems}
              />
            ) : (
              <EditChecklistContent
                ref={editContentRef}
                checklist={selectedChecklist}
                onSave={(checklist) => handleUpdateChecklist(checklist, closeViewChecklistModal)}
                isUserAdmin={isUserAdmin}
                addReminder={true}
                eventStartTime={
                  selectedChecklistEvent && !selectedChecklistEvent.isAllDay
                    ? new Date(selectedChecklistEvent.startTime)
                    : null
                }
              />
            )}
          </View>
        </View>
      </ModalWrapper>
    </SafeAreaView>
  );
};

export default CalendarScreen;