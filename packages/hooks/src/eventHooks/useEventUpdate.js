import { Alert } from "react-native";
import { DateTime } from "luxon";
import { useUpdateInternalEvent } from "../internalCalendarHooks/useUpdateInternalEvent";
import { useUpdateGoogleCalendarEvent } from "../googleCalendarHooks/useUpdateGoogleCalendarEvent";
import { useDeleteNotification } from "../useDeleteNotification";
import { useNotifications } from "../notificationHooks/useNotifications";

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
 * useEventUpdate - Shared event update logic
 * 
 * Handles updating events in internal, group, and Google calendars
 * Manages reminder updates (delete old, schedule new)
 * Used by ALL app EventModals
 */
export const useEventUpdate = ({ user, db }) => {
  const updateInternalEvent = useUpdateInternalEvent();
  const updateGoogleEvent = useUpdateGoogleCalendarEvent();
  const deleteNotification = useDeleteNotification();
  
  const { scheduleActivityReminder, scheduleBatchNotification } = useNotifications();

  const updateEvent = async ({
    eventId,
    originalStartTime, // Original start time to find the shard
    title,
    description,
    startDate,
    endDate,
    isAllDay,
    selectedCalendarId,
    selectedCalendar,
    reminderMinutes,
    activities = [],
    appName = "app",
    membersToNotify = [],
  }) => {
    console.log("Updating event:", eventId);

    // Build event data
    const eventData = {
      summary: title.trim(),
      description: description.trim(),
      calendarId: selectedCalendarId,
    };

    // Convert ISO string dates to Date objects
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Handle all-day vs timed events
    if (isAllDay) {
      eventData.start = {
        date: DateTime.fromJSDate(startDateObj).toFormat("yyyy-MM-dd"),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      eventData.end = {
        date: DateTime.fromJSDate(endDateObj).toFormat("yyyy-MM-dd"),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } else {
      eventData.start = {
        dateTime: DateTime.fromJSDate(startDateObj).toISO(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      eventData.end = {
        dateTime: DateTime.fromJSDate(endDateObj).toISO(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    // Clean activities
    const cleanedActivities = activities.map(cleanUndefined);

    try {
      let result;
      const isSharedEvent = membersToNotify.length > 0;

      // INTERNAL or GROUP CALENDAR
      if (
        selectedCalendarId === "internal" ||
        selectedCalendar?.calendarType === "group"
      ) {
        result = await updateInternalEvent({
          eventId,
          startTime: originalStartTime,
          summary: eventData.summary,
          description: eventData.description,
          start: eventData.start,
          end: eventData.end,
          activities: cleanedActivities,
          reminderMinutes,
        });

        if (result.success) {
          console.log(`✅ Event updated: ${eventId}`);

          // Update reminders: Delete old, schedule new
          await deleteNotification(eventId);

          if (reminderMinutes != null) {
            const reminderTime = new Date(reminderMinutes);
            if (reminderTime > new Date()) {
              if (isSharedEvent) {
                await scheduleBatchNotification(
                  membersToNotify,
                  `Reminder: ${title.trim()}`,
                  description.trim() || "Event reminder",
                  reminderTime,
                  {
                    screen: "Calendar",
                    eventId,
                    app: `${appName}-app`,
                  }
                );
              } else {
                await scheduleActivityReminder(
                  {
                    id: eventId,
                    name: title.trim(),
                    reminderTime: reminderTime.toISOString(),
                  },
                  "Event",
                  eventId,
                  null,
                  {
                    screen: "Calendar",
                    eventId,
                    app: `${appName}-app`,
                  }
                );
              }
            }
          }

          Alert.alert("Success", "Event updated successfully");
          return { success: true, eventId };
        } else {
          Alert.alert("Error", `Failed to update event: ${result.error}`);
          return { success: false, error: result.error };
        }
      }

      // GOOGLE CALENDAR
      else {
        result = await updateGoogleEvent(
          eventId,
          selectedCalendarId,
          eventData,
          cleanedActivities,
          originalStartTime
        );

        if (result.success) {
          console.log(`✅ Google Calendar event updated: ${eventId}`);

          // Update reminders
          await deleteNotification(eventId);

          if (reminderMinutes != null) {
            const reminderTime = new Date(reminderMinutes);
            if (reminderTime > new Date()) {
              if (isSharedEvent) {
                const { scheduleBatchNotification: scheduleBatch } = await import("@my-apps/services");
                await scheduleBatch(
                  membersToNotify,
                  `Reminder: ${title.trim()}`,
                  description.trim() || "Event reminder",
                  reminderTime,
                  {
                    screen: "Calendar",
                    eventId,
                    app: `${appName}-app`,
                  }
                );
              } else {
                const { scheduleNotification } = await import("@my-apps/services");
                await scheduleNotification(
                  user.userId,
                  `Reminder: ${title.trim()}`,
                  description.trim() || "Event reminder",
                  eventId,
                  reminderTime,
                  {
                    screen: "Calendar",
                    eventId,
                    app: `${appName}-app`,
                  }
                );
              }
            }
          }

          Alert.alert("Success", "Event updated successfully");
          return { success: true, eventId };
        } else {
          Alert.alert("Error", "Failed to update Google Calendar event");
          return { success: false, error: result.error };
        }
      }
    } catch (error) {
      console.error("Error updating event:", error);
      Alert.alert("Error", "Unexpected error while updating event");
      return { success: false, error: error.message };
    }
  };

  return { updateEvent };
};