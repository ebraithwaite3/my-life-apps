// src/screens/TodayScreen.js
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";
import { Ionicons } from "@expo/vector-icons";
import { useCalendarActions } from "../hooks";
import { DateTime } from "luxon";
import EventCard from "../components/cards/EventCard/EventCard";
import LoadingScreen from "../components/LoadingScreen";
import { useUserActions } from "../hooks";
import EventCreateEditModal from "../components/modals/EventCreateEditModal";

const TodayScreen = ({ navigation }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const {
    user,
    calendars,
    tasks,
    groups,
    currentDate,
    setWorkingDate,
    loading,
    calendarsLoading,
  } = useData();
  const { syncCalendar } = useCalendarActions();
  const { toggleEventVisibility } = useUserActions();
  const [syncing, setSyncing] = useState(false);
  const [syncingCalendars, setSyncingCalendars] = useState(new Set());
  const [showHiddenEvents, setShowHiddenEvents] = useState(false);
  const [createEditModalVisible, setCreateEditModalVisible] = useState(false);
  const [initialRender, setInitialRender] = useState(true);
  
  console.log("Tasks in TodayScreen:", tasks);
  console.log("CURRENT DATE IN TODAY SCREEN:", currentDate);

  // keep currentDate synced with "today" whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log("TodayScreen focused - setting date to today");
      const today = DateTime.now().toISODate();
      console.log("Today's date:", today);
      console.log("Current context date:", currentDate);
      console.log("About to set working date to:", today);
      setWorkingDate(today);
    }, [setWorkingDate, currentDate])
  );

  // Add this useEffect after the useFocusEffect
