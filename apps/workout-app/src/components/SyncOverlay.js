import React from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';

const SyncOverlay = () => {
  const { autoSyncInProgress, syncingCalendarIds, calendars } = useData();
  const { theme, getSpacing, getTypography } = useTheme();

  if (!autoSyncInProgress) return null;

  const syncingCalendars = calendars.filter(cal => 
    syncingCalendarIds.has(cal.calendarId)
  );

  const completedCount = calendars.filter(cal => 
    !syncingCalendarIds.has(cal.calendarId)
  ).length;

  const totalCount = syncingCalendars.length + completedCount;

  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    content: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: getSpacing.lg,
      margin: getSpacing.lg,
      minWidth: 250,
      maxWidth: 300,
      alignItems: 'center',
    },
    title: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.lg,
      textAlign: 'center',
    },
    progressContainer: {
      width: '100%',
      marginBottom: getSpacing.md,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      marginBottom: getSpacing.sm,
    },
    progressFill: {
      height: 4,
      backgroundColor: theme.primary,
      borderRadius: 2,
    },
    progressText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
    },
    calendarList: {
      maxHeight: 120,
      width: '100%',
      marginTop: getSpacing.sm,
    },
    calendarItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.xs,
    },
    calendarName: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.primary,
      marginLeft: getSpacing.sm,
      flex: 1,
    },
  });

  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Modal
      visible={autoSyncInProgress}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={theme.primary} />
          
          <Text style={styles.title}>Syncing Calendars</Text>
          
          <Text style={styles.subtitle}>
            Updating your calendar events with the latest data
          </Text>

          {totalCount > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${progressPercentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {completedCount} of {totalCount} calendars synced
              </Text>
            </View>
          )}

          {syncingCalendars.length > 0 && (
            <View style={styles.calendarList}>
              {syncingCalendars.map(calendar => (
                <View key={calendar.calendarId} style={styles.calendarItem}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={styles.calendarName} numberOfLines={1}>
                    {calendar.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default SyncOverlay;