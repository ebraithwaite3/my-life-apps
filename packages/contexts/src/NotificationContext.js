import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import * as Notifications from "expo-notifications";
import { useNavigation } from "@react-navigation/native";

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
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(
          "📱 Notification received while app is open:",
          notification
        );

        // Show our custom banner
        setCurrentNotification(notification);
      });

    // ========================================
    // LISTENER 2: User tapped notification (from any state: open, background, closed)
    // ========================================
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 User tapped notification:", response);

        const notification = response.notification;
        const data = notification.request.content.data;

        // Handle navigation based on notification data
        handleNotificationTap(data);
      });

    // ========================================
    // CHECK: Did user tap a notification to open the app?
    // ========================================
    // ✅ NEW (current):
    const response = Notifications.getLastNotificationResponse();
    if (response) {
      console.log("🚀 App opened from notification tap:", response);
      const data = response.notification.request.content.data;
      handleNotificationTap(data);
    }

    // Cleanup listeners when component unmounts
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  /**
 * Handle notification tap - navigate to the right screen
 */
const handleNotificationTap = (data) => {
  console.log("Handling notification tap with data:", data);

  if (data?.screen) {
    // Extract screen and pass everything else as params
    const { screen, app, ...params } = data;
    
    console.log("📍 Navigating to:", screen, "with params:", params);
    
    // Navigate through nested stack: Main -> Tab -> Screen
    navigation.navigate("Main", {
      screen: screen,
      params: {
        screen: `${screen}Home`,
        params: params
      }
    });
  } else {
    console.warn("Notification missing screen data, navigating to Calendar");
    navigation.navigate("Main", {
      screen: "Calendar",
      params: {
        screen: "CalendarHome"
      }
    });
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
