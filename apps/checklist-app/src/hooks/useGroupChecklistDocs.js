import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@my-apps/contexts';

export const useGroupChecklistDocs = (groupIds = []) => {
  const { db } = useAuth();
  const [groupChecklists, setGroupChecklists] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db || !groupIds || groupIds.length === 0) {
      setGroupChecklists({});
      setLoading(false);
      return;
    }

    console.log('📋 Subscribing to group pinned checklists for groups:', groupIds);

    const unsubscribers = [];

    groupIds.forEach(groupId => {
      const checklistRef = doc(db, 'pinnedChecklists', groupId);
      
      const unsubscribe = onSnapshot(
        checklistRef,
        (docSnap) => {
          setGroupChecklists(prev => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              console.log(`📋 Group ${groupId} pinned checklists updated:`, {
                pinned: data.pinned?.length || 0
              });
              return {
                ...prev,
                [groupId]: data
              };
            } else {
              console.log(`📋 No pinned checklists for group ${groupId}`);
              return {
                ...prev,
                [groupId]: {
                  groupId,
                  pinned: []
                }
              };
            }
          });
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error(`❌ Error loading pinned checklists for group ${groupId}:`, err);
          setError(err);
          setLoading(false);
        }
      );

      unsubscribers.push(unsubscribe);
    });

    return () => {
      console.log('📋 Unsubscribing from all group pinned checklists');
      unsubscribers.forEach(unsub => unsub());
    };
  }, [db, groupIds?.join(',')]);

  return { groupChecklists, loading, error };
};