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

function roundUpToTenMinutes(date) {
  const TEN_MIN_MS = 10 * 60 * 1000;
  return new Date(
    Math.ceil((date.getTime() - 5 * 60 * 1000) / TEN_MIN_MS) * TEN_MIN_MS,
  );
}

function computeNextScheduledTime(reminder) {
  const { recurrence } = reminder;
  if (!recurrence) return null;

  const now = new Date();

  if (recurrence.scheduleByDay) {
    const candidates = recurrence.scheduleByDay.map(({ day, time, timezone }) => {
      const tz = timezone || "America/New_York";
      const nowInZone = DateTime.fromJSDate(now).setZone(tz);
      const [hour, minute] = time.split(":").map(Number);
      let candidate = nowInZone.set({ hour, minute, second: 0, millisecond: 0 });
      if (candidate <= nowInZone) candidate = candidate.plus({ days: 1 });
      let iterations = 0;
      while (
        candidate.toFormat("EEE").toUpperCase().slice(0, 2) !== day &&
        ++iterations <= 14
      ) {
        candidate = candidate.plus({ days: 1 });
      }
      return candidate;
    });
    const soonest = candidates.reduce((min, c) => (c < min ? c : min));
    return soonest.toISO();
  }

  if (recurrence.everyNDays) {
    const { n, time, timezone } = recurrence.everyNDays;
    const tz = timezone || "America/New_York";
    const [hour, minute] = time.split(":").map(Number);
    return DateTime.fromJSDate(now)
      .setZone(tz)
      .plus({ days: n })
      .set({ hour, minute, second: 0, millisecond: 0 })
      .toISO();
  }

  if (recurrence.everyNMinutes) {
    return roundUpToTenMinutes(
      new Date(now.getTime() + recurrence.everyNMinutes.n * 60_000),
    ).toISOString();
  }

  return null;
}

