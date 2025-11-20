const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {google} = require("googleapis");

// Define the secrets
const googleClientId = defineSecret("GOOGLE_CLIENT_ID");
const googleClientSecret = defineSecret("GOOGLE_CLIENT_SECRET");
const googleRefreshToken = defineSecret("GOOGLE_REFRESH_TOKEN");

/**
 * Helper to strip timezone offset from ISO string
 * @param {string} isoString - ISO date string
 * @return {string} Date string without timezone
 */
function stripOffset(isoString) {
  return isoString.split(/[+-]Z/)[0];
}

exports.writeToCalendar = onRequest(
    {
      secrets: [googleClientId, googleClientSecret, googleRefreshToken],
    },
    async (req, res) => {
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
            googleClientId.value(),
            googleClientSecret.value(),
            "urn:ietf:wg:oauth:2.0:oob",
        );

        oauth2Client.setCredentials({
          refresh_token: googleRefreshToken.value(),
        });

        const calendar = google.calendar({version: "v3", auth: oauth2Client});

        // Build reminders object
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
            timeZone: "America/New_York",
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
    },
);

exports.updateCalendarEvent = onRequest(
    {
      secrets: [googleClientId, googleClientSecret, googleRefreshToken],
    },
    async (req, res) => {
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
            googleClientId.value(),
            googleClientSecret.value(),
            "urn:ietf:wg:oauth:2.0:oob",
        );

        oauth2Client.setCredentials({
          refresh_token: googleRefreshToken.value(),
        });

        const calendar = google.calendar({version: "v3", auth: oauth2Client});

        // Build update object
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
    },
);

exports.deleteCalendarEvent = onRequest(
    {
      secrets: [googleClientId, googleClientSecret, googleRefreshToken],
    },
    async (req, res) => {
      try {
        const {eventId} = req.body.data || req.body;

        if (!eventId) {
          throw new Error("Missing required parameter: eventId");
        }

        const oauth2Client = new google.auth.OAuth2(
            googleClientId.value(),
            googleClientSecret.value(),
            "urn:ietf:wg:oauth:2.0:oob",
        );

        oauth2Client.setCredentials({
          refresh_token: googleRefreshToken.value(),
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
    },
);
