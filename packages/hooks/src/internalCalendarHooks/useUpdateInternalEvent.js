import { DateTime } from 'luxon';
import { useAuth } from '@my-apps/contexts';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const useUpdateInternalEvent = () => {
  const { user: authUser, db } = useAuth();

  const updateInternalEvent = async ({
    eventId,
    startTime,
    summary,
    description,
    start,
    end,
    activities,
    reminderMinutes,
  }) => {
    if (!authUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      const eventDateTime = DateTime.fromISO(startTime);
      const monthKey = eventDateTime.toFormat("yyyy-LL");
      
      console.log("📝 Updating internal event:", monthKey, eventId);

      const monthRef = doc(db, 'activities', authUser.uid, 'months', monthKey);
      const monthDoc = await getDoc(monthRef);
      
      if (!monthDoc.exists() || !monthDoc.data().items) {
        return { success: false, error: 'Event not found' };
      }

      const existingItems = { ...monthDoc.data().items };
      
      if (!existingItems[eventId]) {
        return { success: false, error: 'Event not found' };
      }

      // Update event with new data
      existingItems[eventId] = {
        ...existingItems[eventId],
        title: summary,
        description: description || '',
        startTime: start.dateTime || start.date,
        endTime: end.dateTime || end.date,
        isAllDay: !!start.date,
        activities: activities || [],
        reminderMinutes: reminderMinutes || null,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(monthRef, { items: existingItems }, { merge: true });

      console.log('✅ Internal event updated:', eventId);
      return { success: true, eventId };
      
    } catch (error) {
      console.error('❌ Error updating internal event:', error);
      return { success: false, error: error.message };
    }
  };

  return updateInternalEvent;
};