import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  Platform,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

const TIMER_STORAGE_KEY = '@timer_state';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return {
      shouldShowAlert: true, 
      shouldPlaySound: true, 
      shouldSetBadge: false,
    };
  },
});

const TimerBanner = forwardRef(({ 
  onTimerComplete, 
  onEditingChange,
  maxSeconds = 3600 // Default to 1 hour, can be overridden
}, ref) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();
  
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [totalSeconds, setTotalSeconds] = useState(60);
  const [startTime, setStartTime] = useState(null);
  const [notificationId, setNotificationId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [hasError, setHasError] = useState(false);
  const intervalRef = useRef(null);
  const resetTimeoutRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const inputRef = useRef(null);
  
  // Animated error height
  const errorAnim = useRef(new Animated.Value(0)).current;

  // Expose finishEditing to parent via ref
  useImperativeHandle(ref, () => ({
    finishEditing: handleTimeInputDone,
  }));

  // Notify parent when editing state changes
  useEffect(() => {
    if (onEditingChange) {
      onEditingChange(isEditing);
    }
  }, [isEditing, onEditingChange]);

  // Animate error message
  useEffect(() => {
    Animated.timing(errorAnim, {
      toValue: hasError ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [hasError]);

  useEffect(() => {
    loadTimerState();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [startTime, totalSeconds, isRunning]);

  useEffect(() => {
    if (isRunning && startTime) {
      saveTimerState();
    }
  }, [isRunning, startTime, totalSeconds, notificationId]);

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      if (isRunning && startTime) {
        recalculateTimer();
      }
    }
    appState.current = nextAppState;
  };

  const saveTimerState = async () => {
    try {
      const state = { isRunning, startTime, totalSeconds, notificationId };
      await AsyncStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  };

  const loadTimerState = async () => {
    try {
      const stateStr = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
      if (stateStr) {
        const state = JSON.parse(stateStr);
        if (state.isRunning && state.startTime) {
          setTotalSeconds(state.totalSeconds);
          setStartTime(state.startTime);
          setNotificationId(state.notificationId);
          setIsRunning(true);
          recalculateTimer(state.startTime, state.totalSeconds);
        }
      }
    } catch (error) {
      console.error('Error loading timer state:', error);
    }
  };

  const clearTimerState = async () => {
    try {
      await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing timer state:', error);
    }
  };

  const scheduleNotification = async (seconds) => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return null;
  
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ Timer Complete!",
          body: "Your rest timer has finished.",
          sound: 'default',
          data: { type: 'timer_complete', scheduledFor: seconds },
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' }),
        },
        trigger: { type: 'timeInterval', seconds: seconds, repeats: false },
      });
      setNotificationId(id);
      return id;
    } catch (error) {
      return null;
    }
  };

  const cancelNotification = async (id = notificationId) => {
    if (id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
        setNotificationId(null);
      } catch (error) {}
    }
  };

  const recalculateTimer = (savedStartTime = startTime, savedTotalSeconds = totalSeconds) => {
    const now = Date.now();
    const elapsed = Math.floor((now - savedStartTime) / 1000);
    const remaining = Math.max(0, savedTotalSeconds - elapsed);
    
    if (remaining <= 0 && elapsed >= savedTotalSeconds + 5) {
        handleReset();
        return;
    }

    if (remaining <= 0) {
      handleTimerComplete();
      return;
    }
    setRemainingSeconds(remaining);
    startCountdown(remaining);
  };

  const startCountdown = (initialRemaining = remainingSeconds) => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        const newRemaining = prev - 1;
        if (newRemaining <= 0) {
          clearInterval(intervalRef.current);
          handleTimerComplete();
          return 0;
        }
        return newRemaining;
      });
    }, 1000);
  };

  const adjustTime = (delta) => {
    if (isRunning) return;
    const newTime = Math.max(5, Math.min(maxSeconds, totalSeconds + delta));
    setTotalSeconds(newTime);
    setRemainingSeconds(newTime);
  };

  // Format time in MM:SS or HH:MM:SS for display
  const formatTimeDisplay = (seconds) => {
    if (!seconds) return "00:00";
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

  // Handle long press on time display
  const handleLongPress = () => {
    if (isRunning) return;
    
    const formatted = formatTimeDisplay(totalSeconds);
    setTimeInput(formatted);
    setHasError(false);
    setIsEditing(true);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Handle time input change with improved validation
  const handleTimeInputChange = (text) => {
    const formatted = formatTimeInput(text);
    setTimeInput(formatted);
    
    // Only validate after 2+ digits to avoid premature errors
    const digits = text.replace(/\D/g, '');
    
    if (digits.length < 2) {
      setHasError(false);
      return;
    }

    const seconds = parseTimeToSeconds(formatted);
    
    if (seconds < 5 || seconds > maxSeconds) {
      // Haptic feedback on error state change
      if (!hasError) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      }
      setHasError(true);
    } else {
      setHasError(false);
    }
  };

  // Handle blur or done with auto-correction
  const handleTimeInputDone = () => {
    if (!timeInput) {
      setIsEditing(false);
      setHasError(false);
      return;
    }

    let seconds = parseTimeToSeconds(timeInput);
    
    // Auto-correct to valid range instead of rejecting
    if (seconds < 5) {
      seconds = 5;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (seconds > maxSeconds) {
      seconds = maxSeconds;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    setIsEditing(false);
    setHasError(false);
    setTimeInput('');
  };

  const handleStart = async () => {
    const now = Date.now();
    setStartTime(now);
    setIsRunning(true);
    await scheduleNotification(totalSeconds);
    startCountdown(totalSeconds);
  };

  const handleStop = async () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    await cancelNotification();
  };

  const handleReset = async () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
    setStartTime(null);
    
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    
    await cancelNotification();
    await clearTimerState();
  };

  const handleTimerComplete = async () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setRemainingSeconds(0);
    
    await cancelNotification();
    await clearTimerState();
    
    if (onTimerComplete) onTimerComplete();

    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = setTimeout(() => {
      setRemainingSeconds(totalSeconds);
      setStartTime(null);
      resetTimeoutRef.current = null;
    }, 5000);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    if (mins > 0) return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
    return `${secs}s`;
  };

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.l || 16,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.xs,
      borderWidth: 1,
      borderColor: isRunning ? theme.success + '40' : (remainingSeconds === 0 ? theme.success : theme.border),
      minHeight: 54,
    },
    pillGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.m || 12,
      paddingHorizontal: 4,
      height: 38,
    },
    adjustButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    adjustButtonDisabled: {
      opacity: 0.2,
    },
    timeDisplay: {
      fontSize: 18,
      fontWeight: '700',
      color: (isRunning || remainingSeconds === 0) ? theme.success : theme.text.primary,
      fontVariant: ['tabular-nums'],
      minWidth: 45,
      textAlign: 'center',
      marginHorizontal: 4,
    },
    timeInput: {
      fontSize: 18,
      fontWeight: '700',
      color: hasError ? theme.error : theme.text.primary,
      fontVariant: ['tabular-nums'],
      minWidth: 80,
      textAlign: 'center',
      marginHorizontal: 4,
      backgroundColor: theme.surface,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderWidth: hasError ? 2 : 0,
      borderColor: hasError ? theme.error : 'transparent',
    },
    errorText: {
      marginTop: 2,
      fontSize: 10,
      color: theme.error,
      fontWeight: '600',
      textAlign: 'center',
    },
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16, 
    },
    circleButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startButton: {
      backgroundColor: theme.primary,
    },
    stopButton: {
      backgroundColor: theme.error,
    },
    resetButton: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.pillGroup}>
        {!isRunning ? (
          <>
            <TouchableOpacity
              style={[styles.adjustButton, totalSeconds <= 5 && styles.adjustButtonDisabled]}
              onPress={() => adjustTime(-5)}
              disabled={totalSeconds <= 5 || isEditing}
            >
              <Ionicons 
                name="remove" 
                size={18} 
                color={totalSeconds <= 5 ? theme.text.tertiary : theme.text.primary} 
              />
            </TouchableOpacity>

            {isEditing ? (
              <View style={{ alignItems: 'center' }}>
                <TextInput
                  ref={inputRef}
                  style={styles.timeInput}
                  value={timeInput}
                  onChangeText={handleTimeInputChange}
                  onBlur={handleTimeInputDone}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Animated.View
                  style={{
                    height: errorAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 14],
                    }),
                    opacity: errorAnim,
                  }}
                >
                  {hasError && (
                    <Text style={styles.errorText}>
                      Max: {formatTimeDisplay(maxSeconds)}
                    </Text>
                  )}
                </Animated.View>
              </View>
            ) : (
              <TouchableOpacity 
                onLongPress={handleLongPress}
                delayLongPress={400}
                activeOpacity={0.7}
              >
                <Text style={styles.timeDisplay}>
                  {remainingSeconds === 0 ? "Done" : formatTime(remainingSeconds)}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustTime(5)}
              disabled={isEditing}
            >
              <Ionicons name="add" size={18} color={theme.text.primary} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={styles.timeDisplay}>{formatTime(remainingSeconds)}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.circleButton, styles.resetButton]}
          onPress={handleReset}
        >
          <Ionicons name="refresh" size={18} color={theme.text.secondary} />
        </TouchableOpacity>

        {isRunning ? (
          <TouchableOpacity
            style={[styles.circleButton, styles.stopButton]}
            onPress={handleStop}
          >
            <Ionicons name="stop" size={16} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.circleButton, styles.startButton]}
            onPress={handleStart}
            disabled={isEditing}
          >
            <Ionicons name="play" size={16} color="#FFF" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

export default TimerBanner;