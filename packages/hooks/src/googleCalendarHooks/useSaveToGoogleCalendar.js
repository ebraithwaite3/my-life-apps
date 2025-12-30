import { DateTime } from "luxon";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { writeToGoogleCalendar } from "@my-apps/calendar-sync";

export const useSaveToGoogleCalendar = () => {
  const saveToGoogleCalendar = async (
    eventData,
    calendarId,
    db,
    activities
  ) => {
    console.log("🔥 START saveToGoogleCalendar");
    console.log("DB APP NAME:", db?.app?.name);
    console.log("calendarId:", calendarId);
    console.log("eventData:", eventData);

    try {
      console.log("🔥 Inside try block");

      // Get app instance from db
      const app = db?.app;
      console.log("🔥 Got app:", !!app);

      if (!app) {
        console.error("❌ Firebase app instance not available");
        return {
          success: false,
          error: "Firebase app not initialized",
        };
      }

      console.log("🔥 About to fetch calendar doc");

      // Look up the actual Google Calendar ID
      const calendarDoc = await getDoc(doc(db, "calendars", calendarId));
      console.log("🔥 Got calendar doc:", calendarDoc.exists());

      if (!calendarDoc.exists()) {
        console.log("❌ Calendar not found");
        return { success: false, error: "Calendar not found" };
      }

      const calendarData = calendarDoc.data();
      console.log("🔥 Calendar data:", JSON.stringify(calendarData));

      // Try NEW structure first (source.calendarId)
      let actualGoogleCalendarId = calendarData.source?.calendarId;
      console.log("🔥 New structure ID:", actualGoogleCalendarId);

      // Fallback to OLD structure (extract from calendarAddress)
      if (!actualGoogleCalendarId && calendarData.source?.calendarAddress) {
        // ← Fixed!
        console.log(
          "🔥 Trying old structure, calendarAddress:",
          calendarData.source.calendarAddress
        );
        const match =
          calendarData.source.calendarAddress.match(/\/ical\/([^\/]+)\//);
        if (match) {
          actualGoogleCalendarId = decodeURIComponent(match[1]);
          console.log("🔥 Extracted ID:", actualGoogleCalendarId);
        }
      }

      if (!actualGoogleCalendarId) {
        console.error("❌ Could not determine Google Calendar ID");
        return {
          success: false,
          error: "Could not determine Google Calendar ID",
        };
      }

      console.log("📍 Firestore calendarId:", calendarId);
      console.log("📍 Actual Google Calendar ID:", actualGoogleCalendarId);

      const { summary, description, location, start, end } = eventData;

      const startTime = start.dateTime || start.date;
      const endTime = end?.dateTime || end?.date;

      const payload = {
        title: summary || "",
        description: description || "",
        location: location || "",
        startTime: startTime,
        endTime: endTime,
        calendarId: actualGoogleCalendarId,
      };

      console.log("📤 Sending to Google Calendar:", payload);

      const result = await writeToGoogleCalendar(app, payload);
      console.log("🔥 writeToGoogleCalendar result:", result);

      if (result.success) {
        console.log("✅ Saved to Google Calendar:", result.eventId);

        const startDateTime = DateTime.fromISO(startTime);
        const monthKey = startDateTime.toFormat("yyyy-MM");

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

        const monthRef = doc(db, "calendars", calendarId, "months", monthKey);
        const monthDoc = await getDoc(monthRef);
        const existingEvents = monthDoc.exists()
          ? monthDoc.data().events || {}
          : {};

        existingEvents[fullEventId] = eventDoc;

        await setDoc(monthRef, { events: existingEvents }, { merge: true });

        console.log(
          "✅ Saved to Firestore month events map:",
          monthKey,
          fullEventId
        );

        return { success: true, eventId: fullEventId };
      } else {
        console.error("❌ Google Calendar API error:", result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("❌ CAUGHT ERROR:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);
      return { success: false, error: error.message };
    }
  };

  return saveToGoogleCalendar;
};
