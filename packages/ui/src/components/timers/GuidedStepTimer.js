import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * GuidedStepTimer - Compact per-step timer for Guided Workflow items.
 * - Persists running state to AsyncStorage so modal close/reopen restores countdown.
 * - Cancels timer + notification when parent item is marked complete.
 * - Long-press time display to type a custom time (MM:SS / HH:MM:SS).
 * - +/- buttons adjust in 5-minute increments; press-and-hold for fast adjust.
 * - Schedules/cancels only its own notification (no cancelAll).
 */
const GuidedStepTimer = ({ timerMinutes = 30, stepName, stepId, completed = false }) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();

  const storageKey = `@guided_timer_${(stepId || stepName || 'step').replace(/[^a-zA-Z0-9]/g, '_')}`;
  const initialSeconds = timerMinutes * 60;

  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [notificationId, setNotificationId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [hasError, setHasError] = useState(false);

  const intervalRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const inputRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // Refs so callbacks always see current values without stale closures
  const runningRef = useRef(false);
  const startTimeRef = useRef(null);
  const totalSecondsRef = useRef(initialSeconds);
  const notificationIdRef = useRef(null);

  useEffect(() => { runningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);
  useEffect(() => { totalSecondsRef.current = totalSeconds; }, [totalSeconds]);
  useEffect(() => { notificationIdRef.current = notificationId; }, [notificationId]);

  // Restore running timer on mount
  useEffect(() => {
    loadTimerState();
  }, []);

  // Persist state whenever the timer is running
  useEffect(() => {
    if (isRunning && startTime) {
      saveTimerState();
    }
  }, [isRunning, startTime, totalSeconds, notificationId]);

  // Cancel and clean up when the step is marked complete
  useEffect(() => {
    if (completed && runningRef.current) {
      cancelOwnNotification();
      clearTimerState();
      clearInterval(intervalRef.current);
      setIsRunning(false);
      runningRef.current = false;
      setNotificationId(null);
      notificationIdRef.current = null;
    }
  }, [completed]);

  // AppState handler — recalculate remaining when app comes back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (runningRef.current && startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const remaining = Math.max(0, totalSecondsRef.current - elapsed);
          setRemainingSeconds(remaining);
          if (remaining <= 0) handleComplete();
          else startCountdown();
        }
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  // Clear intervals on unmount (notification intentionally left scheduled for background)
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(holdIntervalRef.current);
    };
  }, []);

  // ─── AsyncStorage ────────────────────────────────────────────────────────────

  const saveTimerState = async () => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify({
        startTime: startTimeRef.current,
        totalSeconds: totalSecondsRef.current,
        notificationId: notificationIdRef.current,
        savedDate: new Date().toDateString(),
      }));
    } catch {}
  };

  const loadTimerState = async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!state.startTime || state.savedDate !== new Date().toDateString()) {
        await AsyncStorage.removeItem(storageKey);
        return;
      }
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      const remaining = Math.max(0, state.totalSeconds - elapsed);
      if (remaining <= 0) {
        await AsyncStorage.removeItem(storageKey);
        return;
      }
      // Restore state
      setTotalSeconds(state.totalSeconds);
      totalSecondsRef.current = state.totalSeconds;
      setStartTime(state.startTime);
      startTimeRef.current = state.startTime;
      setNotificationId(state.notificationId);
      notificationIdRef.current = state.notificationId;
      setRemainingSeconds(remaining);
      setIsRunning(true);
      runningRef.current = true;
      startCountdown();
    } catch {}
  };

  const clearTimerState = async () => {
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch {}
  };

  // ─── Notifications ───────────────────────────────────────────────────────────

  const scheduleNotification = async (seconds) => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return null;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Timer Complete!',
          body: stepName ? `${stepName} is done.` : 'Your timer has finished.',
          sound: 'default',
          ...(Platform.OS === 'android' && {
            priority: Notifications.AndroidNotificationPriority?.HIGH,
            vibrationPattern: [0, 250, 250, 250],
          }),
          ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' }),
        },
        trigger: { type: 'timeInterval', seconds, repeats: false },
      });
      return id;
    } catch {
      return null;
    }
  };

  const cancelOwnNotification = async (id) => {
    const targetId = id ?? notificationIdRef.current;
    if (targetId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(targetId);
      } catch {}
    }
  };

  // ─── Timer controls ──────────────────────────────────────────────────────────

  const startCountdown = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(intervalRef.current);
          handleComplete();
          return 0;
        }
        return next;
      });
    }, 1000);
  };

  const handleStart = async () => {
    const now = Date.now();
    setStartTime(now);
    startTimeRef.current = now;
    setIsRunning(true);
    runningRef.current = true;
    const id = await scheduleNotification(remainingSeconds);
    setNotificationId(id);
    notificationIdRef.current = id;
    startCountdown();
  };

  const handleStop = async () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    runningRef.current = false;
    await cancelOwnNotification();
    setNotificationId(null);
    notificationIdRef.current = null;
    await clearTimerState();
  };

  const handleReset = async () => {
    clearInterval(intervalRef.current);
    clearInterval(holdIntervalRef.current);
    setIsRunning(false);
    runningRef.current = false;
    setRemainingSeconds(totalSeconds);
    setStartTime(null);
    startTimeRef.current = null;
    await cancelOwnNotification();
    setNotificationId(null);
    notificationIdRef.current = null;
    await clearTimerState();
  };

  const handleComplete = async () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    runningRef.current = false;
    setRemainingSeconds(0);
    await cancelOwnNotification();
    await clearTimerState();
    setTimeout(() => {
      setRemainingSeconds(totalSecondsRef.current);
      setStartTime(null);
      startTimeRef.current = null;
    }, 5000);
  };

  // ─── Time adjustment (± buttons) ─────────────────────────────────────────────

  const adjustTime = (deltaMinutes) => {
    if (isRunning) return;
    const deltaSeconds = deltaMinutes * 60;
    setTotalSeconds(prev => {
      const newTotal = Math.max(60, prev + deltaSeconds);
      totalSecondsRef.current = newTotal;
      setRemainingSeconds(newTotal);
      return newTotal;
    });
  };

  const startHold = (deltaMinutes) => {
    clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = setInterval(() => adjustTime(deltaMinutes), 150);
  };

  const stopHold = () => clearInterval(holdIntervalRef.current);

  // ─── Manual time input (long press) ──────────────────────────────────────────

  const formatTimeInput = (text) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, -2)}:${digits.slice(-2)}`;
    return `${digits.slice(0, -4)}:${digits.slice(-4, -2)}:${digits.slice(-2)}`;
  };

  const parseTimeToSeconds = (formattedTime) => {
    const parts = formattedTime.split(':').map(p => parseInt(p) || 0);
    if (parts.length === 1) return parts[0] * 60; // bare number = minutes
    if (parts.length === 2) return parts[0] * 60 + parts[1]; // MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
  };

  const handleLongPress = () => {
    if (isRunning) return;
    setTimeInput(formatTime(totalSeconds));
    setHasError(false);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleTimeInputChange = (text) => {
    const formatted = formatTimeInput(text);
    setTimeInput(formatted);
    setHasError(parseTimeToSeconds(formatted) < 60);
  };

  const handleTimeInputDone = () => {
    if (!timeInput) {
      setIsEditing(false);
      setHasError(false);
      return;
    }
    let seconds = parseTimeToSeconds(timeInput);
    if (seconds < 60) seconds = 60;
    setTotalSeconds(seconds);
    totalSecondsRef.current = seconds;
    setRemainingSeconds(seconds);
    setIsEditing(false);
    setHasError(false);
    setTimeInput('');
  };

  // ─── Formatting ──────────────────────────────────────────────────────────────

  const formatTime = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  // Hide entirely when completed (effect above already cancelled the notification)
  if (completed) return null;

  const isDone = remainingSeconds === 0;
  const timeColor = (isRunning || isDone) ? (theme.success || theme.primary) : theme.text.primary;

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.sm,
      paddingHorizontal: getSpacing.sm,
      paddingVertical: 6,
      marginTop: getSpacing.xs,
      borderWidth: 1,
      borderColor: isRunning ? (theme.success || theme.primary) + '60' : theme.border,
    },
    pillGroup: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    adjustBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeText: {
      fontSize: 14,
      fontWeight: '700',
      color: timeColor,
      fontVariant: ['tabular-nums'],
      minWidth: 44,
      textAlign: 'center',
    },
    timeInput: {
      fontSize: 14,
      fontWeight: '700',
      color: hasError ? theme.error : theme.text.primary,
      fontVariant: ['tabular-nums'],
      minWidth: 56,
      textAlign: 'center',
      backgroundColor: theme.surface,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderWidth: hasError ? 1 : 0,
      borderColor: hasError ? theme.error : 'transparent',
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    circleBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startBtn: { backgroundColor: theme.primary },
    stopBtn: { backgroundColor: theme.error },
    resetBtn: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.pillGroup}>
        {!isRunning && (
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => adjustTime(-5)}
            onLongPress={() => startHold(-5)}
            onPressOut={stopHold}
            disabled={totalSeconds <= 60 || isEditing}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
          >
            <Ionicons
              name="remove"
              size={14}
              color={totalSeconds <= 60 ? theme.text.tertiary : theme.text.primary}
            />
          </TouchableOpacity>
        )}

        {!isRunning && isEditing ? (
          <TextInput
            ref={inputRef}
            style={styles.timeInput}
            value={timeInput}
            onChangeText={handleTimeInputChange}
            onBlur={handleTimeInputDone}
            keyboardType="number-pad"
            selectTextOnFocus
          />
        ) : (
          <TouchableOpacity
            onLongPress={handleLongPress}
            delayLongPress={400}
            activeOpacity={isRunning ? 1 : 0.7}
            disabled={isRunning}
          >
            <Text style={styles.timeText}>
              {isDone ? 'Done' : formatTime(remainingSeconds)}
            </Text>
          </TouchableOpacity>
        )}

        {!isRunning && (
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => adjustTime(5)}
            onLongPress={() => startHold(5)}
            onPressOut={stopHold}
            disabled={isEditing}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          >
            <Ionicons name="add" size={14} color={theme.text.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.circleBtn, styles.resetBtn]}
          onPress={handleReset}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh" size={14} color={theme.text.secondary} />
        </TouchableOpacity>

        {isRunning ? (
          <TouchableOpacity
            style={[styles.circleBtn, styles.stopBtn]}
            onPress={handleStop}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="stop" size={12} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.circleBtn, styles.startBtn]}
            onPress={handleStart}
            disabled={isEditing}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="play" size={12} color="#fff" style={{ marginLeft: 1 }} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default GuidedStepTimer;
