import { DateTime } from "luxon";
import { useAuth } from "@my-apps/contexts";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const useUpdateInternalEvent = () => {
  const { user: authUser, db } = useAuth();

  const updateInternalEvent = async ({
    eventId,
    startTime,
    summary,
    description,
    start,
    end,
    activities,
    reminderMinutes,
    groupId = null,
  }) => {
    if (!authUser?.uid) {
      console.error("❌ No authUser available");
      return { success: false, error: "User not authenticated" };
    }

    try {
      const eventDateTime = DateTime.fromISO(startTime);
      const monthKey = eventDateTime.toFormat("yyyy-LL");

      console.log("📝 Updating internal event:", monthKey, eventId);
      console.log("📝 Reminder to save:", reminderMinutes); // ✅ ADD THIS
      console.log("📝 GroupId:", groupId);

      // ✅ Use groupId if present, otherwise use user's uid
      const entityId = groupId || authUser.uid;
      const monthRef = doc(db, "activities", entityId, "months", monthKey);
      console.log("📂 Path:", monthRef.path);

      const monthDoc = await getDoc(monthRef);
      console.log("📂 Month doc exists:", monthDoc.exists()); // ✅ ADD THIS

      if (!monthDoc.exists() || !monthDoc.data().items) {
        console.error("❌ Month document not found or has no items");
        return { success: false, error: "Event not found" };
      }

      const existingItems = { ...monthDoc.data().items };
      console.log("📂 Found items:", Object.keys(existingItems).length); // ✅ ADD THIS
      console.log("📂 Looking for eventId:", eventId); // ✅ ADD THIS
      console.log("📂 Available eventIds:", Object.keys(existingItems)); // ✅ ADD THIS

      if (!existingItems[eventId]) {
        console.error("❌ Event not found in month items");
        return { success: false, error: "Event not found" };
      }

      // Update event with new data
      existingItems[eventId] = {
        ...existingItems[eventId],
        title: summary,
        description: description || "",
        startTime: start.dateTime || start.date,
        endTime: end.dateTime || end.date,
        isAllDay: !!start.date,
        activities: activities || [],
        reminderMinutes: reminderMinutes || null,
        updatedAt: new Date().toISOString(),
      };

      console.log("💾 About to save to Firestore..."); // ✅ ADD THIS
      await setDoc(monthRef, { items: existingItems }, { merge: true });
      console.log("💾 Save complete!"); // ✅ ADD THIS

      console.log("✅ Internal event updated:", eventId);
      return { success: true, eventId };
    } catch (error) {
      console.error("❌ Error updating internal event:", error);
      console.error("❌ Error stack:", error.stack); // ✅ ADD THIS
      return { success: false, error: error.message };
    }
  };

  return updateInternalEvent;
};
