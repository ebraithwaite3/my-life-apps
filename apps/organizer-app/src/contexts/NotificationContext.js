import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [currentNotification, setCurrentNotification] = useState(null);
  const navigation = useNavigation();
  
  // Refs to store listeners so we can clean them up
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // ========================================
    // LISTENER 1: Notification received while app is OPEN (foreground)
    // ========================================
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received while app is open:', notification);
      
      // Show our custom banner
      setCurrentNotification(notification);
    });

    // ========================================
    // LISTENER 2: User tapped notification (from any state: open, background, closed)
    // ========================================
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 User tapped notification:', response);
      
      const notification = response.notification;
      const data = notification.request.content.data;
      
      // Handle navigation based on notification data
      handleNotificationTap(data);
    });

    // ========================================
    // CHECK: Did user tap a notification to open the app?
    // ========================================
    Notifications.getLastNotificationResponseAsync()
      .then(response => {
        if (response) {
          console.log('🚀 App opened from notification tap:', response);
          const data = response.notification.request.content.data;
          handleNotificationTap(data);
        }
      });

    // Cleanup listeners when component unmounts
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  /**
   * Handle notification tap - navigate to the right screen
   */
  const handleNotificationTap = (data) => {
    console.log('Handling notification tap with data:', data);

    // Example: Navigate based on notification type
    if (data?.screen) {
      // If notification has a "screen" field, navigate there
      navigation.navigate(data.screen, data.params || {});
    } else if (data?.taskId) {
      // Example: Navigate to a specific task
      navigation.navigate('TaskDetail', { taskId: data.taskId });
    } else if (data?.eventId) {
      // Example: Navigate to a specific event
      navigation.navigate('EventDetail', { eventId: data.eventId });
    } else {
      // Default: Navigate to home or notifications screen
      navigation.navigate('Home');
    }
  };

  /**
   * Dismiss the banner
   */
  const dismissNotification = () => {
    setCurrentNotification(null);
  };

  /**
   * User tapped the banner - handle it like a notification tap
   */
  const handleBannerPress = (notification) => {
    const data = notification.request.content.data;
    handleNotificationTap(data);
  };

  const value = {
    currentNotification,
    dismissNotification,
    handleBannerPress,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};