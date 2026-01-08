import React, { useRef, useState, useEffect } from "react";
import { View } from "react-native";
import { useTheme } from "@my-apps/contexts";
import { ModalWrapper, ModalHeader, PillSelectionButton } from "@my-apps/ui";
import EditWorkoutTemplate from "./EditWorkoutTemplate";
import WorkoutContent from "./WorkoutContent";

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

  const [workoutMode, setWorkoutMode] = useState('complete');
  const [updatedExercises, setUpdatedExercises] = useState([]);
  const [originalExercises, setOriginalExercises] = useState([]); // ← Store original
  const [isDirty, setIsDirty] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  // Reset state when modal opens with a workout
  useEffect(() => {
    if (visible && mode === 'workout' && workout) {
      console.log('🔄 Modal opened with workout:', workout.id);
      const exercises = JSON.parse(JSON.stringify(workout.exercises || [])); // Deep clone
      setOriginalExercises(exercises);
      setUpdatedExercises(exercises);
      setWorkoutMode('complete');
      setIsDirty(false);
    }
  }, [visible, mode, workout?.id]);

  // Detect changes by comparing updatedExercises to originalExercises
  useEffect(() => {
    if (workoutMode !== 'complete' || !visible) {
      setIsDirty(false);
      return;
    }

    console.log('🔍 Checking for changes...');
    console.log('Original:', originalExercises);
    console.log('Updated:', updatedExercises);

    const hasChanges = JSON.stringify(updatedExercises) !== JSON.stringify(originalExercises);
    console.log('Has changes:', hasChanges);
    
    setIsDirty(hasChanges);
  }, [updatedExercises, originalExercises, workoutMode, visible]);

  // Handle close with reset
  const handleClose = () => {
    console.log('❌ Closing modal and resetting state');
    setUpdatedExercises([]);
    setOriginalExercises([]);
    setIsDirty(false);
    setWorkoutMode('complete');
    onClose?.();
  };

  const getTitle = () => {
    if (mode === 'template') {
      return template ? 'Edit Template' : 'New Template';
    }
    if (workout) {
      return workout.name || 'Workout';
    }
    if (event) {
      return `${event.title} Workout`;
    }
    return 'New Workout';
  };

  const getSubtitle = () => {
    if (mode === 'workout' && workoutMode === 'complete' && workout && updatedExercises.length > 0) {
      const completed = updatedExercises.filter(ex => 
        ex.sets?.every(set => set.completed)
      ).length;
      return `${completed}/${updatedExercises.length} Exercises Complete`;
    }
    
    if ((mode === 'template' || workoutMode === 'edit') && selectedCount > 0) {
      return `${selectedCount} exercise${selectedCount !== 1 ? 's' : ''} selected`;
    }
    
    return undefined; // ← Make sure this stays undefined, not empty string
  };

  const getDoneText = () => {
    if (mode === 'template') {
      return template ? 'Update' : 'Create';
    }
    if (workout) {
      return 'Update';
    }
    return 'Create';
  };

  const handleDone = () => {
    if (mode === 'workout' && workoutMode === 'complete' && workout) {
      handleUpdateFromCompleteMode();
    } else {
      editContentRef.current?.save();
    }
  };

  const handleUpdateFromCompleteMode = () => {
    console.log('🔄 handleUpdateFromCompleteMode called');
    console.log('isDirty:', isDirty);
    console.log('workout:', workout);
    
    if (!workout || !isDirty) {
      console.log('❌ Skipping update - workout exists:', !!workout, 'isDirty:', isDirty);
      return;
    }

    const updatedWorkout = {
      ...workout,
      exercises: updatedExercises,
      completedAt: new Date().toISOString(),
    };

    console.log('✅ Calling onUpdateWorkout');
    onUpdateWorkout?.(updatedWorkout);
    handleClose();
  };

  const showPillSelection = mode === 'workout' && workout;

  console.log('Subtitle value:', getSubtitle(), 'Type:', typeof getSubtitle());
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
            onDone={handleDone}
            doneText={getDoneText()}
            doneDisabled={mode === 'workout' && workoutMode === 'complete' && workout && !isDirty}
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
                  setWorkoutMode(value);
                  if (value === 'complete') {
                    const exercises = JSON.parse(JSON.stringify(workout?.exercises || []));
                    setOriginalExercises(exercises);
                    setUpdatedExercises(exercises);
                    setIsDirty(false);
                  }
                }}
              />
            </View>
          )}

{mode === 'workout' && workoutMode === 'complete' && workout ? (
  <WorkoutContent
    workout={{ ...workout, exercises: updatedExercises }}
    onExerciseUpdate={setUpdatedExercises}
  />
) : (
  <EditWorkoutTemplate
    ref={editContentRef}
    template={mode === 'template' ? template : null}
    workout={mode === 'workout' ? workout : null}
    event={event}
    onSave={(data) => {
      if (mode === 'template') {
        onSaveTemplate?.(data, templateContext);
      } else {
        if (workout) {
          onUpdateWorkout?.(data);
        } else {
          onSaveWorkout?.(data);
        }
      }
      handleClose();
    }}
    onSelectedCountChange={setSelectedCount}
    isTemplate={mode === 'template'}
  />
)}
        </View>
      </View>
    </ModalWrapper>
  );
};

export default WorkoutModal;