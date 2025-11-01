import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";
import { useCalendarActions } from "../hooks/useCalendarActions";
import { Ionicons } from "@expo/vector-icons";
import { DateTime } from "luxon";
import EventCreateEditModal from "../components/modals/EventCreateEditModal";

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

  // Add this useEffect after your useState declarations
  useEffect(() => {
    setCalendarDays(generateCalendarDays(currentMonth));
  }, [calendars]); // Regenerate when calendars data arrives

  const editableCalendars = useMemo(() => {
    if (!user?.calendars || user.calendars.length === 0) return [];
    return user.calendars.filter(
      (cal) => cal.permissions === "write" && cal.calendarType === "internal"
    );
  }, [user?.calendars]);

  const isEventHidden = (eventId) =>
    user?.hiddenEvents?.some((hidden) => hidden.eventId === eventId) || false;

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

    const daysToSubtract =
      startOfMonth.weekday === 7 ? 0 : startOfMonth.weekday;
    const startOfGrid = startOfMonth.minus({ days: daysToSubtract });

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

  // ✅ Modern Gesture API replacement
  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationX < -50) handleMonthChange("next");
      else if (event.translationX > 50) handleMonthChange("prev");
    })
    .runOnJS(true);

  const handleToday = () => {
    const todayMonthStart = today.startOf("month");
    setCurrentMonth(todayMonthStart);
    setCalendarDays(generateCalendarDays(todayMonthStart));
  };

  const renderEventIndicators = (events) => {
    if (!events || events.length === 0) return null;

    const eventCount = events.length;
    const eventText = eventCount === 1 ? "1 Event" : `${eventCount} Events`;

    return (
      <View style={styles.eventBanner}>
        <Text style={styles.eventBannerText}>{eventText}</Text>
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
    },
    syncButtonActive: { backgroundColor: theme.primary },
    fab: {
      backgroundColor: theme.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
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
    weekHeader: { flexDirection: "row", marginBottom: getSpacing.sm },
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
    weekRow: { flexDirection: "row" },
    dayCell: {
      flex: 1,
      height: 80,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: getSpacing.xs,
      borderRadius: getBorderRadius.sm,
      marginVertical: 1,
    },
    todayCell: { borderWidth: 3, borderColor: "#FF0000" },
    otherMonthCell: { opacity: 0 },
    dayText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "500",
      color: theme.text.primary,
      marginBottom: getSpacing.xs,
    },
    todayText: { color: "#FF0000", fontWeight: "700" },
    otherMonthText: { color: theme.text.tertiary },
    eventBanner: {
      backgroundColor: "#007AFF",
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 3,
      marginTop: 2,
      alignSelf: "stretch",
    },
    eventBannerText: {
      fontSize: 8,
      color: "white",
      fontWeight: "600",
      textAlign: "center",
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {calendars?.length > 1 ? "Calendars" : "Calendar"}
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setCreateEditModalVisible(true)}
          >
            <Ionicons name="add" size={24} color={theme.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Swipe gesture wrapper */}
      <GestureDetector gesture={panGesture}>
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

          {currentMonth.month !== today.month ||
          currentMonth.year !== today.year ? (
            <TouchableOpacity
              style={styles.todayButtonFloating}
              onPress={handleToday}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.weekHeader}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <View key={day} style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

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
      </GestureDetector>

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
