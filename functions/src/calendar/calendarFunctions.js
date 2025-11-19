const {onCall} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
// ✅ Initialize admin only if it hasn't been initialized yet
if (!admin.apps.length) {
  admin.initializeApp();
}

const axios = require("axios");
const ical = require("ical");
const {DateTime} = require("luxon");
const {rrulestr} = require("rrule");

exports.syncCalendar = onCall(async (request) => {
  try {
    const requestData = request.data;
    console.log("🔄 syncCalendar called with data:", requestData);

    const isBatch = Array.isArray(requestData.calendars);

    if (isBatch) {
      console.log(
          "🔄 Starting BATCH sync for",
          requestData.calendars.length,
          "calendars",
      );

      const results = await syncMultipleCalendars(
          requestData.calendars,
          requestData.monthsBack || 1,
          requestData.monthsForward || 3,
      );

      return {
        success: true,
        batch: true,
        results,
      };
    }

    console.log(
        "🔄 Starting SINGLE sync for calendar:",
        requestData.calendarId,
    );

    const result = await syncSingleCalendar(
        requestData.calendarId,
        requestData.calendarAddress,
        requestData.calendarType,
        requestData.monthsBack || 1,
        requestData.monthsForward || 3,
    );

    return {
      success: true,
      batch: false,
      ...result,
    };
  } catch (error) {
    console.error("❌ Sync error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Sync multiple calendars
 * @param {Array} calendars - Array of calendar objects to sync
 * @param {number} monthsBack - Number of months back to sync
 * @param {number} monthsForward - Number of months forward to sync
 * @return {Promise<Object>} Sync results
 */
async function syncMultipleCalendars(calendars, monthsBack, monthsForward) {
  const results = [];

  for (const calendar of calendars) {
    try {
      const result = await syncSingleCalendar(
          calendar.calendarId,
          calendar.calendarAddress,
          calendar.calendarType || calendar.type,
          monthsBack,
          monthsForward,
      );

      results.push({
        calendarId: calendar.calendarId,
        name: calendar.name,
        success: true,
        ...result,
      });
    } catch (error) {
      console.error(`❌ Failed to sync ${calendar.name}:`, error);

      results.push({
        calendarId: calendar.calendarId,
        name: calendar.name,
        success: false,
        error: error.message,
      });

      // Update error status in Firestore
      try {
        await admin
            .firestore()
            .collection("calendars")
            .doc(calendar.calendarId)
            .update({
              "sync.syncStatus": "error",
              "sync.lastError": error.message,
              "sync.lastErrorAt": new Date().toISOString(),
            });
      } catch (updateError) {
        console.error("Failed to update error status:", updateError);
      }
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  console.log(
      `✅ Batch sync complete: ${successCount} success, ${errorCount} failed`,
  );

  return {
    totalCount: calendars.length,
    successCount,
    errorCount,
    results,
  };
}

/**
 * Sync a single calendar
 * @param {string} calendarId - Calendar ID
 * @param {string} calendarAddress - Calendar iCal feed URL
 * @param {string} calendarType - Calendar type (ical, google, etc)
 * @param {number} monthsBack - Number of months back to sync
 * @param {number} monthsForward - Number of months forward to sync
 * @return {Promise<Object>} Sync result
 */
async function syncSingleCalendar(
    calendarId,
    calendarAddress,
    calendarType,
    monthsBack,
    monthsForward,
) {
  console.log(
      "📅 Sync range:",
      monthsBack,
      "months back,",
      monthsForward,
      "months forward",
  );

  if (!calendarId || !calendarAddress) {
    throw new Error(
        "Missing required parameters: calendarId and calendarAddress",
    );
  }

  // Step 1: Fetch iCal feed
  // Convert webcal:// to https:// for axios
  const fetchUrl = calendarAddress.replace(/^webcal:\/\//i, "https://");
  console.log("📥 Fetching iCal feed from:", fetchUrl);

  const response = await axios.get(fetchUrl);
  const icalData = response.data;

  // Step 2: Parse iCal data
  console.log("🔍 Parsing iCal data...");
  const parsedCalendar = ical.parseICS(icalData);

  // Step 3: Convert to our event format and group by month
  const eventsByMonth = groupEventsByMonth(
      parsedCalendar,
      monthsBack,
      monthsForward,
      calendarId,
      calendarType,
  );
  console.log(
      "📊 Events grouped into",
      Object.keys(eventsByMonth).length,
      "months",
  );

  // Step 4: Write to month-sharded Firestore documents
  // WITH ACTIVITY PRESERVATION
  const db = admin.firestore();
  const batch = db.batch();
  let eventCount = 0;
  let preservedActivitiesCount = 0;
  let deletedEventsCount = 0;
  let updatedEventIdsCount = 0;

  const now = new Date().toISOString();

  for (const [monthKey, newMonthEvents] of Object.entries(eventsByMonth)) {
    const monthDocRef = db
        .collection("calendars")
        .doc(calendarId)
        .collection("months")
        .doc(monthKey);

    // Get existing month document to preserve app-specific fields
    const monthDoc = await monthDocRef.get();
    const existingEvents = monthDoc.exists ?
      monthDoc.data().events || {} :
      {};

    // Build a map of base IDs to full event IDs for existing events
    // Base ID is everything before the timestamp
    // (e.g., "abc123@google.com" from "abc123@google.com-1234567890")
    const existingEventsByBaseId = {};
    for (const [eventId, event] of Object.entries(existingEvents)) {
      const lastDashIndex = eventId.lastIndexOf("-");
      const baseId =
        lastDashIndex !== -1 ?
          eventId.substring(0, lastDashIndex) :
          eventId;
      existingEventsByBaseId[baseId] = {fullId: eventId, event};
    }

    // Track which old event IDs have been replaced
    const replacedEventIds = new Set();

    // Merge new events with existing, preserving app-specific fields
    const mergedEvents = {};

    for (const [newEventId, newEventData] of
      Object.entries(newMonthEvents)) {
      // Get base ID of new event (remove timestamp)
      const lastDashIndex = newEventId.lastIndexOf("-");
      const newBaseId =
        lastDashIndex !== -1 ?
          newEventId.substring(0, lastDashIndex) :
          newEventId;

      // Check if an event with this base ID already exists
      // (might have different timestamp)
      const existingMatch = existingEventsByBaseId[newBaseId];

      let eventToPreserve = null;

      if (existingMatch) {
        // Found a match by base ID
        const oldEventId = existingMatch.fullId;
        eventToPreserve = existingMatch.event;

        if (oldEventId !== newEventId) {
          console.log(
              "   ↳ Updating event ID from",
              oldEventId,
              "to",
              newEventId,
          );
          replacedEventIds.add(oldEventId);
          updatedEventIdsCount++;
        }
      }

      // Start with calendar fields from sync
      mergedEvents[newEventId] = {...newEventData};

      // ===== PRESERVE APP-SPECIFIC FIELDS =====
      if (eventToPreserve) {
        // Preserve activities array
        if (
          eventToPreserve.activities &&
          Array.isArray(eventToPreserve.activities)
        ) {
          mergedEvents[newEventId].activities = eventToPreserve.activities;
          preservedActivitiesCount++;
          console.log(
              "   ↳ Preserved",
              eventToPreserve.activities.length,
              "activities for event:",
              newEventData.title,
          );
        }

        // Preserve user-set reminder
        if (eventToPreserve.reminderMinutes !== undefined) {
          mergedEvents[newEventId].reminderMinutes =
            eventToPreserve.reminderMinutes;
        }
      }
    }

    // ===== REMOVE DELETED EVENTS =====
    // Build set of base IDs in new sync
    const baseIdsInNewSync = new Set();
    for (const newEventId of Object.keys(newMonthEvents)) {
      const lastDashIndex = newEventId.lastIndexOf("-");
      const baseId =
        lastDashIndex !== -1 ?
          newEventId.substring(0, lastDashIndex) :
          newEventId;
      baseIdsInNewSync.add(baseId);
    }

    // Find events that should be deleted:
    // 1. Events that are no longer in calendar source (by base ID)
    // 2. Events that have been replaced with new timestamp
    const eventsToDelete = Object.keys(existingEvents)
        .filter((eventId) => {
          const event = existingEvents[eventId];
          const lastDashIndex = eventId.lastIndexOf("-");
          const baseId =
          lastDashIndex !== -1 ?
            eventId.substring(0, lastDashIndex) :
            eventId;

          // Delete if replaced with new timestamp
          if (replacedEventIds.has(eventId)) {
            return true;
          }

          // Delete if no longer in calendar source
          return event.source === "ical_feed" &&
          !baseIdsInNewSync.has(baseId);
        });

    if (eventsToDelete.length > 0) {
      console.log(
          `🗑️ Removing ${eventsToDelete.length} events from ${monthKey}`,
      );
      deletedEventsCount += eventsToDelete.length;

      // Log which events are being deleted
      eventsToDelete.forEach((eventId) => {
        const deletedEvent = existingEvents[eventId];
        if (replacedEventIds.has(eventId)) {
          console.log(
              "   ↳ Removing old timestamp:",
              deletedEvent.title,
              `(${eventId})`,
          );
        } else {
          console.log(`   ↳ Deleting: ${deletedEvent.title}`);
          if (deletedEvent.activities) {
            console.log(
                `      (had ${deletedEvent.activities.length} activities)`,
            );
          }
        }
      });
    }

    // Write merged events (excludes deleted ones)
    batch.set(
        monthDocRef,
        {
          events: mergedEvents,
          updatedAt: now,
        },
    );

    eventCount += Object.keys(mergedEvents).length;
    console.log(
        `📝 Prepared`,
        Object.keys(mergedEvents).length,
        `events for ${monthKey}`,
    );
  }

  // Step 5: Update sync status on main calendar doc
  const calendarRef = db.collection("calendars").doc(calendarId);
  batch.update(calendarRef, {
    "sync.syncStatus": "success",
    "sync.lastSyncedAt": now,
    "sync.eventCount": eventCount,
    "sync.monthsCovered": Object.keys(eventsByMonth).length,
    "sync.preservedActivitiesCount": preservedActivitiesCount,
    "sync.deletedEventsCount": deletedEventsCount,
    "sync.updatedEventIdsCount": updatedEventIdsCount,
    "updatedAt": now,
  });

  // Commit all writes
  await batch.commit();

  console.log("✅ Sync completed:", calendarId, "at", now);
  console.log(
      `📈 Synced ${eventCount} events across`,
      Object.keys(eventsByMonth).length,
      "months",
  );
  console.log(
      `🔗 Preserved activities on ${preservedActivitiesCount} events`,
  );
  console.log(
      `🔄 Updated ${updatedEventIdsCount} event IDs to match sync timestamps`,
  );
  console.log(
      `🗑️ Deleted ${deletedEventsCount} events (including old timestamps)`,
  );

  return {
    syncedAt: now,
    calendarId,
    eventCount,
    monthsCovered: Object.keys(eventsByMonth).length,
    preservedActivitiesCount,
    deletedEventsCount,
    updatedEventIdsCount,
  };
}

/**
 * Group events by month within the specified range
 * @param {Object} parsedCalendar - Parsed iCal calendar object
 * @param {number} monthsBack - Number of months back to include
 * @param {number} monthsForward - Number of months forward to include
 * @param {string} calendarId - Calendar ID
 * @param {string} calendarType - Calendar type
 * @return {Object} Events grouped by month key
 */
function groupEventsByMonth(
    parsedCalendar,
    monthsBack,
    monthsForward,
    calendarId,
    calendarType,
) {
  const now = DateTime.now();
  const startDate = now.minus({months: monthsBack}).startOf("month");
  const endDate = now.plus({months: monthsForward}).endOf("month");

  console.log(
      "📅 Date range:",
      startDate.toISODate(),
      "to",
      endDate.toISODate(),
  );

  const eventsByMonth = {};

  for (const event of Object.values(parsedCalendar)) {
    if (event.type !== "VEVENT") continue;

    try {
      const eventStart = event.start ?
        DateTime.fromJSDate(event.start) :
        null;

      if (!eventStart) continue;

      // Check if this is a recurring event
      if (event.rrule) {
        console.log("🔁 Found recurring event:", event.summary);

        // Expand recurring events
        const occurrences = expandRecurringEvent(event, startDate, endDate);

        console.log(`   ↳ Expanded to ${occurrences.length} occurrences`);

        for (const occurrence of occurrences) {
          addEventToMonth(
              eventsByMonth,
              occurrence,
              event,
              calendarId,
              calendarType,
          );
        }
      } else {
        // Single event - check if in range
        if (eventStart < startDate || eventStart > endDate) continue;

        addEventToMonth(
            eventsByMonth,
            eventStart,
            event,
            calendarId,
            calendarType,
        );
      }
    } catch (error) {
      console.error("Error processing event:", error, event.summary);
      continue;
    }
  }

  return eventsByMonth;
}

/**
 * Expand a recurring event into individual occurrences
 * @param {Object} event - Event object
 * @param {DateTime} startDate - Start date for expansion
 * @param {DateTime} endDate - End date for expansion
 * @return {Array<DateTime>} Array of occurrence dates
 */
function expandRecurringEvent(event, startDate, endDate) {
  try {
    // Parse the RRULE
    const rrule = rrulestr(event.rrule.toString(), {
      dtstart: event.start,
      cache: true,
    });

    // Get all occurrences between our date range
    const occurrences = rrule.between(
        startDate.toJSDate(),
        endDate.toJSDate(),
        true, // inclusive
    );

    return occurrences.map((date) => DateTime.fromJSDate(date));
  } catch (error) {
    console.error("Error expanding recurring event:", error);
    return [];
  }
}

/**
 * Add an event to the appropriate month in eventsByMonth
 * @param {Object} eventsByMonth - Events grouped by month
 * @param {DateTime} eventStartDateTime - Event start time
 * @param {Object} event - Event object
 * @param {string} calendarId - Calendar ID
 * @param {string} calendarType - Calendar type
 */
function addEventToMonth(
    eventsByMonth,
    eventStartDateTime,
    event,
    calendarId,
    calendarType,
) {
  let startUTC = eventStartDateTime;

  if (calendarType === "ical") {
    // Convert from America/New_York to UTC
    startUTC = eventStartDateTime
        .setZone("America/New_York", {keepLocalTime: true})
        .toUTC();
  }

  const monthKey = startUTC.toFormat("yyyy-MM");

  // Initialize month object if needed
  if (!eventsByMonth[monthKey]) {
    eventsByMonth[monthKey] = {};
  }

  // Calculate event end time
  let eventEnd;
  if (event.end) {
    eventEnd = DateTime.fromJSDate(event.end);
    if (calendarType === "ical") {
      eventEnd = eventEnd
          .setZone("America/New_York", {keepLocalTime: true})
          .toUTC();
    }
  } else if (event.duration) {
    eventEnd = startUTC.plus({seconds: event.duration});
  } else {
    eventEnd = startUTC.plus({hours: 1});
  }

  // Create unique event ID for this occurrence
  const baseId = event.uid || `event-${event.summary}`;
  const occurrenceId = `${baseId}-${startUTC.toMillis()}`;

  // Convert to our event format (CALENDAR FIELDS ONLY)
  eventsByMonth[monthKey][occurrenceId] = {
    title: event.summary || "Untitled Event",
    description: event.description || "",
    startTime: startUTC.toISO(),
    endTime: eventEnd.toISO(),
    location: event.location || "",
    isAllDay: event.start.dateOnly || false,
    source: "ical_feed",
    calendarId: calendarId,
    isRecurring: !!event.rrule,
    recurringEventId: event.uid || baseId,
  };
}
