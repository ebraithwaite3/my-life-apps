import { useState, useEffect, useMemo, useCallback } from "react";
import { DateTime } from "luxon";

export const useActivityDocs = (db, userId, groupIds = [], currentMonth, currentYear) => {
  const [allActivities, setAllActivities] = useState({});
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState({});

  const monthKeys = useMemo(() => {
    if (!currentMonth || !currentYear) return [];
    try {
      const current = DateTime.fromObject({
        year: currentYear,
        month: DateTime.fromFormat(currentMonth, "LLLL").month,
      });
      return [
        current.minus({ months: 1 }).toFormat("yyyy-LL"),
        current.toFormat("yyyy-LL"),
        current.plus({ months: 1 }).toFormat("yyyy-LL"),
      ];
    } catch (e) {
      setError(e);
      return [];
    }
  }, [currentMonth, currentYear]);

  const entityIds = useMemo(() => {
    const ids = [];
    if (userId) ids.push(userId);
    if (Array.isArray(groupIds)) ids.push(...groupIds.filter(Boolean));
    return ids;
  }, [userId, groupIds]);

  useEffect(() => {
    if (!db || entityIds.length === 0 || monthKeys.length === 0) {
      setAllActivities({});
      setActivitiesLoading(false);
      return;
    }

    const { doc, onSnapshot } = require("firebase/firestore");
    const newSubs = { ...activeSubscriptions };

    entityIds.forEach((entityId) => {
      monthKeys.forEach((monthKey) => {
        const subKey = `${entityId}-${monthKey}`;
        if (activeSubscriptions[subKey]) return;

        const unsub = onSnapshot(
          doc(db, "activities", entityId, "months", monthKey),
          (docSnap) => {
            const items = docSnap.exists() ? docSnap.data().items || {} : {};
            setAllActivities((prev) => ({
              ...prev,
              [entityId]: {
                ...prev[entityId],
                [monthKey]: {
                  items,
                  loaded: true,
                },
              },
            }));
          },
          (err) => {
            console.error(`❌ Firestore error:`, err);
            setError(err);
          }
        );

        newSubs[subKey] = unsub;
      });
    });

    setActiveSubscriptions(newSubs);
    setActivitiesLoading(false);

    return () => Object.values(activeSubscriptions).forEach((fn) => fn());
  }, [db, entityIds.join(","), monthKeys.join(",")]);

  // Helpers
  const getActivitiesForMonth = useCallback(
    (monthKey) => {
      const combined = {};
      entityIds.forEach((entityId) => {
        const map = allActivities[entityId]?.[monthKey]?.items || {};
        Object.assign(combined, map);
      });
      // Map activityId → eventId
      return Object.entries(combined).map(([activityId, activityData]) => ({
        eventId: activityId, // rename activityId to eventId
        ...activityData,
      }));
    },
    [allActivities, entityIds]
  );

  const getActivitiesForDay = useCallback(
    (dateString) => {
      const date = DateTime.fromISO(dateString);
      const mk = date.toFormat("yyyy-LL");
      const start = date.startOf("day");
      const end = date.endOf("day");

      return getActivitiesForMonth(mk).filter((item) => {
        if (!item.startTime) return false;
        const s = DateTime.fromISO(item.startTime);
        return s >= start && s <= end;
      });
    },
    [getActivitiesForMonth]
  );

  const getCurrentMonthActivities = useCallback(() => {
    return getActivitiesForMonth(monthKeys[1]);
  }, [getActivitiesForMonth, monthKeys]);

  const getActivitiesForEntity = useCallback(
    (entityId) => {
      const shards = allActivities[entityId] || {};
      const combined = {};
      Object.values(shards).forEach((shard) => {
        if (shard.items) Object.assign(combined, shard.items);
      });
      return Object.entries(combined).map(([activityId, activityData]) => ({
        eventId: activityId, // rename activityId to eventId
        ...activityData,
      }));
    },
    [allActivities]
  );

  const getActivitiesForEvent = useCallback(
    (calendarId, eventId) => {
      return getCurrentMonthActivities().filter(
        (item) => item.calendarId === calendarId && item.eventId === eventId
      );
    },
    [getCurrentMonthActivities]
  );

  return {
    allActivities,
    activitiesLoading,
    error,
    getActivitiesForMonth,
    getActivitiesForDay,
    getCurrentMonthActivities,
    getActivitiesForEntity,
    getActivitiesForEvent,
    loadedEntities: Object.keys(allActivities),
    loadedMonths: monthKeys,
  };
};
