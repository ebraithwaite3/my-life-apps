import { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, getCountFromServer, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { useAuth } from '@my-apps/contexts';

const CACHE_KEY = '@meals_cache';
const LAST_UPDATED_KEY = '@meals_lastUpdated';
const LAST_FETCHED_KEY = '@meals_lastFetched';
const COOLDOWN_HOURS = 6;

const formatHoursAgo = (hours) => {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;
};

export const useMeals = () => {
  const { db } = useAuth();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (db) loadCacheAndSync();
  }, [db]);

  const fullFetch = async () => {
    const collRef = collection(db, 'meals');
    const snapshot = await getDocs(collRef);
    const fetched = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const now = DateTime.now().toISO();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fetched));
    await AsyncStorage.setItem(LAST_UPDATED_KEY, now);
    await AsyncStorage.setItem(LAST_FETCHED_KEY, now);

    setMeals(fetched);
    setLastUpdated(now);
    console.log(`[useMeals] Cache saved — ${fetched.length} meals, lastFetched: ${now}`);
    return fetched.length;
  };

  const backgroundSync = async (cachedMeals) => {
    const collRef = collection(db, 'meals');

    // Count check — catches deletions
    const countSnapshot = await getCountFromServer(collRef);
    const firestoreCount = countSnapshot.data().count;
    const cachedCount = cachedMeals.length;

    if (cachedCount !== firestoreCount) {
      console.log(
        `[useMeals] Cache count (${cachedCount}) != Firestore count (${firestoreCount}) — doing full re-fetch`
      );
      await fullFetch();
      return;
    }

    // Delta query
    const lastUpdatedStr = await AsyncStorage.getItem(LAST_UPDATED_KEY);
    const lastTimestamp = lastUpdatedStr
      ? Timestamp.fromDate(DateTime.fromISO(lastUpdatedStr).toJSDate())
      : Timestamp.fromDate(new Date(0));

    const q = query(collRef, where('updatedAt', '>', lastTimestamp));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('[useMeals] Firestore returned 0 updated docs — cache is current');
      await AsyncStorage.setItem(LAST_FETCHED_KEY, DateTime.now().toISO());
      return;
    }

    console.log(`[useMeals] Firestore returned ${snapshot.docs.length} updated docs — merging into cache`);
    const updatedMap = new Map(cachedMeals.map((m) => [m.id, m]));
    snapshot.docs.forEach((doc) => {
      updatedMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    const merged = Array.from(updatedMap.values());
    const now = DateTime.now().toISO();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(merged));
    await AsyncStorage.setItem(LAST_UPDATED_KEY, now);
    await AsyncStorage.setItem(LAST_FETCHED_KEY, now);

    setMeals(merged);
    setLastUpdated(now);
    console.log(`[useMeals] Cache saved — ${merged.length} meals, lastFetched: ${now}`);
  };

  const loadCacheAndSync = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);

      if (!cached) {
        console.log('[useMeals] No cache found — doing full Firestore fetch');
        try {
          await fullFetch();
        } catch (err) {
          console.error('[useMeals] Full fetch failed:', err);
          setMeals([]);
        }
        setLoading(false);
        return;
      }

      // Return cached data immediately — UI is instant
      const cachedMeals = JSON.parse(cached);
      console.log(`[useMeals] Cache loaded — ${cachedMeals.length} meals from AsyncStorage`);
      setMeals(cachedMeals);
      setLoading(false);

      // Check 6-hour cooldown
      const lastFetchedStr = await AsyncStorage.getItem(LAST_FETCHED_KEY);
      if (lastFetchedStr) {
        const hoursAgo = Math.abs(DateTime.fromISO(lastFetchedStr).diffNow('hours').hours);
        const timeStr = formatHoursAgo(hoursAgo);

        if (hoursAgo < COOLDOWN_HOURS) {
          console.log(
            `[useMeals] Last fetched: ${timeStr} ago — SKIPPING Firestore check (under 6hr cooldown)`
          );
          return;
        }

        console.log(`[useMeals] Last fetched: ${timeStr} ago — checking Firestore for updates`);
      } else {
        console.log('[useMeals] No lastFetched timestamp — checking Firestore for updates');
      }

      // Background sync — doesn't block the UI
      setRefreshing(true);
      try {
        await backgroundSync(cachedMeals);
      } catch (err) {
        console.error('[useMeals] Background sync failed — using cached data:', err);
      } finally {
        setRefreshing(false);
      }
    } catch (err) {
      console.error('[useMeals] Cache read failed — falling back to full Firestore fetch:', err);
      try {
        await fullFetch();
      } catch (fetchErr) {
        console.error('[useMeals] Full fetch also failed:', fetchErr);
        setMeals([]);
      }
      setLoading(false);
    }
  };

  const refreshMeals = async () => {
    if (!db || refreshing) return 0;
    console.log('[useMeals] Full refresh triggered manually by admin');
    setRefreshing(true);
    try {
      await AsyncStorage.multiRemove([CACHE_KEY, LAST_UPDATED_KEY, LAST_FETCHED_KEY]);
      return await fullFetch();
    } catch (err) {
      console.error('[useMeals] Manual refresh failed:', err);
      return 0;
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const saveMeal = async (meal) => {
    const now = DateTime.now().toISO();
    const mealData = { ...meal, updatedAt: now };
    await setDoc(doc(db, 'meals', meal.id), mealData, { merge: true });

    const updatedMeals = meals.some((m) => m.id === meal.id)
      ? meals.map((m) => (m.id === meal.id ? mealData : m))
      : [...meals, mealData];

    setMeals(updatedMeals);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updatedMeals));
    await AsyncStorage.setItem(LAST_UPDATED_KEY, now);
    console.log(`[useMeals] Saved meal "${meal.name}" (${meal.id}) — cache updated`);
  };

  const deleteMeal = async (id) => {
    await deleteDoc(doc(db, 'meals', id));
    const updatedMeals = meals.filter((m) => m.id !== id);
    setMeals(updatedMeals);
    const now = DateTime.now().toISO();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updatedMeals));
    await AsyncStorage.setItem(LAST_UPDATED_KEY, now);
    console.log(`[useMeals] Deleted meal ${id} — cache updated`);
  };

  const mealMap = useMemo(() => {
    return new Map(meals.map((m) => [m.nameLower || m.name?.toLowerCase(), m]));
  }, [meals]);

  return {
    meals,
    mealMap,
    loading,
    refreshing,
    refreshMeals,
    saveMeal,
    deleteMeal,
    lastUpdated,
  };
};
