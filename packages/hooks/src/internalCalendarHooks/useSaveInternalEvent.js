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
          groupId,
          targetUserId,
        } = eventData;

        const startDateStr = start.dateTime || start.date;
        const startDT = DateTime.fromISO(startDateStr);

        const endDateStr = end?.dateTime || end?.date || null;
        const endDT = endDateStr
          ? DateTime.fromISO(endDateStr)
          : start.date
          ? startDT.endOf("day")
          : null;

        const entityId = groupId || targetUserId || authUser.uid;
        const yearMonth = startDT.toFormat("yyyy-LL");
  
        const shardRef = doc(db, "activities", entityId, "months", yearMonth);
        const shardSnap = await getDoc(shardRef);
  
        const eventId = id || uuidv4();
        const timestamp = startDT.toMillis();
        const eventKey = `${eventId}-${timestamp}`;
  
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
          groupId: groupId || null,
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
        console.log(`🆔 Event ID: ${eventKey}`);
  
        return { 
          success: true, 
          eventId: eventKey, // ← Return the full event key
          eventIdBase: eventId, // ← Also return base ID if needed
          timestamp // ← Return timestamp if needed
        };
      } catch (err) {
        console.error("❌ Error saving internal event", err);
        return { success: false, error: err };
      }
    };
  
    return saveInternalEvent;
  };