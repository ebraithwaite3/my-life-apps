// App.js
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  CustomThemeProvider,
  useTheme,
  AuthProvider,
  useAuth,
  DataProvider,
  ChecklistDataProvider,
} from "@my-apps/contexts";
import { WorkoutDataProvider } from "./src/contexts/WorkoutDataContext";
import { useAppRegistration } from "@my-apps/hooks";
// import { ChecklistDataProvider } from "./src/contexts/ChecklistDataContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MainNavigator from "./src/navigation/MainNavigator";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";

// Toast configuration
const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#4CAF50" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: "600" }}
      text2Style={{ fontSize: 14 }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: "#F44336" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: "600" }}
      text2Style={{ fontSize: 14 }}
    />
  ),
  warning: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#FF9800", backgroundColor: "#FFF3E0" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: "600", color: "#E65100" }}
      text2Style={{ fontSize: 14, color: "#EF6C00" }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#2196F3" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: "600" }}
      text2Style={{ fontSize: 14 }}
    />
  ),
};

// Main app component
const MainApp = () => {
  const { isDarkMode } = useTheme();
  const { logout, db, user } = useAuth();

  // Register this app when user logs in
  useAppRegistration(db, user?.uid, "checklist-app");

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
          <ChecklistDataProvider>
            <WorkoutDataProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <MainApp />
                <Toast config={toastConfig} />
              </GestureHandlerRootView>
            </WorkoutDataProvider>
          </ChecklistDataProvider>
        </DataProvider>
      </AuthProvider>
    </CustomThemeProvider>
  );
}
