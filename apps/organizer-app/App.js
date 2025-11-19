// App.js
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { 
  CustomThemeProvider, 
  useTheme,
  AuthProvider,
  useAuth,
  DataProvider
} from "@my-apps/contexts";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MainNavigator from "./src/navigation/MainNavigator";
import Toast from "react-native-toast-message";
import { setupPushNotifications } from './src/services/notificationService'; // ← ADD THIS

// Main app component
const MainApp = () => {
  const { isDarkMode } = useTheme();
  const { logout, user } = useAuth(); // ← ADD user

  // ← ADD THIS EFFECT
  useEffect(() => {
    if (user) {
      console.log('User logged in, setting up push notifications...');
      setupPushNotifications(user.uid)
        .then(() => console.log('✅ Push notifications setup complete!'))
        .catch((error) => console.error('❌ Push notification setup failed:', error));
    }
  }, [user]);

  const handleLogout = async () => {
    console.log("Logging out...");
    await logout();
  };

  return (
    <>
      <MainNavigator onLogout={handleLogout} />
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </>
  );
};

// Root app component with providers
export default function App() {
  return (
    <CustomThemeProvider>
      <AuthProvider>
        <DataProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <MainApp />
            <Toast />
          </GestureHandlerRootView>
        </DataProvider>
      </AuthProvider>
    </CustomThemeProvider>
  );
}