import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Update workout history after completing a workout
 * Keeps up to 2 most recent workouts per exercise
 * Replaces same-day workouts instead of creating duplicates
 */
export const updateWorkoutHistory = async (completedWorkout, userId, db) => {
  if (!userId || !db) {
    console.error('❌ Missing userId or db');
    return false;
  }

  try {
    const historyRef = doc(db, 'workoutHistory', userId);
    const historySnap = await getDoc(historyRef);
    
    const currentHistory = historySnap.exists() 
      ? historySnap.data() 
      : { userId, exercises: {} };

    const today = new Date().toISOString().split('T')[0]; // "2026-01-07"
    const timestamp = new Date().toISOString();

    let updatedCount = 0;

    // Process each exercise in the workout
    completedWorkout.exercises.forEach(exercise => {
      // Only save if all sets are completed
      const allSetsComplete = exercise.sets?.every(set => set.completed);
      if (!allSetsComplete) return;

      const exerciseId = exercise.exerciseId;
      
      // Get current lastWorkouts for this exercise
      const currentLastWorkouts = currentHistory.exercises?.[exerciseId]?.lastWorkouts || [];
      
      // Create new workout entry
      const newWorkout = {
        date: today,
        timestamp: timestamp,
        sets: exercise.sets.map(set => {
          const setData = {};
          if (set.reps !== undefined) setData.reps = set.reps;
          if (set.weight !== undefined) setData.weight = set.weight;
          if (set.distance !== undefined) setData.distance = set.distance;
          if (set.time !== undefined) setData.time = set.time;
          return setData;
        }).filter(set => Object.keys(set).length > 0) // Only include sets with data
      };

      // Skip if no valid sets
      if (newWorkout.sets.length === 0) return;

      // Check if there's already a workout from today
      const todayWorkoutIndex = currentLastWorkouts.findIndex(w => w.date === today);
      
      let updatedLastWorkouts;
      if (todayWorkoutIndex !== -1) {
        // Replace today's workout
        console.log(`📊 Replacing existing workout for ${exerciseId} from ${today}`);
        updatedLastWorkouts = [...currentLastWorkouts];
        updatedLastWorkouts[todayWorkoutIndex] = newWorkout;
      } else {
        // Add new workout and keep only 2 most recent
        console.log(`📊 Adding new workout for ${exerciseId}`);
        updatedLastWorkouts = [newWorkout, ...currentLastWorkouts].slice(0, 2);
      }

      // Sort by timestamp descending (most recent first)
      updatedLastWorkouts.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Update the exercises object
      if (!currentHistory.exercises) {
        currentHistory.exercises = {};
      }
      
      currentHistory.exercises[exerciseId] = {
        lastWorkouts: updatedLastWorkouts
      };

      updatedCount++;
    });

    if (updatedCount > 0) {
      // Save to Firestore
      await setDoc(historyRef, currentHistory);
      console.log(`✅ Workout history updated for ${updatedCount} exercise(s)`);
      return true;
    } else {
      console.log('ℹ️ No completed exercises to save to history');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error updating workout history:', error);
    return false;
  }
};