const functions = require("firebase-functions");
const admin = require("firebase-admin");

const USER_MAP = {
  "Me": "LCqH5hKx2bP8Q5gDGPmzRd65PB32",
  "Jack": "ObqbPOKgzwYr2SmlN8UQOaDbkzE2",
  "Ellie": "CjW9bPGIjrgEqkjE9HxNF6xuxfA3",
};

/**
 * setSilentMode — enable or disable silent mode for one or more users.
 *
 * POST body:
 * {
 *   "users": ["Me"] | ["Jack", "Ellie"] | ["All"],
 *   "action": "on" | "off"
 * }
 * @param {object} req - HTTP request
 * @param {object} res - HTTP response
 * @return {Promise<void>}
 */
exports.setSilentMode = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  const {users: rawUsers, action: rawAction} = req.body || {};
  console.log("setSilentMode received body:", JSON.stringify(req.body));

  // Accept either a proper array or a comma-separated string ("Me, Jack")
  let users;
  if (Array.isArray(rawUsers)) {
    users = rawUsers;
  } else if (typeof rawUsers === "string" && rawUsers.trim()) {
    users = rawUsers.split(",").map((s) => s.trim()).filter(Boolean);
  }

  if (!users || users.length === 0) {
    return res.status(400).json({
      error: "users must be a non-empty array or comma-separated string",
    });
  }

  // Trim + lowercase so Shortcuts whitespace/caps don't break it
  const action = typeof rawAction === "string" ?
    rawAction.trim().toLowerCase() :
    "";

  if (action !== "on" && action !== "off") {
    return res.status(400).json({
      error: "action must be \"on\" or \"off\"",
    });
  }

  const silentMode = action === "on";
  const db = admin.firestore();

  const targets = users[0] === "All" ? Object.keys(USER_MAP) : users;

  const results = await Promise.all(
      targets.map(async (name) => {
        const userId = USER_MAP[name];

        if (!userId) {
          return {name, status: "error", reason: "Unknown user"};
        }

        try {
          await db.doc(`masterConfig/${userId}`).set(
              {silentMode},
              {merge: true},
          );
          return {name, userId, silentMode};
        } catch (err) {
          console.error(`❌ setSilentMode failed for ${name}:`, err.message);
          return {name, userId, status: "error", reason: err.message};
        }
      }),
  );

  console.log(
      `🔕 setSilentMode "${action}" applied to: ` +
    `${targets.join(", ")}`,
  );

  return res.status(200).json({success: true, action, results});
});
