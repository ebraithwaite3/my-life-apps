import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";

const AttendanceHeader = ({
  assignment,
  group,
  handleAssignmentPress,
  responses,
  totalUsers,
  myResponse,
  expandCard,
  notes,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  console.log("AttendanceHeader props:", { assignment, group, responses });

  const allowingMaybe = useMemo(() => {
    return assignment?.attendanceData?.settings?.allowMaybeResponse || false;
  }, [assignment]);
  console.log("Allowing Maybe Response:", allowingMaybe, "Assignment:", assignment);

  const attendanceCounts = useMemo(() => {
    const counts = {
      yes: 0,
      no: 0,
      maybe: 0,
    };

    if (!Array.isArray(responses)) {
      return counts; // Return default counts if responses is not an array
    }

    responses.forEach((response) => {
      if (response.response === "yes") {
        counts.yes++;
      } else if (response.response === "no") {
        counts.no++;
      } else if (response.response === "maybe") {
        counts.maybe++;
      }
    });
    console.log("Allowing Maybe:", allowingMaybe, "Counts:", counts);

    return counts;
  }, [responses]);

  const getStatusColor = (response) => {
    switch (response) {
      case "yes":
        return theme.success || "#4CAF50";
      case "maybe":
        return theme.warning || "#FF9800";
      case "no":
        return theme.error || "#F44336";
      default:
        return "#FFC60A";
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 8,
      marginTop: getSpacing.sm,
      overflow: "hidden",
    },
    pressableContent: {
      padding: getSpacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: getSpacing.sm,
    },
    titleContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    icon: {
      marginRight: getSpacing.sm,
    },
    typeTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: getTypography.h4.fontWeight,
      color: theme.text.primary,
      flex: 1,
    },
    responseCount: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
      marginRight: getSpacing.sm,
    },
    chevron: {
      marginLeft: getSpacing.xs,
    },
    description: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.xs,
      lineHeight: 20,
    },
    eventInfo: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
      marginBottom: getSpacing.md,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: getSpacing.xs,
    },
    myStatus: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
    },
    counts: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.pressableContent}
        onPress={handleAssignmentPress}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons
              name="people-outline"
              size={24}
              color={theme.text.primary}
              style={styles.icon}
            />
            <Text style={styles.typeTitle}>Attendance</Text>
            <Text
              style={[
                styles.responseCount,
                responses?.length === totalUsers &&
                  totalUsers > 0 && { color: theme.success || "#4CAF50" },
              ]}
            >
              {`${responses?.length}/${totalUsers} Responses`}
            </Text>
            <Ionicons
              name={expandCard ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.text.secondary}
              style={styles.chevron}
            />
          </View>
        </View>
        <View style={styles.statusRow}>
          <Text
            style={[styles.myStatus, { color: getStatusColor(myResponse) }]}
          >
            Me:{" "}
            {myResponse
              ? myResponse === "yes"
                ? "Going"
                : myResponse === "maybe"
                ? "Maybe"
                : "Not Going"
              : "No Response"}
          </Text>
          <Text style={styles.counts}>
            {attendanceCounts.yes} Yes • {attendanceCounts.no} No
            {allowingMaybe && ` • ${attendanceCounts.maybe} Maybe`}
          </Text>
        </View>
        <View style={styles.description}>
          <Text style={{ color: theme.text.secondary }}>
            (Click to view Respones
            {notes?.length > 0 ? ` and ${notes.length} notes)` : ")"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default AttendanceHeader;
