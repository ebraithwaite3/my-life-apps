import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
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
 * Schedule push notification for future delivery — upserts into masterConfig/{userId}.reminders[]
 */
export const scheduleNotification = async (userId, title, body, eventId, scheduledFor, data = {}) => {
  try {
    const db = getFirestore();
    const { isRecurring, recurringConfig, ...cleanData } = data;

    const notifId = cleanData.checklistId
      ? `${eventId}-checklist-${cleanData.checklistId}`
      : eventId;

    const intervalMinutes = isRecurring
      ? (recurringConfig?.intervalMinutes
         || (recurringConfig?.intervalSeconds
           ? Math.round(recurringConfig.intervalSeconds / 60)
           : null))
      : null;

    const reminderData = {
      id: notifId,
      deliveryMode: 'push',
      title,
      message: body,
      eventId,
      scheduledTime: scheduledFor.toISOString(),
      acknowledgedAt: null,
      notification: {
        title,
        body,
        screen: cleanData.screen || null,
        handlerName: null,
        handlerParams: null,
        data: { ...cleanData, app: cleanData.app || 'organizer-app' },
      },
      paused: false,
      pausedUntil: null,
      reminderType: isRecurring ? 'persistent' : 'oneTime',
      recurringIntervalMinutes: intervalMinutes,
      recurringIntervalDays: null,
      recurringSchedule: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletable: true,
    };

    const configRef = doc(db, 'masterConfig', userId);
    const snap = await getDoc(configRef);
    const existing = snap.exists() ? (snap.data().reminders || []) : [];
    const updated = existing.some((r) => r.id === notifId)
      ? existing.map((r) => r.id === notifId ? reminderData : r)
      : [...existing, reminderData];

    await setDoc(configRef, { reminders: updated }, { merge: true });

    console.log('✅ Reminder scheduled in masterConfig:', notifId);
    if (isRecurring) console.log('   📅 Recurring:', recurringConfig);
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
 * Schedule notification to multiple users — upserts into each user's masterConfig.reminders[]
 */
export const scheduleBatchNotification = async (userIds, title, body, scheduledFor, data = {}) => {
  try {
    const db = getFirestore();
    const notificationIds = [];
    const { isRecurring, recurringConfig, ...cleanData } = data;

    const intervalMinutes = isRecurring
      ? (recurringConfig?.intervalMinutes
         || (recurringConfig?.intervalSeconds
           ? Math.round(recurringConfig.intervalSeconds / 60)
           : null))
      : null;

    for (const userId of userIds) {
      const notifId = cleanData.checklistId
        ? `${cleanData.eventId}-checklist-${cleanData.checklistId}`
        : cleanData.eventId;

      const reminderData = {
        id: notifId,
        deliveryMode: 'push',
        title,
        message: body,
        eventId: cleanData.eventId,
        scheduledTime: scheduledFor.toISOString(),
        acknowledgedAt: null,
        notification: {
          title,
          body,
          screen: cleanData.screen || null,
          handlerName: null,
          handlerParams: null,
          data: { ...cleanData, app: cleanData.app || 'checklist-app' },
        },
        paused: false,
        pausedUntil: null,
        reminderType: isRecurring ? 'persistent' : 'oneTime',
        recurringIntervalMinutes: intervalMinutes,
        recurringIntervalDays: null,
        recurringSchedule: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletable: true,
      };

      const configRef = doc(db, 'masterConfig', userId);
      const snap = await getDoc(configRef);
      const existing = snap.exists() ? (snap.data().reminders || []) : [];
      const updated = existing.some((r) => r.id === notifId)
        ? existing.map((r) => r.id === notifId ? reminderData : r)
        : [...existing, reminderData];

      await setDoc(configRef, { reminders: updated }, { merge: true });
      notificationIds.push(notifId);
    }

    console.log(`✅ Scheduled ${notificationIds.length} reminders in masterConfig`);
    if (isRecurring) console.log('   📅 Recurring:', recurringConfig);
    return { success: true, notificationIds };
  } catch (error) {
    console.error('❌ Failed to schedule batch notifications:', error);
    return { success: false, error: error.message };
  }
};
