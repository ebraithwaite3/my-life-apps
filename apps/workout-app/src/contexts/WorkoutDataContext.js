import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useData, useAuth } from '@my-apps/contexts';
import { doc, onSnapshot } from 'firebase/firestore';
import { DateTime } from 'luxon';

const WorkoutDataContext = createContext();

export const useWorkoutData = () => {
  const context = useContext(WorkoutDataContext);
  if (!context) {
    throw new Error('useWorkoutData must be used within WorkoutDataProvider');
  }
  return context;
};

export const WorkoutDataProvider = ({ children }) => {
  const { user } = useData();
  const { db } = useAuth();
  
  const [workoutCatalog, setWorkoutCatalog] = useState(null);
  const [workoutHistory, setWorkoutHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log("Workout History:", workoutHistory);

  // Subscribe to workout catalog
  useEffect(() => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }

    console.log('📚 Subscribing to workout catalog...');
    setLoading(true);
    setError(null);

    const catalogRef = doc(db, 'admin', 'workoutCatalog');
    
    const unsubscribe = onSnapshot(
      catalogRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📚 Workout catalog loaded:', data.workouts?.length, 'exercises');
          setWorkoutCatalog(data);
        } else {
          console.log('📚 No workout catalog found');
          setWorkoutCatalog(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('❌ Error loading workout catalog:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      console.log('📚 Unsubscribing from workout catalog');
      unsubscribe();
    };
  }, [user?.userId, db]);

  // Subscribe to workout history
  useEffect(() => {
    if (!user?.userId) {
      setHistoryLoading(false);
      return;
    }

    console.log('📊 Subscribing to workout history...');
    setHistoryLoading(true);

    const historyRef = doc(db, 'workoutHistory', user.userId);
    
    const unsubscribe = onSnapshot(
      historyRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📊 Workout history loaded:', Object.keys(data.exercises || {}).length, 'exercises tracked');
          setWorkoutHistory(data);
        } else {
          console.log('📊 No workout history found - creating empty structure');
          setWorkoutHistory({ userId: user.userId, exercises: {} });
        }
        setHistoryLoading(false);
      },
      (err) => {
        console.error('❌ Error loading workout history:', err);
        setWorkoutHistory({ userId: user.userId, exercises: {} });
        setHistoryLoading(false);
      }
    );

    return () => {
      console.log('📊 Unsubscribing from workout history');
      unsubscribe();
    };
  }, [user?.userId, db]);

  // Get all exercises
  const allExercises = useMemo(() => {
    return workoutCatalog?.workouts || [];
  }, [workoutCatalog]);
  console.log('All exercises count:', allExercises);

  // Get exercises by category
  const getExercisesByCategory = useMemo(() => {
    const exercisesByCategory = {};
    
    allExercises.forEach(exercise => {
      const category = exercise.category || 'other';
      if (!exercisesByCategory[category]) {
        exercisesByCategory[category] = [];
      }
      exercisesByCategory[category].push(exercise);
    });
    
    return exercisesByCategory;
  }, [allExercises]);

  // Get exercise by ID
  const getExerciseById = (id) => {
    return allExercises.find(exercise => exercise.id === id);
  };

  // Get exercises with specific tracking field
  const getExercisesWithTracking = (trackingField) => {
    return allExercises.filter(exercise => 
      exercise.tracking?.includes(trackingField)
    );
  };

  // Get last workouts for specific exercise
  const getLastWorkouts = (exerciseId) => {
    return workoutHistory?.exercises?.[exerciseId]?.lastWorkouts || [];
  };

  // Get most recent workout for exercise
  const getLastWorkout = (exerciseId) => {
    return workoutHistory?.exercises?.[exerciseId]?.lastWorkouts?.[0] || null;
  };

  // Get last workout for specific exercise that was NOT today or in the future
  // Also if the workout date is in the past, return null
  const getLastPastWorkout = (exerciseId, workoutDate) => {
    if (!workoutDate) return null;
  
    // The date of the workout currently being displayed/edited
    const targetDate = DateTime.fromISO(workoutDate).startOf('day');
  
    const lastWorkouts = getLastWorkouts(exerciseId);
    
    // Find the first workout in history that happened BEFORE the current workout's date
    for (let workout of lastWorkouts) {
      const workoutDateTime = DateTime.fromISO(workout.date).startOf('day');
      
      if (workoutDateTime < targetDate) {
        return workout;
      }
    }
    
    return null;
  };

  const value = useMemo(() => ({
    // Raw data
    workoutCatalog,
    workoutHistory,
    
    // Exercises
    allExercises,
    exercisesByCategory: getExercisesByCategory,
    
    // Loading states
    loading,
    historyLoading,
    error,
    
    // Helper functions
    getExerciseById,
    getExercisesWithTracking,
    getLastWorkouts,
    getLastWorkout,
    getLastPastWorkout,
  }), [
    workoutCatalog,
    workoutHistory,
    allExercises,
    getExercisesByCategory,
    loading,
    historyLoading,
    error,
  ]);

  return (
    <WorkoutDataContext.Provider value={value}>
      {children}
    </WorkoutDataContext.Provider>
  );
};