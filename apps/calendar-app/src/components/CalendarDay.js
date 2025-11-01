import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

const CalendarDay = memo(({ 
  day, 
  onPress, 
  zoomLevel
}) => {
  const { theme, getSpacing } = useTheme();

  // Memoize styles based on zoom level and theme
  const styles = useMemo(() => StyleSheet.create({
    dayCell: {
      flex: 1,
      minHeight: zoomLevel === 0 ? 40 : zoomLevel === 1 ? 60 : 100,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: getSpacing.xs,
      paddingHorizontal: 2,
      borderWidth: 0.5,
      borderColor: theme.border + "40",
    },
    todayCell: {
      backgroundColor: `${theme.primary}15`,
      borderColor: theme.primary,
      borderWidth: 1,
    },
    otherMonthCell: {
      opacity: 0.3,
    },
    dayText: {
      fontSize: zoomLevel === 0 ? 10 : zoomLevel === 1 ? 12 : 14,
      fontWeight: day.isToday ? "700" : "500",
      color: day.isToday ? theme.primary : theme.text.primary,
      marginBottom: zoomLevel === 0 ? 2 : getSpacing.xs,
    },
    otherMonthText: {
      color: theme.text.tertiary,
    },
    eventDots: {
      flexDirection: "row",
      gap: 2,
      flexWrap: "wrap",
      justifyContent: "center",
      maxWidth: "90%",
    },
    eventDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    eventBarsCompact: {
      width: "100%",
      gap: 1,
    },
    eventBarCompact: {
      height: 3,
      borderRadius: 1,
      width: "100%",
    },
    eventBarsExpanded: {
      width: "100%",
      gap: 2,
      marginTop: 2,
    },
    eventBarExpanded: {
      minHeight: 16,
      borderRadius: 2,
      paddingHorizontal: 4,
      paddingVertical: 2,
      justifyContent: "center",
    },
    eventTextExpanded: {
      fontSize: 9,
      color: "white",
      fontWeight: "500",
    },
    moreEventsText: {
      fontSize: 8,
      color: theme.text.secondary,
      fontWeight: "600",
      marginTop: 2,
    },
  }), [theme, getSpacing, zoomLevel, day.isToday]);

  // Memoize event indicators rendering
  const eventIndicators = useMemo(() => {
    if (day.events.length === 0) return null;

    // Zoomed out - show dots
    if (zoomLevel === 0) {
      const maxDots = 6;
      const visibleEvents = day.events.slice(0, maxDots);
      
      return (
        <View style={styles.eventDots}>
          {visibleEvents.map((event, index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.eventDot,
                { backgroundColor: event.calendarColor || theme.primary },
              ]}
            />
          ))}
        </View>
      );
    }

    // Medium zoom - compact bars
    if (zoomLevel === 1) {
      const maxBars = 3;
      const visibleEvents = day.events.slice(0, maxBars);
      
      return (
        <View style={styles.eventBarsCompact}>
          {visibleEvents.map((event, index) => (
            <View
              key={`bar-${index}`}
              style={[
                styles.eventBarCompact,
                { backgroundColor: event.calendarColor || theme.primary },
              ]}
            />
          ))}
          {day.events.length > maxBars && (
            <Text style={styles.moreEventsText}>
              +{day.events.length - maxBars}
            </Text>
          )}
        </View>
      );
    }

    // Zoomed in - expanded view with text
    const maxBars = 4;
    const visibleEvents = day.events.slice(0, maxBars);
    
    return (
      <View style={styles.eventBarsExpanded}>
        {visibleEvents.map((event, index) => (
          <View
            key={`expanded-${index}`}
            style={[
              styles.eventBarExpanded,
              { backgroundColor: event.calendarColor || theme.primary },
            ]}
          >
            <Text style={styles.eventTextExpanded} numberOfLines={1}>
              {event.title}
            </Text>
          </View>
        ))}
        {day.events.length > maxBars && (
          <Text style={styles.moreEventsText}>
            +{day.events.length - maxBars} more
          </Text>
        )}
      </View>
    );
  }, [day.events, zoomLevel, styles, theme.primary]);

  // Memoize cell style array
  const cellStyles = useMemo(() => [
    styles.dayCell,
    day.isToday && styles.todayCell,
    !day.isCurrentMonth && styles.otherMonthCell,
  ], [styles, day.isToday, day.isCurrentMonth]);

  // Memoize text style array
  const textStyles = useMemo(() => [
    styles.dayText,
    !day.isCurrentMonth && styles.otherMonthText,
  ], [styles, day.isCurrentMonth]);

  return (
    <TouchableOpacity
      style={cellStyles}
      onPress={() => onPress(day)}
      activeOpacity={0.7}
    >
      <Text style={textStyles}>
        {day.date.day}
      </Text>
      {eventIndicators}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.day.date.toISODate() === nextProps.day.date.toISODate() &&
    prevProps.day.events.length === nextProps.day.events.length &&
    prevProps.zoomLevel === nextProps.zoomLevel &&
    prevProps.day.isToday === nextProps.day.isToday &&
    prevProps.day.isCurrentMonth === nextProps.day.isCurrentMonth
  );
});

CalendarDay.displayName = 'CalendarDay';

export default CalendarDay;