// App.js
import React from "react";
import { StatusBar } from "expo-status-bar";
import {
  CustomThemeProvider,
  useTheme,
  AuthProvider,
  useAuth,
} from "@my-apps/contexts";
import { useAppRegistration } from "@my-apps/hooks";
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

// App content component (after auth is ready)
const AppContent = () => {
  const { isDarkMode } = useTheme();
  const { logout, db, user, authLoading } = useAuth();

  console.log('🔥 APP CONTENT - authLoading:', authLoading);
  console.log('🔥 APP CONTENT - user:', user?.uid || 'none');

  // Register this app when user logs in
  useAppRegistration(db, user?.uid, "study-app");

  const handleLogout = async () => {
    console.log("Logging out...");
    await logout();
  };

  return (
    <>
      <MainNavigator onLogout={handleLogout} user={user} authLoading={authLoading} />
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <Toast config={toastConfig} />
    </>
  );
};

// Root app component with providers
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CustomThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </CustomThemeProvider>
    </GestureHandlerRootView>
  );
}