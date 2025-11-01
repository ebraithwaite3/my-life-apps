import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { DateTime } from "luxon";

const EventHeader = ({ event, hideDetails = false }) => {
  console.log("EventHeader event:", event);
  const { theme, getSpacing, getTypography } = useTheme();

  if (!event) return null;

  const formatEventTime = () => {
    // Use device's local timezone instead of getUserTimezone
    const startTime = DateTime.fromISO(event.startTime).toLocal();
    const endTime = DateTime.fromISO(event.endTime).toLocal();

    const now = DateTime.now();
    const isToday = startTime.hasSame(now, "day");
    const isYesterday = startTime.plus({ days: 1 }).hasSame(now, "day");
    const isTomorrow = startTime.minus({ days: 1 }).hasSame(now, "day");

    // Check if the event spans multiple days
    const isMultiDay = !startTime.hasSame(endTime, "day");

    let dateTopLine;
    let dateBottomLine;
    if (isMultiDay) {
      // If it's multi-day, show format 'Mon, Aug 10, 2025 3:00 PM' (using the start time)
      dateTopLine = startTime.toFormat("ccc, MMM d, yyyy h:mm a");
      // Same format for end time
      dateBottomLine = endTime.toFormat("ccc, MMM d, yyyy h:mm a");
    } else if (isToday) {
      dateTopLine = "Today";
      // Need the Start and End time in the same line (e.g. 3:00 PM - 5:00 PM)
      dateBottomLine = `${startTime.toFormat("h:mm a")} - ${endTime.toFormat(
        "h:mm a"
      )}`;
    } else if (isYesterday) {
      dateTopLine = "Yesterday";
      dateBottomLine = `${startTime.toFormat("h:mm a")} - ${endTime.toFormat(
        "h:mm a"
      )}`;
    } else if (isTomorrow) {
      dateTopLine = "Tomorrow";
      dateBottomLine = `${startTime.toFormat("h:mm a")} - ${endTime.toFormat(
        "h:mm a"
      )}`;
    } else {
      // It's NOT multi-day and NOT today, yesterday, or tomorrow so use Mon, Aug 10, 2025
      dateTopLine = startTime.toFormat("ccc, MMM d, yyyy");
      dateBottomLine = `${startTime.toFormat("h:mm a")} - ${endTime.toFormat(
        "h:mm a"
      )}`;
    }

    return { dateTopLine, dateBottomLine, isMultiDay };
  };

  const formatArrivalTime = () => {
    if (!event.arrivalTime) return null;
    const arrivalTime = DateTime.fromISO(event.arrivalTime).toLocal();
    return arrivalTime.toFormat("h:mm a");
  };

  const { dateTopLine, dateBottomLine, isMultiDay } = formatEventTime();
  const arrivalText = formatArrivalTime();

  // Dynamic font size for title based on length
  const getDynamicTitleFontSize = (title) => {
    if (!title) return getTypography.h1.fontSize;

    const baseSize = getTypography.h1.fontSize;
    const maxLength = 20;
    const length = title.length;
    if (length > maxLength) {
      return Math.max(baseSize - (length - maxLength) * 0.5, 16);
    }
    return baseSize;
  };

  const handleLocationPress = (location) => {
    // Encode the location for URL
    const encodedLocation = encodeURIComponent(location);

    // Try to open in native Maps app
    const url =
      Platform.OS === "ios"
        ? `maps://app?q=${encodedLocation}`
        : `geo:0,0?q=${encodedLocation}`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to web maps
        const webUrl = `https://maps.google.com/maps?q=${encodedLocation}`;
        Linking.openURL(webUrl);
      }
    });
  };

  // Get calendar info - use passed calendar prop or fallback to event data
  const calendarInfo = {
    name: event.calendarName || 'Unknown Calendar',
    color: event.calendarColor || theme.primary
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      paddingHorizontal: getSpacing.sm,
      paddingVertical: getSpacing.sm,
      paddingTop: getSpacing.md,
    },
    eventSection: {
      marginBottom: getSpacing.sm,
    },
    title: {
      fontWeight: getTypography.h1.fontWeight,
      color: theme.text.primary,
      maxWidth: "100%",
    },
    dateTopLine: {
      fontSize: getTypography.h3.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.xs,
    },
    dateBottomLine: {
      fontSize: getTypography.h3.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.sm,
    },
    multiDayText: {
      fontSize: getTypography.h3.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.xs,
    },
    multiDayLabel: {
      fontWeight: "600",
      color: theme.text.primary,
    },
    groupContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: getSpacing.xs,
      maxWidth: "100%",
    },
    groupDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: calendarInfo.color,
      marginRight: getSpacing.xs,
      flexShrink: 0,
    },
    calendarName: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      flex: 1,
      flexShrink: 1,
    },
    description: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      lineHeight: 18,
    },
    detailsSection: {
      paddingTop: getSpacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    detailsTitle: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: getTypography.h2.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: getSpacing.sm,
    },
    detailIcon: {
      marginRight: getSpacing.sm,
      marginTop: 2,
    },
    detailContent: {
      flex: 1,
    },
    detailText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      lineHeight: 22,
    },
    detailSubtext: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: 2,
      lineHeight: 18,
    },
    arrivalTime: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      fontStyle: 'italic',
      marginBottom: getSpacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      {/* Event Section */}
      <View style={styles.eventSection}>
        <Text
          style={[
            styles.title,
            { fontSize: getDynamicTitleFontSize(event.title) },
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {event.title || 'Untitled Event'}
        </Text>

        {isMultiDay ? (
          <>
            <Text style={styles.multiDayText}>
              <Text style={styles.multiDayLabel}>Start: </Text>
              {dateTopLine}
            </Text>
            <Text style={styles.multiDayText}>
              <Text style={styles.multiDayLabel}>End: </Text>
              {dateBottomLine}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.dateTopLine}>{dateTopLine}</Text>
            <Text style={styles.dateBottomLine}>{dateBottomLine}</Text>
          </>
        )}

        {/* Arrival time if different from start time */}
        {arrivalText && (
          <Text style={styles.arrivalTime}>
            Arrival: {arrivalText}
          </Text>
        )}

        {/* Calendar info */}
        <View style={styles.groupContainer}>
          <View style={styles.groupDot} />
          <Text
            style={styles.calendarName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {calendarInfo.name}
          </Text>
        </View>
      </View>

      {/* Details Section */}
      {(event.description || event.location || event.additionalInfo) &&
        !hideDetails && (
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>Details</Text>

            {/* Description */}
            {event.description && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={theme.text.secondary}
                  style={styles.detailIcon}
                />
                <View style={styles.detailContent}>
                  <Text
                    style={styles.detailText}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                  >
                    {event.description}
                  </Text>
                </View>
              </View>
            )}

            {/* Location */}
            {event.location && (
              <TouchableOpacity
                style={styles.detailRow}
                onPress={() => handleLocationPress(event.location)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={theme.primary}
                  style={styles.detailIcon}
                />
                <View style={styles.detailContent}>
                  <Text style={[styles.detailText, { color: theme.primary }]}>
                    {event.location}
                  </Text>
                  {event.address && (
                    <Text style={styles.detailSubtext}>{event.address}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {/* Event Type */}
            {event.eventType && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="bookmark-outline"
                  size={20}
                  color={theme.text.secondary}
                  style={styles.detailIcon}
                />
                <View style={styles.detailContent}>
                  <Text style={styles.detailText}>
                    Type: {event.eventType}
                  </Text>
                </View>
              </View>
            )}

            {/* Additional Info */}
            {event.additionalInfo && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={theme.text.secondary}
                  style={styles.detailIcon}
                />
                <View style={styles.detailContent}>
                  <Text style={styles.detailText}>{event.additionalInfo}</Text>
                </View>
              </View>
            )}
          </View>
        )}
    </View>
  );
};

export default EventHeader;