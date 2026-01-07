import React, { useRef, useMemo } from "react";
import { View, ScrollView, StyleSheet, PanResponder } from "react-native";
import { useTheme } from "@my-apps/contexts";
import EventCard from "./EventCard";

/**
 * DayView - Calendar day view with swipe gestures
 * 
 * Swipe left → Next day
 * Swipe right → Previous day
 */
const DayView = ({
  appName,
  date,
  events = [],
  userCalendars = [],
  onDeleteEvent,
  onEditEvent,
  onAddActivity,
  onActivityPress,
  onActivityDelete,
  // Navigation handlers for swipe gestures
  onSwipeLeft,  // ← Next day
  onSwipeRight, // ← Previous day
}) => {
  const { theme, getSpacing } = useTheme();
  const scrollViewRef = useRef(null);
  console.log("Events in DayView:", events);

  // Sort Events by start time (earlier first)
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aStart = new Date(a.startTime).getTime();
      const bStart = new Date(b.startTime).getTime();
      return aStart - bStart;
    });
  }, [events]);
  console.log("Sorted Events in DayView:", sortedEvents);

  // Swipe gesture handler
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Activate if horizontal swipe > 20px and vertical < 50px
      return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 50;
    },
    onPanResponderRelease: (evt, gestureState) => {
      const SWIPE_THRESHOLD = 50;
      
      if (gestureState.dx > SWIPE_THRESHOLD) {
        // Swiped right → Previous day
        console.log("👈 Swiped right - Previous day");
        onSwipeRight?.();
      } else if (gestureState.dx < -SWIPE_THRESHOLD) {
        // Swiped left → Next day
        console.log("👉 Swiped left - Next day");
        onSwipeLeft?.();
      }
    },
  }), [onSwipeLeft, onSwipeRight]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: getSpacing.lg,
      paddingTop: getSpacing.md,
      paddingBottom: getSpacing.xl * 2,
    },
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {sortedEvents.map((event, index) => (
          <EventCard
            key={`${event.eventId}-${index}`}
            appName={appName}
            event={event}
            userCalendars={userCalendars}
            onDeleteEvent={onDeleteEvent}
            onEditEvent={onEditEvent}
            onAddActivity={onAddActivity}
            onActivityPress={onActivityPress}
            onActivityDelete={onActivityDelete}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default DayView;