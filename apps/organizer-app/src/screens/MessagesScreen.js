import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@my-apps/contexts';
import * as Notifications from 'expo-notifications';
import { TimerBanner } from '@my-apps/ui'; // Adjust path as needed

const MessagesScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();
  const [showTimer, setShowTimer] = useState(true);
  const notificationIdRef = useRef(null);

  // Schedule iPhone notification
  const scheduleNotification = async (seconds) => {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ Timer Complete!",
          body: `Your ${Math.floor(seconds / 60)} minute timer is done!`,
          sound: true,
        },
        trigger: {
          type: 'timeInterval',
          seconds: seconds,
          repeats: false,
        },
      });

      notificationIdRef.current = notificationId;
      console.log(`✅ Timer scheduled for ${seconds}s - ID: ${notificationId}`);
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  // Cancel scheduled notification
  const cancelNotification = async () => {
    if (notificationIdRef.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
        console.log(`❌ Cancelled notification: ${notificationIdRef.current}`);
        notificationIdRef.current = null;
      } catch (error) {
        console.error('Error cancelling notification:', error);
      }
    }
  };

  // Timer callbacks
  const handleTimerStart = (totalSeconds) => {
    console.log(`🚀 Timer started: ${totalSeconds}s`);
    scheduleNotification(totalSeconds);
  };

  const handleTimerPause = (remainingSeconds) => {
    console.log(`⏸ Timer paused: ${remainingSeconds}s remaining`);
    cancelNotification(); // Cancel the original notification
  };

  const handleTimerResume = (remainingSeconds) => {
    console.log(`▶️ Timer resumed: ${remainingSeconds}s remaining`);
    scheduleNotification(remainingSeconds); // Re-schedule with remaining time
  };

  const handleTimerEnd = () => {
    console.log('⏹ Timer ended');
    cancelNotification(); // Cancel notification if timer stopped early
  };

  const handleTimerComplete = () => {
    console.log('✅ Timer completed naturally');
    notificationIdRef.current = null; // Clear ref since notification already fired
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: getSpacing.lg,
    },
    title: {
      ...getTypography.h1,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
    },
    subtitle: {
      ...getTypography.body,
      color: theme.text.secondary,
      marginBottom: getSpacing.xl,
    },
    timerContainer: {
      marginBottom: getSpacing.xl,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>💬 Messages</Text>
        <Text style={styles.subtitle}>
          Unified messaging - coming soon!
        </Text>

        {/* Timer Banner */}
        {showTimer && (
          <View style={styles.timerContainer}>
            <TimerBanner
              onClose={() => setShowTimer(false)}
              onTimerStart={handleTimerStart}
              onTimerPause={handleTimerPause}
              onTimerResume={handleTimerResume}
              onTimerEnd={handleTimerEnd}
              onTimerComplete={handleTimerComplete}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MessagesScreen;