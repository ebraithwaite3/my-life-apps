import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@my-apps/contexts';
import { triggerBatchSync, formatLastSyncTime } from '@my-apps/calendar-sync';
import { useData } from '@my-apps/contexts';
import { app } from '@my-apps/config';

const TodayScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user } = useData();
  const [syncing, setSyncing] = useState(false);
  
  // Get all calendars from the user doc
  const allCalendars = user?.calendars || [];
  console.log('All Calendars from user doc:', allCalendars);
  
  // Filter out internal allCalendars - only sync external ones
  const externalCalendars = allCalendars?.filter(cal => cal.type !== 'internal' && cal.type !== 'public'
  ) || [];
  console.log('External allCalendars to sync:', externalCalendars);

  // OLD SINGLE CALENDAR SYNC (commented out)
  // const calendar = allCalendars?.filter(cal => cal.id === 'e93f152b-27cd-465a-bf19-c3a9c5ceb080')[0];
  // const handleSync = async () => {
  //   const result = await triggerManualSync(
  //     app,
  //     calendar.calendarId,
  //     calendar.calendarAddress,
  //     calendar.type,
  //     1,
  //     3
  //   );
  //   
  //   if (result.success) {
  //     Alert.alert('Success', 'Calendar synced!');
  //   }
  // };

  // NEW BATCH SYNC FOR ALL EXTERNAL CALENDARS
  const handleSyncAll = async () => {
    if (externalCalendars.length === 0) {
      Alert.alert('No Calendars', 'No external calendars to sync');
      return;
    }

    setSyncing(true);
    
    // Prep payload with truncation for logging
    const syncPayload = externalCalendars.map(cal => ({
      calendarId: cal.calendarId,
      calendarAddress: cal.calendarAddress, // Full URL, but log truncated
      name: cal.name,
      type: cal.calendarType
    }));
    
    console.log('📦 Batch payload to emulator:', {
      calendars: syncPayload.map(c => ({ 
        id: c.calendarId, 
        address: c.calendarAddress?.substring(0, 50) + (c.calendarAddress?.length > 50 ? '...' : ''), 
        type: c.type 
      })),
      monthsBack: 1,
      monthsForward: 3
    });
    
    try {
      const result = await triggerBatchSync(
        app,
        syncPayload,
        1,  // monthsBack
        3   // monthsForward
      );
      
      console.log('📥 Batch sync raw result:', result);
      
      if (result.success) {
        // Compute counts from results array (assuming server returns { results: [{success, ...}, ...] })
        const syncResults = result.results.results || [];
        const successCount = syncResults.filter(r => r.success).length;
        const errorCount = syncResults.filter(r => !r.success).length;
        
        console.log(`✅ ${successCount} succeeded, ❌ ${errorCount} failed`);
        
        Alert.alert(
          'Sync Complete!', 
          `✅ ${successCount} succeeded\n❌ ${errorCount} failed`
        );
        
        // Optional: Refresh user data or show per-calendar details
        // e.g., if you have a refresh function: refreshUserData();
      } else {
        Alert.alert('Sync Failed', result.error || 'Unknown server error');
      }
    } catch (error) {
      console.error('Batch sync error:', error);
      Alert.alert('Sync Error', error.message || 'Request failed');
    } finally {
      setSyncing(false);
    }
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
    },
    calendarItem: {
      backgroundColor: theme.surface,
      padding: getSpacing.md,
      borderRadius: 8,
      marginBottom: getSpacing.sm,
    },
    calendarName: {
      ...getTypography.h3,
      color: theme.text.primary,
      marginBottom: getSpacing.xs,
    },
    calendarSync: {
      ...getTypography.caption,
      color: theme.text.secondary,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>📅 Calendar</Text>
        <Text style={styles.subtitle}>
          {externalCalendars.length} external calendar{externalCalendars.length !== 1 ? 's' : ''}
        </Text>
        
        {externalCalendars.map(cal => (
          <View key={cal.calendarId} style={styles.calendarItem}>
            <Text style={styles.calendarName}>{cal.name}</Text>
            <Text style={styles.calendarSync}>
              Last Sync: {formatLastSyncTime(cal)}
            </Text>
          </View>
        ))}
        
        <View style={{ marginTop: getSpacing.lg }}>
          {syncing ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : (
            <Button
              onPress={handleSyncAll}
              title={`Sync All (${externalCalendars.length})`}
              color={theme.primary}
              disabled={externalCalendars.length === 0}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TodayScreen;