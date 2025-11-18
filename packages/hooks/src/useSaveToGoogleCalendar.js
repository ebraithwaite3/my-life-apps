import { DateTime } from "luxon";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { writeToGoogleCalendar } from "@my-apps/calendar-sync";
import { app } from "@my-apps/services";

export const useSaveToGoogleCalendar = () => {

  const saveToGoogleCalendar = async (eventData, calendarId, db, reminderMinutes = null, activities) => {
    console.log("DB APP NAME:", db?.app?.name);
    try {
      // Check if app instance exists
      if (!app) {
        console.error("❌ Firebase app instance not available from useAuth()");
        return { 
          success: false, 
          error: "Firebase app not initialized. Please ensure 'app' is exported from AuthContext." 
        };
      }

      const { summary, description, location, start, end } = eventData;

      // Extract ISO strings from the start/end objects
      const startTime = start.dateTime || start.date;
      const endTime = end?.dateTime || end?.date;

      const payload = {
        title: summary || "",
        description: description || "",
        location: location || "",
        startTime: startTime,
        endTime: endTime,
        reminderMinutes: reminderMinutes,
      };

      console.log("📤 Sending to Google Calendar:", payload);

      // Call the service
      const result = await writeToGoogleCalendar(app, payload);

      if (result.success) {
        console.log("✅ Saved to Google Calendar:", result.eventId);

        // Now save to Firestore month document's events MAP FIELD
        const startDateTime = DateTime.fromISO(startTime);
        const monthKey = startDateTime.toFormat("yyyy-MM");
        
        // Get timestamp from start time for unique event ID
        const timestamp = startDateTime.toMillis();
        const fullEventId = `${result.eventId}@google.com-${timestamp}`;

        const eventDoc = {
          calendarId: calendarId,
          title: summary || "",
          description: description || "",
          location: location || "",
          startTime: startTime,
          endTime: endTime,
          source: "google",
          isAllDay: !start.dateTime,
          isRecurring: false,
          activities: activities || [],
        };

        // Get the month document reference
        const monthRef = doc(db, "calendars", calendarId, "months", monthKey);
        
        // Get existing events map
        const monthDoc = await getDoc(monthRef);
        const existingEvents = monthDoc.exists() ? (monthDoc.data().events || {}) : {};
        
        // Add new event to the map
        existingEvents[fullEventId] = eventDoc;
        
        // Write back with merge
        await setDoc(monthRef, { events: existingEvents }, { merge: true });
        
        console.log("✅ Saved to Firestore month events map:", monthKey, fullEventId);

        return { success: true, eventId: fullEventId };
      } else {
        console.error("❌ Google Calendar API error:", result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("❌ Error calling Google Calendar service:", error);
      return { success: false, error: error.message };
    }
  };

  return saveToGoogleCalendar;
};