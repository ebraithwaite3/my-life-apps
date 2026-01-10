import React, { useState, useEffect } from 'react';
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
  const [timeInput, setTimeInput] = useState('');

  // Sync inputs when set prop changes
  useEffect(() => {
    setWeightInput(set.weight?.toString() || '0');
  }, [set.weight]);

  useEffect(() => {
    setRepsInput(set.reps?.toString() || '0');
  }, [set.reps]);

  useEffect(() => {
    setDistanceInput(set.distance?.toString() || '0');
  }, [set.distance]);

  useEffect(() => {
    setTimeInput(formatTime(set.time || 0));
  }, [set.time]);

  // Format time in MM:SS or HH:MM:SS for display
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

  // Format time input as user types (auto-insert colons)
  const formatTimeInput = (text) => {
    const digits = text.replace(/\D/g, '');
    
    if (digits.length === 0) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) {
      return `${digits.slice(0, -2)}:${digits.slice(-2)}`;
    }
    return `${digits.slice(0, -4)}:${digits.slice(-4, -2)}:${digits.slice(-2)}`;
  };

  // Parse formatted time back to total seconds
  const parseTimeToSeconds = (formattedTime) => {
    const parts = formattedTime.split(':').map(p => parseInt(p) || 0);
    
    if (parts.length === 1) {
      return parts[0];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  };

  // Handle weight change (update immediately)
  const handleWeightChange = (text) => {
    setWeightInput(text);
    const num = parseFloat(text) || 0;
    onUpdate({ weight: num });
  };

  // Handle weight blur (round to nearest 0.5)
  const handleWeightBlur = () => {
    const num = parseFloat(weightInput) || 0;
    const rounded = Math.round(num * 2) / 2;
    setWeightInput(rounded.toString());
    onUpdate({ weight: rounded });
  };

  // Handle reps change (update immediately)
  const handleRepsChange = (text) => {
    setRepsInput(text);
    const num = parseInt(text) || 0;
    onUpdate({ reps: num });
  };

  // Handle reps blur (format)
  const handleRepsBlur = () => {
    const num = parseInt(repsInput) || 0;
    setRepsInput(num.toString());
    onUpdate({ reps: num });
  };

  // Handle distance change (update immediately)
  const handleDistanceChange = (text) => {
    setDistanceInput(text);
    const num = parseFloat(text) || 0;
    onUpdate({ distance: num });
  };

  // Handle distance blur (round to 2 decimals)
  const handleDistanceBlur = () => {
    const num = parseFloat(distanceInput) || 0;
    const rounded = Math.round(num * 100) / 100;
    setDistanceInput(rounded.toString());
    onUpdate({ distance: rounded });
  };

  // Handle time input change
  const handleTimeChange = (text) => {
    const formatted = formatTimeInput(text);
    setTimeInput(formatted);
  };

  // Handle time blur
  const handleTimeBlur = () => {
    if (!timeInput) {
      setTimeInput('00:00');
      onUpdate({ time: 0 });
      return;
    }
    
    const totalSeconds = parseTimeToSeconds(timeInput);
    const formatted = formatTime(totalSeconds);
    setTimeInput(formatted);
    onUpdate({ time: totalSeconds });
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
    inputSmallFont: {
      fontSize: getTypography.bodySmall.fontSize,
      paddingHorizontal: 4,
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
            onChangeText={handleWeightChange}
            onBlur={handleWeightBlur}
            onFocus={() => {
              if (weightInput === '0') setWeightInput('');
            }}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        )}

        {/* Reps Input */}
        {hasReps && (
          <TextInput
            style={styles.input}
            value={repsInput}
            onChangeText={handleRepsChange}
            onBlur={handleRepsBlur}
            onFocus={() => {
              if (repsInput === '0') setRepsInput('');
            }}
            keyboardType="number-pad"
            selectTextOnFocus
          />
        )}

        {/* Distance Input */}
        {hasDistance && (
          <TextInput
            style={styles.input}
            value={distanceInput}
            onChangeText={handleDistanceChange}
            onBlur={handleDistanceBlur}
            onFocus={() => {
              if (distanceInput === '0') setDistanceInput('');
            }}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        )}

        {/* Time Input - Auto-formatting with dynamic font size */}
        {hasTime && (
          <TextInput
            style={[
              styles.input,
              timeInput.length > 5 && styles.inputSmallFont,
            ]}
            value={timeInput}
            onChangeText={handleTimeChange}
            onBlur={handleTimeBlur}
            onFocus={() => {
              if (timeInput === '00:00') setTimeInput('');
            }}
            keyboardType="number-pad"
            placeholder="MM:SS"
            selectTextOnFocus
          />
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