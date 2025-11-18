// App.js
import React from "react";
import { StatusBar } from "expo-status-bar";
import { 
  CustomThemeProvider, 
  useTheme,
  AuthProvider,    // ← Import from package
  useAuth,         // ← Import from package
  DataProvider     // ← Already correct
} from "@my-apps/contexts";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MainNavigator from "./src/navigation/MainNavigator";
import Toast from "react-native-toast-message";

// Main app component
const MainApp = () => {
  const { isDarkMode } = useTheme();
  const { logout } = useAuth();

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