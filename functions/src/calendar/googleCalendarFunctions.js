const {onRequest} = require("firebase-functions/v2/https");
const {google} = require("googleapis");
require("dotenv").config();

/**
 * Helper to strip timezone offset from ISO string
 * @param {string} isoString - ISO date string
 * @return {string} Date string without timezone
 */
function stripOffset(isoString) {
  return isoString.split(/[+-]Z/)[0];
}

exports.writeToCalendar = onRequest(async (req, res) => {
  try {
    const {
      title,
      startTime,
      endTime,
      description,
      location,
      reminderMinutes,
    } = req.body.data || req.body;

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        "urn:ietf:wg:oauth:2.0:oob",
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const calendar = google.calendar({version: "v3", auth: oauth2Client});

    // Build reminders object
    // Default: no reminders
    // If reminderMinutes is provided, set a popup reminder
    const reminders = reminderMinutes ?
      {
        useDefault: false,
        overrides: [
          {method: "popup", minutes: reminderMinutes},
        ],
      } :
      {
        useDefault: false,
        overrides: [],
      };

    const event = {
      summary: title,
      description: description,
      location: location,
      start: {
        dateTime: stripOffset(startTime),
        timeZone: "America/New_York", // adjust to your timezone
      },
      end: {
        dateTime: stripOffset(endTime),
        timeZone: "America/New_York",
      },
      reminders: reminders,
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    res.json({
      data: {
        success: true,
        eventId: response.data.id,
        created: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating calendar event:", error);
    res.status(500).json({
      data: {
        success: false,
        error: error.message,
      },
    });
  }
});

exports.updateCalendarEvent = onRequest(async (req, res) => {
  try {
    const {
      eventId,
      title,
      description,
      startTime,
      endTime,
      location,
      reminderMinutes,
    } = req.body.data || req.body;

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        "urn:ietf:wg:oauth:2.0:oob",
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const calendar = google.calendar({version: "v3", auth: oauth2Client});

    // Build update object - only include fields that are provided
    const event = {};
    if (title) event.summary = title;
    if (description) event.description = description;
    if (location) event.location = location;
    if (startTime) {
      event.start = {
        dateTime: stripOffset(startTime),
        timeZone: "America/New_York",
      };
    }
    if (endTime) {
      event.end = {
        dateTime: stripOffset(endTime),
        timeZone: "America/New_York",
      };
    }

    // Handle reminders if provided
    if (reminderMinutes !== undefined) {
      event.reminders = reminderMinutes ?
        {
          useDefault: false,
          overrides: [
            {method: "popup", minutes: reminderMinutes},
          ],
        } :
        {
          useDefault: false,
          overrides: [],
        };
    }

    const response = await calendar.events.patch({
      calendarId: "primary",
      eventId: eventId,
      requestBody: event,
    });

    res.json({
      data: {
        success: true,
        eventId: response.data.id,
        updated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating calendar event:", error);
    res.status(500).json({
      data: {
        success: false,
        error: error.message,
      },
    });
  }
});

exports.deleteCalendarEvent = onRequest(async (req, res) => {
  try {
    const {eventId} = req.body.data || req.body;

    if (!eventId) {
      throw new Error("Missing required parameter: eventId");
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        "urn:ietf:wg:oauth:2.0:oob",
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const calendar = google.calendar({version: "v3", auth: oauth2Client});

    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
    });

    res.json({
      data: {
        success: true,
        eventId,
        deleted: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    res.status(500).json({
      data: {
        success: false,
        error: error.message,
      },
    });
  }
});
