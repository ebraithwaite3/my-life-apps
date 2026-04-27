const {onCall} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

/**
 * Send push notification via Expo Push Service
 */
exports.sendPushNotification = onCall(async (request) => {
  const {userId, title, body, data} = request.data;
  const targetApp = data?.app || "organizer-app"; // ← Default to organizer

  try {
    console.log(`📲 Sending ${targetApp} notification to user: ${userId}`);

    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();

    // NEW: Get app-specific token
    const pushToken = userData.pushTokens?.[targetApp];

    if (!pushToken) {
      console.log(`User ${userId} doesn't have ${targetApp} installed`);
      return {
        success: false,
        message: `User doesn't have ${targetApp} installed`,
      };
    }

    console.log(`Found ${targetApp} push token for user ${userId}`);

    // Build message for Expo Push Service
    const message = {
      to: pushToken,
      sound: data?.silent === true ? null : "default",
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

    console.log("Expo API Response:", JSON.stringify(responseData, null, 2));

    if (responseData.data) {
      const result = responseData.data[0];
      if (result && result.status === "error") {
        throw new Error(`Expo push error: ${result.message}`);
      }

      console.log(`✅ Notification sent successfully:`, result);

      return {
        success: true,
        messageId: result && result.id ? result.id : "unknown",
        status: result && result.status ? result.status : "sent",
        sentAt: new Date().toISOString(),
      };
    } else if (responseData.errors) {
      const errorMsg = JSON.stringify(responseData.errors);
      throw new Error(`Expo API error: ${errorMsg}`);
    } else {
      console.log(`✅ Notification sent (unknown response format)`);

      return {
        success: true,
        messageId: "unknown",
        sentAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("❌ Failed to send notification:", error);
    throw error;
  }
});

exports.sendBatchPushNotification = onCall(async (request) => {
  const {userIds, title, body, data} = request.data;
  const targetApp = data?.app || "checklist-app";

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error("userIds must be a non-empty array");
  }

  try {
    console.log(
        `📲 Sending notifications to ${userIds.length} users for ${targetApp}`,
    );

    const db = admin.firestore();
    let totalSent = 0;
    let totalFailed = 0;

    // Send individually to avoid cross-app batching issues
    for (const userId of userIds) {
      try {
        const userDoc = await db.collection("users").doc(userId).get();

        if (!userDoc.exists) {
          console.log(`⚠️ User ${userId} not found`);
          totalFailed++;
          continue;
        }

        const userData = userDoc.data();
        const pushToken = userData.pushTokens?.[targetApp];

        if (!pushToken || !pushToken.startsWith("ExponentPushToken[")) {
          console.log(`⚠️ User ${userId} has no valid ${targetApp} token`);
          totalFailed++;
          continue;
        }

        // Send individual notification
        const message = {
          to: pushToken,
          sound: data?.silent === true ? null : "default",
          title: title || "Notification",
          body: body || "",
          data: data || {},
        };

        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });

        const responseData = await response.json();

        // Individual sends return data.status, not data[0].status
        if (responseData.data?.status === "ok") {
          // ← Remove [0]
          console.log(`✅ Sent to user ${userId}`);
          totalSent++;
        } else {
          console.error(`❌ Failed for user ${userId}:`, responseData);
          totalFailed++;
        }
      } catch (error) {
        console.error(`Error sending to user ${userId}:`, error);
        totalFailed++;
      }
    }

    console.log(`✅ Complete: ${totalSent} sent, ${totalFailed} failed`);

    return {
      success: true,
      totalSent,
      totalFailed,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Batch notification failed:", error);
    throw error;
  }
});
