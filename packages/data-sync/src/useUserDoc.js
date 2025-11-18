import { useState, useEffect } from 'react';

/**
 * Subscribe to a user document
 * @param {object} db - Firestore database instance
 * @param {string} userId - User ID to subscribe to
 * @returns {object} { user, loading, error }
 */
export const useUserDoc = (db, userId) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db || !userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    console.log('👤 Setting up user subscription:', userId);
    setLoading(true);
    setError(null);

    // Import Firestore methods
    const { doc, onSnapshot } = require('firebase/firestore');

    // Subscribe to user document
    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      (docSnap) => {
        if (docSnap.exists()) {
          console.log('👤 User data received:', userId);
          setUser({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.warn('❌ User document not found:', userId);
          setUser(null);
          setError(new Error('User not found'));
        }
        setLoading(false);
      },
      (err) => {
        console.error('❌ User subscription error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 Cleaning up user subscription:', userId);
      unsubscribe();
    };
  }, [db, userId]);

  return { user, loading, error };
};