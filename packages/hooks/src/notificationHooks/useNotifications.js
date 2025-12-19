import { useAuth } from '@my-apps/contexts';
import { 
  sendNotification, 
  sendBatchNotification, 
  scheduleNotification,
  scheduleBatchNotification 
} from '@my-apps/services';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { DateTime } from 'luxon';

export const useNotifications = () => {
  const { user, db } = useAuth();
  const userId = user?.userId;

  /**
   * Delete pending notifications by eventId
   */
  const deleteNotificationsByEventId = async (eventId) => {
    try {
      console.log(`🗑️ Searching for notifications with eventId:`, eventId);
      
      const notificationsRef = collection(db, 'pendingNotifications');
      const q = query(notificationsRef, where('eventId', '==', eventId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log(`ℹ️ No pending notifications found for eventId:`, eventId);
        return { success: true, deletedCount: 0 };
      }

      console.log(`📋 Found ${querySnapshot.size} notification(s) to delete`);

      let deletedCount = 0;
      for (const docSnap of querySnapshot.docs) {
        await deleteDoc(docSnap.ref);
        console.log(`✅ Deleted notification:`, docSnap.id);
        deletedCount++;
      }

      console.log(`✅ Deleted ${deletedCount} notification(s) for eventId:`, eventId);
      return { success: true, deletedCount };
    } catch (err) {
      console.error('❌ Error deleting notification', err);
      return { success: false, error: err.message };
    }
  };

  /**
 * Send "Event Created" notification
 * Automatically uses batch if there are members to notify
 */
const notifyEventCreated = async (event, membersToNotify = [], customData = {}) => {
    const title = "New Event Created";
    const body = `${event.title} on ${DateTime.fromISO(event.startTime).toFormat('MMM d')}`;
    const data = {
      screen: 'Calendar',
      eventId: event.eventId,
      app: 'organizer-app',
      ...customData,
    };
  
    // Filter out the creator
    const recipients = membersToNotify.filter(id => id !== userId);
    
    if (recipients.length === 0) {
      return { success: true, skipped: true };
    }
  
    // Use batch for any number of recipients (1 or more)
    return await sendBatchNotification(recipients, title, body, data);
  };

  /**
 * Send "Activity Created" notification
 * Generic for any activity type (checklist, workout, golf round, etc.)
 * Automatically uses batch if there are members to notify
 * 
 * @param {Object} activity - Activity object
 * @param {string} activityType - Type for display ('Checklist', 'Workout', 'Golf Round', etc.)
 * @param {Object} event - Optional event object if activity is attached to an event
 * @param {Array} membersToNotify - Array of user IDs to notify
 * @param {Object} customData - Custom data to include in notification
 */
const notifyActivityCreated = async (
    activity,
    activityType = 'Activity',
    event = null,
    membersToNotify = [],
    customData = {}
  ) => {
    const title = `New ${activityType} Added`;
    
    // Build body with event context if available
    let body = activity.name;
    if (event) {
      const eventDate = DateTime.fromISO(event.startTime).toFormat('MMM d');
      body = `${activity.name} for ${event.title} on ${eventDate}`;
    }
    
    const data = {
      screen: event ? 'Calendar' : 'Pinned',
      eventId: event?.eventId,
      activityId: activity.id,
      ...customData,
    };
  
    // Filter out the creator
    const recipients = membersToNotify.filter(id => id !== userId);
    
    if (recipients.length === 0) {
      return { success: true, skipped: true };
    }
  
    // Use batch for any number of recipients (1 or more)
    return await sendBatchNotification(recipients, title, body, data);
  };
  
  /**
   * Schedule event reminder notification(s)
   * Automatically uses batch if there are members to notify
   */
  const scheduleEventReminder = async (event, membersToNotify = [], customData = {}) => {
    if (!event.reminderMinutes) return { success: true, skipped: true };
  
    const eventTime = DateTime.fromISO(event.startTime);
    const reminderTime = eventTime.minus({ minutes: event.reminderMinutes });
  
    if (reminderTime < DateTime.now()) {
      console.log('⏰ Reminder time is in the past, skipping');
      return { success: true, skipped: true };
    }
  
    const title = `Reminder: ${event.title}`;
    const body = `Starting in ${event.reminderMinutes} minutes`;
    const data = {
      screen: 'Calendar',
      eventId: event.eventId,
      app: 'organizer-app',
      ...customData,
    };
  
    // If group event (has members to notify)
    if (membersToNotify.length > 0) {
      return await scheduleBatchNotification(
        membersToNotify,
        title,
        body,
        reminderTime.toJSDate(),
        data
      );
    }
  
    // Personal event - notify creator only
    return await scheduleNotification(
      userId,
      title,
      body,
      event.eventId,
      reminderTime.toJSDate(),
      data
    );
  };

  /**
   * Schedule activity reminder notification (generic for any activity type)
   * Handles both specific time and event-relative reminders
   * 
   * @param {Object} activity - Activity object (checklist, workout, golf round, etc.)
   * @param {string} activityType - Type for display ('Checklist', 'Workout', 'Golf Round', etc.)
   * @param {string} eventId - Optional event ID if activity is attached to an event
   * @param {string} eventStartTime - Optional event start time for relative reminders
   * @param {Object} customData - Custom data to include in notification
   */
  const scheduleActivityReminder = async (
    activity, 
    activityType = 'Activity',
    eventId = null, 
    eventStartTime = null,
    customData = {}
  ) => {
    let reminderTime;

    // Relative reminder (X minutes before event)
    if (activity.reminderMinutes && eventStartTime) {
      const eventTime = DateTime.fromISO(eventStartTime);
      reminderTime = eventTime.minus({ minutes: activity.reminderMinutes });
    }
    // Specific time reminder (all-day events or pinned activities)
    else if (activity.reminderTime) {
      reminderTime = DateTime.fromISO(activity.reminderTime);
    }
    // No reminder set
    else {
      return { success: true, skipped: true };
    }

    // Don't schedule past reminders
    if (reminderTime < DateTime.now()) {
      console.log('⏰ Activity reminder time is in the past, skipping');
      return { success: true, skipped: true };
    }

    const title = `${activityType} Reminder: ${activity.name}`;
    
    // Build body based on activity type/content
    let body = activity.name;
    if (activity.items?.length) {
      const itemCount = activity.items.length;
      body = `${itemCount} item${itemCount !== 1 ? 's' : ''} to complete`;
    }

    const data = {
      screen: eventId ? 'Calendar' : 'Pinned',
      eventId: eventId,
      activityId: activity.id,
      ...customData, // Allow override/additional data
    };

    return await scheduleNotification(
      userId,
      title,
      body,
      activity.id,
      reminderTime.toJSDate(),
      data
    );
  };

  /**
   * Send immediate notification (generic)
   * For custom use cases
   */
  const sendImmediate = async (recipients, title, body, data = {}) => {
    if (Array.isArray(recipients) && recipients.length > 1) {
      return await sendBatchNotification(recipients, title, body, data);
    } else {
      const targetUser = Array.isArray(recipients) ? recipients[0] : recipients;
      return await sendNotification(targetUser, title, body, data);
    }
  };

  /**
   * Schedule notification (generic)
   * For custom use cases
   */
  const scheduleForLater = async (recipients, title, body, scheduledFor, data = {}) => {
    if (Array.isArray(recipients) && recipients.length > 1) {
      return await scheduleBatchNotification(recipients, title, body, scheduledFor, data);
    } else {
      const targetUser = Array.isArray(recipients) ? recipients[0] : recipients;
      return await scheduleNotification(targetUser, title, body, targetUser, scheduledFor, data);
    }
  };

  return {
    // Deletion
    deleteNotificationsByEventId,
    
    // Specific helpers
    notifyEventCreated,
    notifyActivityCreated,
    scheduleEventReminder,
    scheduleActivityReminder, // ✅ Generic for all activities
    
    // Generic helpers
    sendImmediate,
    scheduleForLater,
  };
};