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

    console.log(
        "Expo API Response:",
        JSON.stringify(responseData, null, 2),
    );

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
  const targetApp = data?.app; // Optional: specific app

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error("userIds must be a non-empty array");
  }

  try {
    console.log(`📲 Sending batch notification to ${userIds.length} users`);

    const db = admin.firestore();
    const messages = [];
    const results = [];

    for (const userId of userIds) {
      try {
        const userDoc = await db.collection("users").doc(userId).get();

        if (!userDoc.exists) {
          results.push({userId, success: false, error: "User not found"});
          continue;
        }

        const userData = userDoc.data();

        if (targetApp) {
          // Send to specific app only
          const pushToken = userData.pushTokens?.[targetApp];

          if (!pushToken) {
            results.push({
              userId,
              success: false,
              error: `No ${targetApp} token`,
            });
            continue;
          }

          messages.push({
            to: pushToken,
            sound: "default",
            title: title || "MyOrganizer",
            body: body || "",
            data: Object.assign({}, data || {}, {userId}),
          });
        } else {
          // Send to ALL apps user has
          const tokens = userData.pushTokens || {};

          for (const [app, token] of Object.entries(tokens)) {
            messages.push({
              to: token,
              sound: "default",
              title: title || "MyOrganizer",
              body: body || "",
              data: Object.assign({}, data || {}, {userId, app}),
            });
          }
        }
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error.message,
        });
      }
    }

    // Send batch to Expo
    if (messages.length > 0) {
      const response = await fetch(
          "https://exp.host/--/api/v2/push/send",
          {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(messages),
          },
      );

      const responseData = await response.json();
      console.log(
          "Expo Batch Response:",
          JSON.stringify(responseData, null, 2),
      );

      if (responseData.data) {
        responseData.data.forEach((result, index) => {
          results.push({
            userId: userIds[index],
            success: result.status === "ok",
            messageId: result.id,
            error: result.status === "error" ? result.message : null,
          });
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`✅ Batch complete: ${successCount}/${userIds.length} sent`);

    return {
      success: true,
      totalSent: successCount,
      totalFailed: userIds.length - successCount,
      results: results,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Batch notification failed:", error);
    throw error;
  }
});
