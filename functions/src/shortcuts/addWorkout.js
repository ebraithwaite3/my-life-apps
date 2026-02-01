const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { parseDateTime } = require('../utils/dateTimeHelpers');

exports.addWorkout = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).send("");
  }

  console.log("🏋️‍♂️ Received request");
  console.log("Method:", req.method);
  console.log("Body:", JSON.stringify(req.body, null, 2));

  const {date, time, workout, addChecklist} = req.body;

  console.log("📅 Date:", date);
  console.log("⏰ Time:", time);
  console.log("🏋️‍♂️ Workout:", workout);
  console.log("✅ Checklist:", addChecklist);

  // Validate required fields
  if (!date || !time || !workout) {
    return res.status(400).json({error: "Date, Time, and Workout are required"});
  }

  try {
    // 🎯 Parse the date and time into a Luxon DateTime
    const workoutDateTime = parseDateTime(date, time, 'America/New_York');
    
    console.log("🗓️  Parsed DateTime:", workoutDateTime.toISO());
    console.log("📍 Human readable:", workoutDateTime.toLocaleString({
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }));

    return res.status(200).json({
      message: "Workout added successfully",
      parsedDateTime: workoutDateTime.toISO(),
      readable: workoutDateTime.toLocaleString({
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    });
  } catch (error) {
    console.error("❌ Error adding workout:", error);
    return res.status(500).json({
      error: "Failed to parse date/time",
      message: error.message,
    });
  }
});
