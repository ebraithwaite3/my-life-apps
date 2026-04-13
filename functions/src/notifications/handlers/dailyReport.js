const {DateTime} = require("luxon");

/**
 * dailyReport handler
 *
 * Queries Firestore at send-time to build a personalized daily summary.
 * Returns: { title, body } for the push notification.
 *
 * @param {string} userId
 * @param {object} params - handlerParams from the pendingNotification doc
 *   - timezone {string} default "America/New_York"
 *   - skipCalendarIds {string[]} calendar IDs to exclude from event count
 *   - skipTitleKeywords {string[]} event titles containing these are excluded
 * @param {FirebaseFirestore.Firestore} db
 */
module.exports = async (userId, params, db) => {
  try {
    const timezone = params.timezone || "America/New_York";
    const skipCalendarIds = new Set(params.skipCalendarIds || []);
    const skipTitleKeywords = (params.skipTitleKeywords || [])
        .map((k) => k.toLowerCase());

    const today = DateTime.now().setZone(timezone).startOf("day");
    const todayStr = today.toISODate(); // "2026-04-12"
    const monthKey = today.toFormat("yyyy-MM"); // "2026-04"

    // ── 1. Count today's calendar events ────────────────────────────────────
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return fallback();

    const userData = userDoc.data();
    const calendarIds = (userData.calendars || [])
        .map((c) => c.calendarId)
        .filter((id) => !!id && !skipCalendarIds.has(id));

    let eventCount = 0;

    for (const calendarId of calendarIds) {
      try {
        const monthDoc = await db
            .collection("calendars")
            .doc(calendarId)
            .collection("months")
            .doc(monthKey)
            .get();

        if (!monthDoc.exists) continue;

        const events = monthDoc.data().events || {};

        for (const event of Object.values(events)) {
          if (!event.startTime) continue;

          const eventDay = DateTime
              .fromISO(event.startTime, {zone: timezone})
              .toISODate();
          if (eventDay !== todayStr) continue;

          if (event.skipFromDailyReport === true) continue;

          if (skipTitleKeywords.length > 0) {
            const titleLower = (event.title || "").toLowerCase();
            if (skipTitleKeywords.some((kw) => titleLower.includes(kw))) {
              continue;
            }
          }

          // Don't count "To Do" as a calendar event — handled separately below
          if (event.title?.trim().toLowerCase() === "to do") continue;

          eventCount++;
        }
      } catch (calErr) {
        console.error(
            `[dailyReport] Error reading calendar ${calendarId}:`,
            calErr.message,
        );
      }
    }

    // ── 2. Count today's incomplete To Do items ──────────────────────────────
    // Activities live at: activities/{userId}/months/{monthKey}
    // The doc has an `items` map of events; find the one titled "To Do"
    let todoCount = 0;

    try {
      const activityMonthDoc = await db
          .collection("activities")
          .doc(userId)
          .collection("months")
          .doc(monthKey)
          .get();

      if (activityMonthDoc.exists) {
        const activityItems = activityMonthDoc.data().items || {};

        for (const event of Object.values(activityItems)) {
          if (event.title?.trim().toLowerCase() !== "to do") continue;

          // Confirm it's today
          if (event.startTime) {
            const eventDay = DateTime
                .fromISO(event.startTime, {zone: timezone})
                .toISODate();
            if (eventDay !== todayStr) continue;
          }

          const checklistActivity = (event.activities || [])
              .find((a) => a.activityType === "checklist");

          if (checklistActivity) {
            todoCount += (checklistActivity.items || [])
                .filter((i) => !i.completed).length;
          }
        }
      }
    } catch (todoErr) {
      console.error("[dailyReport] Error reading activities:", todoErr.message);
    }

    // ── 3. Build notification ────────────────────────────────────────────────
    const eventStr = `${eventCount} event${eventCount !== 1 ? "s" : ""}`;
    const todoStr = `${todoCount} to-do${todoCount !== 1 ? "s" : ""}`;

    return {
      title: "Here's What Today Looks Like",
      body: `${eventStr}  •  ${todoStr}`,
    };
  } catch (err) {
    console.error("[dailyReport] Handler failed:", err);
    return fallback();
  }
};

const fallback = () => ({
  title: "Here's What Today Looks Like",
  body: "Tap to see today's schedule",
});
