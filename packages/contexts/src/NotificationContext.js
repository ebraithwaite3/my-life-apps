import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import * as Notifications from "expo-notifications";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children, navigationRef }) => {
  const [currentNotification, setCurrentNotification] = useState(null);

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
    // CHECK: Did user tap a notification to open the app? (cold start)
    // Poll until navigationRef is ready, then handle
    const response = Notifications.getLastNotificationResponse();
    if (response) {
      console.log("🚀 App opened from notification tap:", response);
      const data = response.notification.request.content.data;

      // NavigationContainer may not be ready yet on cold start — wait for it
      const waitAndNavigate = () => {
        if (navigationRef?.isReady()) {
          handleNotificationTap(data);
        } else {
          setTimeout(waitAndNavigate, 100);
        }
      };
      waitAndNavigate();
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
  console.log("🔔 handleNotificationTap — full data:", JSON.stringify(data));

  if (!navigationRef?.isReady()) {
    console.warn("Navigation not ready yet");
    return;
  }

  const { screen, app, ...params } = data || {};
  const targetScreen = screen || "Calendar";
  const homeScreen = `${targetScreen}Home`;

  console.log("📍 Navigating to:", targetScreen, "with params:", params);

  navigationRef.navigate("Main", {
    screen: targetScreen,
    params: {
      screen: homeScreen,
      params: Object.keys(params).length > 0 ? params : undefined,
    },
  });
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
