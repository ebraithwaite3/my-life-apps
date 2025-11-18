import { useState, useEffect, useMemo, useCallback } from 'react';
import { DateTime } from 'luxon';

/**
 * Manage calendar shards for MULTIPLE calendars
 * - Loads 3 months (prev, current, next) for each calendar
 * - Automatically loads new months as user navigates
 * - Maintains persistent cache until app closes
 * - Dynamically handles calendars being added/removed
 * 
 * @param {object} db - Firestore database instance
 * @param {array} calendarIds - Array of calendar IDs ["cal1", "cal2"]
 * @param {string} currentMonth - Current month name (e.g., "November")
 * @param {number} currentYear - Current year (e.g., 2025)
 * @returns {object} { allCalendars, calendarsLoading, error, getEventsForMonth, getEventsForDay }
 */
export const useCalendarDocs = (db, calendarIds = [], currentMonth, currentYear) => {
  const [allCalendars, setAllCalendars] = useState({});
  const [calendarsLoading, setCalendarsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState({});

  // Calculate the 3 months we need
  const monthKeys = useMemo(() => {
    if (!currentMonth || !currentYear) return [];

    try {
      const current = DateTime.fromObject({ 
        year: currentYear, 
        month: DateTime.fromFormat(currentMonth, 'LLLL').month 
      });

      const prev = current.minus({ months: 1 });
      const next = current.plus({ months: 1 });

      return [
        prev.toFormat('yyyy-LL'),
        current.toFormat('yyyy-LL'),
        next.toFormat('yyyy-LL'),
      ];
    } catch (error) {
      console.error('❌ Error calculating month keys:', error);
      setError(error);
      return [];
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    if (!db || calendarIds.length === 0 || monthKeys.length === 0) {
      setAllCalendars({});
      setCalendarsLoading(false);
      return;
    }

    console.log(`📅 Loading shards for ${calendarIds.length} calendars:`, calendarIds);
    console.log(`📅 Months:`, monthKeys);
    setCalendarsLoading(true);
    setError(null);

    const { doc, onSnapshot } = require('firebase/firestore');
    const newSubscriptions = { ...activeSubscriptions };

    calendarIds.forEach((calendarId) => {
      if (!calendarId) return;

      monthKeys.forEach((monthKey) => {
        const subKey = `${calendarId}-${monthKey}`;

        if (allCalendars[calendarId]?.[monthKey]?.loaded || activeSubscriptions[subKey]) {
          console.log(`✅ Shard ${calendarId}/${monthKey} already loaded/loading`);
          return;
        }

        console.log(`🔄 Loading shard: ${calendarId}/${monthKey}`);

        const unsubscribe = onSnapshot(
          doc(db, 'calendars', calendarId, 'months', monthKey),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const eventCount = Object.keys(data.events || {}).length;
              console.log(`✅ Shard loaded: ${calendarId}/${monthKey} (${eventCount} events)`);
              
              setAllCalendars((prev) => ({
                ...prev,
                [calendarId]: {
                  ...prev[calendarId],
                  [monthKey]: {
                    events: data.events || {},
                    loaded: true,
                  },
                },
              }));
            } else {
              console.log(`📅 No shard for ${calendarId}/${monthKey} (returning empty)`);
              setAllCalendars((prev) => ({
                ...prev,
                [calendarId]: {
                  ...prev[calendarId],
                  [monthKey]: {
                    events: {},
                    loaded: true,
                  },
                },
              }));
            }
          },
          (err) => {
            console.error(`❌ Shard ${calendarId}/${monthKey} error:`, err);
            setError(err);
            
            setAllCalendars((prev) => ({
              ...prev,
              [calendarId]: {
                ...prev[calendarId],
                [monthKey]: {
                  events: {},
                  loaded: true,
                  error: err,
                },
              },
            }));
          }
        );

        newSubscriptions[subKey] = unsubscribe;
      });
    });

    setActiveSubscriptions(newSubscriptions);
    setCalendarsLoading(false);

    return () => {
      console.log('🧹 Cleaning up shard subscriptions');
      Object.entries(activeSubscriptions).forEach(([key, unsub]) => {
        const [calId] = key.split('-');
        if (!calendarIds.includes(calId)) {
          console.log(`🧹 Removing subscription for removed calendar: ${key}`);
          unsub();
        }
      });
    };
  }, [db, calendarIds.join(','), monthKeys.join(',')]);

  // Helper: Get ALL events from ALL calendars for a specific month (as array)
  const getEventsForMonth = useCallback((monthKey) => {
    const combined = {};
    
    calendarIds.forEach((calendarId) => {
      const monthEvents = allCalendars[calendarId]?.[monthKey]?.events || {};
      Object.assign(combined, monthEvents);
    });
  
    // Map object to array, preserving the key as eventId
    return Object.entries(combined).map(([eventId, eventData]) => ({
      eventId,
      ...eventData,
    }));
  }, [allCalendars, calendarIds]);
  
  const getEventsForDay = useCallback((dateString) => {
    try {
      const date = DateTime.fromISO(dateString);
      const monthKey = date.toFormat('yyyy-LL');
      const dayStart = date.startOf('day');
      const dayEnd = date.endOf('day');
  
      return getEventsForMonth(monthKey).filter((event) => {
        if (!event.startTime) return false;
        const eventStart = DateTime.fromISO(event.startTime);
        return eventStart >= dayStart && eventStart <= dayEnd;
      });
    } catch {
      return [];
    }
  }, [getEventsForMonth]);
  
  const getEventsForCalendar = useCallback((calendarId) => {
    const calendarShards = allCalendars[calendarId] || {};
    const allEvents = {};
  
    Object.values(calendarShards).forEach((shard) => {
      if (shard.events) Object.assign(allEvents, shard.events);
    });
  
    return Object.entries(allEvents).map(([eventId, eventData]) => ({
      eventId,
      ...eventData,
    }));
  }, [allCalendars]);
  

// Helper: Get events for current month (as array)
const getCurrentMonthEvents = useCallback(() => {
  const currentMonthKey = monthKeys[1];
  return getEventsForMonth(currentMonthKey);
}, [monthKeys, getEventsForMonth]);
  

  return { 
    allCalendars,
    calendarsLoading, 
    error,
    getEventsForMonth,      // Get all events for a month: getEventsForMonth("2025-11")
    getEventsForDay,        // Get all events for a day: getEventsForDay("2025-11-15")
    getCurrentMonthEvents,  // Get current month's events
    getEventsForCalendar,   // Get all events for one calendar (kept for future filtering)
    loadedCalendars: Object.keys(allCalendars),
    loadedMonths: monthKeys,
  };
};