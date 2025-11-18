import { DateTime } from 'luxon';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getApp } from 'firebase/app'; // For fallback
import { Platform } from 'react-native';
import { app } from '@my-apps/services';

// Get functions instance with proper emulator setup
const getFunctionsInstance = (passedApp) => {
  // Fallback to default app if passedApp is invalid
  const validApp = passedApp || getApp();
  
  const functionsInstance = getFunctions(validApp);
  
  if (__DEV__) {
    // Match your existing platform logic
    let emulatorHost;
    if (Platform.OS === 'android') {
      emulatorHost = '10.0.2.2'; 
    } else {
      emulatorHost = '10.0.0.178'; // ← your dev machine IP
    }
    
    console.log(`🔧 [Calendar Sync DEV] Connecting to Functions emulator at ${emulatorHost}:5001`);
    connectFunctionsEmulator(functionsInstance, emulatorHost, 5001);
  } else {
    console.log('🚀 [Calendar Sync PRODUCTION] Using live Firebase Functions');
  }
  
  return functionsInstance;
};

/**
 * Trigger a manual sync for a calendar
 * @param {Object} passedApp - Optional Firebase app (falls back to default)
 * @param {string} calendarId - The calendar ID
 * @param {string} calendarAddress - The iCal feed URL
 * @param {string} calendarType - Type of calendar (google, ical, etc.)
 * @returns {Promise<Object>} - Sync result
 */
export const triggerManualSync = async (
  passedApp = app, // Default to imported app
  calendarId, 
  calendarAddress, 
  calendarType = 'ical',
  monthsBack = 1,
  monthsForward = 3
) => {
  try {
    console.log('🔄 Triggering sync for:', calendarId);
    
    const functions = getFunctionsInstance(passedApp);
    const syncCalendar = httpsCallable(functions, 'syncCalendar');
    
    const result = await syncCalendar({
      calendarId,
      calendarAddress,
      calendarType,
      monthsBack,
      monthsForward
    });
    
    if (result.data.success) {
      console.log('✅ Sync successful:', result.data);
      return { success: true, ...result.data };
    } else {
      console.error('❌ Sync failed:', result.data.error);
      return { success: false, error: result.data.error };
    }
  } catch (error) {
    console.error('❌ Sync request error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

// Sync multiple calendars at once
export const triggerBatchSync = async (
  passedApp = app, // Default to imported app
  calendars, // Array of {calendarId, calendarAddress, name, type}
  monthsBack = 1,
  monthsForward = 3
) => {
  try {
    console.log('🔄 Triggering batch sync for', calendars.length, 'calendars');
    
    const functions = getFunctionsInstance(passedApp);
    const syncCalendar = httpsCallable(functions, 'syncCalendar');
    
    const result = await syncCalendar({
      calendars,
      monthsBack,
      monthsForward
    });
    
    if (result.data.success) {
      console.log('✅ Batch sync successful:', result.data.results);
      return { success: true, ...result.data };
    } else {
      console.error('❌ Batch sync failed:', result.data.error);
      return { success: false, error: result.data.error };
    }
  } catch (error) {
    console.error('❌ Batch sync request error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};


/**
 * Get sync status from calendar object
 * @param {Object} calendar - Calendar object from Firestore
 * @returns {string} - 'syncing' | 'success' | 'error' | 'never'
 */
export const getSyncStatus = (calendar) => {
  if (!calendar) return 'never';
  return calendar.sync?.syncStatus || calendar.syncStatus || 'never';
};

/**
 * Get last sync time from calendar object
 * @param {Object} calendar - Calendar object from Firestore
 * @returns {DateTime|null} - Luxon DateTime or null
 */
export const getLastSyncTime = (calendar) => {
  if (!calendar) return null;
  
  const lastSynced = calendar.sync?.lastSyncedAt || calendar.lastSynced;
  
  if (!lastSynced) return null;
  
  return DateTime.fromISO(lastSynced);
};

/**
 * Format last sync time for display
 * @param {Object} calendar - Calendar object from Firestore
 * @returns {string} - Formatted string like "2 hours ago" or "Never synced"
 */
export const formatLastSyncTime = (calendar) => {
  const lastSync = getLastSyncTime(calendar);
  
  if (!lastSync) return 'Never synced';
  
  const now = DateTime.now();
  const diff = now.diff(lastSync, ['days', 'hours', 'minutes']);
  
  if (diff.days >= 1) {
    return `${Math.floor(diff.days)} day${Math.floor(diff.days) !== 1 ? 's' : ''} ago`;
  } else if (diff.hours >= 1) {
    return `${Math.floor(diff.hours)} hour${Math.floor(diff.hours) !== 1 ? 's' : ''} ago`;
  } else if (diff.minutes >= 1) {
    return `${Math.floor(diff.minutes)} minute${Math.floor(diff.minutes) !== 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};