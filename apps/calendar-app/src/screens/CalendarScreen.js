import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";
import { useCalendarActions } from "../hooks/useCalendarActions";
import { Ionicons } from "@expo/vector-icons";
import { DateTime } from "luxon";
import EventCreateEditModal from "../components/modals/EventCreateEditModal";
import { PanGestureHandler, State } from "react-native-gesture-handler";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CalendarScreen = ({ navigation }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { user, calendars, groups } = useData();
  const { syncCalendar } = useCalendarActions();
  const [syncing, setSyncing] = useState(false);
  const [syncingCalendars, setSyncingCalendars] = useState(new Set());
  const [createEditModalVisible, setCreateEditModalVisible] = useState(false);

  const today = DateTime.now().setZone("America/New_York");
  const [currentMonth, setCurrentMonth] = useState(today.startOf("month"));

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const externalCalendars = useMemo(
    () => calendars.filter((cal) => cal.type !== "internal"),
    [calendars]
  );

  const editableCalendars = useMemo(() => {
    if (!user?.calendars || user.calendars.length === 0) return [];
    return user.calendars.filter(
      (cal) => cal.permissions === "write" && cal.calendarType === "internal"
    );
  }, [user?.calendars]);

  const handleImportCalendar = () => {
    if (calendars.length < 2) {
      navigation.navigate("ImportCalendar");
    } else {
      navigation.navigate("CalendarEdit");
    }
  };

  const handleSyncAllCalendars = async () => {
    if (externalCalendars.length === 0) {
      Alert.alert(
        "No Calendars",
        "You need to import calendars before you can sync them."
      );
      return;
    }

    Alert.alert(
      "Sync All Calendars",
      `Are you sure you want to sync all ${externalCalendars.length} calendar(s)? This may take a moment.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sync All",
          style: "default",
          onPress: async () => {
            setSyncing(true);
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            try {
              const syncPromises = externalCalendars.map(async (calendar) => {
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
              });

              await Promise.all(syncPromises);

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
                  `Synced ${successCount} calendar(s), ${errorCount} failed:\n\n${errors.join(
                    "\n"
                  )}`
                );
              }
            } catch (error) {
              Alert.alert(
                "Sync Error",
                "An unexpected error occurred while syncing calendars."
              );
            } finally {
              setSyncing(false);
              setSyncingCalendars(new Set());
            }
          },
        },
      ]
    );
  };

  const isEventHidden = (eventId) => {
    return (
      user?.hiddenEvents?.some((hidden) => hidden.eventId === eventId) || false
    );
  };

  const getEventsForDate = (date) => {
    if (!calendars || calendars.length === 0) return [];

    const dateISO = date.toISODate();
    const events = [];

    calendars.forEach((calendar) => {
      if (calendar.events) {
        Object.entries(calendar.events).forEach(([eventKey, event]) => {
          const eventDate = DateTime.fromISO(event.startTime).setZone(
            "America/New_York"
          );
          if (eventDate.toISODate() === dateISO && !isEventHidden(eventKey)) {
            events.push({
              ...event,
              eventId: eventKey,
              calendarColor: calendar.color,
              calendarName: calendar.name,
            });
          }
        });
      }
    });

    return events;
  };

  const generateCalendarDays = (month) => {
    const startOfMonth = month.startOf("month").setZone("America/New_York");
    const endOfMonth = month.endOf("month").setZone("America/New_York");

    const daysToSubtract = startOfMonth.weekday === 7 ? 0 : startOfMonth.weekday;
    const startOfGrid = startOfMonth.minus({ days: daysToSubtract });

    // Calculate the end of the calendar grid (always complete weeks)
    const daysInMonth = endOfMonth.day;
    const totalDaysNeeded = daysToSubtract + daysInMonth;
    const weeksNeeded = Math.ceil(totalDaysNeeded / 7);
    const totalCells = weeksNeeded * 7;

    const days = [];
    let current = startOfGrid;

    for (let i = 0; i < totalCells; i++) {
      const isCurrentMonth = current.month === month.month;
      const events = isCurrentMonth ? getEventsForDate(current) : [];
      
      days.push({
        date: current,
        isCurrentMonth,
        isToday: current.toISODate() === today.toISODate(),
        events,
        eventCount: events.length,
      });
      current = current.plus({ days: 1 });
    }

    return days;
  };

  const [calendarDays, setCalendarDays] = useState(() =>
    generateCalendarDays(currentMonth)
  );

  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const handleDatePress = (day) => {
    navigation.navigate("DayScreen", { date: day.date.toISODate() });
  };

  const handleMonthChange = (direction) => {
    const newMonth =
      direction === "next"
        ? currentMonth.plus({ months: 1 })
        : currentMonth.minus({ months: 1 });

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setCurrentMonth(newMonth);
    setCalendarDays(generateCalendarDays(newMonth));
  };

  const onSwipe = (event) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      if (translationX < -50) {
        handleMonthChange("next");
      }
      if (translationX > 50) {
        handleMonthChange("prev");
      }
    }
  };

  const handleToday = () => {
    const todayMonthStart = today.startOf("month");
    setCurrentMonth(todayMonthStart);
    setCalendarDays(generateCalendarDays(todayMonthStart));
  };

  const renderEventIndicators = (events) => {
    if (!events || events.length === 0) return null;
    const maxIndicators = 3;
    const visibleEvents = events.slice(0, maxIndicators);
    return (
      <View style={styles.eventIndicators}>
        {visibleEvents.map((event, index) => (
          <View
            key={index}
            style={[
              styles.eventBar,
              { backgroundColor: event.calendarColor || theme.primary },
            ]}
          >
            <Text style={styles.eventText} numberOfLines={1}>
              {event.title}
            </Text>
          </View>
        ))}
        {events.length > maxIndicators && (
          <Text style={styles.moreEventsText}>
            +{events.length - maxIndicators}
          </Text>
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
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
    content: {
      flex: 1,
      paddingHorizontal: getSpacing.md,
      paddingTop: getSpacing.sm,
    },
    monthTitle: {
      fontSize: getTypography.h1.fontSize,
      fontWeight: getTypography.h1.fontWeight,
      color: theme.text.primary,
    },
    todayButtonFloating: {
      position: "absolute",
      bottom: 20,
      right: 20,
      backgroundColor: theme.primary,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      borderRadius: getBorderRadius.md,
      zIndex: 10,
    },
    todayButtonText: {
      color: theme.text.inverse,
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
    },
    weekHeader: {
      flexDirection: "row",
      marginBottom: getSpacing.sm,
    },
    dayHeader: {
      flex: 1,
      alignItems: "center",
      paddingVertical: getSpacing.xs,
    },
    dayHeaderText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    calendarGrid: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      padding: getSpacing.xs,
    },
    weekRow: {
      flexDirection: "row",
    },
    dayCell: {
      flex: 1,
      height: 80,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: getSpacing.xs,
      borderRadius: getBorderRadius.sm,
      marginVertical: 1,
    },
    todayCell: {
      borderWidth: 3,
      borderColor: "#FF0000",
    },
    otherMonthCell: {
      opacity: 0,
    },
    dayText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "500",
      color: theme.text.primary,
      marginBottom: getSpacing.xs,
    },
    todayText: {
      color: "#FF0000",
      fontWeight: "700",
    },
    otherMonthText: {
      color: theme.text.tertiary,
    },
    eventIndicators: {
      width: "100%",
      alignItems: "stretch",
      justifyContent: "flex-start",
      marginTop: getSpacing.xs,
      gap: 2,
    },
    eventBar: {
      height: 14,
      borderRadius: 2,
      paddingHorizontal: 3,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    eventText: {
      fontSize: 8,
      color: "white",
      fontWeight: "500",
    },
    moreEventsText: {
      fontSize: 8,
      color: theme.text.secondary,
      fontWeight: "600",
      marginLeft: 2,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Only title and sync/add buttons */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {calendars?.length > 1 ? "Calendars" : "Calendar"}
        </Text>

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
              <Ionicons name="calendar" size={24} color={theme.text.inverse} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fab}
            onPress={() => setCreateEditModalVisible(true)}
          >
            <Ionicons name="add" size={24} color={theme.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>

      {/* FIX: PanGestureHandler now wraps the entire content View */}
      <PanGestureHandler onHandlerStateChange={onSwipe}>
        <View style={styles.content}>
          <Animated.View
            style={{
              opacity: fadeAnim,
              alignItems: "center",
              marginBottom: getSpacing.sm,
            }}
          >
            <Text style={styles.monthTitle}>
              {currentMonth.toFormat("MMMM yyyy")}
            </Text>
          </Animated.View>

          {/* Today Floating Button */}
          {currentMonth.month !== today.month ||
          currentMonth.year !== today.year ? (
            <TouchableOpacity
              style={styles.todayButtonFloating}
              onPress={handleToday}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          ) : null}

          {/* Week Header */}
          <View style={styles.weekHeader}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <View key={day} style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((day, dayIndex) => (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      day.isToday && styles.todayCell,
                      !day.isCurrentMonth && styles.otherMonthCell,
                    ]}
                    onPress={() => handleDatePress(day)}
                    activeOpacity={0.7}
                    disabled={!day.isCurrentMonth}
                  >
                    {day.isCurrentMonth && (
                      <>
                        <Text
                          style={[
                            styles.dayText,
                            day.isToday && styles.todayText,
                          ]}
                        >
                          {day.date.day}
                        </Text>
                        {renderEventIndicators(day.events)}
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>
      </PanGestureHandler>

      <EventCreateEditModal
        isVisible={createEditModalVisible}
        onClose={() => setCreateEditModalVisible(false)}
        availableCalendars={editableCalendars}
        initialDate={today}
        groups={groups}
      />
    </SafeAreaView>
  );
};

export default CalendarScreen;