useEffect(() => {
  if (!loading && !calendarsLoading) {
    // Small delay only on initial render to prevent flash
    const timer = setTimeout(() => {
      setInitialRender(false);
    }, 400);
    return () => clearTimeout(timer);
  }
}, [loading, calendarsLoading]);

  const handleToggleEventVisibility = async (eventId, startTime, hideOrUnhide) => {
    try {
      // setUpdatingHiddenEvents(true);
      await toggleEventVisibility(eventId, startTime, hideOrUnhide);
      // // Pause briefly to ensure UI updates
      // await new Promise((resolve) => setTimeout(resolve, 300));
      // setUpdatingHiddenEvents(false);
    } catch (error) {
      console.error("Error toggling event visibility:", error);
    }
  }

  const handleImportCalendar = () => {
    if (calendars.length < 2) {
      // If its less than 2, that means they only have their internal user calendar
      // So give them the option to import a calendar
      navigation.navigate("ImportCalendar");
    } else {
      // Navigate to the CalendarEdit screen if there are already calendars
      navigation.navigate("CalendarEdit");
    }
  };

  const externalCalendars = useMemo(() => {
    return calendars.filter(cal => cal.type !== 'internal');
  }, [calendars]);

  console.log("External calendars:", externalCalendars);

  // Simplified loading check - no more complex logic or artificial delays
  const isDataLoading = loading || calendarsLoading || initialRender;

  console.log("IS DATA LOADING?", isDataLoading, { loading, calendarsLoading });

  // Helper function to check if an event has been hidden by user
  const isEventHidden = (eventId) => {
    console.log("Checking if event is hidden:", eventId, user?.hiddenEvents);
    return (
      user?.hiddenEvents?.some((hidden) => hidden.eventId === eventId) || false
    );
  };

  // Build today's Hidden Events (to show a checkbox at the top to show the hidden events)
  // Should be looking in user.hiddenEvents for any events with startTime as todays data (just in the format of 2025-09-22)
  const todaysHiddenEvents = useMemo(() => {
    if (!user?.hiddenEvents || user.hiddenEvents.length === 0) return [];

    const todayISO = currentDate;

    return user.hiddenEvents.filter((hidden) => {
      if (!hidden.startTime) return false;
      const hiddenDate = DateTime.fromISO(hidden.startTime).toISODate();
      return hiddenDate === todayISO;
    });
  }, [user?.hiddenEvents, currentDate]);

  console.log("Today's hidden events:", todaysHiddenEvents);

  // build today's events
  const todaysEvents = useMemo(() => {
    if (!calendars || calendars.length === 0) return [];

    const events = [];
    const todayISO = currentDate;

    calendars.forEach((calendar) => {
      if (calendar.events && typeof calendar.events === "object") {
        Object.entries(calendar.events).forEach(([eventKey, event]) => {
          const eventStart = DateTime.fromISO(event.startTime);
          const eventEnd = DateTime.fromISO(event.endTime);

          if (!eventStart.isValid || !eventEnd.isValid) return;

          const todayStart = DateTime.fromISO(todayISO).startOf("day");
          const todayEnd = DateTime.fromISO(todayISO).endOf("day");

          if (
            eventStart.toISODate() === todayISO ||
            eventEnd.toISODate() === todayISO ||
            (eventStart <= todayEnd && eventEnd >= todayStart)
          ) {
            const isHidden = isEventHidden(eventKey);
            
            // Only filter out hidden events if showHiddenEvents is false
            if (!isHidden || showHiddenEvents) {
              events.push({
                ...event,
                eventId: eventKey,
                calendarName: calendar.name,
                calendarColor: calendar.color || theme.primary,
                eventType: event.eventType || "event",
                isHidden: isHidden,
              });
            }
          }
        });
      }
    });

    events.sort(
      (a, b) => DateTime.fromISO(a.startTime) - DateTime.fromISO(b.startTime)
    );
    return events;
  }, [calendars, currentDate, theme.primary, user?.hiddenEvents, showHiddenEvents]);

  // sync handler
  const handleSyncAllCalendars = async () => {
    if (calendars.length === 0) {
      Alert.alert(
        "No Calendars",
        "You need to import calendars before you can sync them."
      );
      return;
    }

    Alert.alert(
      "Sync All Calendars",
      `Are you sure you want to sync all ${externalCalendars.length} calendar(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sync All",
          onPress: async () => {
            setSyncing(true);
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            try {
              await Promise.all(
                calendars
                  .filter(calendar => calendar.type !== 'internal') // Skip internal calendars
                  .map(async (calendar) => {
                    const calendarId = calendar.calendarId || calendar.id;
                    setSyncingCalendars((prev) => new Set([...prev, calendarId]));
              
                    try {
                      await syncCalendar(calendarId);
                      successCount++;
                    } catch (error) {
                      errorCount++;
                      errors.push(`${calendar.name}: ${error.message}`);
                    } finally {
                      setSyncingCalendars((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(calendarId);
                        return newSet;
                      });
                    }
                  })
              );

              if (errorCount === 0) {
                Alert.alert(
                  "Sync Complete",
                  `Successfully synced all ${successCount} calendar(s).`
                );
              } else if (successCount === 0) {
                Alert.alert(
                  "Sync Failed",
                  `Failed to sync any calendars:\n\n${errors.join("\n")}`
                );
              } else {
                Alert.alert(
                  "Sync Partially Complete",
                  `Synced ${successCount}, ${errorCount} failed:\n\n${errors.join(
                    "\n"
                  )}`
                );
              }
            } finally {
              setSyncing(false);
              setSyncingCalendars(new Set());
            }
          },
        },
      ]
    );
  };

  const editableCalendars = useMemo(() => {
    // Return calendar objects from user.calendars that are internal with write permissions
    if (!user?.calendars || user.calendars.length === 0) return [];
  
    return user.calendars.filter(
      (cal) => cal.permissions === "write" && cal.calendarType === "internal"
    );
  }, [user?.calendars]);
  console.log("Editable calendars:", editableCalendars);

  const hasConfiguredCalendars = user?.calendars && user.calendars.length > 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: getTypography.h2.fontWeight,
      color: theme.text.primary,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
    },
    syncButton: {
      backgroundColor: theme.button.secondary,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    syncButtonActive: {
      backgroundColor: theme.primary,
    },
    // Hidden Events Toggle Styles
    hiddenToggleContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      backgroundColor: theme.surface,
    },
    hiddenToggleContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      flex: 1,
    },
    hiddenToggleText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginRight: getSpacing.sm,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderRadius: getBorderRadius.xs,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    content: {
      flex: 1,
      paddingHorizontal: getSpacing.md,
    },
    greeting: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: getTypography.h2.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
      textAlign: "center",
    },
    eventsContainer: {
      paddingVertical: getSpacing.md,
      paddingBottom: getSpacing.lg,
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: getSpacing.lg,
    },
    emptyTitle: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
      marginTop: getSpacing.md,
      marginBottom: getSpacing.sm,
    },
    emptySubtitle: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: "center",
    },
    fab: {
      backgroundColor: theme.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.username?.split(" ")[0] || "there";

    if (hour < 12) return `Good morning, ${firstName}!`;
    if (hour < 17) return `Good afternoon, ${firstName}!`;
    return `Good evening, ${firstName}!`;
  };

  // Check if we should show loading screen
  if (isDataLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today</Text>

          <View style={styles.headerActions}>
            {externalCalendars.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.syncButton,
                  (syncing || syncingCalendars.size > 0) &&
                    styles.syncButtonActive,
                ]}
                onPress={handleSyncAllCalendars}
                disabled={syncing || syncingCalendars.size > 0}
              >
                {syncing || syncingCalendars.size > 0 ? (
                  <ActivityIndicator size="small" color={theme.text.inverse} />
                ) : (
                  <Ionicons
                    name="sync"
                    size={20}
                    color={theme.button.secondaryText}
                  />
                )}
              </TouchableOpacity>
            )}

            {/* Add Calendar Button */}
            <TouchableOpacity
              style={[
                styles.fab,
                externalCalendars?.length === 0 && {
                  width: "auto",
                  height: "auto",
                  paddingHorizontal: getSpacing.sm,
                  paddingVertical: getSpacing.md,
                  borderRadius: getBorderRadius.lg,
                },
              ]}
              onPress={handleImportCalendar}
              disabled={syncing}
            >
              {externalCalendars?.length === 0 ? (
                <Text
                  style={{
                    color: theme.text.inverse,
                    fontSize: getTypography.body.fontSize,
                    fontWeight: "bold",
                  }}
                >
                  Import a Calendar
                </Text>
              ) : (
                <Ionicons
                  name="calendar"
                  size={24}
                  color={theme.text.inverse}
                />
              )}
            </TouchableOpacity>
            {/* Add a plus button for adding an event, for now just console log */}
            <TouchableOpacity
              style={styles.fab}
              onPress={() => setCreateEditModalVisible(true)}
            >
              <Ionicons name="add" size={24} color={theme.text.inverse} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hidden Events Toggle - Only show if there are hidden events for today */}
        {todaysHiddenEvents.length > 0 && (
          <TouchableOpacity 
            style={styles.hiddenToggleContainer}
            onPress={() => setShowHiddenEvents(!showHiddenEvents)}
          >
            <View style={styles.hiddenToggleContent}>
              <Text style={styles.hiddenToggleText}>
                Show Hidden Events ({todaysHiddenEvents.length})
              </Text>
              <View style={[styles.checkbox, showHiddenEvents && styles.checkboxChecked]}>
                {showHiddenEvents && (
                  <Ionicons name="checkmark" size={14} color="white" />
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* <Text style={styles.greeting}>{getGreeting()}</Text> */}

          {todaysEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="calendar-outline"
                size={64}
                color={theme.text.tertiary}
              />
              <Text style={styles.emptyTitle}>No Events Today</Text>
              <Text style={styles.emptySubtitle}>
                {hasConfiguredCalendars
                  ? "Enjoy your free day! Sync your calendars to see upcoming events."
                  : "Add calendars to see your events here."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={todaysEvents}
              keyExtractor={(event, index) =>
                `${event.calendarId}-${event.eventId}-${index}`
              }
              renderItem={({ item }) => (
                <EventCard
                  event={item}
                  groups={groups}
                  user={user}
                  calendars={calendars}
                  isEventHidden={isEventHidden(item.eventId)}
                  onToggleVisibility={handleToggleEventVisibility}
                  showCalendarName
                  tasks={tasks}
                  onPress={(event) =>
                    navigation.navigate("EventDetails", {
                      eventId: event.eventId,
                      calendarId: event.calendarId,
                    })
                  }
                />
              )}
              contentContainerStyle={styles.eventsContainer}
            />
          )}
        </View>
      </View>
      <EventCreateEditModal
        isVisible={createEditModalVisible}
        onClose={() => setCreateEditModalVisible(false)}
        availableCalendars={editableCalendars}
        initialDate={currentDate}
        groups={groups}
      />
    </SafeAreaView>
  );
};

export default TodayScreen;