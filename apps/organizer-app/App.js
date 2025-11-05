// App.js
import React from "react";
import { StatusBar } from "expo-status-bar";
import { CustomThemeProvider, useTheme } from "@my-apps/contexts";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { DataProvider } from "./src/contexts/DataContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MainNavigator from "./src/navigation/MainNavigator";
import Toast from "react-native-toast-message";

// Main app component
const MainApp = () => {
  const { isDarkMode } = useTheme();
  const { logout } = useAuth(); // ← Add this

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
