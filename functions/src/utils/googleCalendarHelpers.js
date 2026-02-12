const { google } = require("googleapis");
const { defineSecret } = require("firebase-functions/params");

// Define the secrets (same ones writeToCalendar uses)
const googleClientId = defineSecret("GOOGLE_CLIENT_ID");
const googleClientSecret = defineSecret("GOOGLE_CLIENT_SECRET");
const googleRefreshToken = defineSecret("GOOGLE_REFRESH_TOKEN");

/**
 * Helper to strip timezone offset from ISO string
 */
function stripOffset(isoString) {
  return isoString.split(/[+-]Z/)[0];
}

/**
 * Get authenticated Google Calendar client
 */
function getCalendarClient() {
  const oauth2Client = new google.auth.OAuth2(
    googleClientId.value(),
    googleClientSecret.value(),
    "urn:ietf:wg:oauth:2.0:oob",
  );

  oauth2Client.setCredentials({
    refresh_token: googleRefreshToken.value(),
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

/**
 * Create Google Calendar event (shared logic)
 */
async function createCalendarEvent({
  title,
  startTime,
  endTime,
  description = '',
  location = '',
  calendarId = 'primary',
}) {
  const calendar = getCalendarClient();

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
    reminders: {
      useDefault: false,
      overrides: [],
    },
  };

  const response = await calendar.events.insert({
    calendarId: calendarId,
    requestBody: event,
  });

  return response.data.id;
}

module.exports = {
  createCalendarEvent,
  stripOffset,
  getCalendarClient,
  googleClientId,
  googleClientSecret,
  googleRefreshToken,
};
