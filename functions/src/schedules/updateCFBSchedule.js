const {onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const {google} = require("googleapis");

// Import your helper functions
const {processCFBScheduleFromJSON} =
  require("./scrapers/sportsReferenceScraper");
const {transformScheduleToCalendarEvents} =
  require("./utils/scheduleTransform");

// Define the secrets
const googleClientId = defineSecret("GOOGLE_CLIENT_ID");
const googleClientSecret = defineSecret("GOOGLE_CLIENT_SECRET");
const googleRefreshToken = defineSecret("GOOGLE_REFRESH_TOKEN");

/**
 * Update EPL schedule from uploaded JSON data
 */
exports.updateCFBSchedule = onCall(
    {
      secrets: [googleClientId, googleClientSecret, googleRefreshToken],
    },
    async (request) => {
      const db = admin.firestore();
      const data = request.data;

      try {
        console.log("CFB schedule upload triggered");

        // Try different ways to access the data
        let jsonData = null;
        if (data && data.jsonData) {
          jsonData = data.jsonData;
        } else if (data && data.data && data.data.jsonData) {
          jsonData = data.data.jsonData;
        } else {
          jsonData = data;
        }

        console.log("jsonData exists?", !!jsonData);
        console.log("jsonData type:", typeof jsonData);
        console.log("jsonData is array?", Array.isArray(jsonData));

        if (jsonData && Array.isArray(jsonData)) {
          console.log("Array length:", jsonData.length);
          console.log("First item:", jsonData[0]);
        }

        if (!jsonData || !Array.isArray(jsonData)) {
          console.error("Invalid jsonData - not an array");
          throw new Error("jsonData must be an array");
        }

        // Get EPL config from Firestore
        const configDoc = await db.doc("admin/scheduleConfig").get();
        if (!configDoc.exists) {
          throw new Error("Schedule config not found");
        }

        const config = configDoc.data();
        const cfbConfig = config.cfb;

        if (!cfbConfig) {
          throw new Error("CFB config not found in scheduleConfig");
        }

        // Process the JSON data
        const scheduleData = await processCFBScheduleFromJSON(
            jsonData,
            cfbConfig.team,
            cfbConfig.season,
        );

        // Transform to calendar events
        const calendarEvents = transformScheduleToCalendarEvents(
            scheduleData,
            cfbConfig.calendarId,
            "CFB",
            cfbConfig.season,
            {gameDuration: 3},
        );

        console.log(`Transformed ${calendarEvents.length} events`);

        // Now update Google Calendar
        const oauth2Client = new google.auth.OAuth2(
            googleClientId.value(),
            googleClientSecret.value(),
            "urn:ietf:wg:oauth:2.0:oob",
        );

        oauth2Client.setCredentials({
          refresh_token: googleRefreshToken.value(),
        });

        const calendar = google.calendar({version: "v3", auth: oauth2Client});

        // Load mapping
        const mappingDocId = `cfb-${cfbConfig.team}-${cfbConfig.season}`;
        const mappingRef = db.collection("schedules").doc(mappingDocId);
        const mappingDoc = await mappingRef.get();

        const mapping = mappingDoc.exists ? mappingDoc.data() : {games: {}};
        const scrapedWeeks = new Set();

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const eventObj of calendarEvents) {
          const eventId = Object.keys(eventObj)[0];
          const eventData = eventObj[eventId];
          const week = eventData.week;

          scrapedWeeks.add(week);

          const existingGame = mapping.games[week];

          if (!existingGame) {
            // Create new event
            console.log(`Creating Week ${week}...`);

            const googleEvent = await calendar.events.insert({
              calendarId: "primary",
              requestBody: {
                summary: eventData.title,
                description: eventData.description || "",
                location: eventData.location || "",
                start: {
                  dateTime: eventData.startTime,
                  timeZone: "America/New_York",
                },
                end: {
                  dateTime: eventData.endTime,
                  timeZone: "America/New_York",
                },
                reminders: {
                  useDefault: false,
                  overrides: [],
                },
              },
            });

            mapping.games[week] = {
              googleEventId: googleEvent.data.id,
              lastScrapedTime: eventData.startTime,
            };

            created++;
          } else {
            // Check if time changed
            if (eventData.startTime !== existingGame.lastScrapedTime) {
              console.log(`Updating Week ${week}...`);

              await calendar.events.patch({
                calendarId: "primary",
                eventId: existingGame.googleEventId,
                requestBody: {
                  start: {
                    dateTime: eventData.startTime,
                    timeZone: "America/New_York",
                  },
                  end: {
                    dateTime: eventData.endTime,
                    timeZone: "America/New_York",
                  },
                },
              });

              mapping.games[week].lastScrapedTime = eventData.startTime;
              updated++;
            } else {
              skipped++;
            }
          }
        }

        // Delete games no longer in schedule
        let deleted = 0;
        for (const week of Object.keys(mapping.games)) {
          if (!scrapedWeeks.has(week)) {
            console.log(`Deleting Week ${week}...`);

            try {
              await calendar.events.delete({
                calendarId: "primary",
                eventId: mapping.games[week].googleEventId,
              });

              delete mapping.games[week];
              deleted++;
            } catch (error) {
              console.error(
                  `Failed to delete Week ${week}:`,
                  error.message,
              );
            }
          }
        }

        // Save mapping
        await mappingRef.set(mapping);

        return {
          status: "success",
          created,
          updated,
          deleted,
          skipped,
          totalGames: Object.keys(mapping.games).length,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error("CFB upload failed:", error);
        throw error;
      }
    },
);
