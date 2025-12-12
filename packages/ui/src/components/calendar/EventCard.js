// components/calendar/EventCard.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { DateTime } from "luxon";
import ActivityRow from "./ActivityRow";

const EventCard = ({
  appName,
  event,
  userCalendars,
  onEdit,
  onDelete,
  onAddActivity,
  onActivityPress,
  onActivityDelete,
}) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();

  // Format the event time
  const startTime = event?.startTime ? DateTime.fromISO(event.startTime) : null;
  // timeText first needs to check if isAllDay: true, and that should return "All Day"
  const timeText = event.isAllDay
    ? "All Day"
    : startTime
    ? startTime.toLocaleString(DateTime.TIME_SIMPLE)
    : "No Time";
  const hasActivities = event.activities && event.activities.length > 0;

  // Find the calendar this event belongs to
  const calendar = userCalendars.find(
    (cal) => cal.calendarId === event.calendarId
  );
  if (calendar && calendar.color) {
    event.calendarColor = calendar.color;
  } else {
    event.calendarColor = theme.primary;
  }

  // Determine if event is editable (not iCal)
  const isEditable =
    calendar?.calendarType !== "ical" || event.calendarId === "internal";

  const handleMenuPress = () => {
    const buttons = [];

    // Add Edit option if editable
    if (isEditable) {
      buttons.push({
        text: "Edit Event",
        onPress: () => {
          console.log("Edit pressed for event:", event.title);
          if (onEdit) onEdit(event);
        },
      });
    }

    // Always add Delete option
    buttons.push({
      text: "Delete Event",
      style: "destructive",
      onPress: () => {
        console.log("Delete pressed for event:", event.title);
        if (onDelete) onDelete(event);
      },
    });

    // Add Cancel option
    buttons.push({
      text: "Cancel",
      style: "cancel",
    });

    Alert.alert(event.title || "Event Options", "Choose an action", buttons, {
      cancelable: true,
    });
  };

  const styles = StyleSheet.create({
    container: {
      width: "100%",
      backgroundColor: theme.surface || "#FFFFFF",
      borderRadius: getBorderRadius.md,
      marginBottom: getSpacing.md,
      borderLeftWidth: 4,
      borderLeftColor: event.calendarColor || theme.primary,
      borderWidth: 1,
      borderColor: theme.border || "#E0E0E0",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    mainContent: {
      flexDirection: "row",
      alignItems: "center",
      padding: getSpacing.md,
    },
    timeColumn: {
      width: 80,
      marginRight: getSpacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    timeText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text.primary,
      textAlign: "center",
    },
    durationText: {
      fontSize: 12,
      color: theme.text.secondary,
      textAlign: "center",
      marginTop: 2,
    },
    contentColumn: {
      flex: 1,
      justifyContent: "center",
    },
    titleText: {
      fontSize: 16,
      color: theme.text.primary,
      fontWeight: "500",
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
    },
    iconButton: {
      padding: getSpacing.xs,
    },
    activitiesContent: {
      paddingHorizontal: getSpacing.md,
      paddingBottom: getSpacing.md,
      paddingTop: getSpacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    activityItem: {
      paddingVertical: getSpacing.xs,
      paddingLeft: getSpacing.md,
    },
    activityText: {
      fontSize: 14,
      color: theme.text.primary,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.mainContent}>
        {/* Left Column - Time */}
        <View style={styles.timeColumn}>
          <Text style={styles.timeText}>{timeText}</Text>
          <Text style={styles.durationText}>Event</Text>
        </View>

        {/* Middle Column - Content */}
        <View style={styles.contentColumn}>
          <Text style={styles.titleText}>
            {event?.title || "Untitled Event"}
          </Text>
        </View>

        {/* Right Column - Actions */}
        <View style={styles.actionsRow}>
          {/* Add Activity Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              if (onAddActivity) onAddActivity(event);
            }}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={theme.primary}
            />
          </TouchableOpacity>

          {/* Three-dot Menu Button */}
          <TouchableOpacity style={styles.iconButton} onPress={handleMenuPress}>
            <Ionicons
              name="ellipsis-horizontal"
              size={24}
              color={theme.text.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Always Show Activities List if they exist */}
      {hasActivities && (
        <View style={styles.activitiesContent}>
          <ActivityRow 
            activities={event.activities} 
            appName={appName}
            event={event}
            onActivityPress={onActivityPress}
            onActivityDelete={onActivityDelete}
          />
        </View>
      )}
    </View>
  );
};

export default EventCard;