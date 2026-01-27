import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { generateUUID, showSuccessToast } from '@my-apps/utils';

export const usePinnedOperations = (
  db,
  user,
  groups,
  deleteNotification,
  updatePinnedChecklist,
  createPinnedChecklist
) => {
  const handleSaveChecklist = async (checklist, checklistContext, onClose) => {
    try {
      console.log('💾 Saving pinned checklist:', checklist.name);
      
      const docId =
        checklistContext?.type === "personal"
          ? user.userId
          : checklistContext.groupId;

      const docRef = doc(db, "pinnedChecklists", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const currentPinned = docSnap.data().pinned || [];
        const existingIndex = currentPinned.findIndex(
          (c) => c.id === checklist.id
        );

        let updatedPinned;
        if (existingIndex !== -1) {
          updatedPinned = [...currentPinned];
          updatedPinned[existingIndex] = checklist;
          console.log('📝 Updating existing checklist at index:', existingIndex);
        } else {
          updatedPinned = [...currentPinned, checklist];
          console.log('📝 Adding new checklist');
        }

        await updateDoc(docRef, {
          pinned: updatedPinned,
          updatedAt: new Date().toISOString(),
        });
        console.log('✅ Pinned checklist document updated');
      } else {
        await setDoc(docRef, {
          [checklistContext?.type === "personal" ? "userId" : "groupId"]: docId,
          ...(checklistContext?.type === "group" && {
            groupName: checklistContext.groupName,
          }),
          pinned: [checklist],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log('✅ Pinned checklist document created');
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("❌ Error saving pinned checklist:", error);
      Alert.alert("Error", "Failed to save checklist. Please try again.");
    }
  };

  const handleUnpinChecklist = async (checklist) => {
    try {
      const docId = checklist.isGroupChecklist
        ? checklist.groupId
        : checklist.userId || user.userId;

      const docRef = doc(db, "pinnedChecklists", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const currentPinned = docSnap.data().pinned || [];
        const updatedPinned = currentPinned.filter(
          (c) => c.id !== checklist.id
        );

        await updateDoc(docRef, {
          pinned: updatedPinned,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error unpinning checklist:", error);
      Alert.alert("Error", "Failed to unpin checklist. Please try again.");
    }
  };

  const handleMoveChecklist = async (checklist, target) => {
    try {
      const sourceDocId = checklist.isGroupChecklist
        ? checklist.groupId
        : checklist.userId || user.userId;

      const sourceDocRef = doc(db, "pinnedChecklists", sourceDocId);
      const sourceDocSnap = await getDoc(sourceDocRef);

      if (sourceDocSnap.exists()) {
        const currentPinned = sourceDocSnap.data().pinned || [];
        const updatedPinned = currentPinned.filter(
          (c) => c.id !== checklist.id
        );

        await updateDoc(sourceDocRef, {
          pinned: updatedPinned,
          updatedAt: new Date().toISOString(),
        });
      }

      const cleanChecklist = {
        id: checklist.id,
        name: checklist.name,
        items: checklist.items,
        createdAt: checklist.createdAt,
        updatedAt: new Date().toISOString(),
      };

      const targetDocId =
        target.type === "personal" ? user.userId : target.groupId;
      const targetDocRef = doc(db, "pinnedChecklists", targetDocId);
      const targetDocSnap = await getDoc(targetDocRef);

      if (targetDocSnap.exists()) {
        const currentPinned = targetDocSnap.data().pinned || [];
        const updatedPinned = [...currentPinned, cleanChecklist];

        await updateDoc(targetDocRef, {
          pinned: updatedPinned,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await setDoc(targetDocRef, {
          [target.type === "personal" ? "userId" : "groupId"]: targetDocId,
          ...(target.type === "group" && { groupName: target.groupName }),
          pinned: [cleanChecklist],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error moving checklist:", error);
      Alert.alert("Error", "Failed to move checklist. Please try again.");
    }
  };

  const getAvailableMoveTargets = (checklist) => {
    const targets = [];

    if (checklist.isGroupChecklist) {
      targets.push({ type: "personal" });
      groups.forEach((group) => {
        const groupId = group.groupId || group.id;
        if (groupId !== checklist.groupId) {
          targets.push({
            type: "group",
            groupId: groupId,
            groupName: group.name || groupId,
          });
        }
      });
    } else {
      groups.forEach((group) => {
        targets.push({
          type: "group",
          groupId: group.groupId || group.id,
          groupName: group.name || group.groupId || group.id,
        });
      });
    }

    return targets;
  };

  const handleMoveItems = async (itemsToMove, itemIdsToRemove, destination, selectedChecklist, updatedItems, setUpdatedItems, setWorkingChecklist, setSelectedChecklist) => {
    try {
      if (destination.type === 'new-pinned') {
        const newPinned = {
          id: generateUUID(),
          name: destination.name,
          items: itemsToMove.map(item => ({
            ...item,
            id: generateUUID(),
            completed: false,
            ...(item.subItems && {
              subItems: item.subItems.map(sub => ({
                ...sub,
                id: generateUUID(),
                completed: false,
              })),
            }),
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPinned: true,
        };
        
        const result = await createPinnedChecklist(newPinned);
        
        if (result.success) {
          showSuccessToast(`Moved to "${destination.name}"`, "", 2000, "top");
        }
      } else if (destination.type === 'pinned') {
        const targetPinned = destination.checklist;
        const updatedTargetItems = [...(targetPinned.items || [])];
        
        itemsToMove.forEach(movedItem => {
          if (movedItem.subItems && movedItem.subItems.length > 0) {
            updatedTargetItems.push({
              ...movedItem,
              id: generateUUID(),
              subItems: movedItem.subItems.map(sub => ({
                ...sub,
                id: generateUUID(),
                completed: false,
              })),
            });
          } else {
            updatedTargetItems.push({
              ...movedItem,
              id: generateUUID(),
              completed: false,
            });
          }
        });
        
        const updatedPinned = {
          ...targetPinned,
          items: updatedTargetItems,
          updatedAt: new Date().toISOString(),
        };
        
        // ✅ FIX: Determine document ID from the target checklist
        const docId = targetPinned.isGroupChecklist 
          ? targetPinned.groupId 
          : (targetPinned.userId || user.userId);
        
        const docRef = doc(db, "pinnedChecklists", docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const currentPinned = docSnap.data().pinned || [];
          const existingIndex = currentPinned.findIndex(c => c.id === targetPinned.id);
          
          if (existingIndex !== -1) {
            // Update existing checklist
            const updatedPinnedArray = [...currentPinned];
            updatedPinnedArray[existingIndex] = updatedPinned;
            
            await updateDoc(docRef, {
              pinned: updatedPinnedArray,
              updatedAt: new Date().toISOString(),
            });
            
            showSuccessToast(`Moved to "${targetPinned.name}"`, "", 2000, "top");
          } else {
            console.error('❌ Target checklist not found in pinned array');
            Alert.alert('Error', 'Target checklist not found');
            return;
          }
        }
      }
      
      // ✅ Remove items from source checklist
      const remainingItems = updatedItems
        .map(item => {
          if (itemIdsToRemove.has(item.id)) {
            return null;
          }
          
          if (item.subItems && item.subItems.length > 0) {
            const remainingSubs = item.subItems.filter(sub => !itemIdsToRemove.has(sub.id));
            
            if (remainingSubs.length === 0) {
              return null;
            }
            
            if (remainingSubs.length !== item.subItems.length) {
              return {
                ...item,
                subItems: remainingSubs,
              };
            }
          }
          
          return item;
        })
        .filter(Boolean);
      
      const updatedSourceChecklist = {
        ...selectedChecklist,
        items: remainingItems,
        updatedAt: new Date().toISOString(),
      };
      
      const result = await updatePinnedChecklist(updatedSourceChecklist);
      
      if (result.success) {
        setUpdatedItems(remainingItems);
        setWorkingChecklist(updatedSourceChecklist);
        setSelectedChecklist(updatedSourceChecklist);
      } else {
        throw new Error(result.error || 'Failed to update source checklist');
      }
      
    } catch (error) {
      console.error('Error moving items:', error);
      Alert.alert('Error', 'Failed to move items. Please try again.');
    }
  };

  
  return {
    handleSaveChecklist,
    handleUnpinChecklist,
    handleMoveChecklist,
    getAvailableMoveTargets,
    handleMoveItems,
  };
};