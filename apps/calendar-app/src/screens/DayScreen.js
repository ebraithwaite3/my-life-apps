import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Platform,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";
import { Ionicons } from "@expo/vector-icons";
import { DateTime } from "luxon";
import EventCard from "../components/cards/EventCard/EventCard";
import { useUserActions } from "../hooks";
import LoadingScreen from "../components/LoadingScreen";
import EventCreateEditModal from "../components/modals/EventCreateEditModal";

const DayScreen = ({ navigation, route }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { user, calendars, tasks, groups, setWorkingDate } = useData();
  const { toggleEventVisibility } = useUserActions();
  const { date: initialDate } = route.params || {
    date: DateTime.now().toISODate(),
  };

  const [currentDate, setCurrentDate] = useState(initialDate);
  const [showHiddenEvents, setShowHiddenEvents] = useState(false);
  const [updatingHiddenEvents, setUpdatingHiddenEvents] = useState(false);
  const [createEditModalVisible, setCreateEditModalVisible] = useState(false);

  console.log("Tasks in DayScreen:", tasks);

  const handleToggleEventVisibility = async (eventId, startTime, hideOrUnhide) => {
    try {
      setUpdatingHiddenEvents(true);
      await toggleEventVisibility(eventId, startTime, hideOrUnhide);
      // Pause briefly to ensure UI updates
      await new Promise((resolve) => setTimeout(resolve, 300));
      setUpdatingHiddenEvents(false);
    } catch (error) {
      console.error("Error toggling event visibility:", error);
    }
  }

  // Update working date when current date changes
  useEffect(() => {
    setWorkingDate(currentDate);
  }, [currentDate, setWorkingDate]);

  // Navigation functions
  const goToPreviousDay = () => {
    const previousDay = DateTime.fromISO(currentDate)
      .minus({ days: 1 })
      .toISODate();
    setCurrentDate(previousDay);
  };

  const goToNextDay = () => {
    const nextDay = DateTime.fromISO(currentDate).plus({ days: 1 }).toISODate();
    setCurrentDate(nextDay);
  };

  // Format date for header display
  const formatHeaderDate = (dateString) => {
    const date = DateTime.fromISO(dateString);
    return date.toFormat("ccc LLL d"); // e.g., "Wed Sep 10"
  };

  // Helper function to check if an event has been hidden by user
  const isEventHidden = (eventId) => {
    console.log("Checking if event is hidden:", eventId, user?.hiddenEvents);
    return (
      user?.hiddenEvents?.some((hidden) => hidden.eventId === eventId) || false
    );
  };

  // Build Hidden events for the selected date (in user.hiddenEvents)
  const hiddenEventsForDate = useMemo(() => {
    if (!user?.hiddenEvents || user.hiddenEvents.length === 0) return [];
    const dayISO = currentDate;
    return user.hiddenEvents.filter(
      (hidden) => hidden.startTime === dayISO
    );
  }, [user?.hiddenEvents, currentDate]);

  console.log("Hidden events for date", currentDate, ":", hiddenEventsForDate, user?.hiddenEvents);

  // Build events for the selected date
  const dayEvents = useMemo(() => {
    if (!calendars || calendars.length === 0) return [];

    const events = [];
    const dayISO = currentDate;

    calendars.forEach((calendar) => {
      if (calendar.events && typeof calendar.events === "object") {
        Object.entries(calendar.events).forEach(([eventKey, event]) => {
          const eventStart = DateTime.fromISO(event.startTime);
          const eventEnd = DateTime.fromISO(event.endTime);

          if (!eventStart.isValid || !eventEnd.isValid) return;

          const dayStart = DateTime.fromISO(dayISO).startOf("day");
          const dayEnd = DateTime.fromISO(dayISO).endOf("day");

          if (
            eventStart.toISODate() === dayISO ||
            eventEnd.toISODate() === dayISO ||
            (eventStart <= dayEnd && eventEnd >= dayStart)
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
                isHidden: isHidden, // Add this flag for potential styling
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

  const editableCalendars = useMemo(() => {
      // Return calendar objects from user.calendars that are internal with write permissions
      if (!user?.calendars || user.calendars.length === 0) return [];
    
      return user.calendars.filter(
        (cal) => cal.permissions === "write" && cal.calendarType === "internal"
      );
    }, [user?.calendars]);
    console.log("Editable calendars:", editableCalendars);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
      paddingTop: Platform.OS === "ios" ? 0 : getSpacing.sm,
    },
    header: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
      flexDirection: "row",
      alignItems: "center",
    },
    dateNavigation: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.lg,
      flex: 1,
      justifyContent: "center",
    },
    navButton: {
      backgroundColor: theme.button.secondary,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: getTypography.h2.fontWeight,
      color: theme.text.primary,
      textAlign: "center",
      lineHeight: getTypography.h2.fontSize * 1,
      flexShrink: 1,
    },
    backButton: {
      padding: getSpacing.sm,
      marginRight: getSpacing.sm,
    },
    // Hidden Events Toggle Styles
    hiddenToggleContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.surface,
    },
    hiddenToggleContent: {
      flexDirection: "row",
      alignItems: "center",
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between', // Pushes elements to opposite ends
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      backgroundColor: theme.surface,
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
    placeholderView: {
      // This allows the empty View to take up space and push the FAB to the right
      flex: 1, 
      minWidth: 40, // Ensure it has enough width if flex: 1 is too aggressive
    },
  });

  if (updatingHiddenEvents) {
    return <LoadingScreen message="Updating events..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={theme.button.secondaryText}
            />
          </TouchableOpacity>

          <View style={styles.dateNavigation}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={goToPreviousDay}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={theme.button.secondaryText}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle} numberOfLines={1}>
              {formatHeaderDate(currentDate)}
            </Text>

            <TouchableOpacity style={styles.navButton} onPress={goToNextDay}>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.button.secondaryText}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerRow}>
  {/* Conditional Toggle or Empty View */}
  {hiddenEventsForDate.length > 0 ? (
    // CHILD 1: Hidden Events Toggle (shows on the left)
    <TouchableOpacity 
      style={styles.hiddenToggleContainer}
      onPress={() => setShowHiddenEvents(!showHiddenEvents)}
    >
      <View style={styles.hiddenToggleContent}>
        <Text style={styles.hiddenToggleText}>
          Show Hidden Events ({hiddenEventsForDate.length})
        </Text>
        <View style={[styles.checkbox, showHiddenEvents && styles.checkboxChecked]}>
          {showHiddenEvents && (
            <Ionicons name="checkmark" size={14} color="white" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  ) : (
    // PLACEHOLDER: An empty View that occupies the space of the toggle
    // This maintains two children for 'space-between' to work correctly.
    <View style={styles.placeholderView} /> 
  )}
  
  {/* CHILD 2: FAB - Always positioned on the right */}
  <TouchableOpacity
    style={styles.fab}
    onPress={() => setCreateEditModalVisible(true)}
  >
    <Ionicons
      name="add"
      size={20}
      color={theme.button.secondaryText}
    />
  </TouchableOpacity>
</View>

        {/* Content */}
        <View style={styles.content}>
          {dayEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="calendar-outline"
                size={64}
                color={theme.text.tertiary}
              />
              <Text style={styles.emptyTitle}>Free Day</Text>
              <Text style={styles.emptySubtitle}>
                No events scheduled for this day.
              </Text>
            </View>
          ) : (
            <FlatList
              data={dayEvents}
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

export default DayScreen;