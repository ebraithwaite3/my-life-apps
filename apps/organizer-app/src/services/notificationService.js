import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

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
 * Get Expo Push Token (works with EAS builds)
 */
export async function getPushToken() {
  try {
    // Get Expo Push Token (this works with both Expo Go and EAS builds)
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '8d24b3bd-9e5c-4de7-93b7-6268ea9a0d84', // Your EAS project ID from app.json
    });
    
    const token = tokenData.data;
    
    console.log('Got Expo push token:', token);
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

export async function savePushTokenToFirestore(userId, token) {
  try {
    const db = getFirestore();
    const userRef = doc(db, 'users', userId);

    await setDoc(userRef, {
      pushToken: token,
      platform: Platform.OS,
      lastTokenUpdate: new Date().toISOString(),
    }, { merge: true });

    console.log('Push token saved to Firestore');
    return true;
  } catch (error) {
    console.error('Error saving push token:', error);
    return false;
  }
}

export async function setupPushNotifications(userId) {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('Cannot setup push notifications without permissions');
    return false;
  }

  const token = await getPushToken();
  if (!token) {
    console.log('Failed to get push token');
    return false;
  }

  const saved = await savePushTokenToFirestore(userId, token);
  if (!saved) {
    console.log('Failed to save push token');
    return false;
  }

  console.log('✅ Push notifications fully setup!');
  return true;
}