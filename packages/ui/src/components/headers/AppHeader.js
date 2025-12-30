// packages/ui/src/components/headers/AppHeader.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { HeaderMenu } from '../menus';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * AppHeader - Shared application header with app name and menu
 * 
 * @param {string} appName - The name of the app to display
 * @param {Array} menuItems - Array of menu items: { icon, label, onPress, variant }
 * @param {Object|Array} userCalendars - User's calendars (object keyed by calendarId or array)
 */
const AppHeader = ({ 
  appName = "My App",
  menuItems = [],
  userCalendars
}) => {
  const { theme, isDarkMode, toggleTheme, getSpacing, getTypography } = useTheme();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Convert userCalendars to array (could be object or array)
  const calendars = Array.isArray(userCalendars) 
    ? userCalendars 
    : (userCalendars && typeof userCalendars === 'object')
      ? Object.values(userCalendars)
      : [];

  console.log("📅 User Calendars (converted to array):", calendars);

  // Filter to only Google and iCal calendars (check source.type)
  const syncableCalendars = calendars.filter(cal => {
    const type = cal.source?.type || cal.calendarType;
    const isSyncable = type === 'google' || type === 'ical';
    console.log(`  📋 ${cal.name}: type=${type}, syncable=${isSyncable}`);
    return isSyncable;
  });

  console.log("🔄 Syncable Calendars:", syncableCalendars.length, syncableCalendars);

  const handleSyncCalendars = async () => {
    if (isSyncing) {
      Alert.alert("Sync in Progress", "Calendars are already syncing.");
      return;
    }

    if (syncableCalendars.length === 0) {
      Alert.alert("No Calendars", "You don't have any Google or iCal calendars to sync.");
      return;
    }

    setIsSyncing(true);

    try {
      const functions = getFunctions();
      const syncCalendar = httpsCallable(functions, 'syncCalendar');

      // Prepare calendar data for batch sync
      const calendarsToSync = syncableCalendars.map(cal => ({
        calendarId: cal.calendarId,
        name: cal.name,
        source: cal.source
      }));

      console.log("🔄 Starting calendar sync for", calendarsToSync.length, "calendars:", calendarsToSync);

      // Fire off the sync (don't await the result)
      syncCalendar({
        calendars: calendarsToSync,
        monthsBack: 1,
        monthsForward: 3
      }).then((result) => {
        console.log("✅ Sync completed:", result.data);
        Alert.alert(
          "Sync Complete",
          `Successfully synced ${result.data.results?.successCount || 0} calendars.`
        );
      }).catch((error) => {
        console.error("❌ Sync error:", error);
        Alert.alert("Sync Error", error.message || "Failed to sync calendars");
      }).finally(() => {
        setIsSyncing(false);
      });

      // Show immediate feedback that sync started
      Alert.alert(
        "Sync Started",
        `Syncing ${syncableCalendars.length} calendar${syncableCalendars.length > 1 ? 's' : ''}. This may take a moment.`
      );

    } catch (error) {
      console.error("❌ Error starting sync:", error);
      Alert.alert("Error", "Failed to start calendar sync");
      setIsSyncing(false);
    }
  };

  // Build complete menu items including conditional sync option
  const allMenuItems = [
    // Add Sync Calendars if user has syncable calendars
    ...(syncableCalendars.length > 0 ? [{
      icon: '🔄',
      label: isSyncing ? 'Syncing...' : 'Sync Calendars',
      onPress: handleSyncCalendars,
    }] : []),
    // Add user-provided menu items
    ...menuItems
  ];

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      paddingTop: 50, // Account for status bar
      backgroundColor: theme.header,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      shadowColor: theme.shadow.color,
      shadowOffset: theme.shadow.offset,
      shadowOpacity: theme.shadow.opacity,
      shadowRadius: theme.shadow.radius,
      elevation: theme.shadow.elevation,
    },
    appName: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: '700',
      color: theme.text.primary,
      flex: 1,
    },
    hamburgerButton: {
      padding: getSpacing.sm,
      paddingHorizontal: getSpacing.lg,
      marginLeft: getSpacing.sm,
      borderRadius: 20,
      backgroundColor: theme.button.secondary,
    },
    hamburgerText: {
      fontSize: 18,
      color: theme.button.secondaryText,
      lineHeight: 20,
    },
  });

  return (
    <>
      <View style={styles.container}>
        {/* App Name */}
        <Text style={styles.appName}>{appName}</Text>

        {/* Hamburger Menu Button */}
        <TouchableOpacity 
          style={styles.hamburgerButton} 
          onPress={() => setIsMenuVisible(true)}
        >
          <Text style={styles.hamburgerText}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Header Menu */}
      <HeaderMenu
        isVisible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        menuItems={allMenuItems}
      />
    </>
  );
};

export default AppHeader;