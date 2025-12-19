import { Alert } from 'react-native';
import { DateTime } from 'luxon';
import { useSaveInternalEvent } from '../useSaveInternalEvent';
import { useSaveToGoogleCalendar } from '../useSaveToGoogleCalendar';
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
 * useEventCreation - Shared event creation/save logic
 * 
 * Handles saving events to internal, group, and Google calendars
 * Used by ALL app EventModals
 * 
 * NOTE: reminderMinutes is always an ISO string (absolute time), never a number
 */
export const useEventCreation = ({ user, db }) => {
  const saveInternalEvent = useSaveInternalEvent();
  const saveToGoogleCalendar = useSaveToGoogleCalendar();

  const createEvent = async ({
    title,
    description,
    startDate,
    endDate,
    isAllDay,
    selectedCalendarId,
    selectedCalendar,
    reminderMinutes, // Always ISO string or null
    activities = [], // Array of activity objects
    appName = "app", // For notification routing
  }) => {
    console.log("Creating event with data:", {
      title,
      description,
      startDate,
      endDate,
      isAllDay,
      selectedCalendarId,
      reminderMinutes,
      activities,
    });
    
    // Build event data
    const eventData = {
      summary: title.trim(),
      description: description.trim(),
      calendarId: selectedCalendarId,
    };

    // Handle all-day vs timed events
    if (isAllDay) {
      eventData.start = {
        date: DateTime.fromJSDate(startDate).toFormat("yyyy-MM-dd"),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      eventData.end = {
        date: DateTime.fromJSDate(endDate).toFormat("yyyy-MM-dd"),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } else {
      eventData.start = {
        dateTime: DateTime.fromJSDate(startDate).toISO(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      eventData.end = {
        dateTime: DateTime.fromJSDate(endDate).toISO(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    // Clean activities (remove undefined values)
    const cleanedActivities = activities.map(cleanUndefined);

    try {
      let result;

      // INTERNAL or GROUP CALENDAR
      if (
        selectedCalendarId === "internal" ||
        selectedCalendar?.calendarType === "group"
      ) {
        const calendarName = selectedCalendar?.name || "Personal Calendar";
        const groupId = selectedCalendar?.groupId || null;

        eventData.activities = cleanedActivities;
        eventData.groupId = groupId;
        console.log("Creating internal/group event:", eventData, "Reminder:", reminderMinutes);

        result = await saveInternalEvent({
          ...eventData,
          reminderMinutes,
        });

        if (result.success) {
          // Schedule event reminder if set (always ISO string now)
          if (reminderMinutes != null) {
            try {
              const reminderTime = new Date(reminderMinutes);
              console.log("Scheduling reminder at absolute time:", reminderTime);

              if (reminderTime > new Date()) {
                scheduleNotification(
                  user.uid || user.userId,
                  `Reminder: ${title.trim()}`,
                  description.trim() || 'Event reminder',
                  result.eventId,
                  reminderTime,
                  {
                    screen: "Calendar",
                    eventId: result.eventId,
                    app: `${appName}-app`,
                  }
                ).catch(console.error);
              }
            } catch (error) {
              console.error("Error scheduling reminder:", error);
            }
          }

          Alert.alert("Success", `Event added to ${calendarName}`);
          return { success: true, eventId: result.eventId };
        } else {
          Alert.alert("Error", `Failed to save event: ${result.error}`);
          return { success: false, error: result.error };
        }
      }
      
      // GOOGLE CALENDAR
      else {
        result = await saveToGoogleCalendar(
          eventData,
          selectedCalendarId,
          db,
          reminderMinutes,
          cleanedActivities
        );

        if (result.success) {
          // Schedule event reminder if set (always ISO string now)
          if (reminderMinutes != null) {
            try {
              const reminderTime = new Date(reminderMinutes);
              console.log("Scheduling reminder at absolute time:", reminderTime);

              if (reminderTime > new Date()) {
                scheduleNotification(
                  user.uid || user.userId,
                  `Reminder: ${title.trim()}`,
                  description.trim() || 'Event reminder',
                  result.eventId,
                  reminderTime,
                  {
                    screen: "Calendar",
                    eventId: result.eventId,
                    app: `${appName}-app`,
                  }
                ).catch(console.error);
              }
            } catch (error) {
              console.error("Error scheduling reminder:", error);
            }
          }

          Alert.alert("Success", "Event added to Google Calendar");
          return { success: true, eventId: result.eventId };
        } else {
          Alert.alert("Error", "Error saving event to Google Calendar.");
          return { success: false, error: "Google Calendar save failed" };
        }
      }
    } catch (error) {
      console.error("Error creating event:", error);
      Alert.alert("Error", "Unexpected error while saving the event.");
      return { success: false, error: error.message };
    }
  };

  return { createEvent };
};