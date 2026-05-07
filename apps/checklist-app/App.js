// App.js
import React, { useEffect, useState, useRef, useCallback } from "react";
import { StatusBar, AppState } from "react-native";
import AlertModal from "./src/components/alerts/AlertModal";
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
import { updateDocument } from "@my-apps/services";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { DateTime } from "luxon";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MainNavigator, { navigationRef } from "./src/navigation/MainNavigator";
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

function parseDuration(duration) {
  if (!duration) return { minutes: 30 };
  const num = parseInt(duration, 10);
  if (duration.endsWith("d")) return { days: num };
  if (duration.endsWith("h")) return { hours: num };
  return { minutes: num };
}

// Main app component
const MainApp = () => {
  const { isDarkMode, theme } = useTheme();
  const { logout, user: authUser } = useAuth();
  const { masterConfigAlerts, masterConfigNotifications, user: dataUser } = useData();

  // Register this app when user logs in
  const { db } = useAuth();
  useAppRegistration(db, authUser?.uid, 'checklist-app');

  const [activeAlert, setActiveAlert] = useState(null);
  const alertQueueRef = useRef([]);
  const isShowingRef = useRef(false);
  // In-memory dismissed set — clears on restart (intentional: recurring alerts re-show)
  const dismissedIdsRef = useRef(new Set());

  const showNextAlert = useCallback(() => {
    if (isShowingRef.current || alertQueueRef.current.length === 0) return;
    isShowingRef.current = true;
    setActiveAlert(alertQueueRef.current[0]);
  }, []);

  // Stable ref so the 60-second interval always calls the latest version
  const checkAndShowAlertsRef = useRef(null);

  // Enqueue past-due unacknowledged alerts; re-arm snoozed recurring ones
  const checkAndShowAlerts = useCallback(() => {
    if (!masterConfigAlerts?.length) return;

    const now = new Date();

    // Snoozed recurring alerts whose time has arrived — reset acknowledged
    // so they re-queue on the next pass (Firestore update re-triggers this)
    const toRearm = masterConfigAlerts.filter(
      (a) =>
        a.acknowledged &&
        a.recurringIntervalMinutes &&
        a.scheduledTime &&
        new Date(a.scheduledTime) <= now,
    );
    if (toRearm.length > 0) {
      const rearmIds = new Set(toRearm.map((a) => a.id));
      updateAlerts(
        masterConfigAlerts.map((a) =>
          rearmIds.has(a.id) ? { ...a, acknowledged: false } : a,
        ),
      );
      return; // Firestore update triggers re-run; alert will queue then
    }

    const newAlerts = masterConfigAlerts.filter((a) => {
      if (a.acknowledged) return false;
      if (!a.scheduledTime || new Date(a.scheduledTime) > now) return false;
      if (dismissedIdsRef.current.has(a.id)) return false;
      if (alertQueueRef.current.some((q) => q.id === a.id)) return false;
      return true;
    });

    if (newAlerts.length === 0) return;
    alertQueueRef.current = [...alertQueueRef.current, ...newAlerts];
    showNextAlert();
  }, [masterConfigAlerts, showNextAlert, updateAlerts]);

  // Helper: update masterConfig.alerts in Firestore
  const updateAlerts = useCallback(async (updatedAlerts) => {
    const userId = dataUser?.userId || authUser?.uid;
    if (!userId) return;
    try {
      await updateDocument("masterConfig", userId, { alerts: updatedAlerts });
    } catch (err) {
      console.error("❌ Alert update failed:", err);
    }
  }, [dataUser?.userId, authUser?.uid]);

  // Helper: advance to next alert in queue
  const advanceQueue = useCallback(() => {
    alertQueueRef.current = alertQueueRef.current.slice(1);
    isShowingRef.current = false;
    setActiveAlert(null);
    setTimeout(showNextAlert, 300);
  }, [showNextAlert]);

  // "Yes" — acknowledge, deep link, then delete or mark acknowledged
  const handleAlertYes = useCallback(async () => {
    if (!activeAlert) return;

    if (activeAlert.deepLinkTarget && navigationRef?.isReady()) {
      const screen = activeAlert.deepLinkTarget;
      const homeScreen = `${screen}Home`;
      navigationRef.navigate("Main", {
        screen,
        params: { screen: homeScreen },
      });
    }

    // deleteOnConfirm: delete on Yes only
    // deleteOnView: delete on Yes or No (handled in No too)
    const shouldDelete =
      activeAlert.deleteOnConfirm || activeAlert.deleteOnView;
    if (shouldDelete) {
      await updateAlerts(masterConfigAlerts.filter((a) => a.id !== activeAlert.id));
    } else {
      await updateAlerts(
        masterConfigAlerts.map((a) =>
          a.id === activeAlert.id ? { ...a, acknowledged: true } : a,
        ),
      );
    }

    dismissedIdsRef.current.add(activeAlert.id);
    advanceQueue();
  }, [activeAlert, masterConfigAlerts, updateAlerts, advanceQueue]);

  // "No" — dismiss without confirming
  // deleteOnView → delete + dismiss; recurring → re-arm only (no dismiss, re-check later);
  // otherwise → dismiss in-memory only (re-shows next session)
  const handleAlertNo = useCallback(async () => {
    if (!activeAlert) return;

    if (activeAlert.deleteOnView) {
      await updateAlerts(masterConfigAlerts.filter((a) => a.id !== activeAlert.id));
      dismissedIdsRef.current.add(activeAlert.id);
    } else if (activeAlert.recurringIntervalMinutes) {
      const nextTime = new Date(
        Date.now() + activeAlert.recurringIntervalMinutes * 60 * 1000,
      ).toISOString();
      await updateAlerts(
        masterConfigAlerts.map((a) =>
          a.id === activeAlert.id
            ? { ...a, scheduledTime: nextTime, acknowledged: true }
            : a,
        ),
      );
      // acknowledged:true blocks re-show via checkAndShowAlerts filter.
      // Cloud Timer resets acknowledged:false when scheduledTime is past.
    } else {
      dismissedIdsRef.current.add(activeAlert.id);
    }

    advanceQueue();
  }, [activeAlert, masterConfigAlerts, updateAlerts, advanceQueue]);

  // Keep ref current so the polling interval always uses latest masterConfigAlerts
  useEffect(() => {
    checkAndShowAlertsRef.current = checkAndShowAlerts;
  }, [checkAndShowAlerts]);

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

  // Poll every 60 seconds so recurring alerts re-queue after their interval elapses
  useEffect(() => {
    const interval = setInterval(() => checkAndShowAlertsRef.current?.(), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const markLinkedItemComplete = useCallback(async (linkedItem) => {
    const { userId: itemUserId, monthKey, eventId, itemId } = linkedItem;
    const monthRef = doc(db, "activities", itemUserId, "months", monthKey);
    const monthSnap = await getDoc(monthRef);
    if (!monthSnap.exists()) {
      console.warn("⚠️ done: month doc not found", monthKey);
      return;
    }
    const data = monthSnap.data();
    const event = data.items?.[eventId];
    if (!event) {
      console.warn("⚠️ done: event not found", eventId);
      return;
    }
    const activities = event.activities || [];
    const checklistIdx = activities.findIndex((a) => a.activityType === "checklist");
    if (checklistIdx === -1) {
      console.warn("⚠️ done: no checklist activity on event", eventId);
      return;
    }
    const updatedItems = activities[checklistIdx].items.map((i) =>
      i.id === itemId ? { ...i, completed: true } : i
    );
    const updatedActivities = activities.map((a, idx) =>
      idx !== checklistIdx ? a : { ...a, items: updatedItems }
    );
    await setDoc(
      monthRef,
      { items: { [eventId]: { ...event, activities: updatedActivities } } },
      { merge: true }
    );
    console.log(`✅ Marked item "${itemId}" complete in ${monthKey}/${eventId}`);
  }, [db]);

  const handleButtonTap = useCallback(async (button) => {
    if (!activeAlert) return;
    const { action } = button;
    const userId = dataUser?.userId;

    if (action === "reschedule") {
      const tz = button.timezone || "America/New_York";
      const [h, m] = (button.rescheduleTime || "15:00").split(":").map(Number);

      let newTime;
      if (button.rescheduleType === "next_occurrence") {
        const now = DateTime.now().setZone(tz);
        const todayAtTime = now.set({ hour: h, minute: m, second: 0, millisecond: 0 });
        newTime = now < todayAtTime
          ? todayAtTime.toUTC().toISO()
          : todayAtTime.plus({ days: 1 }).toUTC().toISO();
      } else {
        newTime = DateTime.now()
          .setZone(tz)
          .plus({ days: button.advanceDays ?? 1 })
          .set({ hour: h, minute: m, second: 0, millisecond: 0 })
          .toUTC()
          .toISO();
      }

      const modeUpdate = button.onComplete === "set_mode_evening" ? { mode: "evening" }
        : button.onComplete === "set_mode_morning" ? { mode: "morning" }
        : {};

      const updatedAlerts = masterConfigAlerts.map((a) =>
        a.id !== activeAlert.id ? a : {
          ...a,
          scheduledTime: newTime,
          ...modeUpdate,
          ...(activeAlert.deleteOnConfirm ? { acknowledged: true } : {}),
        }
      );

      let updatedNotifications = masterConfigNotifications;
      if (button.affectsLinked) {
        if (activeAlert.linkedNotificationId) {
          updatedNotifications = masterConfigNotifications.map((n) =>
            n.id !== activeAlert.linkedNotificationId ? n : { ...n, scheduledTime: newTime }
          );
        } else {
          console.warn("⚠️ affectsLinked: true but no linkedNotificationId on", activeAlert.id);
        }
      }

      try {
        await updateDocument("masterConfig", userId, {
          alerts: updatedAlerts,
          notifications: updatedNotifications,
        });
        console.log(`✅ Rescheduled "${activeAlert.id}" → ${newTime}`, modeUpdate);
      } catch (err) {
        console.error("❌ Reschedule failed:", err);
      }

    } else if (action === "snooze") {
      const newTime = DateTime.now()
        .plus(parseDuration(button.duration))
        .toUTC()
        .toISO();

      const modeUpdate = button.onComplete === "set_mode_evening" ? { mode: "evening" }
        : button.onComplete === "set_mode_morning" ? { mode: "morning" }
        : {};

      const updatedAlerts = masterConfigAlerts.map((a) =>
        a.id !== activeAlert.id ? a : {
          ...a,
          scheduledTime: newTime,
          ...modeUpdate,
          ...(activeAlert.deleteOnConfirm ? { acknowledged: true } : {}),
        }
      );

      let updatedNotifications = masterConfigNotifications;
      if (button.affectsLinked) {
        if (activeAlert.linkedNotificationId) {
          updatedNotifications = masterConfigNotifications.map((n) =>
            n.id !== activeAlert.linkedNotificationId ? n : { ...n, scheduledTime: newTime }
          );
        } else {
          console.warn("⚠️ affectsLinked: true but no linkedNotificationId on", activeAlert.id);
        }
      }

      try {
        await updateDocument("masterConfig", userId, {
          alerts: updatedAlerts,
          notifications: updatedNotifications,
        });
        console.log(`✅ Snoozed "${activeAlert.id}" → ${newTime}`);
      } catch (err) {
        console.error("❌ Snooze failed:", err);
      }

    } else if (action === "done") {
      if (activeAlert.linkedItem) {
        try {
          await markLinkedItemComplete(activeAlert.linkedItem);
        } catch (err) {
          console.error("❌ done: failed to mark item complete:", err);
        }
      }
      try {
        await updateDocument("masterConfig", userId, {
          alerts: masterConfigAlerts.filter((a) => a.id !== activeAlert.id),
        });
        console.log(`✅ Done: deleted alert "${activeAlert.id}"`);
      } catch (err) {
        console.error("❌ done: failed to delete alert:", err);
      }

    } else if (action === "open") {
      if (navigationRef?.isReady() && button.target) {
        navigationRef.navigate("Main", {
          screen: button.target,
          params: { screen: `${button.target}Home` },
        });
      }
      try {
        await updateDocument("masterConfig", userId, {
          alerts: masterConfigAlerts.filter((a) => a.id !== activeAlert.id),
        });
        console.log(`✅ Open: navigated to "${button.target}", deleted alert`);
      } catch (err) {
        console.error("❌ open: failed to delete alert:", err);
      }

    } else if (action === "delete") {
      try {
        await updateDocument("masterConfig", userId, {
          alerts: masterConfigAlerts.filter((a) => a.id !== activeAlert.id),
        });
        console.log(`✅ Deleted alert "${activeAlert.id}"`);
      } catch (err) {
        console.error("❌ delete: failed:", err);
      }
    }

    advanceQueue();
  }, [activeAlert, masterConfigAlerts, masterConfigNotifications, dataUser, advanceQueue, markLinkedItemComplete]);

  const handleEditSubmit = useCallback(async (isoString) => {
    if (!activeAlert) return;
    const userId = dataUser?.userId;

    const updatedAlerts = masterConfigAlerts.map((a) =>
      a.id !== activeAlert.id ? a : { ...a, scheduledTime: isoString }
    );

    let updatedNotifications = masterConfigNotifications;
    if (activeAlert.linkedNotificationId) {
      updatedNotifications = masterConfigNotifications.map((n) =>
        n.id !== activeAlert.linkedNotificationId ? n : { ...n, scheduledTime: isoString }
      );
    }

    try {
      await updateDocument("masterConfig", userId, {
        alerts: updatedAlerts,
        notifications: updatedNotifications,
      });
      console.log(`✅ Edit saved "${activeAlert.id}" → ${isoString}`);
    } catch (err) {
      console.error("❌ Edit save failed:", err);
    }

    advanceQueue();
  }, [activeAlert, masterConfigAlerts, masterConfigNotifications, dataUser, advanceQueue]);

  const handleLogout = async () => {
    console.log("Logging out...");
    await logout();
  };

  return (
    <>
      <MainNavigator onLogout={handleLogout} />
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <AlertModal
        alert={activeAlert}
        onYes={handleAlertYes}
        onNo={handleAlertNo}
        onButtonTap={handleButtonTap}
        onEditSubmit={handleEditSubmit}
      />
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
