import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  arrayUnion,
} from "firebase/firestore";
import { useAuth, useData } from "@my-apps/contexts";

/**
 * Generic hook to manage reminders for any activity type.
 * Reads/writes to masterConfig/{targetUserId || loggedInUserId}.notifications.
 * Pass targetUserId when managing reminders on behalf of another user (e.g. admin setting Jack's reminder).
 */
export const useNotificationHandlers = (
  activityId,
  activityType = "checklist",
  eventId = null,
  targetUserId = null
) => {
  const { db } = useAuth();
  const { user } = useData();

  const [reminder, setReminder] = useState(null);
  const [loading, setLoading] = useState(true);
  // Stores the notification's id field (not a Firestore doc ID)
  const [notificationDocId, setNotificationDocId] = useState(null);

  const getDataKey = () => {
    switch (activityType) {
      case "checklist": return "checklistId";
      case "workout":   return "workoutId";
      case "golf":      return "golfId";
      default:          return `${activityType}Id`;
    }
  };

  const resolvedUserId = targetUserId || user?.userId;

  // Fetch reminder once when activity changes — reads from masterConfig.notifications
  useEffect(() => {
    const fetchReminder = async () => {
      if (!activityId || !db || !resolvedUserId) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "masterConfig", resolvedUserId));
        const notifications = snap.exists() ? (snap.data().notifications || []) : [];
        const dataKey = getDataKey();
        const match = notifications.find((n) => n.data?.[dataKey] === activityId);

        console.log(`📥 Fetched reminder for ${activityType} (user: ${resolvedUserId}):`, {
          found: !!match,
          id: match?.id || null,
        });

        if (match) {
          setReminder({
            scheduledFor: match.scheduledTime || null,
            isRecurring: match.isRecurring || false,
            ...(match.recurringConfig && { recurringConfig: match.recurringConfig }),
          });
          setNotificationDocId(match.id);
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
  }, [activityId, activityType, db, resolvedUserId]);

  /**
   * Update existing reminder or create new one
   */
  const updateReminder = async (reminderData, activityName, eventStartTime = null) => {
    console.log('⏰ updateReminder called with:', { reminderData, activityName, eventStartTime, resolvedUserId });
    try {
      if (!reminderData) {
        if (notificationDocId) await deleteReminder();
        setReminder(null);
        setNotificationDocId(null);
        return { success: true };
      }

      const { isRecurring, recurringConfig } = reminderData;
      const scheduledTime = new Date(reminderData.scheduledFor);
      const dataKey = getDataKey();

      const notifId = eventId
        ? `${eventId}-${activityType}-${activityId}`
        : activityId;

      const notificationData = {
        id: notifId,
        userId: resolvedUserId,
        title: `Reminder: ${activityName}`,
        body: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} reminder`,
        eventId: eventId || activityId,
        scheduledTime: scheduledTime.toISOString(),
        createdAt: new Date().toISOString(),
        data: {
          screen: eventId ? 'Calendar' : 'Pinned',
          eventId,
          [dataKey]: activityId,
          app: `${activityType}-app`,
          ...(eventStartTime && { date: eventStartTime }),
        },
        isRecurring: isRecurring || false,
        ...(isRecurring && recurringConfig && { recurringConfig }),
      };

      const configRef = doc(db, "masterConfig", resolvedUserId);

      if (notificationDocId) {
        // Update: read-modify-write to replace the existing notification
        const snap = await getDoc(configRef);
        const existing = snap.exists() ? (snap.data().notifications || []) : [];
        const updated = existing.map((n) => n.id === notificationDocId ? notificationData : n);
        // Edge case: was deleted externally — append instead
        if (!updated.some((n) => n.id === notifId)) {
          updated.push(notificationData);
        }
        await setDoc(configRef, { notifications: updated }, { merge: true });
      } else {
        await setDoc(configRef, { notifications: arrayUnion(notificationData) }, { merge: true });
      }

      setNotificationDocId(notifId);

      const normalizedReminder = {
        scheduledFor: scheduledTime.toISOString(),
        isRecurring: isRecurring || false,
        ...(recurringConfig && { recurringConfig }),
      };
      console.log('✅ Reminder updated in masterConfig:', resolvedUserId);
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
      const configRef = doc(db, "masterConfig", resolvedUserId);
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        const existing = snap.data().notifications || [];
        const filtered = existing.filter((n) => n.id !== notificationDocId);
        await setDoc(configRef, { notifications: filtered }, { merge: true });
      }
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
