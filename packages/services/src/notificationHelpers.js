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
 * NOW: Supports recurring notifications via isRecurring and recurringConfig
 */
export const scheduleNotification = async (userId, title, body, eventId, scheduledFor, data = {}) => {
  try {
    const db = getFirestore();

    // ✅ Extract recurring fields from data (don't send to device)
    const { isRecurring, recurringConfig, ...cleanData } = data;

    const notificationData = {
      userId,
      title,
      body,
      eventId,
      notificationId: cleanData.checklistId ? `${eventId}-checklist-${cleanData.checklistId}` : eventId,
      scheduledFor: Timestamp.fromDate(scheduledFor),
      createdAt: Timestamp.now(),
      data: {
        ...cleanData, // ✅ Only non-recurring data goes here
        app: cleanData.app || 'organizer-app',
      },
      // ✅ Recurring fields at top level only
      ...(isRecurring && {
        isRecurring: true,
        recurringConfig,
      }),
    };

    const docRef = await addDoc(collection(db, 'pendingNotifications'), notificationData);

    console.log('✅ Notification scheduled:', docRef.id);
    if (isRecurring) {
      console.log('   📅 Recurring:', recurringConfig);
    }
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
 * NOW: Supports recurring notifications
 */
export const scheduleBatchNotification = async (userIds, title, body, scheduledFor, data = {}) => {
  try {
    const db = getFirestore();
    const notifications = [];

    // ✅ Extract recurring fields from data (don't send to device)
    const { isRecurring, recurringConfig, ...cleanData } = data;

    for (const userId of userIds) {
      const notificationData = {
        userId,
        eventId: cleanData.eventId,
        notificationId: cleanData.checklistId ? `${cleanData.eventId}-checklist-${cleanData.checklistId}` : cleanData.eventId,
        title,
        body,
        scheduledFor: Timestamp.fromDate(scheduledFor),
        createdAt: Timestamp.now(),
        data: {
          ...cleanData, // ✅ Only non-recurring data goes here
          app: cleanData.app || 'checklist-app',
        },
        // ✅ Recurring fields at top level only
        ...(isRecurring && {
          isRecurring: true,
          recurringConfig,
        }),
      };

      const docRef = await addDoc(collection(db, 'pendingNotifications'), notificationData);
      notifications.push(docRef.id);
    }

    console.log(`✅ Scheduled ${notifications.length} notifications`);
    if (isRecurring) {
      console.log('   📅 Recurring:', recurringConfig);
    }
    return { success: true, notificationIds: notifications };
  } catch (error) {
    console.error('❌ Failed to schedule batch notifications:', error);
    return { success: false, error: error.message };
  }
};