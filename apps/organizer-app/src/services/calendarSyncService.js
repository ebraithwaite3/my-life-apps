// services/calendarSyncService.js
import { DateTime } from 'luxon';
import { updateDocument } from './firestoreService';

/**
 * Sync a calendar with its remote source
 */
export const syncCalendar = async (calendarDoc, retryCount = 0) => {
  const maxRetries = 2;
  
  try {
    console.log(`🔄 Syncing calendar: ${calendarDoc.name}`);
    
    // Set sync status to "syncing"
    await updateSyncStatus(calendarDoc.calendarId, 'syncing');
    
    // Fetch iCal data
    const icalData = await fetchCalendarData(calendarDoc.source.calendarAddress);
    
    // Parse events within date range
    const events = parseICalData(icalData, calendarDoc.calendarId);
    
    // Update calendar with events and success status
    await updateDocument('calendars', calendarDoc.calendarId, {
      events,
      'sync.syncStatus': 'success',
      'sync.lastSyncedAt': DateTime.now().toISO(),
      updatedAt: DateTime.now().toISO()
    });

    console.log(`✅ Calendar synced: ${calendarDoc.name} (${Object.keys(events).length} events)`);
    return { success: true, eventCount: Object.keys(events).length };

  } catch (error) {
    console.error(`❌ Sync failed for ${calendarDoc.name}:`, error);
    
    const isRetryable = isRetryableError(error);
    
    // Retry if possible
    if (isRetryable && retryCount < maxRetries) {
      console.log(`🔄 Retrying sync (${retryCount + 1}/${maxRetries})...`);
      await delay(1000 * (retryCount + 1));
      return await syncCalendar(calendarDoc, retryCount + 1);
    }
    
    // Update with error status
    await updateSyncStatus(calendarDoc.calendarId, 'error', {
      errorMessage: error.message,
      errorType: isRetryable ? 'network' : 'parse',
      retryable: isRetryable,
    });

    return { 
      success: false, 
      error: error.message, 
      retryable: isRetryable 
    };
  }
};

/**
 * Fetch calendar data from remote source
 */
const fetchCalendarData = async (calendarAddress) => {
  // Convert webcal:// to https://
  let fetchUrl = calendarAddress;
  if (fetchUrl.startsWith('webcal://')) {
    fetchUrl = fetchUrl.replace('webcal://', 'https://');
  }

  const response = await fetch(fetchUrl, {
    timeout: 30000,
    headers: { 'User-Agent': 'Calendar App/1.0' }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.text();
};

/**
 * Parse iCal data into events
 */
const parseICalData = (icalData, calendarId) => {
  const events = {};
  const lines = icalData.split('\n');
  const dateRange = getDateRange();
  
  console.log('📅 Date range for sync:', dateRange);
  
  let currentEvent = null;
  let eventId = null;
  let eventCount = 0;
  let totalEventsFound = 0;
  let filteredOutCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
      eventId = null;
      totalEventsFound++;
    } else if (line === 'END:VEVENT' && currentEvent && eventId) {
      console.log('🚀 currentEvent before processEvent:', JSON.stringify(currentEvent));
      const event = processEvent(currentEvent, calendarId);
      
      console.log('🔍 Processing event:', {
        eventId,
        title: event?.title,
        startTime: event?.startTime,
        endTime: event?.endTime,
        isValid: !!event
      });
      
      if (event && isEventInRange(event, dateRange)) {
        events[eventId] = event;
        eventCount++;
        console.log('✅ Event added:', eventId, event.title);
      } else if (event) {
        filteredOutCount++;
        console.log('❌ Event filtered out (date range):', eventId, event.title, event.startTime);
      } else {
        console.log('❌ Event failed processing:', eventId);
      }
      
      currentEvent = null;
      eventId = null;
    } else if (currentEvent && line.includes(':')) {
      const [property, ...valueParts] = line.split(':');
      const value = valueParts.join(':');

      console.log('📋 Raw line:', line);
  console.log('🔍 Parsed property:', property, 'value:', value?.substring(0, 50) + '...');
      
      processEventProperty(currentEvent, property, value);
      
      if (property === 'UID') {
        eventId = `event-${value}`;
        console.log('🆔 Event ID created:', eventId);
      }
    }
  }

  console.log(`📊 Sync Summary:
    - Total events found: ${totalEventsFound}
    - Events processed: ${eventCount}
    - Events filtered out: ${filteredOutCount}
    - Final events object keys: ${Object.keys(events).length}`);
    
  return events;
};

/**
 * Process individual event property
 */