// Main app component
const MainApp = () => {
  const { isDarkMode, theme } = useTheme();
  const { logout, user: authUser } = useAuth();
  const {
    masterConfigReminders,
    masterConfigReminderDefaults,
    jackMasterConfig,
    jackMasterConfigReminderDefaults,
    ellieMasterConfig,
    ellieMasterConfigReminderDefaults,
    user: dataUser,
    getActivitiesForDay,
  } = useData();

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
  const checkAndShowRemindersRef = useRef(null);

  // Helper: write updated reminders array to masterConfig
  const updateReminders = useCallback(async (updatedReminders) => {
    const userId = dataUser?.userId || authUser?.uid;
    if (!userId) return;
    try {
      await updateDocument("masterConfig", userId, { reminders: updatedReminders });
    } catch (err) {
      console.error("❌ Reminders update failed:", err);
    }
  }, [dataUser?.userId, authUser?.uid]);

  // Enqueue past-due pending reminders
  const checkAndShowReminders = useCallback(() => {
    if (!masterConfigReminders?.length) return;

    const now = new Date();

    const newReminders = masterConfigReminders.filter((r) => {
      if (r.paused) return false;
      if (!r.scheduledAlertTime) return false;
      const isPending =
        new Date(r.scheduledAlertTime) < now && r.acknowledgedAt === null;
      if (!isPending) return false;
      if (dismissedIdsRef.current.has(r.id)) return false;
      if (alertQueueRef.current.some((q) => q.id === r.id)) return false;
      return true;
    });

    if (newReminders.length === 0) return;
    alertQueueRef.current = [...alertQueueRef.current, ...newReminders];
    showNextAlert();
  }, [masterConfigReminders, showNextAlert]);

  // Helper: advance to next alert in queue
  const advanceQueue = useCallback(() => {
    alertQueueRef.current = alertQueueRef.current.slice(1);
    isShowingRef.current = false;
    setActiveAlert(null);
    setTimeout(showNextAlert, 300);
  }, [showNextAlert]);

  // "Yes" — deep link if set, then delete (one-time) or acknowledge (recurring)
  const handleAlertYes = useCallback(async () => {
    if (!activeAlert) return;

    if (activeAlert.deepLinkTarget && navigationRef?.isReady()) {
      const screen = activeAlert.deepLinkTarget;
      navigationRef.navigate("Main", {
        screen,
        params: { screen: `${screen}Home` },
      });
    }

    const isRecurring = !!(
      activeAlert.recurringIntervalMinutes ||
      activeAlert.recurringIntervalDays ||
      activeAlert.recurringSchedule?.length
    );

    if (isRecurring) {
      await updateReminders(
        masterConfigReminders.map((r) =>
          r.id !== activeAlert.id ? r : {
            ...r,
            acknowledgedAt: new Date().toISOString(),
          }
        ),
      );
    } else {
      await updateReminders(
        masterConfigReminders.filter((r) => r.id !== activeAlert.id),
      );
    }

    dismissedIdsRef.current.add(activeAlert.id);
    advanceQueue();
  }, [activeAlert, masterConfigReminders, updateReminders, advanceQueue]);

  // "No" — recurring: advance scheduledTime; otherwise dismiss in-memory only
  const handleAlertNo = useCallback(async () => {
    if (!activeAlert) return;

    if (activeAlert.recurringIntervalMinutes) {
      const durationMs = activeAlert.recurringIntervalMinutes * 60 * 1000;
      const TEN_MIN = 600000;
      const newTime = new Date(
        Math.ceil((Date.now() + durationMs - 5 * 60000) / TEN_MIN) * TEN_MIN,
      ).toISOString();
      await updateReminders(
        masterConfigReminders.map((r) =>
          r.id !== activeAlert.id ? r : { ...r, scheduledTime: newTime }
        ),
      );
    } else if (activeAlert.recurringIntervalDays) {
      const newTime = DateTime.now()
        .plus({ days: activeAlert.recurringIntervalDays })
        .toISO();
      await updateReminders(
        masterConfigReminders.map((r) =>
          r.id !== activeAlert.id ? r : { ...r, scheduledTime: newTime }
        ),
      );
    } else {
      dismissedIdsRef.current.add(activeAlert.id);
    }

    advanceQueue();
  }, [activeAlert, masterConfigReminders, updateReminders, advanceQueue]);

  // Keep ref current so the polling interval always uses latest masterConfigReminders
  useEffect(() => {
    checkAndShowRemindersRef.current = checkAndShowReminders;
  }, [checkAndShowReminders]);

  // Check reminders when masterConfigReminders updates or app comes to foreground
  useEffect(() => {
    checkAndShowReminders();
  }, [checkAndShowReminders]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkAndShowReminders();
    });
    return () => sub.remove();
  }, [checkAndShowReminders]);

  // Poll every 60 seconds so recurring reminders re-queue after their interval elapses
  useEffect(() => {
    const interval = setInterval(() => checkAndShowRemindersRef.current?.(), 60 * 1000);
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

    // LEGACY: action === "reschedule" (old schema — no button.scheduledTime)
    if (action === "reschedule" && !button.scheduledTime) {
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

      const updatedReminders = masterConfigReminders.map((r) => {
        if (r.id !== activeAlert.id) return r;
        const updated = { ...r, scheduledTime: newTime, ...modeUpdate };
        if (button.affectsLinked && r.notification) {
          updated.notification = { ...r.notification, scheduledTime: newTime };
        }
        return updated;
      });

      try {
        await updateReminders(updatedReminders);
        console.log(`✅ Rescheduled "${activeAlert.id}" → ${newTime}`, modeUpdate);
      } catch (err) {
        console.error("❌ Reschedule failed:", err);
      }

    } else if (action === "snooze") {
      const dur = button.duration || "30m";
      const num = parseInt(dur, 10);
      const durationMs = dur.endsWith("d") ? num * 86400000
        : dur.endsWith("h") ? num * 3600000
        : num * 60000;
      const snoozeTarget = roundUpToTenMinutes(
        new Date(Date.now() + durationMs),
      ).toISOString();

      const updatedReminders = masterConfigReminders.map((r) => {
        if (r.id !== activeAlert.id) return r;
        return {
          ...r,
          scheduledTime: snoozeTarget,
          scheduledAlertTime: snoozeTarget,
          acknowledgedAt: null,
          ...(r.notification && {
            notification: { ...r.notification, scheduledTime: snoozeTarget },
          }),
        };
      });

      try {
        await updateReminders(updatedReminders);
        console.log(`✅ Snoozed "${activeAlert.id}" → ${snoozeTarget}`);
      } catch (err) {
        console.error("❌ Snooze failed:", err);
      }

    } else if (action === "done") {
      // linkedTitle is the new schema explicit link; fall back to title only when
      // no explicit link of either kind is set
      const checklistMatchKey = activeAlert.linkedTitle ||
        (!activeAlert.linkedItem ? activeAlert.title : null);

      if (checklistMatchKey) {
        try {
          const today = DateTime.now().toISODate();
          const todayEvents = getActivitiesForDay(today);
          const toDo = todayEvents.find(
            (e) => e.title?.trim().toLowerCase().includes("to do"),
          );
          if (toDo) {
            const checklist = toDo.activities?.find(
              (a) => a.activityType === "checklist",
            );
            const match = checklist?.items?.find(
              (i) => !i.completed &&
                i.name?.trim().toLowerCase() === checklistMatchKey.trim().toLowerCase(),
            );
            if (match) {
              const monthKey = DateTime.fromISO(toDo.startTime).toFormat("yyyy-LL");
              await markLinkedItemComplete({
                userId: dataUser?.userId || authUser?.uid,
                monthKey,
                eventId: toDo.eventId,
                itemId: match.id,
              });
              console.log(`✅ done: matched "${checklistMatchKey}" → item "${match.id}"`);
            }
          }
        } catch (err) {
          console.error("❌ done: checklist match failed:", err);
        }
      } else if (activeAlert.linkedItem) {
        // LEGACY: explicit item reference (old schema)
        try {
          await markLinkedItemComplete(activeAlert.linkedItem);
        } catch (err) {
          console.error("❌ done: failed to mark item complete:", err);
        }
      }
      try {
        const isRecurring = !!(activeAlert.recurrence && !activeAlert.recurrence.oneTime);
        if (isRecurring) {
          const nextTime = computeNextScheduledTime(activeAlert);
          if (nextTime) {
            await updateReminders(
              masterConfigReminders.map((r) =>
                r.id !== activeAlert.id ? r : {
                  ...r,
                  scheduledTime: nextTime,
                  scheduledAlertTime: nextTime,
                  acknowledgedAt: null,
                  ...(r.notification && {
                    notification: { ...r.notification, scheduledTime: nextTime },
                  }),
                }
              ),
            );
            console.log(`✅ Done: advanced "${activeAlert.id}" → ${nextTime}`);
          } else {
            await updateReminders(
              masterConfigReminders.filter((r) => r.id !== activeAlert.id),
            );
            console.log(`✅ Done: deleted unresolvable recurring reminder "${activeAlert.id}"`);
          }
        } else {
          await updateReminders(
            masterConfigReminders.filter((r) => r.id !== activeAlert.id),
          );
          console.log(`✅ Done: deleted reminder "${activeAlert.id}"`);
        }
      } catch (err) {
        console.error("❌ done: failed to update reminder:", err);
      }

    } else if (action === "remindTomorrow") {
      const tz = "America/New_York";
      const variant = button.variant || "morning";
      const time = activeAlert.actions?.remindTomorrow?.[variant] || button.time || "09:00";
      const [hour, minute] = time.split(":").map(Number);
      const target = DateTime.now()
        .setZone(tz)
        .plus({ days: 1 })
        .set({ hour, minute, second: 0, millisecond: 0 })
        .toISO();

      const updatedReminders = masterConfigReminders.map((r) => {
        if (r.id !== activeAlert.id) return r;
        return {
          ...r,
          scheduledTime: target,
          scheduledAlertTime: target,
          acknowledgedAt: null,
          ...(r.notification && {
            notification: { ...r.notification, scheduledTime: target },
          }),
        };
      });

      try {
        await updateReminders(updatedReminders);
        console.log(`✅ Remind tomorrow: "${activeAlert.id}" → ${target}`);
      } catch (err) {
        console.error("❌ remindTomorrow failed:", err);
      }

    } else if (action === "reschedule" && button.scheduledTime) {
      const newTime = button.scheduledTime;
      const updatedReminders = masterConfigReminders.map((r) => {
        if (r.id !== activeAlert.id) return r;
        return {
          ...r,
          scheduledTime: newTime,
          scheduledAlertTime: newTime,
          acknowledgedAt: null,
          ...(r.notification && {
            notification: { ...r.notification, scheduledTime: newTime },
          }),
        };
      });
      try {
        await updateReminders(updatedReminders);
        console.log(`✅ Reschedule: "${activeAlert.id}" → ${newTime}`);
      } catch (err) {
        console.error("❌ reschedule failed:", err);
      }

    // LEGACY: action === "open"
    } else if (action === "open") {
      if (navigationRef?.isReady() && button.target) {
        navigationRef.navigate("Main", {
          screen: button.target,
          params: { screen: `${button.target}Home` },
        });
      }
      try {
        await updateReminders(
          masterConfigReminders.filter((r) => r.id !== activeAlert.id),
        );
        console.log(`✅ Open: navigated to "${button.target}", deleted reminder`);
      } catch (err) {
        console.error("❌ open: failed to delete reminder:", err);
      }

    // LEGACY: action === "delete"
    } else if (action === "delete") {
      try {
        await updateReminders(
          masterConfigReminders.filter((r) => r.id !== activeAlert.id),
        );
        console.log(`✅ Deleted reminder "${activeAlert.id}"`);
      } catch (err) {
        console.error("❌ delete: failed:", err);
      }

    // LEGACY: action === "pause_indefinitely"
    } else if (action === "pause_indefinitely") {
      try {
        await updateReminders(
          masterConfigReminders.map((r) =>
            r.id !== activeAlert.id ? r : {
              ...r,
              paused: true,
              pausedUntil: null,
              acknowledgedAt: new Date().toISOString(),
            }
          ),
        );
        console.log(`✅ Paused indefinitely "${activeAlert.id}"`);
      } catch (err) {
        console.error("❌ pause_indefinitely: failed:", err);
      }

    // LEGACY: action === "done_and_pause"
    } else if (action === "done_and_pause") {
      const checklistMatchKey = activeAlert.linkedTitle ||
        (!activeAlert.linkedItem ? activeAlert.title : null);

      if (checklistMatchKey) {
        try {
          const today = DateTime.now().toISODate();
          const todayEvents = getActivitiesForDay(today);
          const toDo = todayEvents.find(
            (e) => e.title?.trim().toLowerCase().includes("to do"),
          );
          if (toDo) {
            const checklist = toDo.activities?.find(
              (a) => a.activityType === "checklist",
            );
            const match = checklist?.items?.find(
              (i) => !i.completed &&
                i.name?.trim().toLowerCase() === checklistMatchKey.trim().toLowerCase(),
            );
            if (match) {
              const monthKey = DateTime.fromISO(toDo.startTime).toFormat("yyyy-LL");
              await markLinkedItemComplete({
                userId: dataUser?.userId || authUser?.uid,
                monthKey,
                eventId: toDo.eventId,
                itemId: match.id,
              });
              console.log(`✅ done_and_pause: matched "${checklistMatchKey}" → item "${match.id}"`);
            }
          }
        } catch (err) {
          console.error("❌ done_and_pause: checklist match failed:", err);
        }
      } else if (activeAlert.linkedItem) {
        // LEGACY: explicit item reference (old schema)
        try {
          await markLinkedItemComplete(activeAlert.linkedItem);
        } catch (err) {
          console.error("❌ done_and_pause: failed to mark item complete:", err);
        }
      }
      try {
        await updateReminders(
          masterConfigReminders.map((r) =>
            r.id !== activeAlert.id ? r : {
              ...r,
              paused: true,
              pausedUntil: null,
              acknowledgedAt: new Date().toISOString(),
            }
          ),
        );
        console.log(`✅ Done+paused "${activeAlert.id}"`);
      } catch (err) {
        console.error("❌ done_and_pause: failed to pause reminder:", err);
      }
    }

    advanceQueue();
  }, [activeAlert, masterConfigReminders, advanceQueue, markLinkedItemComplete, updateReminders, getActivitiesForDay, dataUser, authUser]);

  const handleEditSubmit = useCallback(async (isoString) => {
    if (!activeAlert) return;

    const updatedReminders = masterConfigReminders.map((r) => {
      if (r.id !== activeAlert.id) return r;
      const updated = { ...r, scheduledTime: isoString };
      if (r.notification) {
        updated.notification = { ...r.notification, scheduledTime: isoString };
      }
      return updated;
    });

    try {
      await updateReminders(updatedReminders);
      console.log(`✅ Edit saved "${activeAlert.id}" → ${isoString}`);
    } catch (err) {
      console.error("❌ Edit save failed:", err);
    }

    advanceQueue();
  }, [activeAlert, masterConfigReminders, advanceQueue, updateReminders]);

  const handleLogout = async () => {
    console.log("Logging out...");
    await logout();
  };

  const alertReminderDefaults =
    jackMasterConfig?.reminders?.some(r => r.id === activeAlert?.id)
      ? jackMasterConfigReminderDefaults
      : ellieMasterConfig?.reminders?.some(r => r.id === activeAlert?.id)
      ? ellieMasterConfigReminderDefaults
      : masterConfigReminderDefaults;

  return (
    <>
      <MainNavigator onLogout={handleLogout} />
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <AlertModal
        alert={activeAlert}
        reminderDefaults={alertReminderDefaults}
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
