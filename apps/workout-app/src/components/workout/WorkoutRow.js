import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useTheme } from '@my-apps/contexts';

const WorkoutRow = ({ set, setNumber, tracking, onUpdate, onDelete }) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const hasReps = tracking.includes('reps');
  const hasWeight = tracking.includes('weight');
  const hasDistance = tracking.includes('distance');
  const hasTime = tracking.includes('time');

  // Local state for inputs (allows typing without rounding)
  const [weightInput, setWeightInput] = useState(set.weight?.toString() || '0');
  const [repsInput, setRepsInput] = useState(set.reps?.toString() || '0');
  const [distanceInput, setDistanceInput] = useState(set.distance?.toString() || '0');

  // Format time in MM:SS or HH:MM:SS
  const formatTime = (seconds) => {
    if (!seconds) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle weight blur (round to nearest 5)
  const handleWeightBlur = () => {
    const num = parseFloat(weightInput) || 0;
    const rounded = Math.round(num / 5) * 5;
    setWeightInput(rounded.toString());
    onUpdate({ weight: rounded });
  };

  // Handle distance blur (0.1 increments)
  const handleDistanceBlur = () => {
    const num = parseFloat(distanceInput) || 0;
    const rounded = Math.round(num * 10) / 10;
    setDistanceInput(rounded.toString());
    onUpdate({ distance: rounded });
  };

  // Handle reps blur
  const handleRepsBlur = () => {
    const num = parseInt(repsInput) || 0;
    setRepsInput(num.toString());
    onUpdate({ reps: num });
  };

  // Render right swipe action (delete)
  const renderRightActions = () => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={onDelete}
      >
        <Ionicons name="trash" size={20} color="#fff" />
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      backgroundColor: set.completed ? `${theme.success}15` : theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    setNumber: {
      width: 50,
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    prevText: {
      flex: 1,
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
    },
    input: {
      width: 70,
      height: 40,
      backgroundColor: theme.background,
      borderRadius: 8,
      paddingHorizontal: getSpacing.sm,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    timeInput: {
      width: 70,
      height: 40,
      backgroundColor: theme.background,
      borderRadius: 8,
      paddingHorizontal: getSpacing.sm,
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.primary,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'center',
    },
    checkButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteAction: {
      backgroundColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
      width: 70,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
  });

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <View style={styles.container}>
        {/* Set Number */}
        <Text style={styles.setNumber}>{setNumber}</Text>

        {/* Previous (N/A for now) */}
        <Text style={styles.prevText}>N/A</Text>

        {/* Weight Input */}
        {hasWeight && (
          <TextInput
            style={styles.input}
            value={weightInput}
            onChangeText={setWeightInput}
            onBlur={handleWeightBlur}
            keyboardType="number-pad"
            selectTextOnFocus
          />
        )}

        {/* Reps Input */}
        {hasReps && (
          <TextInput
            style={styles.input}
            value={repsInput}
            onChangeText={setRepsInput}
            onBlur={handleRepsBlur}
            keyboardType="number-pad"
            selectTextOnFocus
          />
        )}

        {/* Distance Input */}
        {hasDistance && (
          <TextInput
            style={styles.input}
            value={distanceInput}
            onChangeText={setDistanceInput}
            onBlur={handleDistanceBlur}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        )}

        {/* Time Input (Simple for now - can expand later) */}
        {hasTime && (
          <TouchableOpacity 
            style={styles.timeInput} 
            onPress={() => {
              // TODO: Open time picker modal
              alert('Time picker coming soon!');
            }}
          >
            <Text style={styles.prevText}>{formatTime(set.time || 0)}</Text>
          </TouchableOpacity>
        )}

        {/* Completion Checkbox */}
        <TouchableOpacity
          style={styles.checkButton}
          onPress={() => onUpdate({ completed: !set.completed })}
        >
          <Ionicons
            name={set.completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
            color={set.completed ? theme.success : theme.text.tertiary}
          />
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
};

export default WorkoutRow;