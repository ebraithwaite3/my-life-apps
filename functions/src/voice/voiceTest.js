const functions = require("firebase-functions");
const {DateTime} = require("luxon");

/**
 * Voice test endpoint — receive JSON, log it, return success.
 * Used to verify Claude Voice Chat can hit a Firebase function.
 */
exports.voiceTest = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  const timestamp = DateTime.now()
      .setZone("America/New_York")
      .toFormat("yyyy-MM-dd HH:mm:ss ZZZZ");

  console.log("🎙️ === VOICE TEST HIT ===");
  console.log(`⏰ Timestamp: ${timestamp}`);
  console.log("📦 Payload:", JSON.stringify(req.body, null, 2));
  console.log("🎙️ === END VOICE TEST ===");

  return res.status(200).json({
    success: true,
    received: req.body,
    timestamp,
  });
});
