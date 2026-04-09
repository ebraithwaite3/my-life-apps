import React, { useRef, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, PanResponder, Alert } from "react-native";
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
  navigation,
}) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();
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

  // Split To Do events (checklist app only) from regular events
  const { todoEvents, regularEvents } = useMemo(() => {
    if (appName !== 'checklist') return { todoEvents: [], regularEvents: sortedEvents };
    const todoEvents = [];
    const regularEvents = [];
    sortedEvents.forEach(event => {
      if (event.title?.trim().toLowerCase() === 'to do') {
        todoEvents.push(event);
      } else {
        regularEvents.push(event);
      }
    });
    return { todoEvents, regularEvents };
  }, [sortedEvents, appName]);

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
    todoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${theme.primary}18`,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: `${theme.primary}40`,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      marginBottom: getSpacing.md,
    },
    todoBannerText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
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
        {todoEvents.map(event => {
          const checklistActivity = event.activities?.find(a => a.activityType === 'checklist');
          if (!checklistActivity) return null;
          const total = checklistActivity.items?.length ?? 0;
          const completed = checklistActivity.items?.filter(i => i.completed).length ?? 0;
          return (
            <TouchableOpacity
              key={event.eventId}
              style={styles.todoBanner}
              onPress={() => onActivityPress(checklistActivity, event)}
              onLongPress={() => {
                Alert.alert(
                  'Delete To Do',
                  'Are you sure you want to delete this To Do event?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => onDeleteEvent(event) },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.todoBannerText}>
                {`☑️ To Do — ${completed} of ${total} complete`}
              </Text>
            </TouchableOpacity>
          );
        })}
        {regularEvents.map((event, index) => (
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
            navigation={navigation}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default DayView;