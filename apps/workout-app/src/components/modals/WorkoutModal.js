import React, { useRef, useState, useEffect } from "react";
import { View, Alert, Keyboard } from "react-native";
import { useTheme } from "@my-apps/contexts";
import { ModalWrapper, ModalHeader, PillSelectionButton } from "@my-apps/ui";
import EditWorkoutTemplate from "./EditWorkoutTemplate";
import WorkoutContent from "./WorkoutContent";
import { showSuccessToast } from "@my-apps/utils";

const WorkoutModal = ({
  visible,
  onClose,
  mode,
  template,
  workout,
  event,
  onSaveTemplate,
  onSaveWorkout,
  onUpdateWorkout,
  templateContext,
  isUserAdmin,
}) => {
  const { theme, getSpacing } = useTheme();
  const editContentRef = useRef(null);

  const [workoutMode, setWorkoutMode] = useState("complete");
  const [updatedExercises, setUpdatedExercises] = useState([]);
  const [originalExercises, setOriginalExercises] = useState([]); // Store original
  const [isDirty, setIsDirty] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  // Unified working state for the workout
  const [workingWorkout, setWorkingWorkout] = useState(null);

  // Initialize working workout when modal opens
  useEffect(() => {
    if (visible && mode === "workout" && workout) {
      console.log("🔄 Modal opened with workout:", workout.id);
      const exercises = JSON.parse(JSON.stringify(workout.exercises || [])); // Deep clone
      setWorkingWorkout(workout);
      setOriginalExercises(exercises);
      setUpdatedExercises(exercises);
      setWorkoutMode("complete");
      setIsDirty(false);
    }
  }, [visible, mode, workout?.id]);

  // Detect changes by comparing updatedExercises to originalExercises
  useEffect(() => {
    if (workoutMode !== "complete" || !visible) {
      setIsDirty(false);
      return;
    }

    console.log("🔍 Checking for changes...");
    console.log("Original:", originalExercises);
    console.log("Updated:", updatedExercises);

    const hasChanges =
      JSON.stringify(updatedExercises) !== JSON.stringify(originalExercises);
    console.log("Has changes:", hasChanges);

    setIsDirty(hasChanges);
  }, [updatedExercises, originalExercises, workoutMode, visible]);

  // Handle close with reset
  const handleClose = () => {
    // If there are unsaved changes, confirm before closing
    if (isDirty && mode === "workout" && workout) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to close?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              console.log("❌ Closing modal and resetting state");
              setUpdatedExercises([]);
              setOriginalExercises([]);
              setIsDirty(false);
              setWorkoutMode("complete");
              setWorkingWorkout(null);
              onClose?.();
            },
          },
        ]
      );
    } else {
      console.log("❌ Closing modal and resetting state");
      setUpdatedExercises([]);
      setOriginalExercises([]);
      setIsDirty(false);
      setWorkoutMode("complete");
      setWorkingWorkout(null);
      onClose?.();
    }
  };

  const getTitle = () => {
    if (mode === "template") {
      return template ? "Edit Template" : "New Template";
    }
    if (workout) {
      return workout.name || "Workout";
    }
    if (event) {
      return `${event.title} Workout`;
    }
    return "New Workout";
  };

  const getSubtitle = () => {
    if (
      mode === "workout" &&
      workoutMode === "complete" &&
      workout &&
      updatedExercises.length > 0
    ) {
      const completed = updatedExercises.filter((ex) =>
        ex.sets?.every((set) => set.completed)
      ).length;
      return `${completed}/${updatedExercises.length} Exercises Complete`;
    }

    if ((mode === "template" || workoutMode === "edit") && selectedCount > 0) {
      return `${selectedCount} exercise${
        selectedCount !== 1 ? "s" : ""
      } selected`;
    }

    return undefined;
  };

  const getDoneText = () => {
    if (mode === "template") {
      return template ? "Update" : "Create";
    }
    if (workout) {
      return "Update";
    }
    return "Create";
  };

  const handleDone = () => {
    if (mode === "workout" && workoutMode === "complete" && workout) {
      handleUpdateFromCompleteMode();
    } else {
      editContentRef.current?.save();
    }
  };

  const handleUpdateFromCompleteMode = () => {
    console.log("🔄 handleUpdateFromCompleteMode called");

    if (!workout) {
      console.log("❌ No workout to update");
      handleClose();
      return;
    }

    const hasChanges =
      JSON.stringify(updatedExercises) !== JSON.stringify(originalExercises);
    console.log("Has changes:", hasChanges);

    if (!hasChanges) {
      console.log("ℹ️ No changes detected, closing");
      handleClose();
      return;
    }

    const updatedWorkout = {
      ...workout,
      exercises: updatedExercises,
      completedAt: new Date().toISOString(),
    };

    console.log("✅ Calling onUpdateWorkout");
    onUpdateWorkout?.(updatedWorkout);
    
    // Dismiss keyboard and show success toast at top
    Keyboard.dismiss();
    setTimeout(() => {
      showSuccessToast("Workout saved", "", 2000, "top");
    }, 100);
    
    // After successful update, reset dirty state so button shows "Close"
    setOriginalExercises(JSON.parse(JSON.stringify(updatedExercises)));
    setIsDirty(false);
    
    // Don't close - stay in the workout!
  };

  const getCancelText = () => {
    // Show "Close" when no unsaved changes, "Cancel" when there are changes
    if (mode === "workout" && workout) {
      return isDirty ? "Cancel" : "Close";
    }
    return "Cancel";
  };

  const showPillSelection = mode === "workout" && workout;

  console.log("Subtitle value:", getSubtitle(), "Type:", typeof getSubtitle());
  return (
    <ModalWrapper visible={visible} onClose={handleClose}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 12,
            width: "100%",
            height: "90%",
            overflow: "hidden",
          }}
        >
          <ModalHeader
            title={getTitle()}
            subtitle={getSubtitle()}
            onCancel={handleClose}
            cancelText={getCancelText()}
            onDone={handleDone}
            doneText={getDoneText()}
            doneDisabled={false}
          />

          {showPillSelection && (
            <View
              style={{
                paddingHorizontal: getSpacing.lg,
                paddingVertical: getSpacing.md,
                backgroundColor: theme.surface,
              }}
            >
              <PillSelectionButton
                options={[
                  { label: "Complete", value: "complete" },
                  { label: "Edit", value: "edit" },
                ]}
                selectedValue={workoutMode}
                onSelect={(value) => {
                  // Sync state when switching modes
                  if (workoutMode === 'edit' && editContentRef.current) {
                    // Switching FROM edit TO complete - merge edit changes with existing set data
                    const currentState = editContentRef.current.getCurrentState();
                    
                    // Merge: preserve completed sets, add new exercises, remove deleted ones
                    const mergedExercises = currentState.exercises.map((newEx) => {
                      // Find existing exercise with matching exerciseId
                      const existingEx = updatedExercises.find(ex => ex.exerciseId === newEx.exerciseId);
                      
                      if (existingEx) {
                        // Exercise existed - preserve its sets, but adjust count if changed
                        const existingSets = existingEx.sets || [];
                        const newSetCount = newEx.sets.length;
                        
                        if (existingSets.length === newSetCount) {
                          // Same count - just use existing sets
                          return { ...newEx, sets: existingSets };
                        } else if (existingSets.length < newSetCount) {
                          // Added sets - keep existing, add new empty ones
                          const additionalSets = newEx.sets.slice(existingSets.length);
                          return { ...newEx, sets: [...existingSets, ...additionalSets] };
                        } else {
                          // Removed sets - keep only first N sets
                          return { ...newEx, sets: existingSets.slice(0, newSetCount) };
                        }
                      } else {
                        // New exercise - use empty sets
                        return newEx;
                      }
                    });
                    
                    const updatedWorkout = { 
                      ...workingWorkout, 
                      name: currentState.name,
                      exercises: mergedExercises
                    };
                    setWorkingWorkout(updatedWorkout);
                    setUpdatedExercises(mergedExercises);
                    setIsDirty(false);
                  } else if (workoutMode === 'complete') {
                    // Switching FROM complete TO edit - update working workout with exercises
                    setWorkingWorkout(prev => ({ ...prev, exercises: updatedExercises }));
                  }
                  setWorkoutMode(value);
                }}
              />
            </View>
          )}

          {mode === "workout" && workoutMode === "complete" && workout ? (
            <WorkoutContent
              workout={{ ...workingWorkout, exercises: updatedExercises }}
              onExerciseUpdate={(newExercises) => {
                setUpdatedExercises(newExercises);
                setWorkingWorkout(prev => ({ ...prev, exercises: newExercises }));
              }}
            />
          ) : (
            <EditWorkoutTemplate
              ref={editContentRef}
              template={mode === "template" ? template : null}
              workout={mode === "workout" ? workingWorkout : null}
              event={event}
              onSave={(data) => {
                if (mode === "template") {
                  onSaveTemplate?.(data, templateContext);
                  handleClose();
                } else {
                  if (workout) {
                    // UPDATE mode - save but don't close
                    onUpdateWorkout?.(data);
                    
                    // Dismiss keyboard and show success toast at top
                    Keyboard.dismiss();
                    setTimeout(() => {
                      showSuccessToast("Workout saved", "", 2000, "top");
                    }, 100);
                    
                    // Update working state to reflect saved changes
                    setWorkingWorkout(data);
                    setUpdatedExercises(data.exercises);
                    setOriginalExercises(JSON.parse(JSON.stringify(data.exercises)));
                    setIsDirty(false);
                  } else {
                    // CREATE mode - save and close
                    onSaveWorkout?.(data);
                    handleClose();
                  }
                }
              }}
              onSelectedCountChange={setSelectedCount}
              isTemplate={mode === "template"}
            />
          )}
        </View>
      </View>
    </ModalWrapper>
  );
};

export default WorkoutModal;