import { DateTime } from "luxon";
import { deleteGoogleCalendarEvent } from "@my-apps/calendar-sync";
import { app } from "@my-apps/services";
import { getDocument, setDocument } from "@my-apps/services";

export const useDeleteFromGoogleCalendar = () => {

  const deleteFromGoogleCalendar = async (eventId, calendarId) => {
    try {
      // Check if app instance exists
      if (!app) {
        console.error("❌ Firebase app instance not available");
        return { 
          success: false, 
          error: "Firebase app not initialized." 
        };
      }

      // Extract the base Google Calendar event ID (remove @google.com-timestamp)
      const baseEventId = eventId.split('@')[0];

      console.log("🗑️ Deleting from Google Calendar:", baseEventId);

      // Call the service to delete from Google Calendar
      const result = await deleteGoogleCalendarEvent(app, baseEventId);

      if (result.success) {
        console.log("✅ Deleted from Google Calendar:", baseEventId);

        // Now delete from Firestore month shard
        // Extract timestamp to determine which month shard
        const timestamp = parseInt(eventId.split('-').pop());
        const eventDateTime = DateTime.fromMillis(timestamp);
        const monthKey = eventDateTime.toFormat("yyyy-MM");

        console.log("🗑️ Deleting from Firestore month shard:", monthKey, eventId);

        // Get the month document using the service
        const monthPath = `calendars/${calendarId}/months`;
        const monthDoc = await getDocument(monthPath, monthKey);
        
        if (monthDoc && monthDoc.events) {
          const existingEvents = { ...monthDoc.events };
          
          // Delete the event from the map
          delete existingEvents[eventId];
          
          // Write back using the service
          await setDocument(monthPath, monthKey, { ...monthDoc, events: existingEvents });
          
          console.log("✅ Deleted from Firestore month shard:", monthKey, eventId);
        } else {
          console.warn("⚠️ Month document not found or has no events");
        }

        return { success: true };
      } else {
        console.error("❌ Google Calendar delete error:", result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("❌ Error deleting event:", error);
      return { success: false, error: error.message };
    }
  };

  return deleteFromGoogleCalendar;
};