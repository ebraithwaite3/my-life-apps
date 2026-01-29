import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useAuth } from "@my-apps/contexts";

const UserSettingsContext = createContext(null);

export const useUserSettings = () => {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) throw new Error("useUserSettings must be used within UserSettingsProvider");
  return ctx;
};

const defaultStudyPreferences = {
  quiz: {
    counts: { 1: 5, 2: 5, 3: 5 },
    mode: "endReviewOnly", // V1 default
  },
};

export const UserSettingsProvider = ({ children }) => {
  const { user, db } = useAuth();

  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db || !user?.uid) return;

    setLoading(true);
    setError(null);

    const ref = doc(db, "users", user.uid);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setUserDoc(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      (e) => {
        setError(e?.message || "Failed to load user settings");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [db, user?.uid]);

  const preferences = userDoc?.preferences || {};

  const studyPreferences = useMemo(() => {
    // merge defaults + saved
    const saved = preferences.studyPreferences || {};
    return {
      ...defaultStudyPreferences,
      ...saved,
      quiz: {
        ...defaultStudyPreferences.quiz,
        ...(saved.quiz || {}),
        counts: {
          ...defaultStudyPreferences.quiz.counts,
          ...(saved.quiz?.counts || {}),
        },
      },
    };
  }, [preferences.studyPreferences]);

  const updateStudyPreferences = async (nextStudyPrefs) => {
    if (!db || !user?.uid) throw new Error("Missing db/user");
    const ref = doc(db, "users", user.uid);

    // merge-safe nested write (does NOT overwrite preferences)
    await updateDoc(ref, {
      "preferences.studyPreferences": nextStudyPrefs,
    });
  };

  const value = useMemo(
    () => ({
      userDoc,
      preferences,
      studyPreferences,
      updateStudyPreferences,
      loading,
      error,
    }),
    [userDoc, preferences, studyPreferences, loading, error]
  );

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
};
