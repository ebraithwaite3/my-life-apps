import { Alert } from "react-native";
import { DateTime } from "luxon";
import { useSaveInternalEvent } from "../internalCalendarHooks/useSaveInternalEvent";
import { useSaveToGoogleCalendar } from "../googleCalendarHooks/useSaveToGoogleCalendar";
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
 * useEventCreation - Shared event creation/save logic
 *
 * Handles saving events to internal, group, and Google calendars
 * Manages notifications for event creation and reminders
 * Used by ALL app EventModals
 *
 * NOTE: reminderMinutes is always an ISO string (absolute time), never a number
 * Google Calendar events use OUR app notifications, not Google's
 */
export const useEventCreation = ({ user, db }) => {
  const saveInternalEvent = useSaveInternalEvent();
  const saveToGoogleCalendar = useSaveToGoogleCalendar();

  // Use notification hooks
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
    reminderMinutes, // Always ISO string or null
    activities = [], // Array of activity objects
    appName = "app", // For notification routing
    membersToNotify = [], // Array of user IDs to notify
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
      appName,
      membersToNotify,
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
        console.log(
          "Creating internal/group event:",
          eventData,
          "Reminder:",
          reminderMinutes
        );

        result = await saveInternalEvent({
          ...eventData,
          reminderMinutes,
        });

        if (result.success) {
          console.log(`✅ Event created: ${result.eventId}`);

          // 1. IMMEDIATE NOTIFICATION: Notify group members of new event
          if (isGroupEvent && groupId) {
            console.log(`📢 Notifying ${membersToNotify.length} group members`);
            try {
              await notifyGroupMembers(
                groupId,
                user.userId, // Exclude creator
                `New Event: ${title.trim()}`,
                `${user.username || "A member"} added a new event`,
                {
                  screen: "Calendar",
                  eventId: result.eventId,
                  app: `${appName}-app`,
                }
              );
              console.log("✅ Group members notified");
            } catch (error) {
              console.error("❌ Failed to notify group members:", error);
            }
          }

          // 2. SCHEDULED REMINDER: Set up reminder notifications
          if (reminderMinutes != null) {
            const reminderTime = new Date(reminderMinutes);
            console.log("⏰ Setting up reminder for:", reminderTime);

            if (reminderTime > new Date()) {
              if (isGroupEvent && groupId) {
                // Schedule reminder for ALL group members
                console.log(
                  `⏰ Scheduling group reminder for ${membersToNotify.length} members`
                );
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
                    }
                  );
                  console.log("✅ Group reminder scheduled");
                } catch (error) {
                  console.error("❌ Failed to schedule group reminder:", error);
                }
              } else {
                // Personal event - use scheduleActivityReminder for single user
                console.log("⏰ Scheduling personal reminder");
                try {
                  const reminderEvent = {
                    id: result.eventId,
                    name: title.trim(),
                    reminderTime: reminderTime.toISOString(),
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
                    }
                  );
                  console.log("✅ Personal reminder scheduled");
                } catch (error) {
                  console.error("❌ Failed to schedule reminder:", error);
                }
              }
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
        const isSharedCalendar = membersToNotify.length > 0;
        console.log(
          `Creating Google Calendar event (${
            isSharedCalendar ? "shared" : "personal"
          })`
        );

        // Save to Google Calendar
        result = await saveToGoogleCalendar(
          eventData,
          selectedCalendarId,
          db,
          cleanedActivities
        );

        if (result.success) {
          console.log(`✅ Event created in Google Calendar: ${result.eventId}`);

          // 1. IMMEDIATE NOTIFICATION for shared calendars
          if (isSharedCalendar) {
            console.log(
              `📢 Notifying ${membersToNotify.length} calendar subscribers`
            );
            try {
              // Filter out creator
              const recipients = membersToNotify.filter(
                (id) => id !== user.userId
              );

              if (recipients.length > 0) {
                const { sendBatchNotification } = await import(
                  "@my-apps/services"
                );
                await sendBatchNotification(
                  recipients,
                  `New Event: ${title.trim()}`,
                  `${user.username || "A member"} added a new event`,
                  {
                    screen: "Calendar",
                    eventId: result.eventId,
                    app: `${appName}-app`,
                  }
                );
                console.log(`✅ Notified ${recipients.length} subscribers`);
              }
            } catch (error) {
              console.error("❌ Failed to notify subscribers:", error);
            }
          }

          // 2. Schedule reminders
          if (reminderMinutes != null) {
            const reminderTime = new Date(reminderMinutes);
            console.log("⏰ Scheduling reminder at:", reminderTime);

            if (reminderTime > new Date()) {
              try {
                if (isSharedCalendar) {
                  // Schedule for all subscribers
                  console.log(
                    `⏰ Scheduling reminders for ${membersToNotify.length} subscribers`
                  );
                  const { scheduleBatchNotification } = await import(
                    "@my-apps/services"
                  );

                  await scheduleBatchNotification(
                    membersToNotify,
                    `Reminder: ${title.trim()}`,
                    description.trim() || "Event reminder",
                    reminderTime,
                    {
                      screen: "Calendar",
                      eventId: result.eventId,
                      app: `${appName}-app`,
                    }
                  );
                  console.log("✅ Batch reminders scheduled");
                } else {
                  // Personal reminder - just for creator
                  console.log(
                    "⏰ Scheduling personal reminder for creator:",
                    user.userId
                  );
                  const { scheduleNotification } = await import(
                    "@my-apps/services"
                  );

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
                    }
                  );
                  console.log("✅ Personal reminder scheduled");
                }
              } catch (error) {
                console.error("❌ Failed to schedule reminder:", error);
              }
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
