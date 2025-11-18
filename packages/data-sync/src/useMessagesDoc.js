import { useState, useEffect } from 'react';

/**
 * Subscribe to a user's messages document
 * @param {object} db - Firestore database instance
 * @param {string} userId - User ID to get messages for
 * @returns {object} { messages, loading, error }
 */
export const useMessagesDoc = (db, userId) => {
  const [messages, setMessages] = useState({ messages: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db || !userId) {
      setMessages({ messages: [] });
      setLoading(false);
      return;
    }

    console.log('💬 Setting up messages subscription:', userId);
    setLoading(true);
    setError(null);

    // Import Firestore methods
    const { doc, onSnapshot } = require('firebase/firestore');

    // Subscribe to messages document
    const unsubscribe = onSnapshot(
      doc(db, 'messages', userId),
      (docSnap) => {
        if (docSnap.exists()) {
          console.log('💬 Messages data received:', userId, "Full Doc", docSnap.data());
          const data = docSnap.data();
          setMessages(data);
        } else {
          console.log('💬 No messages document found:', userId);
          setMessages({ messages: [] });
        }
        setLoading(false);
      },
      (err) => {
        console.error('❌ Messages subscription error:', err);
        setError(err);
        setMessages({ messages: [] });
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 Cleaning up messages subscription:', userId);
      unsubscribe();
    };
  }, [db, userId]);

  return { messages, loading, error };
};