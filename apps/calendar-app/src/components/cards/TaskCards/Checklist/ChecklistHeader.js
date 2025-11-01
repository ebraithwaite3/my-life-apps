import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";

const ChecklistHeader = ({
  assignment,
  group,
  handleAssignmentPress,
  listItems,
  completedCount,
  totalCount,
  expandCard, // Changed from isExpanded to match what ChecklistCard passes
  notes,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();

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
    itemCount: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
      marginRight: getSpacing.sm,
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
    description: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.xs,
      lineHeight: 20,
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
              name="list-outline"
              size={24}
              color={theme.text.primary}
              style={styles.icon}
            />
            <Text style={styles.typeTitle}>Checklist</Text>
            <Text
              style={[
                styles.itemCount,
                completedCount === totalCount &&
                  totalCount > 0 && { color: theme.success || "#10b981" },
              ]}
            >
              {completedCount}/{totalCount} Items
            </Text>
            <Ionicons
              name={expandCard ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.text.secondary}
              style={styles.chevron}
            />
          </View>
        </View>

        <View style={styles.description}>
          <Text style={{ color: theme.text.secondary }}>
            (Click here to see list
            {noteCount > 0 ? ` and ${noteCount} notes)` : ")"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default ChecklistHeader;