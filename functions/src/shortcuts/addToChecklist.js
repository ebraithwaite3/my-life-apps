const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {DateTime} = require("luxon");

const ERIC_USER_ID = "LCqH5hKx2bP8Q5gDGPmzRd65PB32";
const JACK_USER_ID = "ObqbPOKgzwYr2SmlN8UQOaDbkzE2";
const ELLIE_USER_ID = "CjW9bPGIjrgEqkjE9HxNF6xuxfA3";

const TIMEZONE = "America/New_York";

const uuid = () =>
  `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const capitalize = (str) =>
  str
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

/**
 * Resolves "Today" or "Tomorrow" to yyyy-MM-dd in Eastern time.
 * @param {string} when - "Today" or "Tomorrow"
 * @return {string} Date string in yyyy-MM-dd format
 */
const resolveDate = (when) => {
  const now = DateTime.now().setZone(TIMEZONE);
  if (when.toLowerCase() === "tomorrow") {
    return now.plus({days: 1}).toFormat("yyyy-MM-dd");
  }
  return now.toFormat("yyyy-MM-dd");
};

/**
 * Finds an event in the internal items map matching title on date.
 * @param {Object} items - Firestore items map
 * @param {string} targetDate - yyyy-MM-dd
 * @param {string} titleMatch - title to match (case-insensitive)
 * @return {Object|null} { eventId, event } or null
 */
const findInternalEvent = (items, targetDate, titleMatch) => {
  for (const [eventId, event] of Object.entries(items)) {
    if (!event.startTime) continue;
    const eventDate = DateTime.fromISO(event.startTime)
        .setZone(TIMEZONE)
        .toFormat("yyyy-MM-dd");
    const titleLower = (event.title || "").toLowerCase().trim();
    if (
      eventDate === targetDate &&
      titleLower === titleMatch.toLowerCase()
    ) {
      return {eventId, event};
    }
  }
  return null;
};

/**
 * Appends an item to the checklist activity in the given activities array.
 * @param {Array} activities - existing activities array
 * @param {string} itemName - capitalized item name
 * @return {Object} { updatedActivities, error }
 */
const appendItemToChecklist = (activities, itemName) => {
  const idx = (activities || []).findIndex(
      (a) => a.activityType === "checklist",
  );
  if (idx === -1) {
    return {updatedActivities: null, error: "No checklist activity found"};
  }
  const updatedActivities = activities.map((a, i) => {
    if (i !== idx) return a;
    return {
      ...a,
      items: [
        ...(a.items || []),
        {id: uuid(), name: itemName, completed: false},
      ],
      updatedAt: new Date().toISOString(),
    };
  });
  return {updatedActivities, error: null};
};

exports.addToChecklist = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  const {name, when, item} = req.body;
  console.log("📦 addToChecklist request:", {name, when, item});

  if (!name || !when || !item) {
    return res.status(400).json({
      error: "Missing fields: name, when (Today/Tomorrow), item",
    });
  }

  const nameLower = name.toLowerCase().trim();
  if (!["me", "jack", "ellie"].includes(nameLower)) {
    return res.status(400).json({error: "name must be Me, Jack, or Ellie"});
  }

  const whenLower = when.toLowerCase().trim();
  if (!["today", "tomorrow"].includes(whenLower)) {
    return res.status(400).json({error: "when must be Today or Tomorrow"});
  }

  const targetDate = resolveDate(when);
  const luxonDate = DateTime.fromFormat(targetDate, "yyyy-MM-dd", {
    zone: TIMEZONE,
  });
  const monthKey = luxonDate.toFormat("yyyy-LL");
  const itemName = capitalize(item);

  // Resolve userId and display name
  const userMap = {
    me: {userId: ERIC_USER_ID, displayName: "My", titleMatch: "to do"},
    jack: {userId: JACK_USER_ID, displayName: "Jack's", titleMatch: "to do"},
    ellie: {userId: ELLIE_USER_ID, displayName: "Ellie's", titleMatch: "to do"},
  };
  const {userId, displayName, titleMatch} = userMap[nameLower];

  console.log(`📅 Target: ${targetDate}, month: ${monthKey}, user: ${userId}`);

  const db = admin.firestore();

  try {
    const monthRef = db
        .collection("activities")
        .doc(userId)
        .collection("months")
        .doc(monthKey);

    const monthDoc = await monthRef.get();

    if (!monthDoc.exists || !monthDoc.data().items) {
      return res.status(404).json({
        error: "To Do List not created yet",
        message: `No events found for ${displayName} list on ${targetDate}.`,
      });
    }

    const items = monthDoc.data().items;
    const found = findInternalEvent(items, targetDate, titleMatch);

    if (!found) {
      return res.status(404).json({
        error: "To Do List not created yet",
        message: `No "To Do" event found for ${displayName}` +
          ` list on ${targetDate}.`,
      });
    }

    const {eventId, event} = found;
    const {updatedActivities, error} = appendItemToChecklist(
        event.activities || [],
        itemName,
    );

    if (error) {
      return res.status(404).json({
        error: "To Do List not created yet",
        message: `${displayName} To Do on ${targetDate}: ${error}`,
      });
    }

    const updated = {...event, activities: updatedActivities};
    await monthRef.set(
        {items: {...items, [eventId]: updated}},
        {merge: true},
    );

    console.log(
        `✅ Added "${itemName}" to ${displayName} To Do on ${targetDate}`,
    );
    return res.status(200).json({
      message: `Added "${itemName}" to ${displayName} To Do list for ${when}`,
    });
  } catch (error) {
    console.error("❌ addToChecklist error:", error);
    return res.status(500).json({
      error: "Failed to add item",
      message: error.message,
    });
  }
});
