import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

/**
 * Register the current app in user's joinedApps array
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} appId - App identifier (e.g., 'organizer-app', 'checklist-app')
 */
export const useAppRegistration = (db, userId, appId) => {
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!db || !userId || !appId) {
      return;
    }

    const registerApp = async () => {
      try {
        setRegistering(true);
        
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          console.error('User document does not exist');
          return;
        }

        const userData = userDoc.data();
        const joinedApps = userData.joinedApps || [];

        // Check if app is already registered
        if (joinedApps.includes(appId)) {
          console.log(`✅ App ${appId} already registered for user ${userId}`);
          setRegistered(true);
          return;
        }

        // Register the app
        await updateDoc(userRef, {
          joinedApps: arrayUnion(appId)
        });

        console.log(`✅ Registered ${appId} for user ${userId}`);
        setRegistered(true);
      } catch (error) {
        console.error(`❌ Failed to register app ${appId}:`, error);
      } finally {
        setRegistering(false);
      }
    };

    registerApp();
  }, [db, userId, appId]);

  return { registered, registering };
};