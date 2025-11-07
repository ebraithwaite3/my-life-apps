const {onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin (only once)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.getUserData = onCall((request) => {
  try {
    logger.info("getUserData called", {data: request.data});

    const userId = request.data.userId;

    if (!userId) {
      throw new Error("userId is required");
    }

    logger.info("Getting user data", {userId});

    return {
      success: true,
      data: {
        userId: userId,
        message: "This will eventually fetch real data!",
      },
    };
  } catch (error) {
    logger.error("Error in getUserData", error);
    throw error;
  }
});

// NEW: Save a note to user's Firestore document
exports.saveUserNote = onCall(async (request) => {
  try {
    logger.info("saveUserNote called", {data: request.data});

    const {userId, note} = request.data;

    if (!userId) {
      throw new Error("userId is required");
    }

    if (!note) {
      throw new Error("note is required");
    }

    logger.info("Saving note for user", {userId, noteLength: note.length});

    // Save to Firestore
    const userRef = db.collection("users").doc(userId);
    const timestamp = new Date().toISOString();

    await userRef.update({
      lastNote: note,
      lastNoteUpdatedAt: timestamp,
      updatedAt: timestamp,
    });

    logger.info("Note saved successfully", {userId});

    return {
      success: true,
      message: "Note saved successfully!",
      timestamp: timestamp,
    };
  } catch (error) {
    logger.error("Error in saveUserNote", error);
    throw error;
  }
});
