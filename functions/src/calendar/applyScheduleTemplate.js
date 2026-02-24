const {onCall} = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {Timestamp} = require("firebase-admin/firestore");
const {DateTime} = require("luxon");
const {
  createCalendarEvent,
  googleClientId,
  googleClientSecret,
  googleRefreshToken,
} = require("../utils/googleCalendarHelpers");

// Helper: Get all subscribers for a calendar
const getCalendarSubscribers = async (firestoreCalendarId) => {
  const calendarDoc = await admin
      .firestore()
      .collection("calendars")
      .doc(firestoreCalendarId)
      .get();

  if (!calendarDoc.exists) {
    return [];
  }

  const calendarData = calendarDoc.data();
  return calendarData.subscribingUsers || [];
};

// Helper: Find Firestore calendar ID from Google Calendar ID
const findFirestoreCalendarId = async (googleCalendarId) => {
  // First, try direct lookup
  const directRef = admin
      .firestore()
      .collection("calendars")
      .doc(googleCalendarId);
  const directDoc = await directRef.get();

  if (directDoc.exists) {
    console.log("✅ Found calendar by direct ID match");
    return directDoc.id;
  }

  // Search through calendars checking source.calendarId
  console.log("🔍 Searching calendars collection...");
  const calendarsSnapshot = await admin
      .firestore()
      .collection("calendars")
      .get();

  for (const doc of calendarsSnapshot.docs) {
    const calData = doc.data();
    if (calData.source?.calendarId === googleCalendarId) {
      console.log("✅ Found calendar by source.calendarId");
      return doc.id;
    }
  }

  throw new Error(`No Firestore calendar found for: ${googleCalendarId}`);
};

// Helper: Convert template reminder to runtime format
const convertTemplateReminder = (templateReminder, eventDate, timezone) => {
  if (!templateReminder || !templateReminder.time) return null;

  const [hours, minutes] = templateReminder.time.split(":").map(Number);

  // Parse eventDate in the specified timezone and set reminder time
  const eventDateTime = DateTime.fromJSDate(eventDate, {zone: timezone});
  const reminderDateTime = eventDateTime.set({hour: hours, minute: minutes, second: 0, millisecond: 0});

  const runtimeReminder = {
    scheduledFor: Timestamp.fromDate(reminderDateTime.toJSDate()),
    isRecurring: templateReminder.isRecurring || false,
  };

  if (templateReminder.isRecurring && templateReminder.recurringConfig) {
    const {
      frequency,
      interval,
      totalOccurrences,
      completedCancelsRecurring,
    } = templateReminder.recurringConfig;

    let intervalSeconds;
    switch (frequency) {
      case "minutely":
        intervalSeconds = interval * 60;
        break;
      case "hourly":
        intervalSeconds = interval * 3600;
        break;
      case "daily":
        intervalSeconds = interval * 86400;
        break;
      case "weekly":
        intervalSeconds = interval * 604800;
        break;
      case "monthly":
        intervalSeconds = interval * 2592000;
        break;
      default:
        intervalSeconds = 3600;
    }

    runtimeReminder.recurringConfig = {
      intervalSeconds,
      ...(totalOccurrences && {totalOccurrences}),
      currentOccurrence: 1,
      nextScheduledFor: reminderDateTime.toISO(),
      lastSentAt: null,
      ...(completedCancelsRecurring !== undefined && {
        completedCancelsRecurring,
      }),
    };
  }

  return runtimeReminder;
};

