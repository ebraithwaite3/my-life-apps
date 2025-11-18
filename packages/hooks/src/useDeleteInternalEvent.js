import { useAuth } from "@my-apps/contexts";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { DateTime } from "luxon";

export const useDeleteInternalEvent = () => {
  const { user: authUser, db } = useAuth();

  const deleteInternalEvent = async (eventKey, startTime) => {
    try {
      // Get the year-month from the event's start time
      const startDT = DateTime.fromISO(startTime);
      const yearMonth = startDT.toFormat("yyyy-LL");
      const entityId = authUser.uid;

      console.log("🗑️ Deleting internal event:", eventKey, "from month:", yearMonth);

      // Reference to the month shard
      const shardRef = doc(db, "activities", entityId, "months", yearMonth);
      const shardSnap = await getDoc(shardRef);

      if (!shardSnap.exists()) {
        console.warn("⚠️ Month shard not found");
        return { success: false, error: "Month shard not found" };
      }

      // Delete the event from the items map
      await updateDoc(shardRef, {
        [`items.${eventKey}`]: deleteField(),
        updatedAt: DateTime.local().toISO(),
      });

      console.log("✅ Deleted internal event from Firestore:", eventKey);

      return { success: true };
    } catch (err) {
      console.error("❌ Error deleting internal event", err);
      return { success: false, error: err.message };
    }
  };

  return deleteInternalEvent;
};