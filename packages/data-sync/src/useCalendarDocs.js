import { useState, useEffect, useMemo, useCallback } from 'react';
import { DateTime } from 'luxon';

/**
 * Manage calendar metadata + shards for MULTIPLE calendars
 * - Loads calendar metadata (subscribingUsers, name, color, etc.)
 * - Loads 3 months (prev, current, next) of events for each calendar
 * - Automatically loads new months as user navigates
 * - Maintains persistent cache until app closes
 */
export const useCalendarDocs = (db, calendarIds = [], currentMonth, currentYear) => {
  const [calendarMetadata, setCalendarMetadata] = useState({});
  const [calendarShards, setCalendarShards] = useState({});
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

  // EFFECT 1: Load calendar metadata (subscribingUsers, name, color, etc.)
  useEffect(() => {
    if (!db || calendarIds.length === 0) {
      setCalendarMetadata({});
      return;
    }

    console.log(`📅 Loading metadata for ${calendarIds.length} calendars`);
    const { doc, onSnapshot } = require('firebase/firestore');
    const unsubscribes = [];

    calendarIds.forEach((calendarId) => {
      if (!calendarId) return;

      const unsubscribe = onSnapshot(
        doc(db, 'calendars', calendarId),
        (docSnap) => {
          if (docSnap.exists()) {
            console.log(`✅ Calendar metadata loaded: ${calendarId}`);
            setCalendarMetadata((prev) => ({
              ...prev,
              [calendarId]: {
                ...docSnap.data(),
                calendarId: docSnap.id,
              },
            }));
          }
        },
        (err) => {
          console.error(`❌ Calendar metadata error for ${calendarId}:`, err);
          setError(err);
        }
      );

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [db, calendarIds.join(',')]);

  // EFFECT 2: Load calendar shards (monthly events)
  useEffect(() => {
    if (!db || calendarIds.length === 0 || monthKeys.length === 0) {
      setCalendarShards({});
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

        if (calendarShards[calendarId]?.[monthKey]?.loaded || activeSubscriptions[subKey]) {
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
              
              setCalendarShards((prev) => ({
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
              setCalendarShards((prev) => ({
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
            
            setCalendarShards((prev) => ({
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

  // COMBINE metadata + shards
  const allCalendars = useMemo(() => {
    const combined = {};
    
    calendarIds.forEach(calendarId => {
      combined[calendarId] = {
        // Metadata (subscribingUsers, name, color, etc.)
        ...calendarMetadata[calendarId],
        // Shards (monthly events)
        shards: calendarShards[calendarId] || {},
      };
    });
    
    return combined;
  }, [calendarIds, calendarMetadata, calendarShards]);

  // Helper: Get ALL events from ALL calendars for a specific month (as array)
  const getEventsForMonth = useCallback((monthKey) => {
    const combined = {};
    
    calendarIds.forEach((calendarId) => {
      const monthEvents = calendarShards[calendarId]?.[monthKey]?.events || {};
      Object.assign(combined, monthEvents);
    });
  
    return Object.entries(combined).map(([eventId, eventData]) => ({
      eventId,
      ...eventData,
    }));
  }, [calendarShards, calendarIds]);
  
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
    const calendarShardsForCal = calendarShards[calendarId] || {};
    const allEvents = {};
  
    Object.values(calendarShardsForCal).forEach((shard) => {
      if (shard.events) Object.assign(allEvents, shard.events);
    });
  
    return Object.entries(allEvents).map(([eventId, eventData]) => ({
      eventId,
      ...eventData,
    }));
  }, [calendarShards]);

  const getCurrentMonthEvents = useCallback(() => {
    const currentMonthKey = monthKeys[1];
    return getEventsForMonth(currentMonthKey);
  }, [monthKeys, getEventsForMonth]);

  return { 
    allCalendars, // Now includes metadata + shards
    calendarsLoading, 
    error,
    getEventsForMonth,
    getEventsForDay,
    getCurrentMonthEvents,
    getEventsForCalendar,
    loadedCalendars: Object.keys(allCalendars),
    loadedMonths: monthKeys,
  };
};