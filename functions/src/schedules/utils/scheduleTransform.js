const {getTeamCode} = require("./teamCodes");
const {DateTime} = require("luxon");

/**
 * Parse game date and time into ISO format with proper ET timezone
 * Returns an object with startTime, endTime, and isTBD flag
 * @param {string} date - Date string (various formats)
 * @param {string} time - Time string (various formats)
 * @param {string} year - Year string (may not be needed if in date)
 * @param {number} defaultDuration - Default game duration in hours
 * @return {object|null} {startTime, endTime, isTBD} or null if invalid
 */
function parseGameDateTime(date, time, year, defaultDuration = 3) {
  // Normalize time format - handle "7:00p" → "7:00 PM"
  if (time && time.match(/\d{1,2}:\d{2}[ap]$/i)) {
    time = time.replace(/([ap])$/i, (match) => match.toUpperCase() + "M");
  }

  // Check if time is TBD
  const isTBD = !time || time.toUpperCase() === "TBD" || time.trim() === "";

  // Handle different date formats
  let dateStr;

  // Check if date already includes a 4-digit year
  const hasYear = /\b(20\d{2})\b/.test(date);

  if (hasYear) {
    // Date already has year (e.g., "Mon, Nov 3, 2025")
    dateStr = date;
  } else {
    // Date needs year added (e.g., "September 7")
    dateStr = `${date} ${year}`;
  }

  try {
    let dt;

    // Try multiple date formats

    // Format: "Mon, Nov 3, 2025" (CBB with day of week)
    dt = DateTime.fromFormat(
        dateStr,
        "EEE, MMM d, yyyy",
        {zone: "America/New_York"},
    );

    if (!dt.isValid) {
      // Format: "Nov 3, 2025" (CBB without day of week)
      dt = DateTime.fromFormat(
          dateStr,
          "MMM d, yyyy",
          {zone: "America/New_York"},
      );
    }

    if (!dt.isValid) {
      // Format: "September 7 2025" (NFL)
      dt = DateTime.fromFormat(
          dateStr,
          "MMMM d yyyy",
          {zone: "America/New_York"},
      );
    }

    if (!dt.isValid) {
      // Format: "Aug 30, 2025" (CFB)
      dt = DateTime.fromFormat(
          dateStr,
          "MMM d, yyyy",
          {zone: "America/New_York"},
      );
    }

    if (!dt.isValid) {
      // Format: "Aug 30 2025" (alternate CFB)
      dt = DateTime.fromFormat(
          dateStr,
          "MMM d yyyy",
          {zone: "America/New_York"},
      );
    }

    if (!dt.isValid) {
      // Format: "2025-08-17" (EPL - ISO date format)
      dt = DateTime.fromFormat(
          dateStr,
          "yyyy-MM-dd",
          {zone: "America/New_York"},
      );
    }

    if (!dt.isValid) {
      console.warn(`Invalid date: ${dateStr} (${dt.invalidReason})`);
      return null;
    }

    // If TBD, create all-day event (12:01 AM to 11:59 PM)
    if (isTBD) {
      const startTime = dt.set({hour: 0, minute: 1, second: 0}).toISO();
      const endTime = dt.set({hour: 23, minute: 59, second: 0}).toISO();

      return {
        startTime,
        endTime,
        isTBD: true,
      };
    }

    // Check if it's 24-hour format (e.g., "16:30" for EPL)
    const time24Match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (time24Match) {
      const hours = parseInt(time24Match[1]);
      const minutes = parseInt(time24Match[2]);

      // Validate hours (0-23)
      if (hours < 0 || hours > 23) {
        console.warn(`Invalid 24-hour time: ${time}`);
        return null;
      }

      dt = dt.set({hour: hours, minute: minutes, second: 0});

      if (!dt.isValid) {
        console.warn(`Invalid date/time combination`);
        return null;
      }

      const startTime = dt.toISO();
      const endTime = dt.plus({hours: defaultDuration}).toISO();

      return {
        startTime,
        endTime,
        isTBD: false,
      };
    }

    // Parse 12-hour format with AM/PM
    const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) {
      console.warn(`Could not parse time: "${time}"`);
      return null;
    }

    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const isPM = timeMatch[3].toUpperCase() === "PM";

    // Convert to 24-hour format
    if (isPM && hours !== 12) {
      hours += 12;
    } else if (!isPM && hours === 12) {
      hours = 0;
    }

    // Set the time
    dt = dt.set({hour: hours, minute: minutes, second: 0});

    if (!dt.isValid) {
      console.warn(`Invalid date/time combination`);
      return null;
    }

    const startTime = dt.toISO();
    const endTime = dt.plus({hours: defaultDuration}).toISO();

    return {
      startTime,
      endTime,
      isTBD: false,
    };
  } catch (error) {
    console.error("Error parsing date/time:", error);
    return null;
  }
}

/**
 * Generate unique event ID
 * @param {string} sport - Sport code (e.g., 'NFL', 'NBA')
 * @param {string} teamCode - Team code (e.g., 'PIT', 'LAL')
 * @param {string} week - Week or game number
 * @return {string} Unique event ID
 */
function generateEventId(sport, teamCode, week) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6);
  return `event-${sport}-${teamCode}-${week}-${timestamp}-${random}`
      .toLowerCase();
}

/**
 * Transform schedule data into calendar events
 * @param {object} scheduleData - Schedule data from scraper
 * @param {string} calendarId - Calendar ID to assign to events
 * @param {string} sport - Sport type (e.g., 'NFL', 'NBA')
 * @param {string} season - Season year
 * @param {object} options - Optional configuration
 * @return {Array} Array of calendar event objects
 */
function transformScheduleToCalendarEvents(
    scheduleData,
    calendarId,
    sport,
    season,
    options = {},
) {
  const {
    gameDuration = 3,
    teamCode = scheduleData.teamCode,
  } = options;

  const events = scheduleData.games.map((game) => {
    const parsedTime = parseGameDateTime(
        game.date,
        game.time,
        season,
        gameDuration,
    );

    // Skip games without valid times
    if (!parsedTime) {
      console.warn(
          `Skipping game with invalid date: ${game.date} ${game.time}`,
      );
      return null;
    }

    const {startTime, endTime, isTBD} = parsedTime;

    // Create title: PIT vs OPPONENT or PIT @ OPPONENT
    const vsOrAt = game.isAway ? "@" : "vs";
    const opponentCode = getTeamCode(game.opponent, sport);
    const title = `${teamCode} ${vsOrAt} ${opponentCode}`;

    // Generate unique event ID
    const eventId = generateEventId(
        sport,
        teamCode,
        game.week || "TBD",
    );

    return {
      [eventId]: {
        calendarId: calendarId,
        title: title,
        description: isTBD ? "Game time TBD" : "",
        startTime: startTime,
        endTime: endTime,
        isAllDay: false,
        location: "",
        source: "auto-scraped",
        sport: sport,
        season: season,
        week: game.week || "",
        opponent: game.opponent,
        isAway: game.isAway,
        timeTBD: isTBD,
        createdAt: new Date().toISOString(),
      },
    };
  });

  // Filter out null entries
  return events.filter((event) => event !== null);
}

/**
 * Flatten array of event objects into a single object
 * @param {Array} events - Array of event objects
 * @return {object} Single object with all events
 */
function flattenEvents(events) {
  return events.reduce((acc, event) => {
    return {...acc, ...event};
  }, {});
}

module.exports = {
  parseGameDateTime,
  generateEventId,
  transformScheduleToCalendarEvents,
  flattenEvents,
};
