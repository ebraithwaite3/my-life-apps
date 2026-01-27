import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
  deleteField,
} from "firebase/firestore";
import { useAuth, useData } from "@my-apps/contexts";

/**
 * Generic hook to manage reminders for any activity type
 * Fetches once when mounted, no real-time updates
 */
export const useNotificationHandlers = (
  activityId,
  activityType = "checklist",
  eventId = null
) => {
  const { db } = useAuth();
  const { user } = useData();

  const [reminder, setReminder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationDocId, setNotificationDocId] = useState(null);

  // Build the query field based on activity type
  const getQueryField = () => {
    switch (activityType) {
      case "checklist":
        return "data.checklistId";
      case "workout":
        return "data.workoutId";
      case "golf":
        return "data.golfId";
      default:
        return `data.${activityType}Id`;
    }
  };

  // ✅ Fetch reminder ONCE when activity changes
  useEffect(() => {
    const fetchReminder = async () => {
      if (!activityId || !db || !user?.userId) {
        setLoading(false);
        return;
      }

      try {
        const notificationsRef = collection(db, "pendingNotifications");
        const queryField = getQueryField();

        const q = query(
          notificationsRef,
          where(queryField, "==", activityId),
          where("userId", "==", user?.userId)
        );

        const snapshot = await getDocs(q);

        console.log(`📥 Fetched reminder for ${activityType}:`, {
          found: !snapshot.empty,
          docCount: snapshot.docs.length,
        });

        if (!snapshot.empty) {
          const docData = snapshot.docs[0];
          const data = docData.data();

          // Normalize to our standard format
          const normalizedReminder = {
            scheduledFor: data.scheduledFor?.toDate().toISOString() || null,
            isRecurring: data.isRecurring || false,
            ...(data.recurringConfig && {
              recurringConfig: data.recurringConfig,
            }),
          };

          setReminder(normalizedReminder);
          setNotificationDocId(docData.id);
        } else {
          setReminder(null);
          setNotificationDocId(null);
        }
      } catch (error) {
        console.error("❌ Fetch Reminder Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminder();
  }, [activityId, activityType, db, user?.userId]);

  /**
   * Update existing reminder or create new one
   */
  const updateReminder = async (reminderData, activityName, eventStartTime = null) => {
    console.log('⏰ updateReminder called with:', { reminderData, activityName, eventStartTime });
    try {
      if (!reminderData) {
        if (notificationDocId) await deleteReminder();
        setReminder(null);
        setNotificationDocId(null);
        return { success: true };
      }
  
      const { isRecurring, recurringConfig } = reminderData;
      const scheduledTime = new Date(reminderData.scheduledFor);
  
      const activityData = {};
      activityData[`${activityType}Id`] = activityId;
  
      const notificationData = {
        userId: user?.userId,
        title: `Reminder: ${activityName}`,
        body: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} reminder`,
        eventId: eventId || activityId,
        notificationId: eventId 
          ? `${eventId}-${activityType}-${activityId}`
          : activityId,
        scheduledFor: Timestamp.fromDate(scheduledTime),
        createdAt: Timestamp.now(),
        data: {
          screen: eventId ? 'Calendar' : 'Pinned',
          eventId: eventId,
          ...activityData,
          app: `${activityType}-app`,
          ...(eventStartTime && { date: eventStartTime }),
        },
        isRecurring: isRecurring || false,
        // ✅ Only include recurringConfig if it exists
        ...(isRecurring && recurringConfig && { recurringConfig }),
      };
  
      // ✅ Try to update, but if doc doesn't exist, create new one
      if (notificationDocId) {
        try {
          // ✅ For updates, we need to explicitly delete recurringConfig if not recurring
          const updateData = {
            ...notificationData,
            // ✅ Only use deleteField when UPDATING and NOT recurring
            ...(!isRecurring && { recurringConfig: deleteField() }),
          };
          
          await updateDoc(doc(db, 'pendingNotifications', notificationDocId), updateData);
        } catch (error) {
          if (error.code === 'not-found') {
            console.log('📝 Document was deleted, creating new notification');
            // ✅ For new docs, just don't include recurringConfig if not recurring
            const docRef = await addDoc(collection(db, 'pendingNotifications'), notificationData);
            setNotificationDocId(docRef.id);
          } else {
            throw error;
          }
        }
      } else {
        // ✅ Creating new doc - just don't include recurringConfig if not recurring
        const docRef = await addDoc(collection(db, 'pendingNotifications'), notificationData);
        setNotificationDocId(docRef.id);
      }
  
      // ✅ Update local state immediately after save
      const normalizedReminder = {
        scheduledFor: scheduledTime.toISOString(),
        isRecurring: isRecurring || false,
        ...(recurringConfig && { recurringConfig }),
      };
      console.log('✅ Reminder updated locally:', normalizedReminder);
      setReminder(normalizedReminder);
  
      return { success: true };
    } catch (error) {
      console.error('❌ updateReminder Error:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Delete existing reminder
   */
  const deleteReminder = async () => {
    try {
      if (!notificationDocId) return { success: true };
      await deleteDoc(doc(db, "pendingNotifications", notificationDocId));
      // ✅ Update local state immediately
      setReminder(null);
      setNotificationDocId(null);
      return { success: true };
    } catch (error) {
      console.error("❌ deleteReminder Error:", error);
      return { success: false, error: error.message };
    }
  };

  return {
    reminder,
    loading,
    hasReminder: !!reminder,
    updateReminder,
    deleteReminder,
  };
};
