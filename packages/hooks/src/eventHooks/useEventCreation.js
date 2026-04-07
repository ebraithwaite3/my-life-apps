import { Alert } from "react-native";
import { DateTime } from "luxon";
import { useSaveInternalEvent } from "../internalCalendarHooks/useSaveInternalEvent";
import { useSaveToGoogleCalendar } from "../googleCalendarHooks/useSaveToGoogleCalendar";
import { useNotifications } from "../notificationHooks/useNotifications";
import { showSuccessToast } from "@my-apps/utils";

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
 * Extract activity IDs by type for notification data
 */
const getActivityData = (activities) => {
  const data = {};
  
  activities.forEach(activity => {
    if (activity.activityType === 'checklist') {
      data.checklistId = activity.id;
    } else if (activity.activityType === 'workout') {
      data.workoutId = activity.id;
    } else if (activity.activityType === 'golf') {
      data.golfId = activity.id;
    }
  });
  
  return data;
};

/**
 * Extract scheduled time from reminder object
 * Handles both old (string) and new (object) formats
 */
const getReminderTime = (reminder) => {
  if (!reminder) return null;
  // Old format: ISO string
  if (typeof reminder === 'string') return reminder;
  // New format: object with scheduledFor
  return reminder.scheduledFor;
};

/**
 * useEventCreation - Shared event creation/save logic
 *
 * NOTE: reminderMinutes is now an object: { scheduledFor: ISO, isRecurring: bool, recurringConfig?: {...} }
 * Or null for no reminder
 */
