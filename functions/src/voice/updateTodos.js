const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * updateTodos — replace the checklist items for one or more To Do events.
 *
 * Expected body:
 * {
 *   action: "updateTodos",
 *   date: "yyyy-MM-dd",
 *   todos: [
 *     {
 *       person: "Me" | "Jack" | "Ellie",
 *       userId: string,
 *       todoTitle: string,
 *       eventId: string | null,
 *       monthKey: "yyyy-LL",
 *       items: [{ id, name, completed, ...rest }]
 *     }
 *   ]
 * }
 *
 * For each entry:
 *   - If eventId is present → direct write to that event's checklist.
 *   - If eventId is null → skip (no To Do event exists for that person today).
 */
exports.updateTodos = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  const body = req.body || {};

  // Accept either { action, todos: [...] } or a bare single-person object
  let todos;
  let date;
  if (Array.isArray(body.todos)) {
    todos = body.todos;
    date = body.date;
  } else if (body.userId && body.items) {
    todos = [body];
    date = body.date || null;
  } else {
    return res.status(400).json({
      error: "Expected { todos: [...] } or a single person object" +
        " with userId + items",
    });
  }

  console.log(`📝 updateTodos — date: ${date}, entries: ${todos.length}`);

  const db = admin.firestore();
  const results = [];

  for (const entry of todos) {
    const {person, userId, todoTitle, eventId, monthKey, items} = entry;

    if (!eventId) {
      console.log(`⚠️  ${person}: no eventId — skipping`);
      results.push({person, status: "skipped", reason: "no eventId"});
      continue;
    }

    if (!userId || !monthKey || !Array.isArray(items)) {
      console.log(`⚠️  ${person}: missing required fields — skipping`);
      results.push({person, status: "skipped", reason: "missing fields"});
      continue;
    }

    try {
      const monthRef = db
          .collection("activities")
          .doc(userId)
          .collection("months")
          .doc(monthKey);

      const monthDoc = await monthRef.get();

      if (!monthDoc.exists) {
        console.log(`⚠️  ${person}: month doc ${monthKey} not found`);
        results.push({
          person, status: "skipped", reason: "month doc not found",
        });
        continue;
      }

      const monthData = monthDoc.data();
      const event = monthData.items?.[eventId];

      if (!event) {
        console.log(
            `⚠️  ${person}: eventId ${eventId} not found in ${monthKey}`,
        );
        results.push({person, status: "skipped", reason: "event not found"});
        continue;
      }

      // Find the checklist activity index
      const activities = event.activities || [];
      const checklistIdx = activities.findIndex(
          (a) => a.activityType === "checklist",
      );

      let updatedActivities;
      if (checklistIdx === -1) {
        // No checklist yet — create one
        updatedActivities = [
          ...activities,
          {
            activityType: "checklist",
            items,
            updatedAt: new Date().toISOString(),
          },
        ];
      } else {
        updatedActivities = activities.map((a, i) => {
          if (i !== checklistIdx) return a;
          return {...a, items, updatedAt: new Date().toISOString()};
        });
      }

      const updatedEvent = {...event, activities: updatedActivities};

      await monthRef.set(
          {items: {[eventId]: updatedEvent}},
          {merge: true},
      );

      console.log(
          `✅ ${person} (${todoTitle}): wrote ${items.length} items` +
          ` to ${monthKey}/${eventId}`,
      );

      results.push({person, status: "updated", itemCount: items.length});
    } catch (err) {
      console.error(`❌ ${person}:`, err.message);
      results.push({person, status: "error", reason: err.message});
    }
  }

  return res.status(200).json({
    success: true,
    date,
    results,
  });
});
