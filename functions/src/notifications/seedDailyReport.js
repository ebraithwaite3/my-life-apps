/**
 * seedDailyReport.js — one-time script to create Eric's recurring 6:30 AM
 * daily report notification.
 *
 * Run from functions/ directory:
 *   node -e "require('./src/notifications/seedDailyReport')"
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or Firebase emulator to be set up.
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const ERIC_USER_ID = "LCqH5hKx2bP8Q5gDGPmzRd65PB32";
const TIMEZONE = "America/New_York";

// Calendars to skip (Google-managed, not relevant to the daily summary)
const SKIP_CALENDAR_IDS = [
  // eslint-disable-next-line max-len
  "60fb54bfbf0fc690d655bf2057eee90906183010ef2f228c22483960bd4f29b9@group.calendar.google.com",
  // eslint-disable-next-line max-len
  "84bb416ffcf57bf9ef64e5c0d7e4867fdebc51d60f38fec83c5a9c9611e62f8a@group.calendar.google.com",
];

const {DateTime} = require("luxon");

const seed = async () => {
  const db = admin.firestore();

  // First send: tomorrow at 6:30 AM in the user's timezone.
  // Luxon computes the correct UTC offset for the current DST state.
  const firstSend = DateTime.now()
      .setZone(TIMEZONE)
      .plus({days: 1})
      .set({hour: 6, minute: 30, second: 0, millisecond: 0});

  const firstSendDate = firstSend.toJSDate();

  const doc = {
    userId: ERIC_USER_ID,
    // No static title/body — handler generates them at send-time
    handlerName: "dailyReport",
    handlerParams: {
      timezone: TIMEZONE,
      skipCalendarIds: SKIP_CALENDAR_IDS,
      skipTitleKeywords: [], // add e.g. ["Birthday", "Holiday"] if needed
    },
    scheduledFor: admin.firestore.Timestamp.fromDate(firstSendDate),
    createdAt: admin.firestore.Timestamp.now(),
    isRecurring: true,
    recurringConfig: {
      intervalSeconds: 86400, // 1 day — scheduler uses timezone-aware math
      totalOccurrences: null, // infinite
      currentOccurrence: 1,
      lastSentAt: null,
    },
    data: {
      app: "checklist-app",
      screen: "Calendar",
    },
  };

  const ref = await db.collection("pendingNotifications").add(doc);

  console.log("✅ Daily report notification seeded.");
  console.log("   Doc ID     :", ref.id);
  console.log("   First send :", firstSend.toISO());
  console.log("   (UTC)      :", firstSendDate.toISOString());
};

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
