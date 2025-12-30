import { DateTime } from "luxon";
import { deleteGoogleCalendarEvent } from "@my-apps/calendar-sync";
import { app } from "@my-apps/services";
import { getDocument, setDocument } from "@my-apps/services";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@my-apps/contexts";

export const useDeleteFromGoogleCalendar = () => {
  const { db } = useAuth();

  const deleteFromGoogleCalendar = async (eventId, calendarId) => {
    try {
      console.log("🗑️ DELETE EVENT - Firestore calendarId:", calendarId);
      console.log("🗑️ DELETE EVENT - eventId:", eventId);
      
      // Check if app instance exists
      if (!app) {
        console.error("❌ Firebase app instance not available");
        return { 
          success: false, 
          error: "Firebase app not initialized." 
        };
      }

      // Look up the calendar document to get the actual Google Calendar ID
      const calendarDoc = await getDoc(doc(db, 'calendars', calendarId));
      if (!calendarDoc.exists()) {
        return { success: false, error: "Calendar not found" };
      }
      
      const calendarData = calendarDoc.data();
      
      // Try NEW structure first (source.calendarId)
      let actualGoogleCalendarId = calendarData.source?.calendarId;
      
      // Fallback to OLD structure (extract from calendarAddress)
      if (!actualGoogleCalendarId && calendarData.source?.calendarAddress) {
        const match = calendarData.source.calendarAddress.match(/\/ical\/([^\/]+)\//);
        if (match) {
          actualGoogleCalendarId = decodeURIComponent(match[1]);
        }
      }
      
      if (!actualGoogleCalendarId) {
        return { success: false, error: "Could not determine Google Calendar ID" };
      }

      console.log("🗑️ Actual Google Calendar ID:", actualGoogleCalendarId);

      // Extract the base Google Calendar event ID (remove @google.com-timestamp)
      const baseEventId = eventId.split('@')[0];

      console.log("🗑️ Deleting from Google Calendar:", baseEventId);

      // Call the service to delete from Google Calendar
      const result = await deleteGoogleCalendarEvent(app, baseEventId, actualGoogleCalendarId);

      if (result.success) {
        console.log("✅ Deleted from Google Calendar:", baseEventId);

        // Now delete from Firestore month shard
        const timestamp = parseInt(eventId.split('-').pop());
        const eventDateTime = DateTime.fromMillis(timestamp);
        const monthKey = eventDateTime.toFormat("yyyy-MM");

        console.log("🗑️ Deleting from Firestore month shard:", monthKey, eventId);

        const monthPath = `calendars/${calendarId}/months`;
        const monthDoc = await getDocument(monthPath, monthKey);
        
        if (monthDoc && monthDoc.events) {
          const existingEvents = { ...monthDoc.events };
          delete existingEvents[eventId];
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