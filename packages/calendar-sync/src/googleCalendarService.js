import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { Platform } from 'react-native';

// Get functions instance with proper emulator setup
const getFunctionsInstance = (app) => {
  const functionsInstance = getFunctions(app);
  
  if (__DEV__) {
    let emulatorHost;
    if (Platform.OS === 'android') {
      emulatorHost = '10.0.2.2'; 
    } else {
      emulatorHost = '10.0.0.178'; 
    }
    
    connectFunctionsEmulator(functionsInstance, emulatorHost, 5001);
  }
  
  return functionsInstance;
};

/**
 * Write event to Google Calendar
 */
export const writeToGoogleCalendar = async (app, eventData) => {
  try {
    const functions = getFunctionsInstance(app);
    const writeToCalendar = httpsCallable(functions, 'writeToCalendar');
    
    const result = await writeToCalendar(eventData);
    
    if (result.data.success) {
      return { success: true, eventId: result.data.eventId };
    } else {
      return { success: false, error: result.data.error };
    }
  } catch (error) {
    console.error('❌ Write to calendar error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update event in Google Calendar
 */
export const updateGoogleCalendarEvent = async (app, eventId, updates) => {
  try {
    const functions = getFunctionsInstance(app);
    const updateCalendarEvent = httpsCallable(functions, 'updateCalendarEvent');
    
    const result = await updateCalendarEvent({
      eventId,
      ...updates
    });
    
    if (result.data.success) {
      return { success: true, eventId: result.data.eventId };
    } else {
      return { success: false, error: result.data.error };
    }
  } catch (error) {
    console.error('❌ Update calendar error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete event from Google Calendar
 */
export const deleteGoogleCalendarEvent = async (app, eventId) => {
  try {
    const functions = getFunctionsInstance(app);
    const deleteCalendarEvent = httpsCallable(functions, 'deleteCalendarEvent');
    
    const result = await deleteCalendarEvent({ eventId });
    
    if (result.data.success) {
      return { success: true };
    } else {
      return { success: false, error: result.data.error };
    }
  } catch (error) {
    console.error('❌ Delete calendar error:', error);
    return { success: false, error: error.message };
  }
};