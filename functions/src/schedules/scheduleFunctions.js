const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const {
  scrapeAndTransformSchedule,
} = require("./scrapers/sportsReferenceScraper");

const { google } = require("googleapis");
require("dotenv").config();

/**
 * Get authenticated Google Calendar client
 */
function getGoogleCalendarClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

/**
 * Generate unique scraper key for an event
 */
function generateScraperKey(sport, team, season, week) {
  return `${sport.toUpperCase()}-${team.toUpperCase()}-${season}-W${week}`;
}

/**
 * Create event description with scraper tag
 */
function createEventDescription(
  sport,
  season,
  week,
  opponent,
  isAway,
  scraperKey
) {
  const vsText = isAway ? `@ ${opponent}` : `vs ${opponent}`;
  return `${sport.toUpperCase()} ${season} - Week ${week}\n${vsText}\n\n[SPORTS-SCRAPER:${scraperKey}]`;
}

/**
 * Core logic for updating sports schedules via Google Calendar
 */
async function updateSchedulesCore() {
  const db = admin.firestore();
  const calendar = getGoogleCalendarClient();

  // 1. Read admin config
  const configDoc = await db.doc("admin/scheduleConfig").get();

  if (!configDoc.exists) {
    throw new Error("Schedule config not found.");
  }

  const config = configDoc.data();
  const today = new Date();
  const results = {};

  // 2. Loop through each sport
  for (const [sport, sportConfig] of Object.entries(config)) {
    console.log(`\n=== Processing ${sport.toUpperCase()} ===`);

    // Skip if disabled
    if (!sportConfig.enabled) {
      console.log(`${sport}: Disabled - skipping`);
      results[sport] = { status: "disabled", skipped: true };
      continue;
    }

    // Skip if out of season
    const seasonStart = new Date(sportConfig.seasonStart);
    const seasonEnd = new Date(sportConfig.seasonEnd);

    if (today < seasonStart || today > seasonEnd) {
      console.log(`${sport}: Out of season - skipping`);
      results[sport] = { status: "out-of-season", skipped: true };
      continue;
    }

    // 3. Run the scraper
    try {
      console.log(
        `Scraping ${sport}: Team ${sportConfig.team}, Season ${sportConfig.season}`
      );

      const gameDuration =
        sport.toLowerCase() === "ncaab" || sport.toLowerCase() === "nba"
          ? 2.5
          : sport.toLowerCase() === "epl"
          ? 2
          : 3;
      const scheduleData = await scrapeAndTransformSchedule(sport, {
        ...sportConfig,
        gameDuration,
      });
      console.log(`✅ Scraped ${scheduleData.length} events`);

      // 4. Load or create mapping document
      const mappingDocId = `${sport}-${sportConfig.team}-${sportConfig.season}`;
      const mappingRef = db.collection("schedules").doc(mappingDocId);
      const mappingDoc = await mappingRef.get();

      const mapping = mappingDoc.exists ? mappingDoc.data() : { games: {} };
      console.log(
        `📋 Loaded mapping with ${
          Object.keys(mapping.games).length
        } existing games`
      );

      // Track which games we've seen in this scrape
      const scrapedWeeks = new Set();

      let created = 0;
      let updated = 0;
      let skipped = 0;

      // 5. Process each scraped game
      for (const eventObj of scheduleData) {
        const eventId = Object.keys(eventObj)[0];
        const eventData = eventObj[eventId];

        const week = eventData.week;
        const scraperKey = generateScraperKey(
          sport,
          sportConfig.team,
          sportConfig.season,
          week
        );
        scrapedWeeks.add(week);

        const existingGame = mapping.games[week];

        if (!existingGame) {
          // CREATE new event in Google Calendar
          console.log(`  ➕ Creating Week ${week}...`);

          const description = createEventDescription(
            sport,
            sportConfig.season,
            week,
            eventData.opponent,
            eventData.isAway,
            scraperKey
          );

          const googleEvent = await calendar.events.insert({
            calendarId: "primary",
            requestBody: {
              summary: eventData.title,
              description: description,
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
                useDefault: false, // ← ADD THIS to disable reminders
                overrides: [],
              },
            },
          });

          // Store in mapping
          mapping.games[week] = {
            googleEventId: googleEvent.data.id,
            scraperKey: scraperKey,
            lastScrapedDate: eventData.startTime.split("T")[0],
            lastScrapedTime: eventData.startTime,
          };

          created++;
        } else {
          // CHECK if date/time changed
          const currentDateTime = eventData.startTime;
          const storedDateTime = existingGame.lastScrapedTime;

          if (currentDateTime !== storedDateTime) {
            // UPDATE event in Google Calendar
            console.log(`  🔄 Updating Week ${week} (time changed)...`);

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

            // Update mapping
            mapping.games[week].lastScrapedDate =
              eventData.startTime.split("T")[0];
            mapping.games[week].lastScrapedTime = eventData.startTime;

            updated++;
          } else {
            // No changes needed
            skipped++;
          }
        }
      }

      // 6. DELETE games that are no longer in the scrape
      let deleted = 0;
      for (const week of Object.keys(mapping.games)) {
        if (!scrapedWeeks.has(week)) {
          console.log(`  🗑️ Deleting Week ${week} (no longer in schedule)...`);

          try {
            await calendar.events.delete({
              calendarId: "primary",
              eventId: mapping.games[week].googleEventId,
            });

            delete mapping.games[week];
            deleted++;
          } catch (error) {
            console.error(`  ❌ Failed to delete Week ${week}:`, error.message);
          }
        }
      }

      // 7. Save updated mapping
      await mappingRef.set(mapping);
      console.log(
        `✅ Mapping saved: ${created} created, ${updated} updated, ${deleted} deleted, ${skipped} skipped`
      );

      results[sport] = {
        status: "success",
        created,
        updated,
        deleted,
        skipped,
        totalGames: Object.keys(mapping.games).length,
      };
    } catch (error) {
      console.error(`❌ ${sport}: Failed - ${error.message}`);
      console.error(error.stack);

      results[sport] = {
        status: "error",
        error: error.message,
      };
    }

    // Small delay between sports
    await sleep(2000);
  }

  return results;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Manual trigger
 */
exports.manualUpdateSchedules = functions.https.onCall(
  async (data, context) => {
    console.log("Manual schedule update triggered");

    try {
      const results = await updateSchedulesCore();

      return {
        success: true,
        message: "Schedule update completed",
        results: results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Manual update failed:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to update schedules",
        error.message
      );
    }
  }
);

exports.testScheduleSetup = functions.https.onCall(async (data, context) => {
  const db = admin.firestore();

  try {
    const configDoc = await db.doc("admin/scheduleConfig").get();

    if (!configDoc.exists) {
      return {
        success: false,
        message: "Config document not found",
      };
    }

    const config = configDoc.data();
    const enabledSports = Object.entries(config)
      .filter(([_, cfg]) => cfg.enabled)
      .map(([sport, _]) => sport);

    return {
      success: true,
      message: "Setup looks good!",
      sportCount: Object.keys(config).length,
      enabledSports: enabledSports,
      config: config,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error checking setup",
      error: error.message,
    };
  }
});
