import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import { useWorkoutData } from '../../contexts/WorkoutDataContext';
import { groupExercisesByCategory } from '../../utils/exerciseUtils';
import { Accordion } from '@my-apps/ui';

const EditWorkoutTemplate = forwardRef(({ 
  template, 
  workout,
  event,
  onSave,
  onSelectedCountChange,
  isTemplate = false 
}, ref) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { allExercises } = useWorkoutData();

  const initialData = template || workout;

  const [name, setName] = useState(
    initialData?.name || 
    (event ? `${event.title} Workout` : isTemplate ? '' : 'Workout')
  );

  const [selectedExercises, setSelectedExercises] = useState(
    initialData?.exercises?.map(ex => ex.exerciseId) || []
  );

  // Track set counts for each exercise
  const [setCounts, setSetCounts] = useState(() => {
    const counts = {};
    if (initialData?.exercises) {
      initialData.exercises.forEach(ex => {
        counts[ex.exerciseId] = ex.sets?.length || 3;
      });
    }
    return counts;
  });

  const [viewMode, setViewMode] = useState('main');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    onSelectedCountChange?.(selectedExercises.length);
  }, [selectedExercises, onSelectedCountChange]);

  useImperativeHandle(ref, () => ({
    save: handleSave,
  }));

  const exercisesByCategory = useMemo(() => {
    const grouped = groupExercisesByCategory(allExercises);
    
    return Object.keys(grouped)
      .sort()
      .map(category => ({
        id: category,
        title: category,
        data: grouped[category],
      }));
  }, [allExercises]);

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return allExercises.filter(ex => 
      ex.name.toLowerCase().includes(query) ||
      ex.category.toLowerCase().includes(query)
    );
  }, [allExercises, searchQuery]);

  const selectedExercisesData = useMemo(() => {
    return selectedExercises
      .map(id => allExercises.find(ex => ex.id === id))
      .filter(Boolean);
  }, [selectedExercises, allExercises]);

  const handleToggleExercise = (exerciseId) => {
    setSelectedExercises(prev => {
      if (prev.includes(exerciseId)) {
        // Remove - also clear set count
        setSetCounts(current => {
          const { [exerciseId]: removed, ...rest } = current;
          return rest;
        });
        return prev.filter(id => id !== exerciseId);
      } else {
        // Add - initialize with 3 sets
        setSetCounts(current => ({ ...current, [exerciseId]: 3 }));
        return [...prev, exerciseId];
      }
    });
  };

  const handleToggleInSearch = (exerciseId) => {
    setSelectedExercises(prev => {
      if (prev.includes(exerciseId)) {
        setSetCounts(current => {
          const { [exerciseId]: removed, ...rest } = current;
          return rest;
        });
        return prev.filter(id => id !== exerciseId);
      } else {
        setSetCounts(current => ({ ...current, [exerciseId]: 3 }));
        return [...prev, exerciseId];
      }
    });
    
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert(isTemplate ? 'Please enter a template name' : 'Please enter a workout name');
      return;
    }
  
    if (selectedExercises.length === 0) {
      alert('Please select at least one exercise');
      return;
    }
  
    if (isTemplate) {
      // Templates just store exercise IDs, order, and set COUNT (not actual sets)
      const templateData = {
        id: initialData?.id || `template-${Date.now()}`,
        name: name.trim(),
        exercises: selectedExercises.map((exerciseId, index) => ({
          exerciseId,
          order: index,
          setCount: setCounts[exerciseId] || 3, // Just the number
        })),
        createdAt: initialData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
  
      if (initialData?.lastUsed) {
        templateData.lastUsed = initialData.lastUsed;
      }
  
      onSave(templateData);
    } else {
      // Workouts create actual sets with tracking fields
      const workoutData = {
        activityType: 'workout',
        id: initialData?.id || `workout-${Date.now()}`,
        name: name.trim(),
        templateId: initialData?.templateId || null,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        startedAt: initialData?.startedAt || new Date().toISOString(),
        completedAt: initialData?.completedAt || null,
        exercises: selectedExercises.map((exerciseId, index) => {
          const exercise = allExercises.find(ex => ex.id === exerciseId);
          const setCount = setCounts[exerciseId] || 3;
  
          return {
            id: `exercise-${Date.now()}-${index}`,
            exerciseId,
            order: index,
            sets: Array(setCount).fill(null).map((_, setIndex) => {
              const set = {
                id: `set-${Date.now()}-${index}-${setIndex}`,
                completed: false,
              };
              
              // Add tracking fields for workouts only
              if (exercise?.tracking?.includes('reps')) set.reps = 0;
              if (exercise?.tracking?.includes('weight')) set.weight = 0;
              if (exercise?.tracking?.includes('distance')) set.distance = 0;
              if (exercise?.tracking?.includes('time')) set.time = 0;
              
              return set;
            }),
          };
        }),
      };
  
      onSave(workoutData);
    }
  };

  const renderExerciseItem = (exercise, isSelected, onToggle) => {
    const setCount = setCounts[exercise.id] || 3;
    
    return (
      <View
        style={[
          styles.exerciseRow,
          isSelected && styles.exerciseRowSelected,
        ]}
      >
        {/* Touchable area for toggling selection */}
        <TouchableOpacity
          style={styles.exerciseToggleArea}
          onPress={onToggle}
          activeOpacity={0.6}
        >
          <View style={styles.checkbox}>
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={28}
              color={isSelected ? theme.primary : theme.text.tertiary}
            />
          </View>
  
          <View style={styles.exerciseInfo}>
            <Text style={[
              styles.exerciseName,
              isSelected && styles.exerciseNameSelected,
            ]}>
              {exercise.name}
            </Text>
            {exercise.category && (
              <Text style={styles.exerciseCategory}>
                {exercise.category}
              </Text>
            )}
          </View>
        </TouchableOpacity>
  
        {/* Set counter - separate from toggle area */}
        {isSelected && (
          <View style={styles.setCounterContainer}>
            <Text style={styles.setsLabel}>Sets</Text>
            <View style={styles.setCounter}>
              <TouchableOpacity
                style={styles.setButton}
                onPress={() => {
                  setSetCounts(c => ({ ...c, [exercise.id]: Math.max(1, setCount - 1) }));
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="remove-circle-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
              
              <Text style={styles.setCount}>{setCount}</Text>
              
              <TouchableOpacity
                style={styles.setButton}
                onPress={() => {
                  setSetCounts(c => ({ ...c, [exercise.id]: Math.min(10, setCount + 1) }));
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: getSpacing.lg,
    },
    section: {
      marginBottom: getSpacing.xl,
    },
    sectionLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: getSpacing.sm,
    },
    nameInput: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    searchButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.md,
      marginBottom: getSpacing.md,
    },
    searchButtonIcon: {
      marginRight: getSpacing.sm,
    },
    searchButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.tertiary,
    },
    searchContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },
    searchHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: getSpacing.md,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: getSpacing.sm,
      marginRight: getSpacing.sm,
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
    },
    searchIcon: {
      marginRight: getSpacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      padding: 0,
    },
    clearButton: {
      padding: getSpacing.xs,
    },
    searchResults: {
      flex: 1,
    },
    resultsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      backgroundColor: theme.surface,
    },
    resultsTitle: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    resultsCount: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: getSpacing.md,
        paddingHorizontal: getSpacing.lg,
        backgroundColor: theme.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      },
      exerciseRowSelected: {
        backgroundColor: `${theme.primary}08`,
      },
      exerciseToggleArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
      },
      checkbox: {
        marginRight: getSpacing.md,
        width: 28,
        alignItems: 'center',
        justifyContent: 'center',
      },
      exerciseInfo: {
        flex: 1,
      },
      exerciseName: {
        fontSize: getTypography.body.fontSize,
        color: theme.text.primary,
        marginBottom: 2,
      },
      exerciseNameSelected: {
        color: theme.primary,
        fontWeight: '500',
      },
      exerciseCategory: {
        fontSize: getTypography.bodySmall.fontSize,
        color: theme.text.tertiary,
        textTransform: 'capitalize',
      },
      setCounterContainer: {
        alignItems: 'center',
        marginLeft: getSpacing.md,
      },
      setsLabel: {
        fontSize: getTypography.bodySmall.fontSize,
        color: theme.text.secondary,
        marginBottom: 2,
      },
      setCounter: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      setButton: {
        padding: getSpacing.xs,
      },
      setCount: {
        fontSize: getTypography.body.fontSize,
        fontWeight: '600',
        color: theme.primary,
        minWidth: 24,
        textAlign: 'center',
        marginHorizontal: getSpacing.xs,
      },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: getSpacing.xl,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
      marginTop: getSpacing.sm,
    },
    itemContainer: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    lastItem: {
      borderBottomWidth: 0,
    },
    searchPrompt: {
      alignItems: 'center',
      paddingVertical: getSpacing.xl,
      paddingHorizontal: getSpacing.lg,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    searchPromptText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.sm,
    },
  });

  if (viewMode === 'search') {
    return (
      <KeyboardAvoidingView 
        style={styles.searchContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.searchHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSearchQuery('');
              setViewMode('main');
            }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
          </TouchableOpacity>

          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={20}
              color={theme.text.tertiary}
              style={styles.searchIcon}
            />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor={theme.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.text.tertiary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {filteredExercises.length > 0 ? (
          <View style={styles.searchResults}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Results</Text>
              <Text style={styles.resultsCount}>
                {filteredExercises.length} {filteredExercises.length === 1 ? 'exercise' : 'exercises'}
              </Text>
            </View>

            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="always"
              renderItem={({ item }) => {
                const isSelected = selectedExercises.includes(item.id);
                return renderExerciseItem(item, isSelected, () => handleToggleInSearch(item.id));
              }}
            />
          </View>
        ) : searchQuery.trim() ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={theme.text.tertiary} />
            <Text style={styles.emptyText}>No exercises found</Text>
          </View>
        ) : (
          <View style={styles.searchResults}>
            <View style={styles.searchPrompt}>
              <Ionicons name="search" size={32} color={theme.text.tertiary} />
              <Text style={styles.searchPromptText}>Type to search exercises</Text>
            </View>

            {selectedExercisesData.length > 0 && (
              <>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>Selected Exercises</Text>
                  <Text style={styles.resultsCount}>
                    {selectedExercisesData.length} {selectedExercisesData.length === 1 ? 'exercise' : 'exercises'}
                  </Text>
                </View>

                <FlatList
                  data={selectedExercisesData}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="always"
                  renderItem={({ item }) => {
                    return renderExerciseItem(item, true, () => handleToggleInSearch(item.id));
                  }}
                />
              </>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {isTemplate ? 'Template Name' : 'Workout Name'}
          </Text>
          <TextInput
            style={styles.nameInput}
            placeholder={isTemplate ? "e.g., Push Day A" : "e.g., Morning Workout"}
            placeholderTextColor={theme.text.tertiary}
            value={name}
            onChangeText={setName}
            autoCorrect={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Exercises</Text>
          
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setViewMode('search')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="search"
              size={20}
              color={theme.text.tertiary}
              style={styles.searchButtonIcon}
            />
            <Text style={styles.searchButtonText}>
              Search exercises...
            </Text>
          </TouchableOpacity>

          <Accordion
            sections={exercisesByCategory}
            renderItem={renderExerciseItem}
            onItemToggle={handleToggleExercise}
            selectedItems={selectedExercises}
            defaultExpandFirst={false}
          />
        </View>
      </ScrollView>
    </View>
  );
});

export default EditWorkoutTemplate;