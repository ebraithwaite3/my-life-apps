import { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, getCountFromServer, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { useAuth } from '@my-apps/contexts';

const CACHE_KEY = '@ingredients_cache';
const LAST_UPDATED_KEY = '@ingredients_lastUpdated';
const LAST_FETCHED_KEY = '@ingredients_lastFetched';
const COOLDOWN_HOURS = 6;

const formatHoursAgo = (hours) => {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;
};

export const useIngredients = () => {
  const { db } = useAuth();
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (db) loadCacheAndSync();
  }, [db]);

  const fullFetch = async () => {
    const collRef = collection(db, 'ingredients');
    const snapshot = await getDocs(collRef);
    const fetched = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const now = DateTime.now().toISO();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fetched));
    await AsyncStorage.setItem(LAST_UPDATED_KEY, now);
    await AsyncStorage.setItem(LAST_FETCHED_KEY, now);

    setIngredients(fetched);
    setLastUpdated(now);
    console.log(`[useIngredients] Cache saved — ${fetched.length} ingredients, lastFetched: ${now}`);
    return fetched.length;
  };

  const backgroundSync = async (cachedIngredients) => {
    const collRef = collection(db, 'ingredients');

    // Count check — catches deletions
    const countSnapshot = await getCountFromServer(collRef);
    const firestoreCount = countSnapshot.data().count;
    const cachedCount = cachedIngredients.length;

    if (cachedCount !== firestoreCount) {
      console.log(
        `[useIngredients] Cache count (${cachedCount}) != Firestore count (${firestoreCount}) — doing full re-fetch`
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
      console.log('[useIngredients] Firestore returned 0 updated docs — cache is current');
      await AsyncStorage.setItem(LAST_FETCHED_KEY, DateTime.now().toISO());
      return;
    }

    console.log(`[useIngredients] Firestore returned ${snapshot.docs.length} updated docs — merging into cache`);
    const updatedMap = new Map(cachedIngredients.map((i) => [i.id, i]));
    snapshot.docs.forEach((doc) => {
      updatedMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    const merged = Array.from(updatedMap.values());
    const now = DateTime.now().toISO();
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(merged));
    await AsyncStorage.setItem(LAST_UPDATED_KEY, now);
    await AsyncStorage.setItem(LAST_FETCHED_KEY, now);

    setIngredients(merged);
    setLastUpdated(now);
    console.log(`[useIngredients] Cache saved — ${merged.length} ingredients, lastFetched: ${now}`);
  };

  const loadCacheAndSync = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);

      if (!cached) {
        console.log('[useIngredients] No cache found — doing full Firestore fetch');
        try {
          await fullFetch();
        } catch (err) {
          console.error('[useIngredients] Full fetch failed:', err);
          setIngredients([]);
        }
        setLoading(false);
        return;
      }

      // Return cached data immediately — UI is instant
      const cachedIngredients = JSON.parse(cached);
      console.log(`[useIngredients] Cache loaded — ${cachedIngredients.length} ingredients from AsyncStorage`);
      setIngredients(cachedIngredients);
      setLoading(false);

      // Check 6-hour cooldown
      const lastFetchedStr = await AsyncStorage.getItem(LAST_FETCHED_KEY);
      if (lastFetchedStr) {
        const hoursAgo = Math.abs(DateTime.fromISO(lastFetchedStr).diffNow('hours').hours);
        const timeStr = formatHoursAgo(hoursAgo);

        if (hoursAgo < COOLDOWN_HOURS) {
          console.log(
            `[useIngredients] Last fetched: ${timeStr} ago — SKIPPING Firestore check (under 6hr cooldown)`
          );
          return;
        }

        console.log(`[useIngredients] Last fetched: ${timeStr} ago — checking Firestore for updates`);
      } else {
        console.log('[useIngredients] No lastFetched timestamp — checking Firestore for updates');
      }

      // Background sync — doesn't block the UI
      setRefreshing(true);
      try {
        await backgroundSync(cachedIngredients);
      } catch (err) {
        console.error('[useIngredients] Background sync failed — using cached data:', err);
      } finally {
        setRefreshing(false);
      }
    } catch (err) {
      console.error('[useIngredients] Cache read failed — falling back to full Firestore fetch:', err);
      try {
        await fullFetch();
      } catch (fetchErr) {
        console.error('[useIngredients] Full fetch also failed:', fetchErr);
        setIngredients([]);
      }
      setLoading(false);
    }
  };

  const addIngredient = async (name, category = null) => {
    const now = DateTime.now().toISO();
    const ingredientData = {
      name: name.trim(),
      category: category || null,
      unavailableAt: [],
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, 'ingredients'), ingredientData);
    const newIngredient = { id: docRef.id, ...ingredientData };

    const updatedIngredients = [...ingredients, newIngredient];
    setIngredients(updatedIngredients);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updatedIngredients));
    await AsyncStorage.setItem(LAST_UPDATED_KEY, now);

    console.log(`[useIngredients] Added "${newIngredient.name}" (${newIngredient.id}) — category: ${category || 'none'}`);
    return newIngredient;
  };

  const updateIngredient = async (ingredientId, updates) => {
    const now = DateTime.now().toISO();
    const updatedFields = { ...updates, updatedAt: now };

    await updateDoc(doc(db, 'ingredients', ingredientId), updatedFields);

    const updatedIngredients = ingredients.map((i) =>
      i.id === ingredientId ? { ...i, ...updatedFields } : i
    );
    setIngredients(updatedIngredients);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updatedIngredients));
    await AsyncStorage.setItem(LAST_UPDATED_KEY, now);

    console.log(`[useIngredients] Updated "${ingredientId}" — fields: ${Object.keys(updates).join(', ')}`);
    return updatedIngredients.find((i) => i.id === ingredientId);
  };

  const refreshIngredients = async () => {
    if (!db || refreshing) return 0;
    console.log('[useIngredients] Full refresh triggered manually by admin');
    setRefreshing(true);
    try {
      await AsyncStorage.multiRemove([CACHE_KEY, LAST_UPDATED_KEY, LAST_FETCHED_KEY]);
      return await fullFetch();
    } catch (err) {
      console.error('[useIngredients] Manual refresh failed:', err);
      return 0;
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const ingredientsByCategory = useMemo(() => {
    return ingredients.reduce((acc, ingredient) => {
      const cat = ingredient.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(ingredient);
      return acc;
    }, {});
  }, [ingredients]);

  const ingredientMap = useMemo(() => {
    return new Map(ingredients.map((i) => [i.nameLower || i.name?.toLowerCase(), i]));
  }, [ingredients]);

  return {
    ingredients,
    ingredientsByCategory,
    ingredientMap,
    loading,
    refreshing,
    refreshIngredients,
    addIngredient,
    updateIngredient,
    lastUpdated,
  };
};
