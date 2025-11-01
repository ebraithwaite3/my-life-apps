import React, { useMemo, memo, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { DateTime } from "luxon";
import CalendarDay from "./CalendarDay";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CalendarMonth = memo(({ 
  monthDate, 
  calendars, 
  user,
  onDayPress, 
  zoomLevel,
  today 
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  // Memoize the event checking function
  const isEventHidden = useCallback((eventId) => {
    return user?.hiddenEvents?.some(hidden => hidden.eventId === eventId) || false;
  }, [user?.hiddenEvents]);

  // Memoize events lookup for each date
  const getEventsForDate = useCallback((date) => {
    if (!calendars || calendars.length === 0) return [];

    const dateISO = date.toISODate();
    const events = [];

    calendars.forEach((calendar) => {
      if (calendar.events) {
        Object.entries(calendar.events).forEach(([eventKey, event]) => {
          const eventDate = DateTime.fromISO(event.startTime).setZone(
            "America/New_York"
          );
          if (eventDate.toISODate() === dateISO) {
            if (!isEventHidden(eventKey)) {
              events.push({
                ...event,
                eventId: eventKey,
                calendarColor: calendar.color,
                calendarName: calendar.name,
              });
            }
          }
        });
      }
    });

    return events;
  }, [calendars, isEventHidden]);

  // Memoize calendar days calculation
  const calendarDays = useMemo(() => {
    const startOfMonth = monthDate.startOf("month").setZone("America/New_York");
    const endOfMonth = monthDate.endOf("month").setZone("America/New_York");

    const daysToSubtract = startOfMonth.weekday === 7 ? 0 : startOfMonth.weekday;
    const startOfGrid = startOfMonth.minus({ days: daysToSubtract });

    const days = [];
    let current = startOfGrid;

    while (current <= endOfMonth.endOf("week")) {
      const events = getEventsForDate(current);
      days.push({
        date: current,
        isCurrentMonth: current.month === monthDate.month,
        isToday: current.setZone("America/New_York").toISODate() === today.toISODate(),
        events: events,
        eventCount: events.length,
      });
      current = current.plus({ days: 1 });
    }

    return days;
  }, [monthDate, today, getEventsForDate]);

  // Memoize weeks grouping
  const weeks = useMemo(() => {
    const weeksArray = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeksArray.push(calendarDays.slice(i, i + 7));
    }
    return weeksArray;
  }, [calendarDays]);

  // Memoize styles
  const styles = useMemo(() => StyleSheet.create({
    monthContainer: {
      width: SCREEN_WIDTH,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.lg,
      justifyContent: 'flex-start',
    },
    monthHeader: {
      marginBottom: getSpacing.lg,
      alignItems: 'center',
    },
    monthTitle: {
      fontSize: zoomLevel === 0 ? 20 : zoomLevel === 1 ? 24 : 28,
      fontWeight: "700",
      color: theme.text.primary,
    },
    weekHeader: {
      flexDirection: "row",
      marginBottom: getSpacing.sm,
      paddingHorizontal: getSpacing.xs,
    },
    dayHeader: {
      flex: 1,
      alignItems: "center",
      paddingVertical: getSpacing.xs,
    },
    dayHeaderText: {
      fontSize: zoomLevel === 0 ? 11 : 13,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    calendarGrid: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      overflow: "hidden",
      padding: getSpacing.xs,
    },
    weekRow: {
      flexDirection: "row",
    },
  }), [theme, getSpacing, getBorderRadius, zoomLevel]);

  // Memoize day headers
  const dayHeaders = useMemo(() => 
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    []
  );

  return (
    <View style={styles.monthContainer}>
      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>
          {monthDate.toFormat("MMMM yyyy")}
        </Text>
      </View>

      {/* Days of Week Header */}
      <View style={styles.weekHeader}>
        {dayHeaders.map((day) => (
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
              <CalendarDay
                key={`${day.date.toISODate()}`}
                day={day}
                onPress={onDayPress}
                zoomLevel={zoomLevel}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
});

CalendarMonth.displayName = 'CalendarMonth';

export default CalendarMonth;