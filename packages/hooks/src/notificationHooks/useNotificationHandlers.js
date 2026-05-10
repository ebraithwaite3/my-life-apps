import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { useAuth, useData } from "@my-apps/contexts";

/**
 * Generic hook to manage reminders for any activity type.
 * Reads/writes to masterConfig/{targetUserId || loggedInUserId}.reminders[].
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

  // Fetch reminder once when activity changes — reads from masterConfig.reminders
  useEffect(() => {
    const fetchReminder = async () => {
      if (!activityId || !db || !resolvedUserId) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "masterConfig", resolvedUserId));
        const reminders = snap.exists() ? (snap.data().reminders || []) : [];
        const dataKey = getDataKey();
        const match = reminders.find(
          (r) => r.notification?.data?.[dataKey] === activityId
        );

        console.log(`📥 Fetched reminder for ${activityType} (user: ${resolvedUserId}):`, {
          found: !!match,
          id: match?.id || null,
        });

        if (match) {
          const isRec = match.reminderType === "persistent" || !!match.recurringIntervalMinutes;
          setReminder({
            scheduledFor: match.scheduledTime || null,
            isRecurring: isRec,
            ...(isRec && match.recurringIntervalMinutes && {
              recurringConfig: { intervalMinutes: match.recurringIntervalMinutes },
            }),
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
      const activityLabel = activityType.charAt(0).toUpperCase() + activityType.slice(1);

      const notifId = eventId
        ? `${eventId}-${activityType}-${activityId}`
        : activityId;

      const intervalMinutes = isRecurring
        ? (recurringConfig?.intervalMinutes
           || (recurringConfig?.intervalSeconds
             ? Math.round(recurringConfig.intervalSeconds / 60)
             : null))
        : null;

      const newReminder = {
        id: notifId,
        deliveryMode: "push",
        title: `Reminder: ${activityName}`,
        message: `${activityLabel} reminder`,
        eventId: eventId || activityId,
        scheduledTime: scheduledTime.toISOString(),
        acknowledgedAt: null,
        notification: {
          title: `Reminder: ${activityName}`,
          body: `${activityLabel} reminder`,
          screen: eventId ? 'Calendar' : 'Pinned',
          handlerName: null,
          handlerParams: null,
          data: {
            screen: eventId ? 'Calendar' : 'Pinned',
            eventId,
            [dataKey]: activityId,
            app: `${activityType}-app`,
            ...(eventStartTime && { date: eventStartTime }),
          },
        },
        paused: false,
        pausedUntil: null,
        reminderType: isRecurring ? "persistent" : "oneTime",
        recurringIntervalMinutes: intervalMinutes,
        recurringIntervalDays: null,
        recurringSchedule: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletable: true,
      };

      const configRef = doc(db, "masterConfig", resolvedUserId);
      const snap = await getDoc(configRef);
      const existing = snap.exists() ? (snap.data().reminders || []) : [];
      const updated = existing.some((r) => r.id === notifId)
        ? existing.map((r) => r.id === notifId ? newReminder : r)
        : [...existing, newReminder];

      await setDoc(configRef, { reminders: updated }, { merge: true });
      setNotificationDocId(notifId);

      const normalizedReminder = {
        scheduledFor: scheduledTime.toISOString(),
        isRecurring: isRecurring || false,
        ...(isRecurring && intervalMinutes && {
          recurringConfig: { intervalMinutes },
        }),
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
        const existing = snap.data().reminders || [];
        const filtered = existing.filter((r) => r.id !== notificationDocId);
        await setDoc(configRef, { reminders: filtered }, { merge: true });
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
