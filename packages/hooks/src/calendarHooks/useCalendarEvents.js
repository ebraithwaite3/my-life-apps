import { useMemo } from 'react';
import { DateTime } from 'luxon';

/**
 * useCalendarEvents - Event filtering and aggregation
 * 
 * Returns filtered events for day/month views
 * Used by ALL apps
 */
export const useCalendarEvents = ({
  selectedDate,
  selectedMonth,
  selectedYear,
  getEventsForDay,
  getActivitiesForDay,
  filterActivitiesFor,
  showOnlyFilteredActivities,
  showDeletedEvents,
}) => {
  // Get all events for today (sorted by time)
  const todaysEvents = useMemo(() => {
    const events = getEventsForDay(selectedDate) || [];
    const internalActivities = (getActivitiesForDay(selectedDate) || []).filter(
      (activity) => activity.calendarId === "internal"
    );

    const combined = [...events, ...internalActivities];
    combined.sort((a, b) => {
      const timeA = a.startTime || "00:00";
      const timeB = b.startTime || "00:00";
      return timeA.localeCompare(timeB);
    });

    return combined;
  }, [selectedDate, getEventsForDay, getActivitiesForDay]);

  // Count deleted events
  const deletedEventsCount = useMemo(() => {
    return todaysEvents.filter((event) => event.deleted).length;
  }, [todaysEvents]);

  // Filter today's events based on deleted flag and activity type
  const filteredTodaysEvents = useMemo(() => {
    let events = todaysEvents;

    // Filter out deleted events if not showing them
    if (!showDeletedEvents) {
      events = events.filter((event) => !event.deleted);
    }

    // Filter by activity type if enabled
    if (filterActivitiesFor && showOnlyFilteredActivities) {
      events = events.filter((event) => {
        return event.activities?.some(
          (activity) => activity.activityType === filterActivitiesFor
        );
      });
    }

    return events;
  }, [todaysEvents, filterActivitiesFor, showOnlyFilteredActivities, showDeletedEvents]);

  // Get all events for month view
  const allEventsForMonth = useMemo(() => {
    if (!selectedMonth || !selectedYear) return [];

    const monthStart = DateTime.fromObject({
      year: selectedYear,
      month: DateTime.fromFormat(selectedMonth, "LLLL").month,
    }).startOf("month");

    const monthEnd = monthStart.endOf("month");

    let events = [];
    let currentDay = monthStart;

    while (currentDay <= monthEnd) {
      const dayEvents = getEventsForDay(currentDay.toISODate()) || [];
      const dayActivities = (
        getActivitiesForDay(currentDay.toISODate()) || []
      ).filter((activity) => activity.calendarId === "internal");
      events.push(...dayEvents, ...dayActivities);
      currentDay = currentDay.plus({ days: 1 });
    }

    // Filter out deleted events if not showing them
    if (!showDeletedEvents) {
      events = events.filter((event) => !event.deleted);
    }

    // Filter by activity type if enabled
    if (filterActivitiesFor && showOnlyFilteredActivities) {
      events = events.filter((event) => {
        return event.activities?.some(
          (activity) => activity.activityType === filterActivitiesFor
        );
      });
    }

    return events;
  }, [
    selectedMonth,
    selectedYear,
    getEventsForDay,
    getActivitiesForDay,
    filterActivitiesFor,
    showOnlyFilteredActivities,
    showDeletedEvents,
  ]);

  return {
    todaysEvents,
    filteredTodaysEvents,
    deletedEventsCount,
    allEventsForMonth,
  };
};