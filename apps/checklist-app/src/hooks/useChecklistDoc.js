import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@my-apps/contexts';

export const useChecklistDoc = (userId) => {
  const { db } = useAuth();
  const [checklists, setChecklists] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db || !userId) {
      setChecklists(null);
      setLoading(false);
      return;
    }

    console.log('📋 Subscribing to pinned checklists for user:', userId);

    const checklistRef = doc(db, 'pinnedChecklists', userId);
    
    const unsubscribe = onSnapshot(
      checklistRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('📋 Pinned checklists updated:', {
            pinned: data.pinned?.length || 0
          });
          setChecklists(data);
        } else {
          console.log('📋 No pinned checklists document found, initializing empty state');
          setChecklists({
            pinned: []
          });
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('❌ Error loading pinned checklists:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      console.log('📋 Unsubscribing from pinned checklists');
      unsubscribe();
    };
  }, [db, userId]);

  return { checklists, loading, error };
};