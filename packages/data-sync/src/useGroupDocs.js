import { useState, useEffect } from 'react';

/**
 * Subscribe to multiple group documents
 * @param {object} db - Firestore database instance
 * @param {array} groupIds - Array of group IDs
 *   Example: ["groupId1", "groupId2"]
 * @returns {object} { groups, loading, error }
 */
export const useGroupDocs = (db, groupIds = []) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Filter out invalid IDs
    const validGroupIds = groupIds.filter((id) => id);

    if (!db || validGroupIds.length === 0) {
      console.log('👥 No group IDs found');
      setGroups([]);
      setLoading(false);
      return;
    }

    console.log('👥 Setting up group subscriptions for', validGroupIds.length, 'groups');
    setLoading(true);
    setError(null);

    const { collection, query, where, documentId, onSnapshot } = require('firebase/firestore');

    const unsubscribes = [];

    // Initialize empty array
    setGroups([]);

    // Split into chunks of 10 (Firestore 'in' query limit)
    const chunks = [];
    for (let i = 0; i < validGroupIds.length; i += 10) {
      chunks.push(validGroupIds.slice(i, i + 10));
    }

    console.log(`👥 Subscribing to ${chunks.length} group batch(es)`);

    // Subscribe to each chunk
    chunks.forEach((chunk, chunkIndex) => {
      const q = query(
        collection(db, 'groups'),
        where(documentId(), 'in', chunk)
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          console.log(`👥 Group batch ${chunkIndex + 1} updated (${querySnapshot.docs.length} groups)`);

          const batchGroups = querySnapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            groupId: docSnap.id,
            ...docSnap.data(),
          }));

          setGroups((prev) => {
            // Remove groups from this batch, then add updated ones
            const otherGroups = prev.filter(g => !chunk.includes(g.groupId));
            return [...otherGroups, ...batchGroups];
          });

          if (chunkIndex === 0) {
            setLoading(false);
          }
        },
        (err) => {
          console.error(`❌ Group batch ${chunkIndex + 1} error:`, err);
          setError(err);
          setLoading(false);
        }
      );

      unsubscribes.push(unsubscribe);
    });

    return () => {
      console.log('🧹 Cleaning up group subscriptions');
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [db, JSON.stringify(groupIds)]); // Use JSON.stringify to properly compare arrays

  return { groups, loading, error };
};