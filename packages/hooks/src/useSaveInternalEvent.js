import { useAuth } from "@my-apps/contexts";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { DateTime } from "luxon";
import * as Crypto from "expo-crypto";

export const useSaveInternalEvent = () => {
    const { user: authUser, db } = useAuth();
    const uuidv4 = () => Crypto.randomUUID();
  
    const saveInternalEvent = async (eventData) => {
      try {
        const { 
          id, 
          summary, 
          description, 
          location, 
          start, 
          end, 
          reminderMinutes, 
          activities,
          groupId // ← Add this
        } = eventData;
  
        const startDateStr = start.dateTime || start.date;
        const startDT = DateTime.fromISO(startDateStr);
  
        const endDateStr = end?.dateTime || end?.date || null;
        const endDT = endDateStr
          ? DateTime.fromISO(endDateStr)
          : start.date
          ? startDT.endOf("day")
          : null;
  
        // ← CHANGE: Use groupId if provided, otherwise use user ID
        const entityId = groupId || authUser.uid;
        const yearMonth = startDT.toFormat("yyyy-LL");
  
        const shardRef = doc(db, "activities", entityId, "months", yearMonth);
        const shardSnap = await getDoc(shardRef);
  
        const eventId = id || uuidv4();
        const eventKey = `${eventId}-${startDT.toMillis()}`;
  
        const newEventObj = {
          calendarId: "internal",
          title: summary || "",
          description: description || "",
          location: location || "",
          startTime: startDT.toISO(),
          endTime: endDT?.toISO() || null,
          isAllDay: !!start.date,
          isRecurring: false,
          recurringEventId: null,
          source: "internal",
          reminderMinutes: reminderMinutes !== undefined ? reminderMinutes : null,
          activities: activities || [],
          groupId: groupId || null, // ← Add this
        };
  
        if (!shardSnap.exists()) {
          await setDoc(shardRef, {
            items: {
              [eventKey]: newEventObj,
            },
            updatedAt: DateTime.local().toISO(),
          });
        } else {
          await updateDoc(shardRef, {
            [`items.${eventKey}`]: newEventObj,
            updatedAt: DateTime.local().toISO(),
          });
        }
  
        console.log(`✅ Event saved to ${groupId ? 'group' : 'personal'} calendar`);
        console.log(`📍 Location: activities/${entityId}/months/${yearMonth}`);
  
        return { success: true };
      } catch (err) {
        console.error("❌ Error saving internal event", err);
        return { success: false, error: err };
      }
    };
  
    return saveInternalEvent;
  };