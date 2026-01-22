import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

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

const TimerBanner = ({ onTimerComplete }) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();
  
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [totalSeconds, setTotalSeconds] = useState(60);
  const [startTime, setStartTime] = useState(null);
  const [notificationId, setNotificationId] = useState(null);
  const intervalRef = useRef(null);
  const resetTimeoutRef = useRef(null); // Track the auto-reset timeout
  const appState = useRef(AppState.currentState);

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
    
    // If we re-open the app and the timer finished more than 5 seconds ago
    if (remaining <= 0 && elapsed >= savedTotalSeconds + 5) {
        handleReset(); // Just reset it immediately, it's been done for a while
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
    const newTime = Math.max(5, Math.min(3600, totalSeconds + delta));
    setTotalSeconds(newTime);
    setRemainingSeconds(newTime);
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
    
    // Clear auto-reset timeout if it exists
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

    // Clear any existing reset timeout
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    // AUTO-RESET DISPLAY: Wait 5 seconds, then reset to ready-to-go time
    resetTimeoutRef.current = setTimeout(() => {
      setRemainingSeconds(totalSeconds); // Just resets display value
      setStartTime(null);                // NOT starting the timer
      resetTimeoutRef.current = null;
    }, 5000);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    if (mins > 0) return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
    return `${secs}s`;
  };

  // Cleanup on unmount
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
      height: 54,
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
              disabled={totalSeconds <= 5}
            >
              <Ionicons 
                name="remove" 
                size={18} 
                color={totalSeconds <= 5 ? theme.text.tertiary : theme.text.primary} 
              />
            </TouchableOpacity>

            <Text style={styles.timeDisplay}>
                {remainingSeconds === 0 ? "Done" : formatTime(remainingSeconds)}
            </Text>

            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustTime(5)}
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
          >
            <Ionicons name="play" size={16} color="#FFF" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default TimerBanner;