const processEventProperty = (event, property, value) => {
  console.log('🔧 Processing property:', property, 'with value:', value?.substring(0, 30));
  console.log('🔧 Event object before:', JSON.stringify(event));
  
  // Extract base property name (remove parameters like ;TZID=America/New_York)
  const baseProperty = property.split(';')[0];
  
  switch (baseProperty) {
    case 'SUMMARY':
      event.title = decodeICalText(value);
      console.log('📝 Set title to:', event.title);
      break;
    case 'DTSTART':
      event.startTime = value;
      event.isAllDay = property.includes('VALUE=DATE');
      console.log('🕐 Set startTime to:', event.startTime);
      break;
    case 'DTEND':
      event.endTime = value;
      console.log('🕕 Set endTime to:', event.endTime);
      break;
    case 'LOCATION':
      event.location = decodeICalText(value);
      console.log('📍 Set location to:', event.location);
      break;
    case 'DESCRIPTION':
      event.description = decodeICalText(value);
      console.log('📄 Set description to:', event.description?.substring(0, 30));
      break;
    default:
      console.log('❓ Unhandled property:', baseProperty);
      break;
  }
  
  console.log('🔧 Event object after:', JSON.stringify(event));
};

/**
 * Process and validate event
 */
const processEvent = (rawEvent, calendarId) => {
  if (!rawEvent.startTime || !rawEvent.endTime) {
    return null;
  }

  const startTime = parseICalDate(rawEvent.startTime);
  const endTime = parseICalDate(rawEvent.endTime);

  if (!startTime || !endTime) {
    return null;
  }

  return {
    title: rawEvent.title || 'Untitled Event',
    description: rawEvent.description || '',
    location: rawEvent.location || '',
    startTime,
    endTime,
    isAllDay: rawEvent.isAllDay || false,
    calendarId,
    source: 'ical_feed'
  };
};

/**
 * Parse iCal date string to ISO format
 */
const parseICalDate = (icalDate) => {
  console.log('🗓️ parseICalDate input:', icalDate);
  
  try {
    // UTC format: 20250710T080000Z
    if (icalDate.endsWith('Z')) {
      // Convert to ISO format
      const isoFormat = icalDate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z');
      const result = DateTime.fromISO(isoFormat, { zone: 'utc' }).toISO();
      console.log('🗓️ UTC format result:', result);
      return result;
    }
    
    // Local timezone format: 20250710T080000 (assumes America/New_York)
    if (icalDate.match(/^\d{8}T\d{6}$/)) {
      const year = icalDate.substring(0, 4);
      const month = icalDate.substring(4, 6);
      const day = icalDate.substring(6, 8);
      const hour = icalDate.substring(9, 11);
      const minute = icalDate.substring(11, 13);
      const second = icalDate.substring(13, 15);
      
      // Create ISO string and parse with America/New_York timezone
      const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      const result = DateTime.fromISO(isoString, { zone: 'America/New_York' }).toISO();
      console.log('🗓️ Timezone-aware format result:', result);
      return result;
    }
    
    // All-day format: 20250710
    if (icalDate.match(/^\d{8}$/)) {
      const result = DateTime.fromFormat(icalDate, 'yyyyMMdd').toISO();
      console.log('🗓️ All-day format result:', result);
      return result;
    }
    
    // Try direct ISO parsing
    const parsed = DateTime.fromISO(icalDate);
    if (parsed.isValid) {
      const result = parsed.toISO();
      console.log('🗓️ Direct ISO result:', result);
      return result;
    }
    
    console.log('🗓️ No format matched, returning null');
    return null;
  } catch (error) {
    console.warn('🗓️ Failed to parse iCal date:', icalDate, error);
    return null;
  }
};

/**
 * Check if event falls within sync date range
 */
const isEventInRange = (event, dateRange) => {
  const eventStart = DateTime.fromISO(event.startTime);
  const eventEnd = DateTime.fromISO(event.endTime);
  const rangeStart = DateTime.fromISO(dateRange.startDate);
  const rangeEnd = DateTime.fromISO(dateRange.endDate);
  
  return eventEnd >= rangeStart && eventStart <= rangeEnd;
};

/**
 * Get default sync date range (6 months back, 1 year forward)
 */
const getDateRange = () => ({
  startDate: DateTime.now().minus({ months: 6 }).startOf('day').toISO(),
  endDate: DateTime.now().plus({ years: 1 }).endOf('day').toISO(),
});

/**
 * Update calendar sync status
 */
const updateSyncStatus = async (calendarId, status, additionalData = {}) => {
  const syncData = {
    'sync.syncStatus': status,
    'sync.lastSyncedAt': DateTime.now().toISO(),
    updatedAt: DateTime.now().toISO(),
    ...Object.fromEntries(
      Object.entries(additionalData).map(([key, value]) => [`sync.${key}`, value])
    )
  };
  
  await updateDocument('calendars', calendarId, syncData);
};

/**
 * Decode iCal escaped text
 */
const decodeICalText = (text) => {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error) => {
  const retryablePatterns = [
    /fetch/i,
    /timeout/i,
    /network/i,
    /ENOTFOUND/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i
  ];
  
  return retryablePatterns.some(pattern => 
    pattern.test(error.message) || error.name === 'TypeError'
  );
};

/**
 * Simple delay utility
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));