import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // Show the notification
    shouldPlaySound: true,   // Play sound
    shouldSetBadge: false,   // Don't update badge count
  }),
});

/**
 * Request notification permissions from the user
 * Returns true if granted, false otherwise
 */
export async function requestNotificationPermissions() {
  // Only works on physical devices, not simulators
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return false;
  }

  // Check current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If not granted, ask the user
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission to receive notifications was denied');
    return false;
  }

  console.log('Notification permissions granted!');
  return true;
}

/**
 * Get the FCM push token for this device
 * Returns the token string or null if failed
 */
export async function getPushToken() {
  try {
    // This gets the FCM token (not Expo push token)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData.data;
    
    console.log('Got push token:', token);
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Save the push token to Firestore for this user
 */
export async function savePushTokenToFirestore(userId, token) {
  try {
    const db = getFirestore();
    const userRef = doc(db, 'users', userId);

    await setDoc(userRef, {
      pushToken: token,
      platform: Platform.OS,
      lastTokenUpdate: new Date().toISOString(),
    }, { merge: true }); // merge: true means don't overwrite other user data

    console.log('Push token saved to Firestore');
    return true;
  } catch (error) {
    console.error('Error saving push token:', error);
    return false;
  }
}

/**
 * Complete setup: request permissions, get token, save to Firestore
 * Call this when user logs in
 */
export async function setupPushNotifications(userId) {
  // Step 1: Request permissions
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('Cannot setup push notifications without permissions');
    return false;
  }

  // Step 2: Get push token
  const token = await getPushToken();
  if (!token) {
    console.log('Failed to get push token');
    return false;
  }

  // Step 3: Save to Firestore
  const saved = await savePushTokenToFirestore(userId, token);
  if (!saved) {
    console.log('Failed to save push token');
    return false;
  }

  console.log('✅ Push notifications fully setup!');
  return true;
}