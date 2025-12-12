import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";

const ChecklistSelector = ({
  label = "Checklist",
  selectedChecklist,
  savedChecklists = [],
  onPress,
  onClear,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  console.log(
    "Rendering ChecklistSelector with selectedChecklist:",
    selectedChecklist
  );

  const styles = StyleSheet.create({
    sectionHeader: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      marginTop: getSpacing.lg,
      marginBottom: getSpacing.sm,
      marginHorizontal: getSpacing.lg,
    },
    formSection: {
      backgroundColor: theme.background,
      marginHorizontal: getSpacing.lg,
      borderRadius: getBorderRadius.md,
      overflow: "hidden",
    },
    formRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.lg,
    },
    leftContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    formLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginRight: getSpacing.sm,
    },
    checklistInfo: {
      flexDirection: "column",
      flexShrink: 1,
      maxWidth: "70%",
      overflow: "hidden",
    },
    checklistItemCount: {
      fontSize: getTypography.bodySmall.fontSize, // slightly smaller
      color: theme.text.secondary, // or whatever you prefer
      marginTop: 2,
    },

    checklistName: {
      fontSize: getTypography.body.fontSize,
      color: theme.primary,
      fontWeight: "600",
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
      backgroundColor: theme.primary + "15",
      borderRadius: getBorderRadius.sm,
    },
    addButtonText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
      fontWeight: "600",
      marginLeft: getSpacing.xs,
    },
    clearButton: {
      padding: getSpacing.xs,
      marginLeft: getSpacing.sm,
    },
  });

  return (
    <>
      <Text style={styles.sectionHeader}>{label}</Text>
      <View style={styles.formSection}>
        <View style={styles.formRow}>
          <View style={styles.leftContent}>
            {!selectedChecklist && (
              <Text style={styles.formLabel}>Add Checklist</Text>
            )}
            {selectedChecklist ? (
              <View style={styles.checklistInfo}>
                <Text
                  style={styles.checklistName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {selectedChecklist.name}
                </Text>
                <Text style={styles.checklistItemCount}>
                  {selectedChecklist.items.length} items
                </Text>
              </View>
            ) : null}

            {selectedChecklist ? (
              <>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={onClear}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={theme.text.secondary}
                  />
                </TouchableOpacity>
              </>
            ) : null}
          </View>

          <TouchableOpacity style={styles.addButton} onPress={onPress}>
            <Ionicons
              name={selectedChecklist ? "create-outline" : "add"}
              size={16}
              color={theme.primary}
            />
            <Text style={styles.addButtonText}>
              {selectedChecklist ? "Change" : "Add"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default ChecklistSelector;
