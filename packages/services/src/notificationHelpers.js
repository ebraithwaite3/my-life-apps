import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Send immediate push notification to one user
 */
export const sendNotification = async (userId, title, body, data = {}) => {
  try {
    const functions = getFunctions();
    const sendPushNotification = httpsCallable(functions, 'sendPushNotification');

    const result = await sendPushNotification({
      userId,
      title,
      body,
      data: {
        ...data,
        app: data.app || 'organizer-app',
      },
    });

    console.log('✅ Notification sent:', result.data);
    return { success: true, ...result.data };
  } catch (error) {
    console.error('❌ Failed to send notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Schedule push notification for future delivery
 */
export const scheduleNotification = async (userId, title, body, eventId, scheduledFor, data = {}) => {
  try {
    const db = getFirestore();

    const notificationData = {
      userId,
      title,
      body,
      eventId,
      notificationId: data.checklistId ? `${eventId}-checklist-${data.checklistId}` : eventId, // ← ADD THIS
      data: {
        ...data,
        app: data.app || 'organizer-app',
      },
      scheduledFor: Timestamp.fromDate(scheduledFor),
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'pendingNotifications'), notificationData);

    console.log('✅ Notification scheduled:', docRef.id);
    return { success: true, notificationId: docRef.id };
  } catch (error) {
    console.error('❌ Failed to schedule notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to multiple users
 */
export const sendBatchNotification = async (userIds, title, body, data = {}) => {
  try {
    const functions = getFunctions();
    const sendBatchPushNotification = httpsCallable(functions, 'sendBatchPushNotification');

    const result = await sendBatchPushNotification({
      userIds,
      title,
      body,
      data: {
        ...data,
        app: data.app || 'organizer-app',
      },
    });

    console.log('✅ Batch notification sent:', result.data);
    return { success: true, ...result.data };
  } catch (error) {
    console.error('❌ Failed to send batch notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Schedule notification to multiple users
 */
export const scheduleBatchNotification = async (userIds, title, body, scheduledFor, data = {}) => {
  try {
    const db = getFirestore();
    const notifications = [];

    for (const userId of userIds) {
      const notificationData = {
        userId,
        eventId: data.eventId,
        notificationId: `${data.eventId}-checklist-${data.checklistId}`, // ← ADD THIS
        title,
        body,
        data: {
          ...data,
          app: data.app || 'checklist-app',
        },
        scheduledFor: Timestamp.fromDate(scheduledFor),
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'pendingNotifications'), notificationData);
      notifications.push(docRef.id);
    }

    console.log(`✅ Scheduled ${notifications.length} notifications`);
    return { success: true, notificationIds: notifications };
  } catch (error) {
    console.error('❌ Failed to schedule batch notifications:', error);
    return { success: false, error: error.message };
  }
};