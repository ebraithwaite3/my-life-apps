// hooks/useUpdateInternalActivities.js
import { DateTime } from 'luxon';
import { useAuth } from '@my-apps/contexts';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const useUpdateInternalActivities = () => {
  const { user: authUser, db } = useAuth();

  const updateInternalActivities = async (eventId, startTime, activities, groupId = null, targetUserId = null) => {
    if (!authUser?.uid) {
      console.error('No authUser ID available');
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const eventDateTime = DateTime.fromISO(startTime);
      const monthKey = eventDateTime.toFormat("yyyy-LL");

      console.log("📝 Updating internal event activities:", monthKey, eventId, groupId ? `(Group: ${groupId})` : targetUserId ? `(Target user: ${targetUserId})` : '(User)');

      let monthRef;

      if (groupId) {
        // GROUP PATH: activities/{groupId}/months/{monthKey}
        monthRef = doc(db, 'activities', groupId, 'months', monthKey);
      } else if (targetUserId) {
        // TARGET USER PATH: activities/{targetUserId}/months/{monthKey} (e.g. admin editing a kid's list)
        monthRef = doc(db, 'activities', targetUserId, 'months', monthKey);
      } else {
        // USER PATH: activities/{userId}/months/{monthKey}
        monthRef = doc(db, 'activities', authUser.uid, 'months', monthKey);
      }
      
      console.log("📂 Path:", monthRef.path);
      
      const monthDoc = await getDoc(monthRef);
      
      if (!monthDoc.exists() || !monthDoc.data().items) {
        console.error('Month document not found or has no items:', monthKey);
        return { success: false, error: 'Month document not found' };
      }

      const existingItems = { ...monthDoc.data().items };
      
      if (!existingItems[eventId]) {
        console.error('Event not found in items map:', eventId);
        console.log('Available event IDs:', Object.keys(existingItems));
        return { success: false, error: 'Event not found' };
      }

      existingItems[eventId] = {
        ...existingItems[eventId],
        activities: activities || []
      };

      await setDoc(monthRef, { items: existingItems }, { merge: true });

      console.log('✅ Internal event activities updated:', eventId, groupId ? '(Group)' : '(User)');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error updating internal event activities:', error);
      return { success: false, error: error.message };
    }
  };

  return updateInternalActivities;
};