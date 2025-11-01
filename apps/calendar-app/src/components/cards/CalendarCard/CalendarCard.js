import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { useCalendarActions } from "../../../hooks";

const CalendarCard = ({
  calendar,
  groups,
  isCalendarSyncing,
  onSyncCalendar,
  syncing,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { deactivateCalendar } = useCalendarActions();

  // Memoize if this calendar can be deleted or not
  // Internal Calendars cannot be deleted also calendars that are linked to a group cannot be deleted
  const canDeleteCalendar = useMemo(() => {
    if (calendar.calendarType === "internal" || calendar.type === "internal") {
      return false;
    }

    // Check if any group has this calendar in their calendars array
    const linkedGroup = groups?.find((group) =>
      group.calendars?.some(
        (groupCalendar) =>
          groupCalendar.calendarId === calendar.calendarId ||
          groupCalendar.calendarId === calendar.id
      )
    );

    return !linkedGroup;
  }, [calendar, groups]);

  const handleDeactivate = async () => {
    const calendarId = calendar.calendarId || calendar.id;
    
    Alert.alert(
      "Delete Calendar",
      `Are you sure you want to delete "${calendar.name}"?\n\nThis will remove the calendar from your account. This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deactivateCalendar(calendarId);
              // Success message will be shown automatically by the hook
            } catch (error) {
              Alert.alert("Delete Failed", `Failed to delete calendar: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const handleCannotDelete = () => {
    const reason =
      calendar.calendarType === "internal" || calendar.type === "internal"
        ? "Internal calendars cannot be deleted."
        : "This calendar is linked to a group. Remove it from the group, or ask a group admin to do so, before you can delete it.";
    
    Alert.alert("Cannot Delete", reason, [{ text: "OK" }]);
  };
  
  const getSyncStatusColor = (status) => {
    switch (status) {
      case "success":
        return "#10B981";
      case "syncing":
        return "#F59E0B";
      case "error":
        return "#EF4444";
      default:
        return theme.text.tertiary;
    }
  };

  const getSyncStatusText = (status) => {
    switch (status) {
      case "success":
        return "Synced";
      case "syncing":
        return "Syncing...";
      case "error":
        return "Sync Error";
      case "pending":
        return "Not Synced";
      default:
        return "";
    }
  };

  const styles = StyleSheet.create({
    calendarItem: {
      backgroundColor: theme.surface,
      padding: getSpacing.lg,
      borderRadius: getBorderRadius.md,
      marginBottom: getSpacing.md,
      borderLeftWidth: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    calendarInfo: {
      flex: 1,
    },
    calendarName: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: getTypography.h4.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.xs,
    },
    calendarDetails: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.xs,
    },
    syncStatus: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      marginTop: getSpacing.xs,
    },
    calendarActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
    },
    syncCalendarButton: {
      backgroundColor: theme.button.secondary,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    syncCalendarButtonActive: {
      backgroundColor: theme.primary,
    },
  });

  return (
    <View style={[styles.calendarItem, { borderLeftColor: calendar.color }]}>
      <View style={styles.calendarInfo}>
        <Text style={styles.calendarName}>{calendar.name}</Text>
        <Text style={styles.calendarDetails}>
          {calendar.eventsCount || 0} events •{" "}
          {((calendar.sourceType || calendar.type) ?? "")
            .toString()
            .replace(/^\w/, (c) => c.toUpperCase())}
        </Text>

        {calendar.description && (
          <Text style={styles.calendarDetails}>{calendar.description}</Text>
        )}
        <Text
          style={[
            styles.syncStatus,
            {
              color: getSyncStatusColor(
                calendar.sync?.syncStatus || calendar.syncStatus
              ),
            },
          ]}
        >
          {isCalendarSyncing
            ? "Syncing..."
            : getSyncStatusText(
                calendar.sync?.syncStatus || calendar.syncStatus
              )}
          {calendar.sync?.lastSyncedAt &&
  calendar.sync.syncStatus === "success" &&
  ` • ${new Date(calendar.sync.lastSyncedAt).toLocaleDateString()} @ ${new Date(
    calendar.sync.lastSyncedAt
  ).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}

        </Text>
      </View>

      {/* Calendar Actions */}
      <View style={styles.calendarActions}>
        {/* Sync Button - only show for external calendars */}
        {calendar.calendarType !== "internal" &&
          calendar.type !== "internal" && (
            <TouchableOpacity
              style={[
                styles.syncCalendarButton,
                isCalendarSyncing && styles.syncCalendarButtonActive,
              ]}
              onPress={() => onSyncCalendar(calendar)}
              disabled={isCalendarSyncing || syncing}
            >
              {isCalendarSyncing ? (
                <ActivityIndicator size="small" color={theme.text.inverse} />
              ) : (
                <Ionicons
                  name="sync"
                  size={16}
                  color={
                    isCalendarSyncing
                      ? theme.text.inverse
                      : theme.button.secondaryText
                  }
                />
              )}
            </TouchableOpacity>
          )}

        {/* Delete/Can't Delete Button */}
        <TouchableOpacity
          style={[
            styles.syncCalendarButton,
            !canDeleteCalendar && { backgroundColor: theme.text.tertiary },
          ]}
          onPress={canDeleteCalendar ? handleDeactivate : handleCannotDelete}
        >
          <Ionicons
            name={canDeleteCalendar ? "trash-outline" : "ban-outline"}
            size={16}
            color={
              canDeleteCalendar ? theme.text.error || "#EF4444" : "#CC293C"
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CalendarCard;