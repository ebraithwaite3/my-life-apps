import { useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteField,
  setDoc,
} from 'firebase/firestore';

export const useStandAloneReminders = (db, userId, isAdmin) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db || !userId || !isAdmin) {
      setReminders([]);
      setLoading(false);
      return;
    }

    console.log('📬 Setting up standAloneReminders listener for:', userId);

    const docRef = doc(db, 'users', userId, 'standAloneReminders', 'allReminders');

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const remindersArray = Object.values(data.reminders || {});
          console.log('📬 Loaded reminders:', remindersArray.length);
          setReminders(remindersArray);
        } else {
          console.log('📬 No reminders doc found');
          setReminders([]);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('❌ Error loading reminders:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, userId]);

  // Delete this reminder from each recipient's masterConfig.reminders[]
  const deletePendingNotifications = async (reminderId, recipients) => {
    if (!db || !recipients?.length) return;

    console.log('🗑️ Removing reminder from masterConfig for:', reminderId);

    await Promise.all(recipients.map(async (recipientId) => {
      const configRef = doc(db, 'masterConfig', recipientId);
      const snap = await getDoc(configRef);
      if (!snap.exists()) return;
      const existing = snap.data().reminders || [];
      const filtered = existing.filter((r) => r.id !== reminderId);
      if (filtered.length !== existing.length) {
        await setDoc(configRef, { reminders: filtered }, { merge: true });
      }
    }));

    console.log(`✅ Removed reminder "${reminderId}" from ${recipients.length} masterConfig doc(s)`);
  };

  // Upsert this reminder into each recipient's masterConfig.reminders[]
  const createPendingNotifications = async (reminder) => {
    if (!db) throw new Error('Missing db');

    console.log('📤 Writing reminder to masterConfig for:', reminder.id);

    const { recipients, schedule, title, message, data, id: reminderId } = reminder;
    const scheduledFor = new Date(schedule.scheduledFor);

    const intervalMinutes = schedule.isRecurring
      ? (schedule.recurringConfig?.intervalMinutes || null)
      : null;

    await Promise.all(recipients.map(async (recipientId) => {
      const reminderData = {
        id: reminderId,
        deliveryMode: 'push',
        title,
        message,
        scheduledTime: scheduledFor.toISOString(),
        acknowledgedAt: null,
        notification: {
          title,
          body: message,
          screen: data?.screen || null,
          handlerName: null,
          handlerParams: null,
          data: { screen: data?.screen, app: data?.app },
        },
        paused: false,
        pausedUntil: null,
        reminderType: schedule.isRecurring ? 'persistent' : 'oneTime',
        recurringIntervalMinutes: intervalMinutes,
        recurringIntervalDays: null,
        recurringSchedule: null,
        ...(schedule.isRecurring && schedule.recurringConfig && {
          recurringConfig: schedule.recurringConfig,
        }),
        standAloneReminderId: reminderId,
        type: 'standalone_reminder',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletable: true,
      };

      const configRef = doc(db, 'masterConfig', recipientId);
      const snap = await getDoc(configRef);
      const existing = snap.exists() ? (snap.data().reminders || []) : [];
      const updated = existing.some((r) => r.id === reminderId)
        ? existing.map((r) => r.id === reminderId ? reminderData : r)
        : [...existing, reminderData];

      await setDoc(configRef, { reminders: updated }, { merge: true });
      console.log('✅ Reminder written to masterConfig for recipient:', recipientId);
    }));

    console.log(`✅ Written reminder "${reminderId}" to ${recipients.length} masterConfig doc(s)`);
  };

  // Helper to create/update reminder
  const saveReminder = async (reminder) => {
    if (!db || !userId) throw new Error('Missing db or userId');

    const docRef = doc(db, 'users', userId, 'standAloneReminders', 'allReminders');
    
    try {
      // 1. Remove existing masterConfig reminders (if editing existing reminder)
      if (reminder.id && reminder.recipients?.length) {
        await deletePendingNotifications(reminder.id, reminder.recipients);
      }

      // 2. Save reminder to collection
      try {
        await updateDoc(docRef, {
          [`reminders.${reminder.id}`]: reminder
        });
      } catch (error) {
        // Doc doesn't exist, create it
        await setDoc(docRef, {
          reminders: {
            [reminder.id]: reminder
          }
        });
      }

      // 3. Create new notifications (only if active)
      if (reminder.isActive) {
        await createPendingNotifications(reminder);
      }

      console.log('✅ Reminder saved and notifications created:', reminder.id);
    } catch (error) {
      console.error('❌ Failed to save reminder:', error);
      throw error;
    }
  };

  // Helper to delete reminder
  const deleteReminder = async (reminderId) => {
    if (!db || !userId) throw new Error('Missing db or userId');

    const docRef = doc(db, 'users', userId, 'standAloneReminders', 'allReminders');

    try {
      // 1. Fetch recipients, then remove from masterConfig.reminders
      const snap = await getDoc(docRef);
      const existingReminder = snap.exists() ? snap.data().reminders?.[reminderId] : null;
      if (existingReminder?.recipients?.length) {
        await deletePendingNotifications(reminderId, existingReminder.recipients);
      }

      // 2. Delete from collection
      await updateDoc(docRef, {
        [`reminders.${reminderId}`]: deleteField()
      });

      console.log('✅ Reminder deleted:', reminderId);
    } catch (error) {
      console.error('❌ Failed to delete reminder:', error);
      throw error;
    }
  };

  // Helper to toggle active status
  const toggleReminderActive = async (reminderId, isActive) => {
    if (!db || !userId) throw new Error('Missing db or userId');

    const docRef = doc(db, 'users', userId, 'standAloneReminders', 'allReminders');
    
    try {
      // 1. Get current reminder
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        throw new Error('Reminders document not found');
      }

      const data = snapshot.data();
      const reminder = data.reminders?.[reminderId];
      
      if (!reminder) {
        throw new Error(`Reminder ${reminderId} not found`);
      }

      // 2. Update the reminder
      const updatedReminder = {
        ...reminder,
        isActive,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(docRef, {
        [`reminders.${reminderId}`]: updatedReminder
      });

      // 3. Remove existing masterConfig reminders
      if (reminder.recipients?.length) {
        await deletePendingNotifications(reminderId, reminder.recipients);
      }

      // 4. Create new notifications if turning ON
      if (isActive) {
        await createPendingNotifications(updatedReminder);
      }

      console.log(`✅ Toggled reminder ${reminderId} to isActive=${isActive}`);
    } catch (error) {
      console.error('❌ Failed to toggle reminder:', error);
      throw error;
    }
  };

  return {
    reminders,
    loading,
    error,
    saveReminder,
    deleteReminder,
    toggleReminderActive,
  };
};