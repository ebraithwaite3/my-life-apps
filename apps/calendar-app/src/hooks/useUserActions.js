// hooks/useUserActions.js
import { useCallback } from 'react';
import { DateTime } from 'luxon';
import { runTransaction, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { updateDocument } from '../services/firestoreService';

export const useUserActions = () => {
  const { user: authUser, db } = useAuth();
  const { user } = useData();

  const addToHiddenEvents = useCallback(async (eventId, startTime) => {
    try {
      console.log("🙈 Adding event to hidden:", eventId, startTime);
      
      if (!authUser?.uid) {
        throw new Error("User not authenticated");
      }
      
      const eventDate = DateTime.fromISO(startTime).toISODate();
      const newHiddenEvent = {
        eventId,
        startTime: eventDate // Store just the date part (YYYY-MM-DD)
      };
      
      // Check if already hidden
      const currentHiddenEvents = user?.hiddenEvents || [];
      const alreadyHidden = currentHiddenEvents.some(hidden => hidden.eventId === eventId);
      
      if (alreadyHidden) {
        console.log("Event already hidden:", eventId);
        return;
      }
      
      const updatedHiddenEvents = [...currentHiddenEvents, newHiddenEvent];
      
      await updateDocument('users', authUser.uid, { 
        hiddenEvents: updatedHiddenEvents,
        updatedAt: DateTime.now().toISO()
      });
      
      console.log("✅ Event hidden successfully");
      
    } catch (error) {
      console.error("❌ Error hiding event:", error);
      throw error;
    }
  }, [authUser?.uid, user?.hiddenEvents]);

  const removeFromHiddenEvents = useCallback(async (eventId) => {
    try {
      console.log("👁️ Removing event from hidden:", eventId);
      
      if (!authUser?.uid) {
        throw new Error("User not authenticated");
      }
      
      const currentHiddenEvents = user?.hiddenEvents || [];
      const updatedHiddenEvents = currentHiddenEvents.filter(
        hidden => hidden.eventId !== eventId
      );
      
      // Only update if there was actually a change
      if (updatedHiddenEvents.length === currentHiddenEvents.length) {
        console.log("Event was not hidden:", eventId);
        return;
      }
      
      await updateDocument('users', authUser.uid, { 
        hiddenEvents: updatedHiddenEvents,
        updatedAt: DateTime.now().toISO()
      });
      
      console.log("✅ Event unhidden successfully");
      
    } catch (error) {
      console.error("❌ Error unhiding event:", error);
      throw error;
    }
  }, [authUser?.uid, user?.hiddenEvents]);

  const toggleEventVisibility = useCallback(async (eventId, startTime, hideOrUnhide) => {
    try {
      console.log(`🔄 Toggling event visibility: ${hideOrUnhide} for eventId:`, eventId);
      if (hideOrUnhide === "unhide") {
        await removeFromHiddenEvents(eventId);
      } else {
        await addToHiddenEvents(eventId, startTime);
      }
      
    } catch (error) {
      console.error("❌ Error toggling event visibility:", error);
      throw error;
    }
  }, [addToHiddenEvents, removeFromHiddenEvents, user?.hiddenEvents]);

  const cleanupOldHiddenEvents = useCallback(async () => {
    try {
      console.log("🧹 Cleaning up old hidden events");
      
      if (!authUser?.uid || !user?.hiddenEvents?.length) {
        return;
      }
      
      const cutoffDate = DateTime.now().minus({ days: 7 }).toISODate();
      const currentHiddenEvents = user.hiddenEvents;
      
      const activeHiddenEvents = currentHiddenEvents.filter(hidden => {
        // Keep events that are newer than 7 days
        return hidden.startTime >= cutoffDate;
      });
      
      // Only update if we're removing some events
      if (activeHiddenEvents.length < currentHiddenEvents.length) {
        const removedCount = currentHiddenEvents.length - activeHiddenEvents.length;
        
        await updateDocument('users', authUser.uid, { 
          hiddenEvents: activeHiddenEvents,
          updatedAt: DateTime.now().toISO()
        });
        
        console.log(`✅ Cleaned up ${removedCount} old hidden events`);
      } else {
        console.log("No old hidden events to clean up");
      }
      
    } catch (error) {
      console.error("❌ Error cleaning up hidden events:", error);
      throw error;
    }
  }, [authUser?.uid, user?.hiddenEvents]);

  return {
    addToHiddenEvents,
    removeFromHiddenEvents,
    toggleEventVisibility,
    cleanupOldHiddenEvents
  };
};