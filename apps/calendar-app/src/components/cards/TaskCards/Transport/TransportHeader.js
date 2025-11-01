import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useData } from "../../../../contexts/DataContext";
import { useTheme } from "../../../../contexts/ThemeContext";

const TransportHeader = ({
  assignment,
  group,
  handleAssignmentPress,
  dropOffInfo,
  pickUpInfo,
  transportStatus,
  userClaimedDropOff,
  userClaimedPickUp,
  expandCard, // Changed from isExpanded to match what TransportCard passes
  notes,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user } = useData();
  // TESTING Push
  const getDropOffStatus = () => {
    if (dropOffInfo.status === "handled") {
      return dropOffInfo.reason || "Handled";
    }
    if (!dropOffInfo.assignedTo) {
      return "Available to claim";
    }
    if (userClaimedDropOff) {
      return "Me";
    }
    return dropOffInfo.assignedTo;
  };

  const getPickUpStatus = () => {
    if (pickUpInfo.status === "handled") {
      return pickUpInfo.reason || "Handled";
    }
    if (!pickUpInfo.assignedTo) {
      return "Available to claim";
    }
    if (userClaimedPickUp) {
      return "Me";
    }
    return pickUpInfo.assignedTo;
  };

  const getStatusColor = (info, isClaimed, hasHandler) => {
    if (info.status === "handled") {
      return theme.text.secondary; // Normal color for handled (not green)
    }
    if (isClaimed) {
      return theme.success || "#10b981"; // Green for "Me"
    }
    if (hasHandler) {
      return theme.text.secondary;
    }
    return theme.text.tertiary; // Muted for available
  };

  const noteCount = Array.isArray(notes) ? notes.length : notes ? 1 : 0;

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
    chevron: {
      marginLeft: getSpacing.xs,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: getSpacing.xs,
    },
    transportLine: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: getSpacing.xs,
    },
    transportLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.primary,
      width: 70,
    },
    transportStatus: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
    },
    description: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.xs,
      lineHeight: 20,
    },
    transportCount: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
      marginRight: getSpacing.sm,
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
              name="car-outline"
              size={24}
              color={theme.text.primary}
              style={styles.icon}
            />
            <Text style={styles.typeTitle}>Transport</Text>
            <Text
              style={[
                styles.transportCount,
                dropOffInfo.assignedTo &&
                  pickUpInfo.assignedTo && {
                    color: theme.success || "#10b981",
                  },
              ]}
            >
              {(dropOffInfo.assignedTo || dropOffInfo.status === "handled"
                ? 1
                : 0) +
                (pickUpInfo.assignedTo || pickUpInfo.status === "handled"
                  ? 1
                  : 0)}
              /2 Rides
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
          <View>
            <View style={styles.transportLine}>
              <Text style={styles.transportLabel}>Drop Off:</Text>
              <Text
                style={[
                  styles.transportStatus,
                  {
                    color: getStatusColor(
                      dropOffInfo,
                      userClaimedDropOff,
                      dropOffInfo.assignedTo
                    ),
                    backgroundColor:
                      userClaimedDropOff && dropOffInfo.status !== "handled"
                        ? `${theme.success || "#10b981"}20`
                        : "transparent",
                    paddingHorizontal:
                      userClaimedDropOff && dropOffInfo.status !== "handled"
                        ? getSpacing.xs
                        : 0,
                    paddingVertical:
                      userClaimedDropOff && dropOffInfo.status !== "handled"
                        ? 2
                        : 0,
                    borderRadius:
                      userClaimedDropOff && dropOffInfo.status !== "handled"
                        ? 4
                        : 0,
                  },
                ]}
              >
                {getDropOffStatus()}
              </Text>
            </View>

            <View style={styles.transportLine}>
              <Text style={styles.transportLabel}>Pick Up:</Text>
              <Text
                style={[
                  styles.transportStatus,
                  {
                    color: getStatusColor(
                      pickUpInfo,
                      userClaimedPickUp,
                      pickUpInfo.assignedTo
                    ),
                    backgroundColor:
                      userClaimedPickUp && pickUpInfo.status !== "handled"
                        ? `${theme.success || "#10b981"}20`
                        : "transparent",
                    paddingHorizontal:
                      userClaimedPickUp && pickUpInfo.status !== "handled"
                        ? getSpacing.xs
                        : 0,
                    paddingVertical:
                      userClaimedPickUp && pickUpInfo.status !== "handled"
                        ? 2
                        : 0,
                    borderRadius:
                      userClaimedPickUp && pickUpInfo.status !== "handled"
                        ? 4
                        : 0,
                  },
                ]}
              >
                {getPickUpStatus()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.description}>
          <Text style={{ color: theme.text.secondary }}>
            (Click to claim/edit
            {noteCount > 0 ? ` and ${noteCount} notes)` : ")"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default TransportHeader;
