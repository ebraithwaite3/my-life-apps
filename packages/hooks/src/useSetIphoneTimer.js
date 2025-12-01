import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

export const useSetIphoneTimer = () => {
  const setIphoneTimer = async (seconds) => {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ Timer Complete!",
          body: `Your ${Math.floor(seconds / 60)} minute timer is done!`,
          sound: true,
        },
        trigger: {
          type: 'timeInterval',  // ← Proper trigger type
          seconds: seconds,
          repeats: false,        // Don't repeat
        },
      });

      console.log(`✅ Timer scheduled for ${seconds}s - ID: ${notificationId}`);
      
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Error', 'Failed to set timer');
    }
  };

  return setIphoneTimer;
};