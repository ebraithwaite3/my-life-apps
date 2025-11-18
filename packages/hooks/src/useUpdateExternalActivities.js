// hooks/useUpdateExternalActivities.js
import { DateTime } from 'luxon';
import { getDocument, setDocument } from '@my-apps/services';
import { useAuth } from '@my-apps/contexts';

export const useUpdateExternalActivities = () => {
  const { user: authUser } = useAuth();

  const updateExternalActivities = async (eventId, calendarId, startTime, activities) => {
    if (!authUser?.uid) {
      console.error('No authUser ID available');
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      // Get the month key from the start time
      const eventDateTime = DateTime.fromISO(startTime);
      const monthKey = eventDateTime.toFormat("yyyy-MM");
      
      console.log("📝 Updating external event activities:", monthKey, eventId, calendarId);

      // Get the month document using the service
      const monthPath = `calendars/${calendarId}/months`;
      const monthDoc = await getDocument(monthPath, monthKey);
      
      if (!monthDoc || !monthDoc.events) {
        console.error('Month document not found or has no events:', monthKey);
        return { success: false, error: 'Month document not found' };
      }

      // Get the events map
      const existingEvents = { ...monthDoc.events };
      
      // Check if the event exists in the map
      if (!existingEvents[eventId]) {
        console.error('Event not found in events map:', eventId);
        return { success: false, error: 'Event not found' };
      }

      // Update the event with new activities
      existingEvents[eventId] = {
        ...existingEvents[eventId],
        activities: activities || []
      };

      // Write back using the service
      await setDocument(monthPath, monthKey, { ...monthDoc, events: existingEvents });

      console.log('✅ External event activities updated:', eventId);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error updating external event activities:', error);
      return { success: false, error: error.message };
    }
  };

  return updateExternalActivities;
};