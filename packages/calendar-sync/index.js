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
    deleteGoogleCalendarEvent,
    applyScheduleTemplate
} from './src/googleCalendarService';