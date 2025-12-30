const {onCall} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
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
        requestData.calendar, // Pass the whole calendar object
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
          calendar,
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
 * Get iCal URL from calendar object based on type
 * @param {Object} calendar - Calendar object with source info
 * @return {string} iCal feed URL
 */
function getCalendarUrl(calendar) {
  const {source} = calendar;

  if (source.type === "google") {
    // Check if we have a stored iCal URL (from the secret address)
    if (source.url) {
      return source.url;
    }
    // Fallback to constructing URL (won't work for private calendars)
    console.warn(`⚠️ No iCal URL stored for Google calendar: ${calendar.name}`);
    return `https://calendar.google.com/calendar/ical/${source.calendarId}/public/basic.ics`;
  } else if (source.type === "ical") {
    return source.url;
  } else {
    throw new Error(`Unknown calendar type: ${source.type}`);
  }
}

/**
 * Sync a single calendar
 * @param {Object} calendar - Calendar object with source and metadata
 * @param {number} monthsBack - Number of months back to sync
 * @param {number} monthsForward - Number of months forward to sync
 * @return {Promise<Object>} Sync result
 */
async function syncSingleCalendar(calendar, monthsBack, monthsForward) {
  console.log(
      "📅 Sync range:",
      monthsBack,
      "months back,",
      monthsForward,
      "months forward",
  );

  if (!calendar || !calendar.calendarId || !calendar.source) {
    throw new Error(
        "Missing parameters: calendar object with calendarId and source",
    );
  }

  const calendarId = calendar.calendarId;
  const calendarType = calendar.source.type;

  // Get the iCal URL based on calendar type
  const calendarUrl = getCalendarUrl(calendar);
  console.log(`📥 Calendar type: ${calendarType}`);
  console.log(`📥 Fetching iCal feed from: ${calendarUrl}`);

  // Step 1: Fetch iCal feed
  // Convert webcal:// to https:// for axios
  const fetchUrl = calendarUrl.replace(/^webcal:\/\//i, "https://");

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
    const existingEvents = monthDoc.exists ? monthDoc.data().events || {} : {};

    // Build a map of base IDs to full event IDs for existing events
    // Base ID is everything before the timestamp
    // (e.g., "abc123@google.com" from "abc123@google.com-1234567890")
    const existingEventsByBaseId = {};
    for (const [eventId, event] of Object.entries(existingEvents)) {
      const lastDashIndex = eventId.lastIndexOf("-");
      const baseId =
        lastDashIndex !== -1 ? eventId.substring(0, lastDashIndex) : eventId;
      existingEventsByBaseId[baseId] = {fullId: eventId, event};
    }

    // Track which old event IDs have been replaced
    const replacedEventIds = new Set();

    // Merge new events with existing, preserving app-specific fields
    const mergedEvents = {};

    for (const [newEventId, newEventData] of Object.entries(newMonthEvents)) {
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
    const eventsToDelete = Object.keys(existingEvents).filter((eventId) => {
      const event = existingEvents[eventId];
      const lastDashIndex = eventId.lastIndexOf("-");
      const baseId =
        lastDashIndex !== -1 ? eventId.substring(0, lastDashIndex) : eventId;

      // Delete if replaced with new timestamp
      if (replacedEventIds.has(eventId)) {
        return true;
      }

      // Delete if no longer in calendar source
      return event.source === "ical_feed" && !baseIdsInNewSync.has(baseId);
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
    batch.set(monthDocRef, {
      events: mergedEvents,
      updatedAt: now,
    });

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
  console.log(`🔗 Preserved activities on ${preservedActivitiesCount} events`);
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
      const eventStart = event.start ? DateTime.fromJSDate(event.start) : null;

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

// Scheduled calendar sync - runs 5 times daily
exports.scheduledCalendarSync = onSchedule(
    {
      schedule: "0 6,10,14,18,22 * * *",
      timeZone: "America/New_York",
      memory: "256MiB",
    },
    async (event) => {
      console.log("🕐 Starting scheduled sync at", new Date().toISOString());

      try {
        const db = admin.firestore();

        // Get all Google and iCal calendars
        const calendarsSnapshot = await db.collection("calendars").get();
        const syncableCalendars = [];

        calendarsSnapshot.forEach((doc) => {
          const calendar = doc.data();
          const sourceType = calendar.source?.type;
          if (sourceType === "google" || sourceType === "ical") {
            syncableCalendars.push(calendar);
          }
        });

        if (syncableCalendars.length === 0) {
          console.log("📭 No syncable calendars found");
          return;
        }

        console.log(
            "📅 Found",
            syncableCalendars.length,
            "calendars to sync:",
            syncableCalendars.map((c) => c.name).join(", "),
        );

        // Sync all calendars
        const results = await syncMultipleCalendars(syncableCalendars, 1, 3);

        console.log("✅ Scheduled sync complete:", {
          total: results.totalCount,
          success: results.successCount,
          failed: results.errorCount,
          timestamp: new Date().toISOString(),
        });

        // **ALERT: If there are any errors, notify admin**
        if (results.errorCount > 0) {
          await notifyAdminOfSyncErrors(results);
        }
      } catch (error) {
        console.error("❌ Scheduled sync error:", error);
        await notifyAdminOfCriticalError(error);
      }
    },
);

/**
 * Notify admin of sync errors via message and push notification
 * @param {Object} results - Sync results object with error details
 */
async function notifyAdminOfSyncErrors(results) {
  const adminUserId = "LCqH5hKx2bP8Q5gDGPmzRd65PB32";
  const db = admin.firestore();

  const failures = results.results.filter((r) => !r.success);

  console.error(
      "❌ Failed syncs:",
      failures.map((f) => f.name),
  );

  // Create detailed error message
  const errorDetails = failures
      .map((f) => `• ${f.name}: ${f.error}`)
      .join("\n");

  const messageText =
    `Calendar Sync Errors\n\n` +
    `${results.errorCount} of ${results.totalCount} ` +
    `calendars failed to sync:\n\n` +
    `${errorDetails}\n\n` +
    `Time: ${new Date().toLocaleString()}`;

  try {
    // Create message in admin's messages collection
    const messageRef = db.collection("messages").doc();
    await messageRef.set({
      id: messageRef.id,
      userId: adminUserId,
      title: "⚠️ Calendar Sync Failed",
      message: messageText,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
      read: false,
      type: "system",
    });

    console.log("📝 Created error message for admin");

    // Send push notification
    await sendPushNotificationInternal(
        adminUserId,
        "⚠️ Calendar Sync Failed",
        `${results.errorCount} calendar${
        results.errorCount > 1 ? "s" : ""
        } failed to sync`,
        {
          screen: "Messages",
          messageId: messageRef.id,
        },
    );

    console.log("📲 Push notification sent to admin");
  } catch (error) {
    console.error("❌ Failed to notify admin:", error);
  }
}

/**
 * Notify admin of critical sync error
 * @param {Error} error - The error that occurred
 */
async function notifyAdminOfCriticalError(error) {
  const adminUserId = "LCqH5hKx2bP8Q5gDGPmzRd65PB32";
  const db = admin.firestore();

  try {
    const messageRef = db.collection("messages").doc();
    await messageRef.set({
      id: messageRef.id,
      userId: adminUserId,
      title: "🚨 Calendar Sync Critical Error",
      message: `Critical error during scheduled sync:\n\n${
        error.message
      }\n\nTime: ${new Date().toLocaleString()}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
      read: false,
      type: "system",
    });

    // Send push notification
    await sendPushNotificationInternal(
        adminUserId,
        "🚨 Calendar Sync Critical Error",
        "Scheduled sync encountered a critical error",
        {
          screen: "Messages",
          messageId: messageRef.id,
        },
    );

    console.log("📲 Critical error notification sent to admin");
  } catch (alertError) {
    console.error("❌ Failed to send critical error alert:", alertError);
  }
}

/**
 * Internal function to send push notification
 * @param {string} userId - User ID to send notification to
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {Object} data - Additional data payload
 * @return {Promise<Object>} Result of notification send
 */
async function sendPushNotificationInternal(userId, title, body, data = {}) {
  const targetApp = data?.app || "checklist-app";

  try {
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const pushToken = userData.pushTokens?.[targetApp];

    if (!pushToken) {
      console.log(`User ${userId} doesn't have ${targetApp} installed`);
      return {success: false};
    }

    // Build message for Expo Push Service
    const message = {
      to: pushToken,
      sound: "default",
      title: title || "MyChecklists",
      body: body || "",
      data: data || {},
    };

    // Send to Expo Push Service
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json();

    if (responseData.data) {
      const result = responseData.data[0];
      if (result && result.status === "error") {
        throw new Error(`Expo push error: ${result.message}`);
      }
      return {success: true, messageId: result?.id};
    }

    return {success: true};
  } catch (error) {
    console.error("❌ Failed to send notification:", error);
    throw error;
  }
}
