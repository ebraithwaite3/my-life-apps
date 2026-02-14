import { useEffect, useState } from 'react';
import { 
  doc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  deleteField, 
  setDoc, 
  collection, 
  addDoc,
  query,
  where,
  getDocs,
  writeBatch
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

  // Helper to delete all pendingNotifications for a reminder
  const deletePendingNotifications = async (reminderId) => {
    if (!db) throw new Error('Missing db');

    console.log('🗑️ Deleting pendingNotifications for reminder:', reminderId);

    const notificationsRef = collection(db, 'pendingNotifications');
    const q = query(notificationsRef, where('standAloneReminderId', '==', reminderId));
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('📭 No notifications found for reminder:', reminderId);
      return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ Deleted ${snapshot.size} notifications for reminder:`, reminderId);
  };

  // Helper to create pendingNotifications for a reminder
  const createPendingNotifications = async (reminder) => {
    if (!db) throw new Error('Missing db');

    console.log('📤 Creating pendingNotifications for reminder:', reminder.id);

    const { recipients, schedule, title, message, data, id: reminderId } = reminder;
    const scheduledFor = new Date(schedule.scheduledFor);

    const promises = recipients.map(async (recipientId) => {
      const notificationData = {
        userId: recipientId,
        title,
        body: message,
        scheduledFor,
        createdAt: new Date(),
        standAloneReminderId: reminderId, // ← Link to reminder
        type: 'standalone_reminder',
        data: {
          screen: data.screen,
          app: data.app,
        },
      };

      // If recurring, add recurring config
      if (schedule.isRecurring) {
        notificationData.isRecurring = true;
        notificationData.recurringConfig = schedule.recurringConfig;
      }

      const notificationsRef = collection(db, 'pendingNotifications');
      await addDoc(notificationsRef, notificationData);
      console.log('✅ Created notification for recipient:', recipientId);
    });

    await Promise.all(promises);
    console.log(`✅ Created ${recipients.length} notifications for reminder:`, reminderId);
  };

  // Helper to create/update reminder
  const saveReminder = async (reminder) => {
    if (!db || !userId) throw new Error('Missing db or userId');

    const docRef = doc(db, 'users', userId, 'standAloneReminders', 'allReminders');
    
    try {
      // 1. Delete old notifications (if editing existing reminder)
      if (reminder.id) {
        await deletePendingNotifications(reminder.id);
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
      // 1. Delete all pendingNotifications
      await deletePendingNotifications(reminderId);

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

      // 3. Delete existing notifications
      await deletePendingNotifications(reminderId);

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