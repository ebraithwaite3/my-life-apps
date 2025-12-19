import { Alert } from 'react-native';
import { useDeleteFromGoogleCalendar } from '../useDeleteFromGoogleCalendar';
import { useDeleteInternalEvent } from '../useDeleteInternalEvent';
import { useDeleteIcalEvent } from '../useDeleteIcalEvent';
import { useUpdateInternalActivities } from '../useUpdateInternalActivities';
import { useUpdateExternalActivities } from '../useUpdateExternalActivities';
import { useDeleteNotification } from '../useDeleteNotification';
import { scheduleNotification } from '@my-apps/services';

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
 * useCalendarHandlers - Core calendar operations
 * 
 * Combines:
 * - Event operations (delete, edit)
 * - Checklist operations (view, add, update, delete)
 * 
 * Used by ALL apps (workout, golf, checklist, etc.)
 */
export const useCalendarHandlers = ({
  user,
  // States from useCalendarState
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
  // Hooks for operations
  const deleteFromGoogleCalendar = useDeleteFromGoogleCalendar();
  const deleteInternalEvent = useDeleteInternalEvent();
  const deleteIcalEvent = useDeleteIcalEvent();
  const updateExternalActivities = useUpdateExternalActivities();
  const updateInternalActivities = useUpdateInternalActivities();
  const deleteNotification = useDeleteNotification();

  // ==========================================
  // EVENT OPERATIONS
  // ==========================================

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

  const handleEditEvent = (event) => {
    console.log("Edit event:", event);
    setSelectedEvent(event);
    setEventModalVisible(true);
  };

  // ==========================================
  // CHECKLIST OPERATIONS (CORE FEATURE)
  // ==========================================

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
    console.log("📋 Opening checklist:", activity.name, "from event:", event.title);
    setSelectedChecklistEvent(event);
    setSelectedChecklist(activity);
    setUpdatedItems(activity.items || []);
    setIsDirtyComplete(false);
    setChecklistMode("complete");
    setShowChecklistModal(true);
  };

  const handleAddChecklist = (event) => {
    console.log("Add checklist to event:", event);
    setSelectedEvent(event);
    setAddChecklistModalVisible(true);
  };

  const handleSaveChecklist = async (checklist, onClose) => {
    try {
      console.log("✅ Checklist saved:", checklist);

      const newActivity = {
        id: checklist.id,
        activityType: "checklist",
        name: checklist.name,
        items: checklist.items,
        createdAt: checklist.createdAt,
      };

      // Add reminder based on event type
      if (selectedEvent?.isAllDay) {
        if (checklist.reminderTime) {
          newActivity.reminderTime = checklist.reminderTime;
        }
      } else {
        if (checklist.reminderMinutes != null) {
          newActivity.reminderMinutes = checklist.reminderMinutes;
        }
      }

      // Add notifyAdmin if enabled
if (checklist.notifyAdmin) {
  newActivity.notifyAdmin = true;
}


      // Clean undefined values before saving
      const cleanedActivity = cleanUndefined(newActivity);
      console.log("🧹 Cleaned activity:", cleanedActivity);

      // Add to event's activities
      const currentActivities = selectedEvent?.activities || [];
      const updatedActivities = [...currentActivities, cleanedActivity];

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
          }
        } else if (!selectedEvent.isAllDay && checklist.reminderMinutes != null) {
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
          }
        }
      } else {
        Alert.alert(
          "Error",
          `Error adding checklist: ${result.error}`
        );
      }

      if (onClose) {
        onClose();
      }
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
    await handleUpdateChecklist(updatedChecklist, closeViewChecklistModal);
  };

  const handleUpdateChecklist = async (updatedChecklist, onClose) => {
    try {
      console.log("💾 Updating checklist:", updatedChecklist.name);

      const currentActivities = selectedChecklistEvent?.activities || [];
      const updatedActivities = currentActivities.map((activity) => {
        if (activity.id === updatedChecklist.id) {
          // Rebuild activity from scratch (don't spread original)
          const updated = {
            id: activity.id,
            activityType: activity.activityType,
            name: updatedChecklist.name,
            items: updatedChecklist.items,
            createdAt: activity.createdAt,
          };

          // Only add notifyAdmin if it exists
          if (updatedChecklist.notifyAdmin !== undefined) {
            updated.notifyAdmin = updatedChecklist.notifyAdmin;
          }

          // Handle reminder based on event type
          if (selectedChecklistEvent.isAllDay) {
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

      console.log("🧹 Cleaned activities:", updatedActivities);

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
          }
        } else if (!selectedChecklistEvent.isAllDay && updatedChecklist.reminderMinutes != null) {
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
          }
        }
      } else {
        Alert.alert("Error", `Error updating checklist: ${result.error}`);
      }

      if (onClose) {
        onClose();
      }
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
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🗑️ Deleting checklist:", activity.name);

              const currentActivities = event.activities || [];
              const updatedActivities = currentActivities
                .filter((a) => a.id !== activity.id)
                .map(cleanUndefined); // Clean remaining activities

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
                // Delete notification if it exists
                const hasReminder = activity.reminderMinutes != null || activity.reminderTime != null;
                
                if (hasReminder) {
                  const notificationId = `${event.eventId}-checklist-${activity.id}`;
                  const notifResult = await deleteNotification(notificationId);
                  
                  if (notifResult.success && notifResult.deletedCount > 0) {
                    console.log(`🔕 Deleted ${notifResult.deletedCount} notification(s)`);
                  }
                }

                Alert.alert("Success", `"${activity.name}" deleted successfully`);
              } else {
                Alert.alert("Error", `Error deleting checklist: ${result.error}`);
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

  // ==========================================
  // RETURN ALL HANDLERS
  // ==========================================

  return {
    // Event operations
    handleDeleteEvent,
    handleEditEvent,
    
    // Checklist operations (core feature - available in all apps)
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