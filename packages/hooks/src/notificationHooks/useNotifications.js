import { useAuth, useData } from '@my-apps/contexts';
import { 
  sendNotification, 
  sendBatchNotification, 
  scheduleNotification,
  scheduleBatchNotification 
} from '@my-apps/services';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DateTime } from 'luxon';

export const useNotifications = () => {
  const { db } = useAuth();
  const { user } = useData();
  const userId = user?.userId;

  /**
   * Delete notifications by eventId from the current user's masterConfig.notifications
   */
  const deleteNotificationsByEventId = async (eventId) => {
    try {
      console.log(`🗑️ Removing notifications from masterConfig for eventId:`, eventId);

      if (!userId) return { success: true, deletedCount: 0 };

      const configRef = doc(db, 'masterConfig', userId);
      const snap = await getDoc(configRef);
      if (!snap.exists()) return { success: true, deletedCount: 0 };

      const existing = snap.data().notifications || [];
      const filtered = existing.filter((n) => n.eventId !== eventId);
      const deletedCount = existing.length - filtered.length;

      if (deletedCount === 0) {
        console.log(`ℹ️ No notifications found in masterConfig for eventId:`, eventId);
        return { success: true, deletedCount: 0 };
      }

      await setDoc(configRef, { notifications: filtered }, { merge: true });
      console.log(`✅ Deleted ${deletedCount} notification(s) from masterConfig for eventId:`, eventId);
      return { success: true, deletedCount };
    } catch (err) {
      console.error('❌ Error deleting notification', err);
      return { success: false, error: err.message };
    }
  };

  /**
   * Get all member user IDs from a group
   */
  const getGroupMemberIds = async (groupId, excludeUserId = null) => {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      
      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }

      const groupData = groupDoc.data();
      const members = groupData.members || [];
      
      const memberIds = members
        .map(member => member.userId)
        .filter(userId => excludeUserId ? userId !== excludeUserId : true);

      return memberIds;
    } catch (error) {
      console.error('Error getting group members:', error);
      throw error;
    }
  };

  /**
   * Notify group members
   */
  const notifyGroupMembers = async (groupId, excludeUserId, title, body, data = {}) => {
    try {
      console.log(`📢 Getting members for group: ${groupId}`);
      const memberIds = await getGroupMemberIds(groupId, excludeUserId);
      
      if (memberIds.length === 0) {
        console.log('No members to notify');
        return { success: true, notifiedCount: 0 };
      }

      console.log(`📢 Notifying ${memberIds.length} group members`);
      return await sendBatchNotification(memberIds, title, body, data);
    } catch (error) {
      console.error('Error notifying group members:', error);
      throw error;
    }
  };

  /**
   * Delete a group reminder from every member's masterConfig.notifications by notification id
   */
  const deleteGroupReminder = async (groupId, notifId) => {
    try {
      const memberIds = await getGroupMemberIds(groupId);
      await Promise.all(memberIds.map(async (memberId) => {
        const configRef = doc(db, 'masterConfig', memberId);
        const snap = await getDoc(configRef);
        if (!snap.exists()) return;
        const existing = snap.data().notifications || [];
        const filtered = existing.filter((n) => n.id !== notifId);
        if (filtered.length !== existing.length) {
          await setDoc(configRef, { notifications: filtered }, { merge: true });
        }
      }));
      console.log(`✅ Deleted group reminder "${notifId}" from ${memberIds.length} masterConfig docs`);
      return { success: true };
    } catch (error) {
      console.error('❌ deleteGroupReminder error:', error);
      throw error;
    }
  };

  /**
   * Schedule group reminder
   * NOW: Passes recurring config through to scheduleBatchNotification
   */
  const scheduleGroupReminder = async (groupId, title, body, eventId, reminderTime, data = {}) => {
    try {
      console.log(`⏰ Getting members for group reminder: ${groupId}`);
      const memberIds = await getGroupMemberIds(groupId);
      
      if (memberIds.length === 0) {
        console.log('No members to remind');
        return { success: true, scheduledCount: 0 };
      }

      console.log(`⏰ Scheduling reminders for ${memberIds.length} group members`);
      if (data.isRecurring) {
        console.log('   📅 Recurring reminder detected');
      }
      
      // ✅ Data object already contains isRecurring and recurringConfig from caller
      return await scheduleBatchNotification(memberIds, title, body, reminderTime, data);
    } catch (error) {
      console.error('Error scheduling group reminder:', error);
      throw error;
    }
  };

  /**
   * Send "Event Created" notification
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
  
    const recipients = membersToNotify.filter(id => id !== userId);
    
    if (recipients.length === 0) {
      return { success: true, skipped: true };
    }
  
    return await sendBatchNotification(recipients, title, body, data);
  };

  /**
   * Send "Activity Created" notification
   */
  const notifyActivityCreated = async (
    activity,
    activityType = 'Activity',
    event = null,
    membersToNotify = [],
    customData = {}
  ) => {
    const title = `New ${activityType} Added`;
    
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
  
    const recipients = membersToNotify.filter(id => id !== userId);
    
    if (recipients.length === 0) {
      return { success: true, skipped: true };
    }
  
    return await sendBatchNotification(recipients, title, body, data);
  };
  
  /**
   * Schedule event reminder notification(s)
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
  
    if (membersToNotify.length > 0) {
      return await scheduleBatchNotification(
        membersToNotify,
        title,
        body,
        reminderTime.toJSDate(),
        data
      );
    }
  
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
   * Schedule activity reminder notification
   * NOW: Passes recurring config through to scheduleNotification
   */
  const scheduleActivityReminder = async (
    activity,
    activityType = 'Activity',
    eventId = null,
    eventStartTime = null,
    customData = {},
    overrideUserId = null
  ) => {
    let reminderTime;

    if (activity.reminderMinutes && eventStartTime) {
      const eventTime = DateTime.fromISO(eventStartTime);
      reminderTime = eventTime.minus({ minutes: activity.reminderMinutes });
    } else if (activity.reminderTime) {
      reminderTime = DateTime.fromISO(activity.reminderTime);
    } else {
      return { success: true, skipped: true };
    }

    if (reminderTime < DateTime.now()) {
      console.log('⏰ Activity reminder time is in the past, skipping');
      return { success: true, skipped: true };
    }

    const title = `${activityType} Reminder: ${activity.name}`;
    
    let body = activity.name;
    if (activity.items?.length) {
      const itemCount = activity.items.length;
      body = `${itemCount} item${itemCount !== 1 ? 's' : ''} to complete`;
    }

    // ✅ customData already contains isRecurring and recurringConfig from caller
    const data = {
      screen: eventId ? 'Calendar' : 'Pinned',
      eventId: eventId,
      activityId: activity.id,
      ...customData, // This spreads isRecurring and recurringConfig
    };
    
    if (customData.isRecurring) {
      console.log('   📅 Scheduling recurring activity reminder');
    }
    
    console.log("Scheduling activity reminder:", {
      userId,
      title,
      body,
      eventId: eventId,
      activityId: activity.id,
      reminderTime: reminderTime.toJSDate(),
      data
    }); 

    return await scheduleNotification(
      overrideUserId || userId,
      title,
      body,
      eventId || activity.id,
      reminderTime.toJSDate(),
      data
    );
  };

  /**
   * Send immediate notification (generic)
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

    // Group helpers
    getGroupMemberIds,
    notifyGroupMembers,
    scheduleGroupReminder,
    deleteGroupReminder,
    
    // Specific helpers
    notifyEventCreated,
    notifyActivityCreated,
    scheduleEventReminder,
    scheduleActivityReminder,
    
    // Generic helpers
    sendImmediate,
    scheduleForLater,
    scheduleBatchNotification, // ✅ Export for direct use
  };
};