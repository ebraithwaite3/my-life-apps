// hooks/useRemoveChecklistItems.js
import { doc, getDoc, updateDoc } from "firebase/firestore";

export const useRemoveChecklistItems = (db, user, updateInternalActivities, updateExternalActivities) => {
  
  const removeItemsFromSource = async (sourceInfo, itemsToRemove) => {
    if (!sourceInfo || !itemsToRemove || itemsToRemove.length === 0) {
      console.log("❌ No source info or items to remove");
      return;
    }

    console.log("🗑️ Removing items from source:", sourceInfo);
    const itemIdsSet = new Set(sourceInfo.itemIdsToRemove);

    try {
      if (sourceInfo.type === 'pinned') {
        // Existing pinned logic
        const docId = sourceInfo.groupId || user.userId;
        const docRef = doc(db, "pinnedChecklists", docId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          console.error("❌ Pinned checklist document not found");
          return;
        }

        const data = docSnap.data();
        const pinned = data.pinned || [];
        
        const updatedPinned = pinned.map(checklist => {
          if (checklist.id === sourceInfo.checklistId) {
            return {
              ...checklist,
              items: checklist.items.filter(item => !itemIdsSet.has(item.id))
            };
          }
          return checklist;
        });

        await updateDoc(docRef, { pinned: updatedPinned });
        console.log("✅ Items removed from pinned checklist");

      } else if (sourceInfo.type === 'event') {
        console.log("🔍 Removing items from event checklist");
        
        // ✅ Filter items from this checklist
        const updatedItems = sourceInfo.allItems.filter(
          item => !itemIdsSet.has(item.id)
        );
        
        console.log(`📊 ${sourceInfo.allItems.length} → ${updatedItems.length} items`);
        
        // ✅ Update ALL activities, only modifying the source checklist
        const updatedActivities = sourceInfo.allActivities.map(activity => {
          if (activity.id === sourceInfo.checklistId && activity.activityType === 'checklist') {
            console.log("🗑️ Updating checklist:", activity.id);
            return {
              ...activity,
              items: updatedItems,
            };
          }
          return activity;  // ✅ Keep all other activities unchanged
        });
        
        console.log(`📊 Saving ${updatedActivities.length} activities`);
        
        // ✅ Use hooks
        const isInternal = sourceInfo.calendarId === 'internal';
        
        let result;
        if (isInternal) {
          result = await updateInternalActivities(
            sourceInfo.eventId,
            sourceInfo.startTime,
            updatedActivities,
            sourceInfo.groupId
          );
        } else {
          result = await updateExternalActivities(
            sourceInfo.eventId,
            sourceInfo.calendarId,
            sourceInfo.startTime,
            updatedActivities
          );
        }
        
        if (result.success) {
          console.log("✅ Items removed from event checklist");
        } else {
          console.error("❌ Failed to update event:", result.error);
        }
      }

    } catch (error) {
      console.error("❌ Error removing items:", error);
      throw error;
    }
  };

  return { removeItemsFromSource };
};