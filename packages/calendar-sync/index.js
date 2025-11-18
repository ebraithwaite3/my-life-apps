export { 
    triggerManualSync,
    triggerBatchSync,  // ← Add this!
    getSyncStatus,
    getLastSyncTime,
    formatLastSyncTime
  } from './src/syncService';

  export {
    writeToGoogleCalendar,
    updateGoogleCalendarEvent,
    deleteGoogleCalendarEvent
} from './src/googleCalendarService';