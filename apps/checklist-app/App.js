// App.js
import React, { useEffect, useState, useRef, useCallback } from "react";
import { StatusBar, Modal, View, Text, TouchableOpacity, StyleSheet, AppState } from "react-native";
import {
  CustomThemeProvider,
  useTheme,
  AuthProvider,
  useAuth,
  DataProvider,
  ChecklistDataProvider,
  useData,
} from "@my-apps/contexts";
import { useAppRegistration } from "@my-apps/hooks";
import AsyncStorage from "@react-native-async-storage/async-storage";
// import { ChecklistDataProvider } from "./src/contexts/ChecklistDataContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MainNavigator from "./src/navigation/MainNavigator";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";

const SEEN_ALERTS_KEY = "seenAlerts";

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
  const { isDarkMode, theme } = useTheme();
  const { logout, db, user } = useAuth();
  const { masterConfigAlerts } = useData();

  // Register this app when user logs in
  useAppRegistration(db, user?.uid, 'checklist-app');

  const [activeAlert, setActiveAlert] = useState(null);
  const alertQueueRef = useRef([]);
  const isShowingRef = useRef(false);

  const showNextAlert = useCallback(() => {
    if (isShowingRef.current || alertQueueRef.current.length === 0) return;
    isShowingRef.current = true;
    setActiveAlert(alertQueueRef.current[0]);
  }, []);

  const handleAlertConfirm = useCallback(async () => {
    if (!activeAlert) return;
    const seenRaw = await AsyncStorage.getItem(SEEN_ALERTS_KEY);
    const seen = seenRaw ? JSON.parse(seenRaw) : [];
    if (!seen.includes(activeAlert.id)) {
      await AsyncStorage.setItem(SEEN_ALERTS_KEY, JSON.stringify([...seen, activeAlert.id]));
    }
    alertQueueRef.current = alertQueueRef.current.slice(1);
    isShowingRef.current = false;
    setActiveAlert(null);
    // Small delay so modal fully closes before showing next
    setTimeout(showNextAlert, 300);
  }, [activeAlert, showNextAlert]);

  const checkAndShowAlerts = useCallback(async () => {
    if (!masterConfigAlerts || masterConfigAlerts.length === 0) return;

    const seenRaw = await AsyncStorage.getItem(SEEN_ALERTS_KEY);
    const seen = seenRaw ? JSON.parse(seenRaw) : [];

    // Clean up IDs no longer in the alerts array
    const currentIds = new Set(masterConfigAlerts.map((a) => a.id));
    const cleanedSeen = seen.filter((id) => currentIds.has(id));
    if (cleanedSeen.length !== seen.length) {
      await AsyncStorage.setItem(SEEN_ALERTS_KEY, JSON.stringify(cleanedSeen));
    }

    const now = new Date();
    const unseen = masterConfigAlerts.filter((a) => {
      if (cleanedSeen.includes(a.id)) return false;
      if (a.expiresAt && new Date(a.expiresAt) < now) return false;
      return true;
    });

    if (unseen.length === 0) return;

    alertQueueRef.current = unseen;
    showNextAlert();
  }, [masterConfigAlerts, showNextAlert]);

  // Check alerts when masterConfigAlerts updates or app comes to foreground
  useEffect(() => {
    checkAndShowAlerts();
  }, [checkAndShowAlerts]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkAndShowAlerts();
    });
    return () => sub.remove();
  }, [checkAndShowAlerts]);

  const handleLogout = async () => {
    console.log("Logging out...");
    await logout();
  };

  return (
    <>
      <MainNavigator onLogout={handleLogout} />
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <Modal
        visible={!!activeAlert}
        transparent
        animationType="fade"
        onRequestClose={handleAlertConfirm}
      >
        <View style={alertStyles.overlay}>
          <View style={[alertStyles.card, { backgroundColor: theme.surface || "#fff" }]}>
            <Text style={[alertStyles.title, { color: theme.text?.primary || "#111" }]}>
              {activeAlert?.title}
            </Text>
            <Text style={[alertStyles.body, { color: theme.text?.secondary || "#444" }]}>
              {activeAlert?.body}
            </Text>
            <TouchableOpacity
              style={[alertStyles.button, { backgroundColor: theme.primary || "#2196F3" }]}
              onPress={handleAlertConfirm}
            >
              <Text style={alertStyles.buttonText}>
                {activeAlert?.confirmLabel || "OK"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

// Root app component with providers
export default function App() {
  return (
    <CustomThemeProvider>
      <AuthProvider>
        <DataProvider>
          <ChecklistDataProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <MainApp />
              <Toast config={toastConfig} />
            </GestureHandlerRootView>
          </ChecklistDataProvider>
        </DataProvider>
      </AuthProvider>
    </CustomThemeProvider>
  );
}
