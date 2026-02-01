import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import { Accordion, PageHeader } from '@my-apps/ui';
import { useWorkoutData } from '../contexts/WorkoutDataContext';
import { useAuth } from '@my-apps/contexts';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { showSuccessToast, showErrorToast } from '@my-apps/utils';

const WORKOUT_CATEGORIES = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'biceps',
  'triceps',
  'core',
  'cardio',
];

// Strength categories get automatic tracking
const STRENGTH_CATEGORIES = ['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps'];

// For core/cardio, user can choose (sets is always included)
const FLEXIBLE_TRACKING_OPTIONS = [
  { id: 'reps', label: 'Reps', icon: 'repeat' },
  { id: 'time', label: 'Time', icon: 'time' },
  { id: 'distance', label: 'Distance', icon: 'speedometer' },
];

const ADMIN_DELETE_PIN = '8990';

const normalizeExerciseName = (str) =>
  str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(' ');


const ExercisesScreen = () => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { db } = useAuth();
  const { allExercises } = useWorkoutData();
  const [loading, setLoading] = useState(false);
  
  // Add exercise modal state (for core/cardio only)
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCategory, setAddCategory] = useState(null);
  const [exerciseName, setExerciseName] = useState('');
  const [selectedTracking, setSelectedTracking] = useState([]);

  // Group exercises by category
  const exercisesByCategory = WORKOUT_CATEGORIES.map((category) => {
    const categoryExercises = allExercises.filter(
      (ex) => ex.category === category
    );

    return {
      id: category,
      title: category.charAt(0).toUpperCase() + category.slice(1),
      data: categoryExercises,
      count: categoryExercises.length,
    };
  });

  const handleAddExercise = (category, categoryTitle) => {
    const isStrengthCategory = STRENGTH_CATEGORIES.includes(category);

    if (isStrengthCategory) {
      // Quick add with Alert.prompt for strength exercises
      if (Platform.OS === 'ios') {
        Alert.prompt(
          'Add Exercise',
          `Enter name for new ${categoryTitle.toLowerCase()} exercise:`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Add',
              onPress: async (name) => {
                if (!name || !name.trim()) {
                  Alert.alert('Error', 'Exercise name is required');
                  return;
                }

                // Auto-assign strength tracking: sets, reps, weight
                await saveExerciseToFirebase(
                  name.trim(),
                  category,
                  categoryTitle,
                  ['sets', 'reps', 'weight']
                );
              },
            },
          ],
          'plain-text'
        );
      } else {
        // Fallback for Android - still use modal
        handleOpenAddModal(category, categoryTitle, true);
      }
    } else {
      // Use modal for core/cardio to select tracking
      handleOpenAddModal(category, categoryTitle, false);
    }
  };

  const handleOpenAddModal = (category, categoryTitle, isStrength = false) => {
    setAddCategory({ id: category, title: categoryTitle, isStrength });
    setExerciseName('');
    setSelectedTracking([]);
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setAddCategory(null);
    setExerciseName('');
    setSelectedTracking([]);
  };

  const toggleTracking = (trackingId) => {
    setSelectedTracking((prev) =>
      prev.includes(trackingId)
        ? prev.filter((id) => id !== trackingId)
        : [...prev, trackingId]
    );
  };

  const saveExerciseToFirebase = async (name, category, categoryTitle, tracking) => {
    try {
      setLoading(true);
  
      const normalizedName = normalizeExerciseName(name);
  
      const docRef = doc(db, 'admin', 'workoutCatalog');
      const docSnap = await getDoc(docRef);
  
      const currentWorkouts = docSnap.exists()
        ? docSnap.data().workouts || []
        : [];
  
      const newExercise = {
        id: `exercise-${Date.now()}`,
        name: normalizedName,
        category,
        tracking,
        createdAt: new Date().toISOString(),
      };
  
      await setDoc(docRef, {
        type: 'workoutCatalog',
        workouts: [...currentWorkouts, newExercise],
        updatedAt: new Date().toISOString(),
      });
  
      showSuccessToast(
        'Exercise Added',
        `Added "${normalizedName}" to ${categoryTitle}`
      );
    } catch (error) {
      showErrorToast('Add Failed', 'Failed to add exercise.');
    } finally {
      setLoading(false);
    }
  };
  

  const handleSaveExercise = async () => {
    if (!exerciseName.trim()) {
      Alert.alert('Error', 'Exercise name is required');
      return;
    }

    if (!addCategory.isStrength && selectedTracking.length === 0) {
      Alert.alert('Error', 'Please select at least one tracking field');
      return;
    }

    // Build tracking array
    let tracking = addCategory.isStrength
      ? ['sets', 'reps', 'weight'] // Strength fallback (shouldn't happen but just in case)
      : ['sets', ...selectedTracking]; // Core/cardio: sets + user selections

    setShowAddModal(false);

    await saveExerciseToFirebase(
      exerciseName.trim(),
      addCategory.id,
      addCategory.title,
      tracking
    );

    // Reset form
    handleCloseAddModal();
  };

  const updateExerciseName = async (exerciseId, newName) => {
    try {
      setLoading(true);
  
      const docRef = doc(db, 'admin', 'workoutCatalog');
      const docSnap = await getDoc(docRef);
      const workouts = docSnap.data().workouts || [];
  
      const updated = workouts.map(ex =>
        ex.id === exerciseId
          ? { ...ex, name: normalizeExerciseName(newName) }
          : ex
      );
  
      await setDoc(docRef, {
        type: 'workoutCatalog',
        workouts: updated,
        updatedAt: new Date().toISOString(),
      });
  
      showSuccessToast('Exercise Updated', normalizeExerciseName(newName));
    } catch (e) {
      showErrorToast('Update Failed', 'Could not update exercise');
    } finally {
      setLoading(false);
    }
  };
  
  const deleteExercise = async (exerciseId, name) => {
    try {
      setLoading(true);
  
      const docRef = doc(db, 'admin', 'workoutCatalog');
      const docSnap = await getDoc(docRef);
      const workouts = docSnap.data().workouts || [];
  
      await setDoc(docRef, {
        type: 'workoutCatalog',
        workouts: workouts.filter(ex => ex.id !== exerciseId),
        updatedAt: new Date().toISOString(),
      });
  
      showSuccessToast('Exercise Deleted', name);
    } catch (e) {
      showErrorToast('Delete Failed', 'Could not delete exercise');
    } finally {
      setLoading(false);
    }
  };

  const promptEditExercise = (exercise) => {
    if (Platform.OS !== 'ios') return; // keep Android simple for now
  
    Alert.prompt(
      'Edit Exercise Name',
      'Update the exercise name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (text) => {
            if (!text?.trim()) return;
            updateExerciseName(exercise.id, text.trim());
          },
        },
      ],
      'plain-text',
      exercise.name
    );
  };

  const promptDeleteExercise = (exercise) => {
    Alert.prompt(
      'Confirm Delete',
      'Enter PIN to delete this exercise:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: (pin) => {
            if (pin !== ADMIN_DELETE_PIN) {
              showErrorToast('Incorrect PIN', 'Exercise not deleted');
              return;
            }
            deleteExercise(exercise.id, exercise.name);
          },
        },
      ],
      'secure-text'
    );
  };
  
  
  

  const renderExerciseItem = (exercise) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onLongPress={() =>
        Alert.alert(
          exercise.name,
          'Choose an action',
          [
            { text: 'Edit', onPress: () => promptEditExercise(exercise) },
            { text: 'Delete', style: 'destructive', onPress: () => promptDeleteExercise(exercise) },
            { text: 'Cancel', style: 'cancel' },
          ]
        )
      }
    >
      <View style={styles.exerciseRow}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          {exercise.tracking?.length > 0 && (
            <Text style={styles.trackingText}>
              {exercise.tracking.join(', ')}
            </Text>
          )}
        </View>
        {/* media badges unchanged */}
      </View>
    </TouchableOpacity>
  );
  

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: getSpacing.md,
    },
    exerciseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    exerciseInfo: {
      flex: 1,
    },
    exerciseName: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginBottom: 2,
    },
    trackingText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
    },
    mediaBadges: {
      flexDirection: 'row',
      gap: getSpacing.sm,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.background,
      borderTopLeftRadius: getBorderRadius.xl,
      borderTopRightRadius: getBorderRadius.xl,
      paddingBottom: getSpacing.xl,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getSpacing.lg,
      paddingTop: getSpacing.lg,
      paddingBottom: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    modalBody: {
      padding: getSpacing.lg,
    },
    inputLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: getSpacing.sm,
    },
    textInput: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginBottom: getSpacing.lg,
    },
    trackingSection: {
      marginBottom: getSpacing.lg,
    },
    trackingHelperText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
      marginBottom: getSpacing.sm,
      fontStyle: 'italic',
    },
    trackingGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: getSpacing.sm,
    },
    trackingOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      minWidth: '30%',
    },
    trackingOptionSelected: {
      backgroundColor: `${theme.primary}15`,
      borderColor: theme.primary,
    },
    trackingIcon: {
      marginRight: getSpacing.xs,
    },
    trackingLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.primary,
    },
    trackingLabelSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
    modalFooter: {
      flexDirection: 'row',
      gap: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
    },
    button: {
      flex: 1,
      paddingVertical: getSpacing.md,
      borderRadius: getBorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    saveButton: {
      backgroundColor: theme.primary,
    },
    buttonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: theme.text.primary,
    },
    saveButtonText: {
      color: '#fff',
    },
  });

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Exercises"
        subtext="Manage your exercise catalog"
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Accordion
          sections={exercisesByCategory}
          renderItem={renderExerciseItem}
          defaultExpandFirst={false}
          renderHeaderRight={(section) => (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleAddExercise(section.id, section.title);
              }}
              disabled={loading}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginRight: 12}}
            >
              <Ionicons name="add-circle" size={28} color={theme.primary} />
            </TouchableOpacity>
          )}
        />
      </ScrollView>

      {/* Add Exercise Modal (Core/Cardio only) */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseAddModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={handleCloseAddModal}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add to {addCategory?.title}
              </Text>
              <TouchableOpacity onPress={handleCloseAddModal}>
                <Ionicons
                  name="close"
                  size={28}
                  color={theme.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Exercise Name */}
              <Text style={styles.inputLabel}>Exercise Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Plank Hold"
                placeholderTextColor={theme.text.tertiary}
                value={exerciseName}
                onChangeText={setExerciseName}
                autoFocus
                autoCorrect={false}
              />

              {/* Tracking Options */}
              <View style={styles.trackingSection}>
                <Text style={styles.inputLabel}>
                  Tracking Fields
                </Text>
                <Text style={styles.trackingHelperText}>
                  Sets are always included. Choose additional tracking:
                </Text>
                <View style={styles.trackingGrid}>
                  {FLEXIBLE_TRACKING_OPTIONS.map((option) => {
                    const isSelected = selectedTracking.includes(option.id);
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.trackingOption,
                          isSelected && styles.trackingOptionSelected,
                        ]}
                        onPress={() => toggleTracking(option.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : option.icon}
                          size={18}
                          color={
                            isSelected ? theme.primary : theme.text.secondary
                          }
                          style={styles.trackingIcon}
                        />
                        <Text
                          style={[
                            styles.trackingLabel,
                            isSelected && styles.trackingLabelSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCloseAddModal}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveExercise}
                disabled={!exerciseName.trim() || selectedTracking.length === 0}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>
                  Add Exercise
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
    </View>
  );
};

export default ExercisesScreen;