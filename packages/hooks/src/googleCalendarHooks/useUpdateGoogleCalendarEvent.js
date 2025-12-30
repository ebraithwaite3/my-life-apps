import { DateTime } from 'luxon';
import { useAuth } from '@my-apps/contexts';
import { updateGoogleCalendarEvent as updateGoogleCalendarAPI } from '@my-apps/calendar-sync';
import { getDocument, setDocument } from '@my-apps/services';

export const useUpdateGoogleCalendarEvent = () => {
  const { user: authUser, db } = useAuth();

  const updateGoogleCalendarEvent = async (eventId, calendarId, eventData, activities, originalStartTime) => {
    if (!authUser?.uid) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('📝 Updating Google Calendar event:', eventId);

      // Get app instance from db (same as useSaveToGoogleCalendar)
      const app = db?.app; // ← Use this pattern from your working hook
      
      if (!app) {
        console.error("❌ Firebase app instance not available");
        return { success: false, error: "Firebase app not initialized" };
      }

      // Extract base Google event ID (remove timestamp suffix)
      const googleEventId = eventId.split('@google.com-')[0];

      // 1. Update in Google Calendar via API
      const apiResult = await updateGoogleCalendarAPI(app, googleEventId, calendarId, {
        title: eventData.summary,
        description: eventData.description,
        startTime: eventData.start.dateTime || eventData.start.date,
        endTime: eventData.end.dateTime || eventData.end.date,
        location: eventData.location || '',
      });

      if (!apiResult.success) {
        console.error('Failed to update Google Calendar:', apiResult.error);
        return { success: false, error: apiResult.error };
      }

      // 2. Update in Firestore calendar shard
      const eventDateTime = DateTime.fromISO(originalStartTime);
      const monthKey = eventDateTime.toFormat("yyyy-MM");
      
      console.log("📝 Updating Firestore shard:", monthKey, eventId);

      const monthPath = `calendars/${calendarId}/months`;
      const monthDoc = await getDocument(monthPath, monthKey);
      
      if (!monthDoc || !monthDoc.events) {
        return { success: false, error: 'Month document not found' };
      }

      const existingEvents = { ...monthDoc.events };
      
      if (!existingEvents[eventId]) {
        return { success: false, error: 'Event not found in shard' };
      }

      // Update event in Firestore
      existingEvents[eventId] = {
        ...existingEvents[eventId],
        title: eventData.summary,
        description: eventData.description || '',
        startTime: eventData.start.dateTime || eventData.start.date,
        endTime: eventData.end.dateTime || eventData.end.date,
        isAllDay: !!eventData.start.date,
        activities: activities || [],
        updatedAt: new Date().toISOString(),
      };

      await setDocument(monthPath, monthKey, { ...monthDoc, events: existingEvents });

      console.log('✅ Google Calendar event updated:', eventId);
      return { success: true, eventId };
      
    } catch (error) {
      console.error('❌ Error updating Google Calendar event:', error);
      return { success: false, error: error.message };
    }
  };

  return updateGoogleCalendarEvent;
};