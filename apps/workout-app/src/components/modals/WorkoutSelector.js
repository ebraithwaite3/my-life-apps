import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";

const WorkoutSelector = ({
  label = "Workout",
  selectedWorkout, // Keep for backwards compatibility
  selectedChecklist, // What SharedEventModal passes
  selectedActivity, // Future-proof generic name
  savedChecklists = [], // What SharedEventModal passes
  savedTemplates = [], // Alternative name
  onPress,
  onClear,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  // Use whichever is provided
  const selected = selectedActivity || selectedWorkout || selectedChecklist;
  const templates = savedTemplates.length ? savedTemplates : savedChecklists;

  const exerciseCount = selected?.exercises?.length || 0;
  const lastUsed = selected?.lastUsed;

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
      width: '100%',
    },
    leftContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      marginRight: getSpacing.md,
    },
    formLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginRight: getSpacing.sm,
    },
    workoutInfo: {
      flexGrow: 1,
      flexShrink: 1,
      flexDirection: "column",
      maxWidth: "75%",
      overflow: "hidden",
    },
    workoutName: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      fontWeight: "600",
      marginBottom: 2,
    },
    exerciseCountText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      fontWeight: '500',
    },
    lastUsedText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
      marginTop: 2,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
      backgroundColor: theme.primary + "15",
      borderRadius: getBorderRadius.sm,
      flexShrink: 0,
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
      flexShrink: 0,
    },
  });

  return (
    <>
      <Text style={styles.sectionHeader}>{label}</Text>
      <View style={styles.formSection}>
        <View style={styles.formRow}>
          
          {/* LEFT CONTENT: Info + Clear Button */}
          <View style={styles.leftContent}>
            {!selected && (
              <Text style={styles.formLabel}>Add Workout</Text>
            )}
            
            {selected ? (
              <View style={styles.workoutInfo}>
                {/* LINE 1: WORKOUT NAME */}
                <Text
                  style={styles.workoutName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {selected.name}
                </Text>
                
                {/* LINE 2: EXERCISE COUNT */}
                <Text style={styles.exerciseCountText}>
                  {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
                </Text>

                {/* LINE 3: LAST USED (Optional) */}
                {lastUsed && (
                  <Text style={styles.lastUsedText}>
                    Last used: {new Date(lastUsed).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ) : null}
            
            {/* Clear Button */}
            {selected ? (
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
            ) : null}
          </View>
          
          {/* RIGHT CONTENT: Action Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={onPress}
          >
            <Ionicons
              name={selected ? "create-outline" : "add"}
              size={16}
              color={theme.primary}
            />
            <Text style={styles.addButtonText}>
              {selected ? "Change" : "Add"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default WorkoutSelector;