export const useEventCreation = ({ user, db }) => {
  const saveInternalEvent = useSaveInternalEvent();
  const saveToGoogleCalendar = useSaveToGoogleCalendar();

  const {
    notifyGroupMembers,
    scheduleGroupReminder,
    scheduleActivityReminder,
  } = useNotifications();

  const createEvent = async ({
    title,
    description,
    startDate,
    endDate,
    isAllDay,
    selectedCalendarId,
    selectedCalendar,
    reminderMinutes, // Now: { scheduledFor, isRecurring, recurringConfig? } or null
    activities = [],
    appName = "app",
    membersToNotify = [],
  }) => {
    console.log("Creating event with reminder:", reminderMinutes);

    const activityData = getActivityData(activities);
    console.log("Activity data for notifications:", activityData);

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

    const cleanedActivities = activities.map(cleanUndefined);

    try {
      let result;
      let isGroupEvent = membersToNotify.length > 0;
      let groupId = selectedCalendar?.groupId || null;

      // INTERNAL or GROUP CALENDAR
      if (
        selectedCalendarId === "internal" ||
        selectedCalendar?.calendarType === "group"
      ) {
        const calendarName = selectedCalendar?.name || "Personal Calendar";

        eventData.activities = cleanedActivities;
        eventData.groupId = groupId;

        // ✅ Save FULL reminder object to Firestore
        result = await saveInternalEvent({
          ...eventData,
          reminderMinutes, // Full object: { scheduledFor, isRecurring, recurringConfig? }
        });

        if (result.success) {
          console.log(`✅ Event created: ${result.eventId}`);

          // 1. IMMEDIATE NOTIFICATION
          if (isGroupEvent && groupId) {
            console.log(`📢 Notifying ${membersToNotify.length} group members`);
            try {
              await notifyGroupMembers(
                groupId,
                user.userId,
                `New Event: ${title.trim()}`,
                `${user.username || "A member"} added a new event`,
                {
                  screen: "Calendar",
                  eventId: result.eventId,
                  app: `${appName}-app`,
                  date: startDate.toISOString(),
                  ...activityData,
                }
              );
              console.log("✅ Group members notified");
            } catch (error) {
              console.error("❌ Failed to notify group members:", error);
            }
          }

          // 2. SCHEDULED REMINDER
          if (reminderMinutes != null) {
            // ✅ Extract scheduled time from object
            console.log('🔍 DEBUG reminderMinutes before notification:', JSON.stringify(reminderMinutes));
  
  const reminderTimeISO = getReminderTime(reminderMinutes);
  console.log('🔍 DEBUG reminderTimeISO:', reminderTimeISO);
  
  const reminderTime = new Date(reminderTimeISO);
  console.log("⏰ Setting up reminder for:", reminderTime);
  console.log("   Recurring:", reminderMinutes.isRecurring);


            if (reminderTime > new Date()) {
              if (isGroupEvent && groupId) {
                console.log(`⏰ Scheduling group reminder for ${membersToNotify.length} members`);
                try {
                  await scheduleGroupReminder(
                    groupId,
                    `Reminder: ${title.trim()}`,
                    description.trim() || "Event reminder",
                    result.eventId,
                    reminderTime,
                    {
                      screen: "Calendar",
                      eventId: result.eventId,
                      app: `${appName}-app`,
                      date: startDate.toISOString(),
                      ...activityData,
                      // ✅ Include recurring config in notification data
                      ...(reminderMinutes.isRecurring && {
                        isRecurring: true,
                        recurringConfig: reminderMinutes.recurringConfig,
                      }),
                    }
                  );
                  console.log("✅ Group reminder scheduled");
                } catch (error) {
                  console.error("❌ Failed to schedule group reminder:", error);
                }
              } else {
                console.log("⏰ Scheduling personal reminder");
                try {
                  const reminderEvent = {
                    id: result.eventId,
                    name: title.trim(),
                    reminderTime: reminderTimeISO,
                  };

                  await scheduleActivityReminder(
                    reminderEvent,
                    "Event",
                    result.eventId,
                    null,
                    {
                      screen: "Calendar",
                      eventId: result.eventId,
                      app: `${appName}-app`,
                      date: startDate.toISOString(),
                      ...activityData,
                      // ✅ Include recurring config
                      ...(reminderMinutes.isRecurring && {
                        isRecurring: true,
                        recurringConfig: reminderMinutes.recurringConfig,
                      }),
                    }
                  );
                  console.log("✅ Personal reminder scheduled");
                } catch (error) {
                  console.error("❌ Failed to schedule reminder:", error);
                }
              }
            }
          }

          showSuccessToast(`Event added to ${calendarName}`, "", 2000, "top");
          return { success: true, eventId: result.eventId };
        } else {
          Alert.alert("Error", `Failed to save event: ${result.error}`);
          return { success: false, error: result.error };
        }
      }

      // GOOGLE CALENDAR
      else {
        const isSharedCalendar = membersToNotify.length > 0;
        console.log(`Creating Google Calendar event (${isSharedCalendar ? "shared" : "personal"})`);

        result = await saveToGoogleCalendar(
          eventData,
          selectedCalendarId,
          db,
          cleanedActivities,
          reminderMinutes // ✅ Pass full reminder object
        );

        if (result.success) {
          console.log(`✅ Event created in Google Calendar: ${result.eventId}`);

          // 1. IMMEDIATE NOTIFICATION
          if (isSharedCalendar) {
            console.log(`📢 Notifying ${membersToNotify.length} calendar subscribers`);
            try {
              const recipients = membersToNotify.filter((id) => id !== user.userId);
              if (recipients.length > 0) {
                const { sendBatchNotification } = await import("@my-apps/services");
                await sendBatchNotification(
                  recipients,
                  `New Event: ${title.trim()}`,
                  `${user.username || "A member"} added a new event`,
                  {
                    screen: "Calendar",
                    eventId: result.eventId,
                    app: `${appName}-app`,
                    date: startDate.toISOString(),
                    ...activityData,
                  }
                );
                console.log(`✅ Notified ${recipients.length} subscribers`);
              }
            } catch (error) {
              console.error("❌ Failed to notify subscribers:", error);
            }
          }

          // 2. SCHEDULED REMINDER
          if (reminderMinutes != null) {
            const reminderTimeISO = getReminderTime(reminderMinutes);
            const reminderTime = new Date(reminderTimeISO);
            console.log("⏰ Scheduling reminder at:", reminderTime);
            console.log("   Recurring:", reminderMinutes.isRecurring);

            if (reminderTime > new Date()) {
              try {
                if (isSharedCalendar) {
                  console.log(`⏰ Scheduling reminders for ${membersToNotify.length} subscribers`);
                  const { scheduleBatchNotification } = await import("@my-apps/services");

                  await scheduleBatchNotification(
                    membersToNotify,
                    `Reminder: ${title.trim()}`,
                    description.trim() || "Event reminder",
                    reminderTime,
                    {
                      screen: "Calendar",
                      eventId: result.eventId,
                      app: `${appName}-app`,
                      date: startDate.toISOString(),
                      ...activityData,
                      // ✅ Include recurring config
                      ...(reminderMinutes.isRecurring && {
                        isRecurring: true,
                        recurringConfig: reminderMinutes.recurringConfig,
                      }),
                    }
                  );
                  console.log("✅ Batch reminders scheduled");
                } else {
                  console.log("⏰ Scheduling personal reminder for creator:", user.userId);
                  const { scheduleNotification } = await import("@my-apps/services");

                  await scheduleNotification(
                    user.userId,
                    `Reminder: ${title.trim()}`,
                    description.trim() || "Event reminder",
                    result.eventId,
                    reminderTime,
                    {
                      screen: "Calendar",
                      eventId: result.eventId,
                      app: `${appName}-app`,
                      date: startDate.toISOString(),
                      ...activityData,
                      // ✅ Include recurring config
                      ...(reminderMinutes.isRecurring && {
                        isRecurring: true,
                        recurringConfig: reminderMinutes.recurringConfig,
                      }),
                    }
                  );
                  console.log("✅ Personal reminder scheduled");
                }
              } catch (error) {
                console.error("❌ Failed to schedule reminder:", error);
              }
            }
          }

          showSuccessToast("Event added to Google Calendar", "", 2000, "top");
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