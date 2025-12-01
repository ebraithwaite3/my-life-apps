import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import { SpinnerPicker } from '@my-apps/ui'; // Adjust path as needed

/**
 * TimerBanner - Banner-style timer with setup and running states
 * 
 * Two modes:
 * 1. Setup Mode (timer not running): Show time selection spinners + START/CLOSE buttons
 * 2. Running Mode (timer active): Show countdown + PAUSE/END buttons
 * 
 * @param {Function} onClose - Called when close button pressed
 * @param {Function} onTimerStart - Called when timer starts (receives total seconds and notification ID setter)
 * @param {Function} onTimerPause - Called when timer pauses (receives remaining seconds)
 * @param {Function} onTimerResume - Called when timer resumes (receives remaining seconds and notification ID setter)
 * @param {Function} onTimerEnd - Called when timer ends/stops
 * @param {Function} onTimerComplete - Called when timer reaches 0
 */
const TimerBanner = ({ 
  onClose,
  onTimerStart,
  onTimerPause,
  onTimerResume,
  onTimerEnd,
  onTimerComplete,
}) => {
  const { theme, getSpacing, getBorderRadius, getTypography } = useTheme();
  
  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const intervalRef = useRef(null);

  // Setup state (when not running)
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);

  // Picker visibility
  const [showHoursPicker, setShowHoursPicker] = useState(false);
  const [showMinutesPicker, setShowMinutesPicker] = useState(false);
  const [showSecondsPicker, setShowSecondsPicker] = useState(false);

  // Animation for progress bar
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Format time for display
  const formatTime = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start timer
  const handleStart = () => {
    const total = (hours * 3600) + (minutes * 60) + seconds;
    if (total === 0) return; // Don't start if time is 0
    
    setTotalSeconds(total);
    setRemainingSeconds(total);
    setIsRunning(true);
    setIsPaused(false);
    
    // Call callback with total seconds
    if (onTimerStart) {
      onTimerStart(total);
    }
    
    // Start countdown
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Pause timer
  const handlePause = () => {
    clearInterval(intervalRef.current);
    setIsPaused(true);
    setIsRunning(false);
    
    // Call callback with remaining seconds
    if (onTimerPause) {
      onTimerPause(remainingSeconds);
    }
  };

  // Resume timer
  const handleResume = () => {
    setIsRunning(true);
    setIsPaused(false);
    
    // Call callback with remaining seconds
    if (onTimerResume) {
      onTimerResume(remainingSeconds);
    }
    
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // End/Stop timer
  const handleEnd = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setRemainingSeconds(0);
    setTotalSeconds(0);
    
    // Call callback
    if (onTimerEnd) {
      onTimerEnd();
    }
  };

  // Timer completion
  const handleTimerComplete = () => {
    console.log('⏰ Timer Complete!');
    
    // Call callback
    if (onTimerComplete) {
      onTimerComplete();
    }
  };

  // Close banner
  const handleClose = () => {
    handleEnd(); // Stop timer if running
    console.log('CLOSE');
    if (onClose) onClose();
  };

  // Update progress animation
  useEffect(() => {
    if (totalSeconds > 0) {
      const progress = remainingSeconds / totalSeconds;
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [remainingSeconds, totalSeconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
    };
  }, []);

  // Create a date object for spinner (using current date + time values)
  const createDateForSpinner = (hrs, mins, secs) => {
    const date = new Date();
    date.setHours(hrs, mins, secs, 0);
    return date;
  };

  const styles = StyleSheet.create({
    banner: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      padding: getSpacing.lg,
      borderWidth: 2,
      borderColor: isRunning ? theme.success || '#4CAF50' : isPaused ? theme.warning || '#FFA500' : theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: getSpacing.md,
    },
    title: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    closeButton: {
      padding: getSpacing.xs,
    },
    // Setup mode styles
    setupContainer: {
      alignItems: 'center',
    },
    timeSelectors: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: getSpacing.sm,
      marginBottom: getSpacing.lg,
    },
    timeSelector: {
      alignItems: 'center',
    },
    timeSelectorButton: {
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      minWidth: 70,
      alignItems: 'center',
    },
    timeSelectorValue: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.text.primary,
    },
    timeSelectorLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.xs,
    },
    timeSeparator: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.text.tertiary,
      marginBottom: 20, // To align with values above labels
    },
    // Running mode styles
    runningContainer: {
      alignItems: 'center',
    },
    countdownDisplay: {
      fontSize: 48,
      fontWeight: '700',
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
      fontVariant: ['tabular-nums'],
    },
    progressContainer: {
      width: '100%',
      height: 6,
      backgroundColor: theme.background,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: getSpacing.lg,
    },
    progressBar: {
      height: '100%',
      backgroundColor: isRunning ? theme.success || '#4CAF50' : theme.warning || '#FFA500',
    },
    // Button styles
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: getSpacing.md,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderRadius: getBorderRadius.md,
      gap: getSpacing.xs,
      minWidth: 120,
      justifyContent: 'center',
    },
    startButton: {
      backgroundColor: theme.primary,
    },
    pauseButton: {
      backgroundColor: theme.warning || '#FFA500',
    },
    resumeButton: {
      backgroundColor: theme.success || '#4CAF50',
    },
    endButton: {
      backgroundColor: theme.error,
    },
    secondaryButton: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    buttonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: '#FFF',
    },
    secondaryButtonText: {
      color: theme.text.primary,
    },
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Render setup mode (not running)
  if (!isRunning && !isPaused) {
    return (
      <View style={styles.banner}>
        <View style={styles.header}>
          <Text style={styles.title}>Set Timer</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={theme.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.setupContainer}>
          {/* Time Selectors */}
          <View style={styles.timeSelectors}>
            {/* Hours */}
            <View style={styles.timeSelector}>
              <TouchableOpacity
                style={styles.timeSelectorButton}
                onPress={() => setShowHoursPicker(true)}
              >
                <Text style={styles.timeSelectorValue}>
                  {hours.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.timeSelectorLabel}>hours</Text>
            </View>

            <Text style={styles.timeSeparator}>:</Text>

            {/* Minutes */}
            <View style={styles.timeSelector}>
              <TouchableOpacity
                style={styles.timeSelectorButton}
                onPress={() => setShowMinutesPicker(true)}
              >
                <Text style={styles.timeSelectorValue}>
                  {minutes.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.timeSelectorLabel}>minutes</Text>
            </View>

            <Text style={styles.timeSeparator}>:</Text>

            {/* Seconds */}
            <View style={styles.timeSelector}>
              <TouchableOpacity
                style={styles.timeSelectorButton}
                onPress={() => setShowSecondsPicker(true)}
              >
                <Text style={styles.timeSelectorValue}>
                  {seconds.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.timeSelectorLabel}>seconds</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleClose}
            >
              <Ionicons name="close-outline" size={20} color={theme.text.primary} />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.startButton]}
              onPress={handleStart}
            >
              <Ionicons name="play" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hours Picker */}
        <SpinnerPicker
          visible={showHoursPicker}
          mode="time"
          value={createDateForSpinner(hours, 0, 0)}
          onConfirm={(date) => {
            setHours(date.getHours());
            setShowHoursPicker(false);
          }}
          onClose={() => setShowHoursPicker(false)}
        />

        {/* Minutes Picker */}
        <SpinnerPicker
          visible={showMinutesPicker}
          mode="time"
          value={createDateForSpinner(0, minutes, 0)}
          onConfirm={(date) => {
            setMinutes(date.getMinutes());
            setShowMinutesPicker(false);
          }}
          onClose={() => setShowMinutesPicker(false)}
        />

        {/* Seconds Picker */}
        <SpinnerPicker
          visible={showSecondsPicker}
          mode="time"
          value={createDateForSpinner(0, 0, seconds)}
          onConfirm={(date) => {
            setSeconds(date.getSeconds());
            setShowSecondsPicker(false);
          }}
          onClose={() => setShowSecondsPicker(false)}
        />
      </View>
    );
  }

  // Render running/paused mode
  return (
    <View style={styles.banner}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isPaused ? 'Timer Paused' : 'Timer Running'}
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color={theme.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.runningContainer}>
        {/* Countdown Display */}
        <Text style={styles.countdownDisplay}>
          {formatTime(remainingSeconds)}
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.endButton]}
            onPress={handleEnd}
          >
            <Ionicons name="stop" size={20} color="#FFF" />
            <Text style={styles.buttonText}>End</Text>
          </TouchableOpacity>

          {isPaused ? (
            <TouchableOpacity
              style={[styles.button, styles.resumeButton]}
              onPress={handleResume}
            >
              <Ionicons name="play" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Resume</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.pauseButton]}
              onPress={handlePause}
            >
              <Ionicons name="pause" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Pause</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default TimerBanner;