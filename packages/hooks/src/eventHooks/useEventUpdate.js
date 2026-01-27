import { Alert } from "react-native";
import { DateTime } from "luxon";
import { useUpdateInternalEvent } from "../internalCalendarHooks/useUpdateInternalEvent";
import { useUpdateGoogleCalendarEvent } from "../googleCalendarHooks/useUpdateGoogleCalendarEvent";
import { useDeleteNotification } from "../useDeleteNotification";
import { useNotifications } from "../notificationHooks/useNotifications";

/**
 * Remove undefined values from object
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
 * Extract scheduled time from reminder object
 */
const getReminderTime = (reminder) => {
  if (!reminder) return null;
  if (typeof reminder === "string") return reminder;
  return reminder.scheduledFor;
};

/**
 * useEventUpdate - Shared event update logic
 *
 * NOTE: reminderMinutes is now an object: { scheduledFor: ISO, isRecurring: bool, recurringConfig?: {...} }
 */
export const useEventUpdate = ({ user, db }) => {
  const updateInternalEvent = useUpdateInternalEvent();
  const updateGoogleEvent = useUpdateGoogleCalendarEvent();
  const deleteNotification = useDeleteNotification();

  const { scheduleActivityReminder, scheduleBatchNotification } =
    useNotifications();

  const updateEvent = async ({
    eventId,
    originalStartTime,
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
    event = null,
  }) => {
    console.log("Updating event:", eventId);
    console.log("Reminder data:", reminderMinutes);

    const eventData = {
      summary: title.trim(),
      description: description.trim(),
      calendarId: selectedCalendarId,
    };

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

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

    const cleanedActivities = activities.map(cleanUndefined);

    try {
      let result;
      const isSharedEvent = membersToNotify.length > 0;

      // INTERNAL or GROUP CALENDAR
      if (
        selectedCalendarId === "internal" ||
        selectedCalendar?.calendarType === "group"
      ) {
        // ✅ Extract groupId - handle both ways
        let groupId = null;

        if (selectedCalendar?.groupId) {
          // Group ID stored directly on calendar object
          groupId = selectedCalendar.groupId;
        } else if (selectedCalendarId?.startsWith("group-")) {
          // Group ID encoded in the calendar ID
          groupId = selectedCalendarId.replace("group-", "");
        }

        console.log("📝 Updating with groupId:", groupId);

        // ✅ Pass groupId to update
        result = await updateInternalEvent({
          eventId,
          startTime: originalStartTime,
          summary: eventData.summary,
          description: eventData.description,
          start: eventData.start,
          end: eventData.end,
          activities: cleanedActivities,
          reminderMinutes,
          groupId, // ✅ NOW SAFELY EXTRACTED
        });

        if (result.success) {
          console.log(`✅ Event updated: ${eventId}`);
        
          // ✅ ONLY delete/recreate if reminder CHANGED
          const oldReminderISO = event.reminderMinutes?.scheduledFor || null;
          const newReminderISO = reminderMinutes?.scheduledFor || null;
          const reminderChanged = oldReminderISO !== newReminderISO;
          
          console.log("🔍 Reminder comparison:", {
            old: oldReminderISO,
            new: newReminderISO,
            changed: reminderChanged
          });
        
          if (reminderChanged) {
            console.log("⚠️ Reminder changed, updating notifications");
            
            // Delete ONLY event-level notifications (no activity IDs)
            const notificationsRef = collection(db, 'pendingNotifications');
            const q = query(notificationsRef, where('eventId', '==', eventId));
            const snapshot = await getDocs(q);
            
            // Filter to event-level only (no checklistId, workoutId, etc)
            const eventLevelDocs = snapshot.docs.filter(doc => {
              const data = doc.data();
              return !data.data?.checklistId && !data.data?.workoutId && !data.data?.golfId;
            });
            
            if (eventLevelDocs.length > 0) {
              await Promise.all(eventLevelDocs.map(doc => deleteDoc(doc.ref)));
              console.log(`🗑️ Deleted ${eventLevelDocs.length} old event-level notifications`);
            }
        
            // Schedule new reminder if set
            if (reminderMinutes != null) {
              const reminderTimeISO = getReminderTime(reminderMinutes);
              const reminderTime = new Date(reminderTimeISO);
              console.log("⏰ Rescheduling reminder for:", reminderTime);
              console.log("   Recurring:", reminderMinutes.isRecurring);
        
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
                      ...(reminderMinutes.isRecurring && {
                        isRecurring: true,
                        recurringConfig: reminderMinutes.recurringConfig,
                      }),
                    }
                  );
                } else {
                  await scheduleActivityReminder(
                    {
                      id: eventId,
                      name: title.trim(),
                      reminderTime: reminderTimeISO,
                    },
                    "Event",
                    eventId,
                    null,
                    {
                      screen: "Calendar",
                      eventId,
                      app: `${appName}-app`,
                      ...(reminderMinutes.isRecurring && {
                        isRecurring: true,
                        recurringConfig: reminderMinutes.recurringConfig,
                      }),
                    }
                  );
                }
              }
            }
          } else {
            console.log("✅ Reminder unchanged, keeping existing notifications");
          }
        
          // ✅ Alert OUTSIDE the if block - always show success
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
          originalStartTime,
          reminderMinutes
        );
      
        if (result.success) {
          console.log(`✅ Google Calendar event updated: ${eventId}`);
      
          // ✅ ONLY delete/recreate if reminder CHANGED
          const oldReminderISO = event.reminderMinutes?.scheduledFor || null;
          const newReminderISO = reminderMinutes?.scheduledFor || null;
          const reminderChanged = oldReminderISO !== newReminderISO;
          
          console.log("🔍 Reminder comparison:", {
            old: oldReminderISO,
            new: newReminderISO,
            changed: reminderChanged
          });
      
          if (reminderChanged) {
            console.log("⚠️ Reminder changed, updating notifications");
            
            // Delete ONLY event-level notifications (no activity IDs)
            const notificationsRef = collection(db, 'pendingNotifications');
            const q = query(notificationsRef, where('eventId', '==', eventId));
            const snapshot = await getDocs(q);
            
            // Filter to event-level only (no checklistId, workoutId, etc)
            const eventLevelDocs = snapshot.docs.filter(doc => {
              const data = doc.data();
              return !data.data?.checklistId && !data.data?.workoutId && !data.data?.golfId;
            });
            
            if (eventLevelDocs.length > 0) {
              await Promise.all(eventLevelDocs.map(doc => deleteDoc(doc.ref)));
              console.log(`🗑️ Deleted ${eventLevelDocs.length} old event-level notifications`);
            }
      
            // Schedule new reminder if set
            if (reminderMinutes != null) {
              const reminderTimeISO = getReminderTime(reminderMinutes);
              const reminderTime = new Date(reminderTimeISO);
              console.log("⏰ Rescheduling reminder for:", reminderTime);
              console.log("   Recurring:", reminderMinutes.isRecurring);
      
              if (reminderTime > new Date()) {
                if (isSharedEvent) {
                  const { scheduleBatchNotification: scheduleBatch } =
                    await import("@my-apps/services");
                  await scheduleBatch(
                    membersToNotify,
                    `Reminder: ${title.trim()}`,
                    description.trim() || "Event reminder",
                    reminderTime,
                    {
                      screen: "Calendar",
                      eventId,
                      app: `${appName}-app`,
                      ...(reminderMinutes.isRecurring && {
                        isRecurring: true,
                        recurringConfig: reminderMinutes.recurringConfig,
                      }),
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
                      ...(reminderMinutes.isRecurring && {
                        isRecurring: true,
                        recurringConfig: reminderMinutes.recurringConfig,
                      }),
                    }
                  );
                }
              }
            }
          } else {
            console.log("✅ Reminder unchanged, keeping existing notifications");
          }
      
          // ✅ Alert OUTSIDE the if block
          Alert.alert("Success", "Event updated successfully");
          return { success: true, eventId };
        } else {
          Alert.alert("Error", "Failed to update Google Calendar event");
          return { success: false, error: result.error };
        }
      }
    } catch (error) {
      console.error("❌ Error updating event:", error);
      Alert.alert("Error", "An unexpected error occurred: " + error.message);
      return { success: false, error: error.message };
    }
  };

  return { updateEvent };
};
