const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const {parseDateTime} = require("../utils/dateTimeHelpers");
const {
  createCalendarEvent,
  googleClientId,
  googleClientSecret,
  googleRefreshToken,
} = require("../utils/googleCalendarHelpers");

// 🎯 Hardcoded constants for Eric's account
const ERIC_USER_ID = "LCqH5hKx2bP8Q5gDGPmzRd65PB32";
const ERIC_GOOGLE_CALENDAR_ID = "ebraithwaite3@gmail.com";
const GYM_CHECKLIST_ID = "88084ec4-aa64-4e53-bf1a-c39bf889ec8c";
const WORKOUT_DURATION_HOURS = 1;

/**
 * Find Firestore calendar ID from Google Calendar ID
 * @param {string} googleCalendarId - Google Calendar ID
 * @return {Promise<string>} Firestore calendar ID
 */
const findFirestoreCalendarId = async (googleCalendarId) => {
  // Try direct lookup first
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
    const data = doc.data();
    if (data.source?.calendarId === googleCalendarId) {
      console.log("✅ Found calendar via source.calendarId");
      return doc.id;
    }
  }

  throw new Error(`Calendar not found for Google ID: ${googleCalendarId}`);
};

exports.addWorkout = onRequest(
    {
      secrets: [googleClientId, googleClientSecret, googleRefreshToken],
      cors: true,
    },
    async (req, res) => {
      // Handle OPTIONS request for CORS
      if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Methods", "POST");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        return res.status(204).send("");
      }

      console.log("🏋️‍♂️ Received workout request");
      console.log("Body:", JSON.stringify(req.body, null, 2));

      const {day, time, workout} = req.body;
      // Handle both "checklist" and "checklist " (with trailing space)
      const checklist = req.body.checklist || req.body["checklist "];

      // Validate required fields
      if (!day || !time || !workout) {
        return res
            .status(400)
            .json({error: "Date, Time & Workout are required"});
      }

      try {
        // 1️⃣ Parse the date and time
        const workoutDateTime = parseDateTime(day, time, "America/New_York");
        console.log("🗓️  Workout time:", workoutDateTime.toISO());

        // 2️⃣ Get user document to access templates
        const userDoc = await admin
            .firestore()
            .collection("users")
            .doc(ERIC_USER_ID)
            .get();

        if (!userDoc.exists) {
          throw new Error("User not found");
        }

        const userData = userDoc.data();

        // 3️⃣ Find workout template (case-insensitive match)
        const workoutTemplates = userData.workoutTemplates || [];
        const workoutTemplate = workoutTemplates.find(
            (t) => t.name.toLowerCase() === workout.toLowerCase(),
        );

        if (!workoutTemplate) {
          return res.status(404).json({
            error: `Workout template "${workout}" not found`,
            availableTemplates: workoutTemplates.map((t) => t.name),
          });
        }

        console.log("✅ Found workout template:", workoutTemplate.name);

        // 4️⃣ Build workout activity with proper exercise structure
        // Templates have {exerciseId, order, setCount}
        // Workouts need {exerciseId, order, sets: [{reps, weight, etc.}]}
        const workoutExercises = (workoutTemplate.exercises || []).map(
            (templateEx, index) => {
              const setCount = templateEx.setCount || 3;

              // Initialize sets with tracking fields
              const sets = Array(setCount)
                  .fill(null)
                  .map((_, setIndex) => {
                    const set = {
                      id: `set-${Date.now()}-${index}-${setIndex}`,
                      completed: false,
                      // Initialize tracking fields to 0
                      reps: 0,
                      weight: 0,
                    };
                    return set;
                  });

              return {
                id: `exercise-${Date.now()}-${index}`,
                exerciseId: templateEx.exerciseId,
                order: index,
                sets: sets,
              };
            },
        );

        const activities = [];

        // Add workout activity with initialized exercises
        activities.push({
          activityType: "workout",
          id: `workout-${Date.now()}`,
          name: workoutTemplate.name,
          templateId: workoutTemplate.id,
          createdAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
          completedAt: null,
          exercises: workoutExercises,
        });

        // 5️⃣ Get checklist template if requested
        let checklistTemplate = null;
        let reminderTime = null;

        console.log(
            "🔍 Checklist param:",
            checklist,
            "Type:",
            typeof checklist,
        );

        // Check for any truthy checklist value
        const checklistEnabled = checklist &&
          (checklist === true ||
           checklist === 1 ||
           String(checklist).toLowerCase() === "true" ||
           String(checklist).toLowerCase() === "yes");

        if (checklistEnabled) {
          const checklistTemplates = userData.checklistTemplates || [];
          console.log(
              "📋 Found",
              checklistTemplates.length,
              "templates",
          );
          console.log("🔎 Looking for ID:", GYM_CHECKLIST_ID);

          checklistTemplate = checklistTemplates.find(
              (ct) => ct.id === GYM_CHECKLIST_ID,
          );

          if (!checklistTemplate) {
            console.log("❌ Checklist template not found!");
            console.log(
                "Available IDs:",
                checklistTemplates.map((ct) => ct.id),
            );
          }

          if (checklistTemplate) {
            console.log("✅ Found checklist template:", checklistTemplate.name);

            // Add checklist activity
            activities.push({
              activityType: "checklist",
              id: checklistTemplate.id,
              name: checklistTemplate.name,
              items: checklistTemplate.items || [],
            });

            // Calculate reminder time (6:30 AM on event day in Eastern time)
            const [reminderHour, reminderMinute] = checklistTemplate
                .defaultReminderTime
                .split(":")
                .map(Number);

            // Use Luxon to set time in the correct timezone
            const reminderDateTime = workoutDateTime.set({
              hour: reminderHour,
              minute: reminderMinute,
              second: 0,
              millisecond: 0,
            });
            reminderTime = reminderDateTime.toJSDate();

            console.log(
                "⏰ Reminder time:",
                reminderTime.toISOString(),
            );
          }
        }

        // 6️⃣ Calculate end time (start + 1 hour)
        const startDate = workoutDateTime.toJSDate();
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + WORKOUT_DURATION_HOURS);

        // 7️⃣ Create event in Google Calendar
        console.log("📅 Creating Google Calendar event...");
        const googleEventId = await createCalendarEvent({
          title: workoutTemplate.name,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          description: `${workoutTemplate.exercises?.length || 0} exercises`,
          location: "",
          calendarId: ERIC_GOOGLE_CALENDAR_ID,
        });

        console.log("✅ Google event created:", googleEventId);

        // 8️⃣ Find Firestore calendar ID
        const firestoreCalendarId = await findFirestoreCalendarId(
            ERIC_GOOGLE_CALENDAR_ID,
        );

        // 9️⃣ Store in Firestore
        const monthKey = startDate.toISOString().substring(0, 7); // "2026-02"
        const timestamp = startDate.getTime();
        const fullEventId = `${googleEventId}@google.com-${timestamp}`;

        const eventDoc = {
          calendarId: firestoreCalendarId,
          title: workoutTemplate.name,
          description: `${workoutTemplate.exercises?.length || 0} exercises`,
          location: "",
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          source: "google",
          isAllDay: false,
          isRecurring: false,
          activities: activities,
        };

        // Add reminder if checklist was included
        if (reminderTime) {
          eventDoc.reminder = {
            scheduledFor: reminderTime.toISOString(),
            isRecurring: false,
          };
        }

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

        console.log("✅ Event stored in Firestore:", fullEventId);

        // 🔟 Schedule reminder in masterConfig.reminders[] if reminder exists
        if (reminderTime && checklistTemplate) {
          console.log("📲 Scheduling reminder in masterConfig...");

          const reminderId = `${fullEventId}-checklist-${checklistTemplate.id}`;
          const now = new Date().toISOString();
          const newReminder = {
            id: reminderId,
            deliveryMode: "push",
            title: `Reminder: ${checklistTemplate.name}`,
            message: checklistTemplate.name,
            eventId: fullEventId,
            scheduledTime: reminderTime.toISOString(),
            acknowledgedAt: null,
            notification: {
              title: `Reminder: ${checklistTemplate.name}`,
              body: checklistTemplate.name,
              screen: "Calendar",
              handlerName: null,
              handlerParams: null,
              data: {
                screen: "Calendar",
                eventId: fullEventId,
                checklistId: checklistTemplate.id,
                app: "checklist-app",
                date: startDate.toISOString(),
              },
            },
            paused: false,
            pausedUntil: null,
            reminderType: "oneTime",
            recurringIntervalMinutes: null,
            recurringIntervalDays: null,
            recurringSchedule: null,
            createdAt: now,
            updatedAt: now,
            deletable: true,
          };

          const configRef = admin.firestore()
              .doc(`masterConfig/${ERIC_USER_ID}`);
          const configSnap = await configRef.get();
          const existing = configSnap.exists ?
              (configSnap.data().reminders || []) :
              [];
          const updated = existing.some((r) => r.id === reminderId) ?
              existing.map((r) => r.id === reminderId ? newReminder : r) :
              [...existing, newReminder];

          await configRef.set({reminders: updated}, {merge: true});
          console.log("✅ Reminder scheduled in masterConfig:", reminderId);
        }

        // Success response (Siri-friendly)
        const dateStr = workoutDateTime.toLocaleString({
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        const message = checklistTemplate ?
          `Workout and checklist have been set for ${dateStr}` :
          `Workout has been set for ${dateStr}`;

        return res.status(200).json({message});
      } catch (error) {
        console.error("❌ Error adding workout:", error);
        return res.status(500).json({
          error: "Failed to add workout",
          message: error.message,
        });
      }
    },
);