exports.applyScheduleTemplate = onCall(
    {
      secrets: [googleClientId, googleClientSecret, googleRefreshToken],
      timeoutSeconds: 300,
    },
    async (request) => {
      console.log("🚀 FUNCTION STARTED");

      try {
        console.log("📦 Has request.data:", !!request.data);
        console.log("📦 Has request.auth:", !!request.auth);

        const {
          templateId,
          templateName,
          startDate,
          timezone = "America/New_York",
        } = request.data || {};

        if (!request.auth || !request.auth.uid) {
          throw new functions.https.HttpsError(
              "unauthenticated",
              "Authentication required",
          );
        }

        const userId = request.auth.uid;

        console.log(
            "🎯 applyScheduleTemplate called:",
            {templateId, templateName, startDate, timezone, userId},
        );
        console.log("📦 DateTime available:", typeof DateTime);
        // 1. Get template by ID (direct lookup - faster and more reliable)
        const templateRef = admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("scheduleTemplates")
            .doc(templateId);

        const templateDoc = await templateRef.get();

        if (!templateDoc.exists) {
          console.error("❌ Template not found:", {templateId, userId});
          throw new functions.https.HttpsError(
              "not-found",
              `Template "${templateName}" (ID: ${templateId}) ` +
              `not found for user ${userId}`,
          );
        }

        const template = templateDoc.data();
        console.log(
            "✅ Template found:",
            template.name,
            "with",
            template.events?.length,
            "events",
        );

        // 2. Validate and parse start date
        if (!startDate) {
          throw new functions.https.HttpsError(
              "invalid-argument",
              "startDate is required",
          );
        }

        // Parse the start date in the user's timezone
        const weekStart = DateTime.fromISO(startDate, {zone: timezone});

        if (!weekStart.isValid) {
          console.error("❌ Invalid start date:", weekStart.invalidReason);
          throw new functions.https.HttpsError(
              "invalid-argument",
              `Invalid start date: ${weekStart.invalidReason}`,
          );
        }

        const weekStartDay = weekStart.startOf("day");
        console.log("📅 Week starts:", weekStartDay.toISO());

        // 3. CREATE ALL EVENTS
        if (!template.events || template.events.length === 0) {
          return {success: false, message: "No events in template"};
        }

        const results = [];

        for (const templateEvent of template.events) {
          try {
            console.log("🚀 Creating event:", templateEvent.title);

            // Calculate dates using Luxon with timezone
            const [startHours, startMinutes] = templateEvent.startTime
                .split(":")
                .map(Number);
            const [endHours, endMinutes] = templateEvent.endTime
                .split(":")
                .map(Number);

            const eventDateTime = weekStartDay
                .plus({days: templateEvent.dayOfWeek})
                .set({
                  hour: startHours,
                  minute: startMinutes,
                  second: 0,
                  millisecond: 0,
                });

            const endDateTime = eventDateTime.set({
              hour: endHours,
              minute: endMinutes,
            });

            // Convert to JavaScript Date objects for compatibility
            const eventDate = eventDateTime.toJSDate();
            const endDate = endDateTime.toJSDate();

            // Find calendar
            const firestoreCalendarId = await findFirestoreCalendarId(
                templateEvent.calendarId,
            );

            // Create in Google Calendar
            const googleEventId = await createCalendarEvent({
              title: templateEvent.title,
              startTime: eventDate.toISOString(),
              endTime: endDate.toISOString(),
              description: templateEvent.description || "",
              location: templateEvent.location || "",
              calendarId: templateEvent.calendarId,
            });

            // Store in Firestore
            const monthKey = eventDate.toISOString().substring(0, 7);
            const timestamp = eventDate.getTime();
            const fullEventId = `${googleEventId}@google.com-${timestamp}`;

            const eventDoc = {
              calendarId: firestoreCalendarId,
              title: templateEvent.title,
              description: templateEvent.description || "",
              location: templateEvent.location || "",
              startTime: eventDate.toISOString(),
              endTime: endDate.toISOString(),
              source: "google",
              isAllDay: false,
              isRecurring: false,
              activities: templateEvent.activities || [],
              reminder: convertTemplateReminder(
                  templateEvent.reminder,
                  eventDate,
                  timezone,
              ),
            };

            const monthRef = admin
                .firestore()
                .collection("calendars")
                .doc(firestoreCalendarId)
                .collection("months")
                .doc(monthKey);

            const monthDoc = await monthRef.get();
            const existingEvents = monthDoc.exists ?
              monthDoc.data().events || {} :
              {};
            existingEvents[fullEventId] = eventDoc;
            await monthRef.set({events: existingEvents}, {merge: true});

            console.log("✅ Event stored:", fullEventId);

            // 🔔 Schedule notifications if reminder exists
            if (eventDoc.reminder && eventDoc.reminder.scheduledFor) {
              console.log("📲 Scheduling notifications for reminder...");

              // Get all calendar subscribers
              const subscribers = await getCalendarSubscribers(
                  firestoreCalendarId,
              );
              console.log(`📋 Found ${subscribers.length} subscriber(s)`);

              // Schedule notification for each subscriber
              for (const subscriberId of subscribers) {
                const reminderData = {
                  userId: subscriberId,
                  eventId: fullEventId,
                  title: `Reminder: ${templateEvent.title}`,
                  body: templateEvent.title,
                  scheduledFor: eventDoc.reminder.scheduledFor,
                  createdAt: Timestamp.now(),
                  data: {
                    screen: "Calendar",
                    eventId: fullEventId,
                    app: "checklist-app",
                    date: eventDoc.startTime,
                  },
                };

                // Add recurring config if present
                if (
                  eventDoc.reminder.isRecurring &&
                  eventDoc.reminder.recurringConfig
                ) {
                  reminderData.isRecurring = true;
                  reminderData.recurringConfig =
                    eventDoc.reminder.recurringConfig;
                }

                await admin
                    .firestore()
                    .collection("pendingNotifications")
                    .add(reminderData);

                console.log(
                    `✅ Notification scheduled for user: ${subscriberId}`,
                );
              }
            }

            results.push({success: true, title: templateEvent.title});
            console.log("✅ Created:", templateEvent.title);
          } catch (error) {
            console.error("❌ Failed:", templateEvent.title, error.message);
            results.push({
              success: false,
              title: templateEvent.title,
              error: error.message,
            });
          }
        }

        const successful = results.filter((r) => r.success).length;
        return {
          success: true,
          message: `Created ${successful} of ${template.events.length} events`,
          results: results,
        };
      } catch (error) {
        console.error("❌ CRITICAL ERROR:", error);
        console.error("❌ Error message:", error.message);
        console.error("❌ Error stack:", error.stack);
        throw new functions.https.HttpsError(
            "internal",
            `Function failed: ${error.message}`,
        );
      }
    },
);
