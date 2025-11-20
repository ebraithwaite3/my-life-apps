const {onCall} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

/**
 * Send push notification via Expo Push Service
 */
exports.sendPushNotification = onCall(async (request) => {
  const {userId, title, body, data} = request.data;

  try {
    console.log(`📲 Sending notification to user: ${userId}`);

    // Get user's push token from Firestore
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const pushToken = userData.pushToken;

    if (!pushToken) {
      throw new Error("User does not have a push token");
    }

    console.log(`Found push token for user ${userId}`);

    // Build message for Expo Push Service
    const message = {
      to: pushToken,
      sound: "default",
      title: title || "MyOrganizer",
      body: body || "",
      data: data || {},
    };

    // Send to Expo Push Service
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json();

    if (responseData.data && responseData.data[0].status === "error") {
      throw new Error(
          `Expo push error: ${responseData.data[0].message}`,
      );
    }

    console.log(`✅ Notification sent successfully:`, responseData);

    return {
      success: true,
      messageId: responseData.data[0].id,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Failed to send notification:", error);
    throw error;
  }
});
