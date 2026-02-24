const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {DateTime} = require("luxon");

const db = admin.firestore();

// Hardcoded calendar IDs
const CALENDAR_IDS = [
  "ical_1767109709271",
  "ebraithwaite3@gmail.com",
];

/**
 * Parse date input and return date range
 * @param {string} dateInput - "today", "tomorrow", "this weekend",
 *                             day name, or ISO date
 * @param {string} timezone - Timezone (default: America/New_York)
 * @return {Object} {startDate, endDate, label}
 */
const parseDateInput = (dateInput, timezone = "America/New_York") => {
  const now = DateTime.now().setZone(timezone);
  const today = now.startOf("day");

  const input = dateInput.toLowerCase().trim();

  if (input === "today") {
    return {
      startDate: today,
      endDate: today.endOf("day"),
      label: today.toFormat("EEEE, MMM d, yyyy"),
    };
  }

  if (input === "tomorrow") {
    const tomorrow = today.plus({days: 1});
    return {
      startDate: tomorrow,
      endDate: tomorrow.endOf("day"),
      label: tomorrow.toFormat("EEEE, MMM d, yyyy"),
    };
  }

  if (input === "this weekend") {
    // Find next Saturday
    const dayOfWeek = today.weekday; // 1=Monday, 7=Sunday
    let saturday;
    if (dayOfWeek === 6) {
      // Today is Saturday
      saturday = today;
    } else if (dayOfWeek === 7) {
      // Today is Sunday, get next Saturday
      saturday = today.plus({days: 6});
    } else {
      // Get upcoming Saturday
      saturday = today.plus({days: 6 - dayOfWeek});
    }
    const sunday = saturday.plus({days: 1});

    return {
      startDate: saturday,
      endDate: sunday.endOf("day"),
      label: `This Weekend (${saturday.toFormat("MMM d")} - ` +
             `${sunday.toFormat("MMM d")})`,
    };
  }

  // Check if it's a day of the week
  const dayNames = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const dayIndex = dayNames.indexOf(input);

  if (dayIndex !== -1) {
    // Day name found (0=Monday, 6=Sunday)
    // Luxon uses 1=Monday, 7=Sunday
    const targetWeekday = dayIndex + 1;
    const currentWeekday = today.weekday;

    let targetDate;
    if (targetWeekday > currentWeekday) {
      // This week
      targetDate = today.plus({days: targetWeekday - currentWeekday});
    } else {
      // Next week
      targetDate = today.plus({days: 7 - currentWeekday + targetWeekday});
    }

    return {
      startDate: targetDate,
      endDate: targetDate.endOf("day"),
      label: targetDate.toFormat("EEEE, MMM d, yyyy"),
    };
  }

  // Try parsing as ISO date
  const specificDate = DateTime.fromISO(input, {zone: timezone});
  if (specificDate.isValid) {
    return {
      startDate: specificDate.startOf("day"),
      endDate: specificDate.endOf("day"),
      label: specificDate.toFormat("EEEE, MMM d, yyyy"),
    };
  }

  throw new Error(`Invalid date input: ${dateInput}`);
};

/**
 * Get events from a calendar for a date range
 * @param {string} calendarId - Calendar ID
 * @param {DateTime} startDate - Start date
 * @param {DateTime} endDate - End date
 * @return {Array} Array of events
 */
const getEventsForCalendar = async (calendarId, startDate, endDate) => {
  const events = [];

  // Get all months that might contain events in this range
  const monthKeys = [];
  let currentMonth = startDate.startOf("month");
  const endMonth = endDate.startOf("month");

  while (currentMonth <= endMonth) {
    monthKeys.push(currentMonth.toFormat("yyyy-MM"));
    currentMonth = currentMonth.plus({months: 1});
  }

  // Query each month
  for (const monthKey of monthKeys) {
    try {
      const monthRef = db
          .collection("calendars")
          .doc(calendarId)
          .collection("months")
          .doc(monthKey);

      const monthDoc = await monthRef.get();

      if (monthDoc.exists) {
        const monthData = monthDoc.data();
        const monthEvents = monthData.events || {};

        // Filter events within date range
        Object.entries(monthEvents).forEach(([eventId, event]) => {
          const eventStart = DateTime.fromISO(event.startTime, {
            zone: "America/New_York",
          });

          if (eventStart >= startDate && eventStart <= endDate) {
            events.push({
              ...event,
              eventId,
              calendarId,
              startDateTime: eventStart,
            });
          }
        });
      }
    } catch (error) {
      console.error(`Error reading calendar ${calendarId}:`, error);
    }
  }

  return events;
};

/**
 * Format events for display
 * @param {Array} events - Array of events
 * @param {string} label - Date range label
 * @return {string} Formatted text
 */
const formatEventsResponse = (events, label) => {
  if (events.length === 0) {
    return `📅 ${label}\n\nNo events scheduled.`;
  }

  // Sort by start time
  events.sort((a, b) => a.startDateTime - b.startDateTime);

  let response = `📅 ${label}\n\n`;

  // Group by day if multiple days
  const eventsByDay = {};
  events.forEach((event) => {
    const dayKey = event.startDateTime.toFormat("yyyy-MM-dd");
    if (!eventsByDay[dayKey]) {
      eventsByDay[dayKey] = [];
    }
    eventsByDay[dayKey].push(event);
  });

  Object.entries(eventsByDay).forEach(([dayKey, dayEvents]) => {
    if (Object.keys(eventsByDay).length > 1) {
      // Multi-day range, show day headers
      const dayLabel = dayEvents[0].startDateTime.toFormat("EEEE, MMM d");
      response += `\n${dayLabel}:\n`;
    }

    dayEvents.forEach((event) => {
      if (event.isAllDay) {
        response += `• All Day: ${event.title}\n`;
      } else {
        const start = event.startDateTime.toFormat("h:mm a");
        const end = DateTime.fromISO(event.endTime, {
          zone: "America/New_York",
        }).toFormat("h:mm a");
        response += `• ${start} - ${end}: ${event.title}\n`;
      }
    });
  });

  response += `\nTotal: ${events.length} event${events.length > 1 ? "s" : ""}`;

  return response;
};

/**
 * Get calendar events for a date/range
 * iOS Shortcut endpoint
 */
exports.getCalendarEvents = functions.https.onRequest(
    async (req, res) => {
      try {
        const {date = "today"} = req.body;

        console.log(`📅 getCalendarEvents called with date: ${date}`);

        // Parse date input
        const {startDate, endDate, label} = parseDateInput(date);

        console.log(`📆 Date range: ${startDate.toISO()} to ` +
                    `${endDate.toISO()}`);

        // Get events from all calendars
        const allEvents = [];
        for (const calendarId of CALENDAR_IDS) {
          const events = await getEventsForCalendar(
              calendarId,
              startDate,
              endDate,
          );
          allEvents.push(...events);
        }

        console.log(`✅ Found ${allEvents.length} events`);

        // Format response
        const response = formatEventsResponse(allEvents, label);

        return res.status(200).json({
          message: response,
          eventCount: allEvents.length,
        });
      } catch (error) {
        console.error("❌ Error in getCalendarEvents:", error);
        return res.status(500).json({
          error: error.message,
        });
      }
    },
);
