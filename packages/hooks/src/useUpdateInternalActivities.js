// hooks/useUpdateInternalActivities.js
import { DateTime } from 'luxon';
import { useAuth } from '@my-apps/contexts';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const useUpdateInternalActivities = () => {
  const { user: authUser, db } = useAuth();

  const updateInternalActivities = async (eventId, startTime, activities) => {
    if (!authUser?.uid) {
      console.error('No authUser ID available');
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      // Get the month key from the start time
      const eventDateTime = DateTime.fromISO(startTime);
      const monthKey = eventDateTime.toFormat("yyyy-LL");
      
      console.log("📝 Updating internal event activities:", monthKey, eventId);

      // Build path to activities month document
      const monthRef = doc(db, 'activities', authUser.uid, 'months', monthKey);
      const monthDoc = await getDoc(monthRef);
      
      if (!monthDoc.exists() || !monthDoc.data().items) {
        console.error('Month document not found or has no items:', monthKey);
        return { success: false, error: 'Month document not found' };
      }

      // Get the items map (not events!)
      const existingItems = { ...monthDoc.data().items };
      
      // Check if the event exists in the map
      if (!existingItems[eventId]) {
        console.error('Event not found in items map:', eventId);
        return { success: false, error: 'Event not found' };
      }

      // Update the event with new activities
      existingItems[eventId] = {
        ...existingItems[eventId],
        activities: activities || []
      };

      // Write back with merge
      await setDoc(monthRef, { items: existingItems }, { merge: true });

      console.log('✅ Internal event activities updated:', eventId);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error updating internal event activities:', error);
      return { success: false, error: error.message };
    }
  };

  return updateInternalActivities;
};