import { Alert } from "react-native";
import { useDeleteFromGoogleCalendar } from "../googleCalendarHooks/useDeleteFromGoogleCalendar";
import { useDeleteInternalEvent } from "../internalCalendarHooks/useDeleteInternalEvent";
import { useDeleteIcalEvent } from "../useDeleteIcalEvent";
import { useUpdateInternalActivities } from "../useUpdateInternalActivities";
import { useUpdateExternalActivities } from "../useUpdateExternalActivities";
import { useDeleteNotification } from "../useDeleteNotification";
import { useNotifications } from "../notificationHooks/useNotifications";
import { useData } from "@my-apps/contexts";
import { scheduleBatchNotification } from "@my-apps/services";

/**
 * Remove undefined values from object (Firestore doesn't allow undefined)
 */
const cleanUndefined = (obj) => {
  const cleaned = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

/**
 * Helper function to extract groupId from event
 * Returns { isInternal, isGroup, groupId }
 */
const getCalendarType = (event) => {
  const calendarId = event?.calendarId;

  if (calendarId === "internal") {
    const groupId = event?.groupId || null;
    return {
      isInternal: true,
      isGroup: !!groupId,
      groupId,
    };
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

export const useCalendarHandlers = ({
  user,
  setAddChecklistModalVisible,
  setShowChecklistModal,
  setChecklistMode,
  setSelectedChecklist,
  setSelectedChecklistEvent,
  setSelectedEvent,
  setUpdatedItems,
  setIsDirtyComplete,
  setEventModalVisible,
  selectedChecklist,
  selectedChecklistEvent,
  selectedEvent,
  updatedItems,
}) => {
  const { allCalendars, adminUserId, groups } = useData();

  const deleteFromGoogleCalendar = useDeleteFromGoogleCalendar();
  const deleteInternalEvent = useDeleteInternalEvent();
  const deleteIcalEvent = useDeleteIcalEvent();
  const updateExternalActivities = useUpdateExternalActivities();
  const updateInternalActivities = useUpdateInternalActivities();
  const deleteNotification = useDeleteNotification();

  const { notifyActivityCreated, scheduleActivityReminder } =
    useNotifications();

  const handleDeleteEvent = async (event) => {
    const calendar = user?.calendars?.find(
      (cal) => cal.calendarId === event.calendarId
    );

    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete the event: "${event.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              let result;

              if (event.calendarId === "internal") {
                const groupId = event.groupId || null;
                result = await deleteInternalEvent(
                  event.eventId,
                  event.startTime,
                  groupId
                );
              } else if (calendar?.calendarType === "ical") {
                result = await deleteIcalEvent(
                  event.eventId,
                  event.calendarId,
                  event.startTime
                );
              } else {
                result = await deleteFromGoogleCalendar(
                  event.eventId,
                  event.calendarId
                );
              }

              if (result.success) {
                const notificationResult = await deleteNotification(
                  event.eventId
                );

                if (
                  notificationResult.success &&
                  notificationResult.deletedCount > 0
                ) {
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

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setEventModalVisible(true);
  };

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

  const handleViewChecklist = (event, activity) => {
    setSelectedChecklistEvent(event);
    setSelectedChecklist(activity);
    setUpdatedItems(activity.items || []);
    setIsDirtyComplete(false);
    setChecklistMode("complete");
    setShowChecklistModal(true);
  };

  const handleAddChecklist = (event) => {
    setSelectedEvent(event);
    setAddChecklistModalVisible(true);
  };

  const handleSaveChecklist = async (checklist, onClose) => {
    try {
      const newActivity = {
        id: checklist.id,
        activityType: "checklist",
        name: checklist.name,
        items: checklist.items,
        createdAt: checklist.createdAt,
      };

      if (selectedEvent?.isAllDay) {
        if (checklist.reminderTime) {
          newActivity.reminderTime = checklist.reminderTime;
        }
      } else {
        if (checklist.reminderMinutes != null) {
          newActivity.reminderMinutes = checklist.reminderMinutes;
        }
      }

      if (checklist.notifyAdmin) {
        newActivity.notifyAdmin = true;
      }

      const cleanedActivity = cleanUndefined(newActivity);
      const currentActivities = selectedEvent?.activities || [];
      const updatedActivities = [...currentActivities, cleanedActivity];

      const { isInternal, isGroup, groupId } = getCalendarType(selectedEvent);

      let result;
      if (isInternal || isGroup) {
        result = await updateInternalActivities(
          selectedEvent.eventId,
          selectedEvent.startTime,
          updatedActivities,
          groupId
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
        Alert.alert("Success", `Checklist added to "${selectedEvent.title}"`);

        // Determine if this is a shared event
        let subscribers = [];
        let isSharedEvent = false;

        if (isGroup && groupId) {
          // Internal group event - get members from group
          const group = groups?.find(
            (g) => g.groupId === groupId || g.id === groupId
          );
          if (group?.members) {
            subscribers = group.members.map((m) => m.userId);
            isSharedEvent = subscribers.length > 1;
          }
        } else {
          // External calendar or personal internal - get subscribers from calendar
          const fullCalendar = allCalendars[selectedEvent.calendarId];
          subscribers = fullCalendar?.subscribingUsers || [];
          isSharedEvent = subscribers.length > 1;
        }

        if (isSharedEvent) {
          console.log(
            `📢 Notifying ${subscribers.length} subscriber(s) about new checklist`
          );
          console.log("Sending Notification data:", {
            screen: "Calendar",
            eventId: selectedEvent.eventId,
            checklistId: checklist.id,
            app: "checklist-app",
            date: selectedEvent.startTime,
          });
          try {
            await notifyActivityCreated(
              checklist,
              "Checklist",
              selectedEvent,
              subscribers,
              {
                screen: "Calendar",
                eventId: selectedEvent.eventId,
                checklistId: checklist.id,
                app: "checklist-app",
                date: selectedEvent.startTime,
              }
            );
            console.log("✅ Subscribers notified");
          } catch (error) {
            console.error("❌ Failed to notify subscribers:", error);
          }
        }

        const hasReminder =
          (selectedEvent.isAllDay && checklist.reminderTime) ||
          (!selectedEvent.isAllDay && checklist.reminderMinutes != null);

        if (hasReminder) {
          let reminderTime;

          if (selectedEvent.isAllDay) {
            reminderTime = new Date(checklist.reminderTime);
          } else {
            const eventStart = new Date(selectedEvent.startTime);
            reminderTime = new Date(eventStart);
            reminderTime.setMinutes(
              reminderTime.getMinutes() - checklist.reminderMinutes
            );
          }

          if (reminderTime > new Date()) {
            try {
              if (isSharedEvent) {
                console.log(
                  `⏰ Scheduling checklist reminder for ${subscribers.length} subscriber(s)`
                );
                await scheduleBatchNotification(
                  subscribers,
                  `Checklist Reminder: ${checklist.name}`,
                  `Complete checklist for "${selectedEvent.title}"`,
                  reminderTime,
                  {
                    screen: "Calendar",
                    eventId: selectedEvent.eventId,
                    checklistId: checklist.id,
                    app: "checklist-app",
                    date: selectedEvent.startTime,
                  }
                );
                console.log("✅ Batch reminders scheduled");
              } else {
                console.log(`⏰ Scheduling personal checklist reminder`);
                await scheduleActivityReminder(
                  {
                    id: checklist.id,
                    name: checklist.name,
                    reminderTime: reminderTime.toISOString(),
                  },
                  "Checklist",
                  selectedEvent.eventId,
                  null,
                  {
                    screen: "Calendar",
                    eventId: selectedEvent.eventId,
                    checklistId: checklist.id,
                    app: "checklist-app",
                    date: selectedEvent.startTime,
                  }
                );
                console.log("✅ Personal reminder scheduled");
              }
            } catch (error) {
              console.error("❌ Failed to schedule reminder:", error);
            }
          }
        }
      } else {
        Alert.alert("Error", `Error adding checklist: ${result.error}`);
      }

      if (onClose) onClose();
    } catch (error) {
      console.error("Unexpected error adding checklist:", error);
      Alert.alert("Error", `Unexpected error: ${error.message}`);
    }
  };

  const handleUpdateFromCompleteMode = async () => {
    const updatedChecklist = {
      ...selectedChecklist,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    const wasJustCompleted =
      !selectedChecklist.completedAt &&
      updatedItems.every((item) => item.completed);

    if (wasJustCompleted) {
      updatedChecklist.completedAt = new Date().toISOString();
    }

    await handleUpdateChecklist(
      updatedChecklist,
      closeViewChecklistModal,
      wasJustCompleted
    );
  };

  const handleUpdateChecklist = async (
    updatedChecklist,
    onClose,
    wasJustCompleted = false,
    silent,
  ) => {
    const eventRef = selectedChecklistEvent;
  
    if (!eventRef) {
      console.error("❌ No event reference available");
      Alert.alert("Error", "Event reference lost. Please try again.");
      return;
    }
  
    try {
      const currentActivities = eventRef.activities || [];
      const updatedActivities = currentActivities.map((activity) => {
        if (activity.id === updatedChecklist.id) {
          const updated = {
            id: activity.id,
            activityType: activity.activityType,
            name: updatedChecklist.name,
            items: updatedChecklist.items,
            createdAt: activity.createdAt,
          };
  
          if (updatedChecklist.notifyAdmin !== undefined) {
            updated.notifyAdmin = updatedChecklist.notifyAdmin;
          }
  
          if (updatedChecklist.completedAt) {
            updated.completedAt = updatedChecklist.completedAt;
          }
  
          if (eventRef.isAllDay) {
            if (updatedChecklist.reminderTime) {
              updated.reminderTime = updatedChecklist.reminderTime;
            }
          } else {
            if (updatedChecklist.reminderMinutes != null) {
              updated.reminderMinutes = updatedChecklist.reminderMinutes;
            }
          }
  
          return cleanUndefined(updated);
        }
        return cleanUndefined(activity);
      });
  
      const { isInternal, isGroup, groupId } = getCalendarType(eventRef);
  
      let result;
      if (isInternal || isGroup) {
        result = await updateInternalActivities(
          eventRef.eventId,
          eventRef.startTime,
          updatedActivities,
          groupId
        );
      } else {
        result = await updateExternalActivities(
          eventRef.eventId,
          eventRef.calendarId,
          eventRef.startTime,
          updatedActivities
        );
      }
  
      if (result.success) {
        if (!silent) {
          Alert.alert("Success", `Checklist "${updatedChecklist.name}" updated`);
        }
  
        if (wasJustCompleted && updatedChecklist.notifyAdmin) {
          // Double-check: ensure checklist wasn't already completed
          const currentActivity = currentActivities.find(
            (a) => a.id === updatedChecklist.id
          );
          const alreadyCompleted = currentActivity?.completedAt != null;
        
          if (!alreadyCompleted) {
            console.log("📢 Notifying admin of checklist completion");
            try {
              const { sendNotification } = await import("@my-apps/services");
              await sendNotification(
                adminUserId,
                `✅ Checklist Completed: ${updatedChecklist.name}`,
                `"${updatedChecklist.name}" was completed for "${eventRef.title}"`,
                {
                  screen: "Calendar",
                  eventId: eventRef.eventId,
                  checklistId: updatedChecklist.id,
                  app: "checklist-app",
                  date: eventRef.startTime,
                }
              );
            } catch (error) {
              console.error("❌ Failed to notify admin:", error);
            }
          } else {
            console.log("⚠️ Checklist already marked complete, skipping duplicate notification");
          }
        }
  
        // Determine if this is a shared event
        let subscribers = [];
        let isSharedEvent = false;
  
        if (isGroup && groupId) {
          const group = groups?.find(
            (g) => g.groupId === groupId || g.id === groupId
          );
          if (group?.members) {
            subscribers = group.members.map((m) => m.userId);
            isSharedEvent = subscribers.length > 1;
          }
        } else {
          const fullCalendar = allCalendars[eventRef.calendarId];
          subscribers = fullCalendar?.subscribingUsers || [];
          isSharedEvent = subscribers.length > 1;
        }
  
        // Determine if we need to manage notifications
        const hadReminder = (eventRef.isAllDay && selectedChecklist.reminderTime) ||
                            (!eventRef.isAllDay && selectedChecklist.reminderMinutes != null);
                            
        const hasReminder = (eventRef.isAllDay && updatedChecklist.reminderTime) ||
                            (!eventRef.isAllDay && updatedChecklist.reminderMinutes != null);
  
        const reminderRemoved = hadReminder && !hasReminder;
        const reminderChanged = hadReminder && hasReminder && (
          selectedChecklist.reminderTime !== updatedChecklist.reminderTime ||
          selectedChecklist.reminderMinutes !== updatedChecklist.reminderMinutes
        );
  
        // Check if reminder is recurring
        const isRecurringReminder = eventRef.reminder?.isRecurring === true;
  
        // Only delete/reschedule based on specific conditions
        if (reminderRemoved) {
          console.log('🗑️ Reminder removed - deleting notifications');
          const notificationId = `${eventRef.eventId}-checklist-${updatedChecklist.id}`;
          await deleteNotification(notificationId);
        } else if (wasJustCompleted && !isRecurringReminder) {
          // Only delete on completion if reminder is NOT recurring
          console.log('🗑️ Checklist completed (non-recurring reminder) - deleting notifications');
          const notificationId = `${eventRef.eventId}-checklist-${updatedChecklist.id}`;
          await deleteNotification(notificationId);
        } else if (wasJustCompleted && isRecurringReminder) {
          console.log('✅ Checklist completed but reminder is recurring - keeping notifications');
        } else if (reminderChanged) {
          console.log('⏰ Reminder settings changed, rescheduling...');
          
          // Delete old notifications
          const notificationId = `${eventRef.eventId}-checklist-${updatedChecklist.id}`;
          await deleteNotification(notificationId);
  
          // Reschedule with new time
          let reminderTime;
  
          if (eventRef.isAllDay) {
            reminderTime = new Date(updatedChecklist.reminderTime);
          } else {
            const eventStart = new Date(eventRef.startTime);
            reminderTime = new Date(eventStart);
            reminderTime.setMinutes(
              reminderTime.getMinutes() - updatedChecklist.reminderMinutes
            );
          }
  
          if (reminderTime > new Date()) {
            try {
              if (isSharedEvent) {
                console.log(
                  `⏰ Rescheduling checklist reminder for ${subscribers.length} subscriber(s)`
                );
                await scheduleBatchNotification(
                  subscribers,
                  `Checklist Reminder: ${updatedChecklist.name}`,
                  `Complete checklist for "${eventRef.title}"`,
                  reminderTime,
                  {
                    screen: "Calendar",
                    eventId: eventRef.eventId,
                    checklistId: updatedChecklist.id,
                    app: "checklist-app",
                    date: eventRef.startTime,
                  }
                );
                console.log("✅ Batch reminders rescheduled");
              } else {
                console.log(`⏰ Rescheduling personal checklist reminder`);
                await scheduleActivityReminder(
                  {
                    id: updatedChecklist.id,
                    name: updatedChecklist.name,
                    reminderTime: reminderTime.toISOString(),
                  },
                  "Checklist",
                  eventRef.eventId,
                  null,
                  {
                    screen: "Calendar",
                    eventId: eventRef.eventId,
                    checklistId: updatedChecklist.id,
                    app: "checklist-app",
                    date: eventRef.startTime,
                  }
                );
                console.log("✅ Personal reminder rescheduled");
              }
            } catch (error) {
              console.error("❌ Failed to reschedule reminder:", error);
            }
          }
        } else {
          console.log('✅ No notification changes needed');
        }
      } else {
        Alert.alert("Error", `Error updating checklist: ${result.error}`);
      }
  
      if (onClose) onClose();
    } catch (error) {
      console.error("Unexpected error updating checklist:", error);
      Alert.alert("Error", `Unexpected error: ${error.message}`);
    }
  };

  const handleDeleteChecklist = async (event, activity) => {
    Alert.alert(
      "Delete Checklist",
      `Are you sure you want to delete "${activity.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const currentActivities = event.activities || [];
              const updatedActivities = currentActivities
                .filter((a) => a.id !== activity.id)
                .map(cleanUndefined);

              const { isInternal, isGroup, groupId } = getCalendarType(event);

              let result;
              if (isInternal || isGroup) {
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
                const hasReminder =
                  activity.reminderMinutes != null ||
                  activity.reminderTime != null;

                if (hasReminder) {
                  const notificationId = `${event.eventId}-checklist-${activity.id}`;
                  await deleteNotification(notificationId);
                }

                Alert.alert(
                  "Success",
                  `"${activity.name}" deleted successfully`
                );
              } else {
                Alert.alert(
                  "Error",
                  `Error deleting checklist: ${result.error}`
                );
              }
            } catch (error) {
              console.error("Unexpected error deleting checklist:", error);
              Alert.alert("Error", `Unexpected error: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  return {
    handleDeleteEvent,
    handleEditEvent,
    handleViewChecklist,
    handleAddChecklist,
    handleSaveChecklist,
    handleUpdateChecklist,
    handleUpdateFromCompleteMode,
    handleDeleteChecklist,
    closeChecklistModal,
    closeViewChecklistModal,
  };
};
