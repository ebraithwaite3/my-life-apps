import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { useTheme } from "@my-apps/contexts";
import { useWorkoutData } from "../../contexts/WorkoutDataContext";
import WorkoutRow from "../workout/WorkoutRow";

const WorkoutContent = ({ workout, onExerciseUpdate }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { allExercises } = useWorkoutData();

  const [expandedExercises, setExpandedExercises] = React.useState([]);

  const toggleExercise = (index) => {
    setExpandedExercises((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSetUpdate = (exerciseIndex, setIndex, updates) => {
    const updatedExercises = JSON.parse(JSON.stringify(workout.exercises));
    updatedExercises[exerciseIndex].sets[setIndex] = {
      ...updatedExercises[exerciseIndex].sets[setIndex],
      ...updates,
    };
    onExerciseUpdate(updatedExercises);
  };

  const handleAddSet = (exerciseIndex) => {
    const updatedExercises = JSON.parse(JSON.stringify(workout.exercises));
    const workoutExercise = updatedExercises[exerciseIndex];
    const exercise = allExercises.find((ex) => ex.id === workoutExercise.exerciseId);

    const newSet = {
      id: `set-${Date.now()}`,
      completed: false,
    };

    if (exercise?.tracking.includes("reps")) newSet.reps = 0;
    if (exercise?.tracking.includes("weight")) newSet.weight = 0;
    if (exercise?.tracking.includes("distance")) newSet.distance = 0;
    if (exercise?.tracking.includes("time")) newSet.time = 0;

    if (!updatedExercises[exerciseIndex].sets) {
      updatedExercises[exerciseIndex].sets = [];
    }

    updatedExercises[exerciseIndex].sets.push(newSet);
    onExerciseUpdate(updatedExercises);
  };

  // Delete entire exercise
  const handleDeleteExercise = (exerciseIndex, exerciseName) => {
    Alert.alert(
      "Delete Exercise",
      `Remove ${exerciseName} from this workout?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedExercises = JSON.parse(JSON.stringify(workout.exercises));
            updatedExercises.splice(exerciseIndex, 1);
            onExerciseUpdate(updatedExercises);
          },
        },
      ]
    );
  };

  // Delete individual set
  const handleDeleteSet = (exerciseIndex, setIndex) => {
    const updatedExercises = JSON.parse(JSON.stringify(workout.exercises));
    updatedExercises[exerciseIndex].sets.splice(setIndex, 1);
    onExerciseUpdate(updatedExercises);
  };

  // Render right swipe actions for exercise
  const renderExerciseRightActions = (exerciseIndex, exerciseName) => {
    return (
      <TouchableOpacity
        style={styles.deleteExerciseAction}
        onPress={() => handleDeleteExercise(exerciseIndex, exerciseName)}
      >
        <Ionicons name="trash" size={24} color="#fff" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: getSpacing.md,
    },
    exerciseCard: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      marginBottom: getSpacing.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
    },
    exerciseCardComplete: {
      borderColor: theme.border,
      borderWidth: 2,
    },
    exerciseHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: getSpacing.md,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    exerciseHeaderComplete: {
      backgroundColor: `${theme.success}10`,
    },
    exerciseHeaderLeft: {
      flex: 1,
    },
    exerciseName: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      marginBottom: 4,
    },
    exerciseNameComplete: {
      color: theme.success,
    },
    setsProgress: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      fontWeight: "500",
    },
    setsProgressComplete: {
      color: theme.success,
    },
    chevronButton: {
      padding: getSpacing.sm,
    },
    columnHeaders: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    columnHeader: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.text.tertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    setColumn: {
      width: 50,
    },
    prevColumn: {
      flex: 1,
    },
    dataColumn: {
      width: 70,
      textAlign: "center",
    },
    checkColumn: {
      width: 44,
    },
    addSetButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: getSpacing.md,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    addSetText: {
      fontSize: getTypography.body.fontSize,
      color: theme.primary,
      fontWeight: "600",
      marginLeft: getSpacing.xs,
    },
    deleteExerciseAction: {
      backgroundColor: "#EF4444",
      justifyContent: "center",
      alignItems: "center",
      width: 80,
      marginBottom: getSpacing.lg,
      borderTopRightRadius: getBorderRadius.lg,
      borderBottomRightRadius: getBorderRadius.lg,
    },
    deleteActionText: {
      color: "#fff",
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      marginTop: 4,
    },
    emptyState: {
      padding: getSpacing.xl,
      alignItems: "center",
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.tertiary,
      textAlign: "center",
    },
  });

  if (!workout.exercises || workout.exercises.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={48} color={theme.text.tertiary} />
          <Text style={styles.emptyText}>No exercises in this workout</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {workout.exercises.map((workoutEx, exerciseIndex) => {
        const exercise = allExercises.find((ex) => ex.id === workoutEx.exerciseId);
        const completedSets = workoutEx.sets?.filter((s) => s.completed).length || 0;
        const totalSets = workoutEx.sets?.length || 0;
        const allComplete = completedSets === totalSets && totalSets > 0;
        const isExpanded = expandedExercises.includes(exerciseIndex);
        const tracking = exercise?.tracking || [];

        return (
          <Swipeable
            key={`exercise-${exerciseIndex}-${workoutEx.exerciseId}`}
            renderRightActions={() =>
              renderExerciseRightActions(exerciseIndex, exercise?.name || "Exercise")
            }
            overshootRight={false}
          >
            <View
              style={[
                styles.exerciseCard,
                allComplete && styles.exerciseCardComplete,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.exerciseHeader,
                  allComplete && styles.exerciseHeaderComplete,
                ]}
                onPress={() => toggleExercise(exerciseIndex)}
                activeOpacity={0.7}
              >
                <View style={styles.exerciseHeaderLeft}>
                  <Text
                    style={[
                      styles.exerciseName,
                      allComplete && styles.exerciseNameComplete,
                    ]}
                  >
                    {exercise?.name || "Unknown Exercise"}
                  </Text>
                  <Text
                    style={[
                      styles.setsProgress,
                      allComplete && styles.setsProgressComplete,
                    ]}
                  >
                    {completedSets}/{totalSets} sets complete
                  </Text>
                </View>

                <View style={styles.chevronButton}>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={24}
                    color={allComplete ? theme.success : theme.text.secondary}
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <>
                  <View style={styles.columnHeaders}>
                    <Text style={[styles.columnHeader, styles.setColumn]}>SET</Text>
                    <Text style={[styles.columnHeader, styles.prevColumn]}>PREV</Text>

                    {tracking.includes("weight") && (
                      <Text style={[styles.columnHeader, styles.dataColumn]}>LBS</Text>
                    )}

                    {tracking.includes("reps") && (
                      <Text style={[styles.columnHeader, styles.dataColumn]}>REPS</Text>
                    )}

                    {tracking.includes("distance") && (
                      <Text style={[styles.columnHeader, styles.dataColumn]}>MILES</Text>
                    )}

                    {tracking.includes("time") && (
                      <Text style={[styles.columnHeader, styles.dataColumn]}>TIME</Text>
                    )}

                    <View style={styles.checkColumn} />
                  </View>

                  {workoutEx.sets?.map((set, setIndex) => (
                    <WorkoutRow
                      key={set.id}
                      set={set}
                      setNumber={setIndex + 1}
                      tracking={tracking}
                      onUpdate={(updates) =>
                        handleSetUpdate(exerciseIndex, setIndex, updates)
                      }
                      onDelete={() => handleDeleteSet(exerciseIndex, setIndex)}
                    />
                  ))}

                  <TouchableOpacity
                    style={styles.addSetButton}
                    onPress={() => handleAddSet(exerciseIndex)}
                  >
                    <Ionicons name="add" size={20} color={theme.primary} />
                    <Text style={styles.addSetText}>Add Set</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Swipeable>
        );
      })}
    </ScrollView>
  );
};

export default WorkoutContent;