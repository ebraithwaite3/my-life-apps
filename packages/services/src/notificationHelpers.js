import { getFirestore, doc, setDoc, arrayUnion } from 'firebase/firestore';
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
 * Schedule push notification for future delivery — writes to masterConfig/{userId}.notifications
 * NOW: Supports recurring notifications via isRecurring and recurringConfig
 */
export const scheduleNotification = async (userId, title, body, eventId, scheduledFor, data = {}) => {
  try {
    const db = getFirestore();

    const { isRecurring, recurringConfig, ...cleanData } = data;

    const notifId = cleanData.checklistId
      ? `${eventId}-checklist-${cleanData.checklistId}`
      : eventId;

    const notificationData = {
      id: notifId,
      userId,
      title,
      body,
      eventId,
      scheduledTime: scheduledFor.toISOString(),
      createdAt: new Date().toISOString(),
      data: {
        ...cleanData,
        app: cleanData.app || 'organizer-app',
      },
      ...(isRecurring && {
        isRecurring: true,
        recurringConfig,
      }),
    };

    await setDoc(
      doc(db, 'masterConfig', userId),
      { notifications: arrayUnion(notificationData) },
      { merge: true },
    );

    console.log('✅ Notification scheduled in masterConfig:', notifId);
    if (isRecurring) {
      console.log('   📅 Recurring:', recurringConfig);
    }
    return { success: true, notificationId: notifId };
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
 * Schedule notification to multiple users — writes to each user's masterConfig.notifications
 * NOW: Supports recurring notifications
 */
export const scheduleBatchNotification = async (userIds, title, body, scheduledFor, data = {}) => {
  try {
    const db = getFirestore();
    const notificationIds = [];

    const { isRecurring, recurringConfig, ...cleanData } = data;

    for (const userId of userIds) {
      const notifId = cleanData.checklistId
        ? `${cleanData.eventId}-checklist-${cleanData.checklistId}`
        : cleanData.eventId;

      const notificationData = {
        id: notifId,
        userId,
        eventId: cleanData.eventId,
        title,
        body,
        scheduledTime: scheduledFor.toISOString(),
        createdAt: new Date().toISOString(),
        data: {
          ...cleanData,
          app: cleanData.app || 'checklist-app',
        },
        ...(isRecurring && {
          isRecurring: true,
          recurringConfig,
        }),
      };

      await setDoc(
        doc(db, 'masterConfig', userId),
        { notifications: arrayUnion(notificationData) },
        { merge: true },
      );
      notificationIds.push(notifId);
    }

    console.log(`✅ Scheduled ${notificationIds.length} notifications in masterConfig`);
    if (isRecurring) {
      console.log('   📅 Recurring:', recurringConfig);
    }
    return { success: true, notificationIds };
  } catch (error) {
    console.error('❌ Failed to schedule batch notifications:', error);
    return { success: false, error: error.message };
  }
};