import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  findNodeHandle,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { useTheme } from "@my-apps/contexts";
import { useWorkoutData } from "../../contexts/WorkoutDataContext";
import WorkoutRow from "../workout/WorkoutRow";
import { KeyboardActionBar, TimerBanner } from "@my-apps/ui";

const WorkoutContent = ({ workout, onExerciseUpdate, selectedDate }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { allExercises, workoutHistory, getLastPastWorkout } = useWorkoutData();

  const [expandedExercises, setExpandedExercises] = React.useState([]);
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);
  const [focusedInput, setFocusedInput] = React.useState(null);
  const [isTimerEditing, setIsTimerEditing] = React.useState(false); // NEW: Track timer editing
  
  const rowRefs = React.useRef({});
  const scrollViewRef = React.useRef(null);
  const timerRef = React.useRef(null); // NEW: Reference to TimerBanner
  const keyboardHeight = React.useRef(0);

  // Keyboard listeners with height tracking
  React.useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', 
      (e) => {
        keyboardHeight.current = e.endCoordinates.height;
        setKeyboardVisible(true);
      }
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', 
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Handle input focus with auto-scroll logic
  const handleInputFocus = (exerciseIndex, setIndex, field, inputRef) => {
    setFocusedInput({ exerciseIndex, setIndex, field });

    if (!inputRef || !scrollViewRef.current) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const scrollNode = findNodeHandle(scrollViewRef.current);
        const inputNode = findNodeHandle(inputRef);
        
        if (!scrollNode || !inputNode) return;

        UIManager.measureLayout(
          inputNode,
          scrollNode,
          (error) => {
            if (__DEV__) console.warn('measureLayout error:', error);
          },
          (x, y, width, height) => {
            const topMargin = 100;
            const scrollToY = Math.max(0, y - topMargin);
            
            scrollViewRef.current.scrollTo({
              y: scrollToY,
              animated: true,
            });
          }
        );
      });
    });
  };

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

  const handleDeleteSet = (exerciseIndex, setIndex) => {
    const updatedExercises = JSON.parse(JSON.stringify(workout.exercises));
    updatedExercises[exerciseIndex].sets.splice(setIndex, 1);
    onExerciseUpdate(updatedExercises);
  };

  const getCurrentRowInputs = () => {
    if (!focusedInput) return [];
    const { exerciseIndex } = focusedInput;
    const workoutEx = workout.exercises[exerciseIndex];
    const exercise = allExercises.find((ex) => ex.id === workoutEx.exerciseId);
    const tracking = exercise?.tracking || [];
    
    const inputs = [];
    if (tracking.includes('weight')) inputs.push('weight');
    if (tracking.includes('reps')) inputs.push('reps');
    if (tracking.includes('distance')) inputs.push('distance');
    if (tracking.includes('time')) inputs.push('time');
    return inputs;
  };

  const handleNavigate = (direction) => {
    if (!focusedInput) return;
    const rowInputs = getCurrentRowInputs();
    const currentIndex = rowInputs.indexOf(focusedInput.field);
    if (currentIndex === -1) return;

    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= rowInputs.length) return;

    const nextField = rowInputs[nextIndex];
    const rowKey = `${focusedInput.exerciseIndex}-${focusedInput.setIndex}`;
    const rowRef = rowRefs.current[rowKey];
    if (rowRef) rowRef.focusField(nextField);
  };

  const handleAdjust = (direction) => {
    if (!focusedInput) return;
    const { exerciseIndex, setIndex, field } = focusedInput;
    const currentSet = workout.exercises[exerciseIndex].sets[setIndex];
    let increment = 0;
    let currentValue = currentSet[field] || 0;
    
    switch (field) {
      case 'weight': increment = direction === 'increment' ? 5 : -5; break;
      case 'reps': increment = direction === 'increment' ? 1 : -1; break;
      case 'distance': increment = direction === 'increment' ? 0.1 : -0.1; break;
      case 'time': increment = direction === 'increment' ? 30 : -30; break;
    }

    let newValue = Math.max(0, currentValue + increment);
    if (field === 'distance') newValue = Math.round(newValue * 100) / 100;
    if (field === 'weight') newValue = Math.round(newValue * 2) / 2;

    handleSetUpdate(exerciseIndex, setIndex, { [field]: newValue });
  };

  const getIncrementText = () => {
    if (!focusedInput) return '';
    switch (focusedInput.field) {
      case 'weight': return '5 lbs';
      case 'reps': return '1 rep';
      case 'distance': return '0.1 mi';
      case 'time': return '30 sec';
      default: return '';
    }
  };

  const getNavigationState = () => {
    if (!focusedInput) return { canGoBack: false, canGoNext: false };
    const rowInputs = getCurrentRowInputs();
    const currentIndex = rowInputs.indexOf(focusedInput.field);
    return {
      canGoBack: currentIndex > 0,
      canGoNext: currentIndex < rowInputs.length - 1,
    };
  };

  const { canGoBack, canGoNext } = getNavigationState();

  const renderExerciseRightActions = (exerciseIndex, exerciseName) => (
    <TouchableOpacity
      style={styles.deleteExerciseAction}
      onPress={() => handleDeleteExercise(exerciseIndex, exerciseName)}
    >
      <Ionicons name="trash" size={24} color="#fff" />
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    timerContainer: {
      paddingHorizontal: getSpacing.md,
      paddingTop: getSpacing.md,
      paddingBottom: getSpacing.sm,
      backgroundColor: theme.background,
    },
    scrollContent: { padding: getSpacing.md, paddingTop: 0 },
    exerciseCard: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      marginBottom: getSpacing.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
    },
    exerciseCardComplete: { borderColor: theme.border, borderWidth: 2 },
    exerciseHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: getSpacing.md,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    exerciseHeaderComplete: { backgroundColor: `${theme.success}10` },
    exerciseHeaderLeft: { flex: 1 },
    exerciseName: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      marginBottom: 4,
    },
    exerciseNameComplete: { color: theme.success },
    setsProgress: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      fontWeight: "500",
    },
    setsProgressComplete: { color: theme.success },
    chevronButton: { padding: getSpacing.sm },
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
    setColumn: { width: 50 },
    prevColumn: { flex: 1 },
    dataColumn: { width: 70, textAlign: "center" },
    checkColumn: { width: 44 },
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
    emptyState: { padding: getSpacing.xl, alignItems: "center" },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.tertiary,
      textAlign: "center",
    },
    centerButtonContainer: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
    adjustButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
      backgroundColor: `${theme.primary}10`,
    },
    adjustButtonText: { fontSize: 13, fontWeight: '600', color: theme.primary },
    timerDoneButton: {
      paddingHorizontal: 24,
      paddingVertical: 8,
      backgroundColor: theme.primary,
      borderRadius: 8,
    },
    timerDoneButtonText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 16,
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      {/* Timer Banner - Sticky at top, doesn't scroll */}
      <View style={styles.timerContainer}>
        <TimerBanner
          ref={timerRef}
          onTimerComplete={() => {
            console.log('⏰ Rest timer complete!');
          }}
          onEditingChange={setIsTimerEditing}
        />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}      
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Workout Exercises */}
        {workout.exercises.map((workoutEx, displayIndex) => {
          const exerciseIndex = displayIndex;
          const exercise = allExercises.find((ex) => ex.id === workoutEx.exerciseId);
          const completedSets = workoutEx.sets?.filter((s) => s.completed).length || 0;
          const totalSets = workoutEx.sets?.length || 0;
          const allComplete = completedSets === totalSets && totalSets > 0;
          const isExpanded = expandedExercises.includes(displayIndex);
          const tracking = exercise?.tracking || [];
          const lastPastWorkout = getLastPastWorkout(workoutEx.exerciseId, selectedDate);

          return (
            <Swipeable
              key={`exercise-${exerciseIndex}-${workoutEx.exerciseId}`}
              renderRightActions={() =>
                renderExerciseRightActions(exerciseIndex, exercise?.name || "Exercise")
              }
              overshootRight={false}
            >
              <View style={[styles.exerciseCard, allComplete && styles.exerciseCardComplete]}>
                <TouchableOpacity
                  style={[styles.exerciseHeader, allComplete && styles.exerciseHeaderComplete]}
                  onPress={() => toggleExercise(displayIndex)}
                  activeOpacity={0.7}
                >
                  <View style={styles.exerciseHeaderLeft}>
                    <Text style={[styles.exerciseName, allComplete && styles.exerciseNameComplete]}>
                      {exercise?.name || "Unknown Exercise"}
                    </Text>
                    <Text style={[styles.setsProgress, allComplete && styles.setsProgressComplete]}>
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
                      {tracking.includes("weight") && <Text style={[styles.columnHeader, styles.dataColumn]}>LBS</Text>}
                      {tracking.includes("reps") && <Text style={[styles.columnHeader, styles.dataColumn]}>REPS</Text>}
                      {tracking.includes("distance") && <Text style={[styles.columnHeader, styles.dataColumn]}>MILES</Text>}
                      {tracking.includes("time") && <Text style={[styles.columnHeader, styles.dataColumn]}>TIME</Text>}
                      <View style={styles.checkColumn} />
                    </View>

                    {workoutEx.sets?.map((set, setIndex) => {
                      const rowKey = `${exerciseIndex}-${setIndex}`;
                      return (
                        <WorkoutRow
                          key={set.id}
                          ref={(ref) => (rowRefs.current[rowKey] = ref)}
                          set={set}
                          setNumber={setIndex + 1}
                          tracking={tracking}
                          previousSet={lastPastWorkout?.sets?.[setIndex]}
                          onUpdate={(updates) => handleSetUpdate(exerciseIndex, setIndex, updates)}
                          onDelete={() => handleDeleteSet(exerciseIndex, setIndex)}
                          onFocus={(field, inputRef) => handleInputFocus(exerciseIndex, setIndex, field, inputRef)}
                          onBlur={() => setFocusedInput(null)}
                        />
                      );
                    })}

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
        
        {keyboardVisible && (
          <View style={{ height: keyboardHeight.current + 80 }} />
        )}
      </ScrollView>

      <KeyboardActionBar
        visible={keyboardVisible}
        onWillDismiss={() => setKeyboardVisible(false)}
        leftButton={
          isTimerEditing
            ? undefined // No left button when editing timer
            : canGoBack
            ? { icon: 'chevron-back', text: 'Back', onPress: () => handleNavigate('prev') }
            : canGoNext
            ? { icon: 'chevron-forward', text: 'Next', onPress: () => handleNavigate('next') }
            : undefined
        }
        centerContent={
          isTimerEditing ? (
            null
          ) : focusedInput ? (
            <View style={styles.centerButtonContainer}>
              <TouchableOpacity style={styles.adjustButton} onPress={() => handleAdjust('decrement')}>
                <Ionicons name="remove" size={20} color={theme.primary} />
                <Text style={styles.adjustButtonText}>{getIncrementText()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adjustButton} onPress={() => handleAdjust('increment')}>
                <Ionicons name="add" size={20} color={theme.primary} />
                <Text style={styles.adjustButtonText}>{getIncrementText()}</Text>
              </TouchableOpacity>
            </View>
          ) : undefined
        }
      />
    </KeyboardAvoidingView>
  );
};

export default WorkoutContent;