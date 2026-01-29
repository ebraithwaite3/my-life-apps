import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { DateTime } from "luxon";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  if (!Device.isDevice) {
    console.log("Push notifications only work on physical devices");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permission to receive notifications was denied");
    return false;
  }

  console.log("Notification permissions granted!");
  return true;
}

/**
 * Get Expo Push Token (works with EAS builds)
 */
export async function getPushToken() {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "598271a6-9d37-4879-b7a3-70879175d9f0", // ←  TO DO: UPDATE THIS FOR OTHER APPS
    });
    

    const token = tokenData.data;

    console.log("Got Expo push token:", token);
    return token;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
}

/**
 * Save app-specific push token to Firestore
 * @param {string} userId - User's ID
 * @param {string} token - Expo push token
 * @param {string} appId - App identifier (e.g., 'organizer-app', 'checklist-app')
 */
export async function savePushTokenToFirestore(userId, token, appId) {
  try {
    const db = getFirestore();
    const userRef = doc(db, "users", userId);

    // Use bracket notation to create nested field path
    await updateDoc(userRef, {
      [`pushTokens.${appId}`]: token,
      [`pushTokens.${appId}_platform`]: Platform.OS,
      [`pushTokens.${appId}_lastUpdate`]: DateTime.now().toISO(),
    });

    console.log(`✅ Push token saved for ${appId}`);
    return true;
  } catch (error) {
    console.error("Error saving push token:", error);
    return false;
  }
}

/**
 * Setup push notifications for a specific app
 * @param {string} userId - User's ID
 * @param {string} appId - App identifier (e.g., 'organizer-app')
 */
export async function setupPushNotifications(userId, appId) {
  if (!appId) {
    console.error("❌ appId is required for setupPushNotifications");
    return false;
  }

  console.log(`Setting up push notifications for ${appId}...`);

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log("Cannot setup push notifications without permissions");
    return false;
  }

  const token = await getPushToken();
  if (!token) {
    console.log("Failed to get push token");
    return false;
  }

  const saved = await savePushTokenToFirestore(userId, token, appId);
  if (!saved) {
    console.log("Failed to save push token");
    return false;
  }

  console.log(`✅ Push notifications fully setup for ${appId}!`);
  return true;
}