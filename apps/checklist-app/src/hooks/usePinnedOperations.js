import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { scheduleNotification } from '@my-apps/services';
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
      const docId =
        checklistContext?.type === "personal"
          ? user.userId
          : checklistContext.groupId;

      const docRef = doc(db, "pinnedChecklists", docId);
      const docSnap = await getDoc(docRef);

      let oldChecklist = null;
      if (docSnap.exists()) {
        const currentPinned = docSnap.data().pinned || [];
        oldChecklist = currentPinned.find((c) => c.id === checklist.id);
      }

      if (oldChecklist?.reminderTime) {
        const notificationId = `pinned-checklist-${checklist.id}`;
        await deleteNotification(notificationId);
      }

      if (docSnap.exists()) {
        const currentPinned = docSnap.data().pinned || [];
        const existingIndex = currentPinned.findIndex(
          (c) => c.id === checklist.id
        );

        let updatedPinned;
        if (existingIndex !== -1) {
          updatedPinned = [...currentPinned];
          updatedPinned[existingIndex] = checklist;
        } else {
          updatedPinned = [...currentPinned, checklist];
        }

        await updateDoc(docRef, {
          pinned: updatedPinned,
          updatedAt: new Date().toISOString(),
        });
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
      }

      if (checklist.reminderTime) {
        const reminderDate = new Date(checklist.reminderTime);

        if (reminderDate > new Date()) {
          const itemCount = checklist.items?.length || 0;
          const notificationId = `pinned-checklist-${checklist.id}`;

          await scheduleNotification(
            user.userId,
            `Checklist Reminder: ${checklist.name}`,
            `${itemCount} item${itemCount !== 1 ? "s" : ""} to complete`,
            notificationId,
            reminderDate,
            {
              screen: "Pinned",
              checklistId: checklist.id,
              app: "checklist-app",
            }
          );
        }
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error saving pinned checklist:", error);
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

        if (checklist.reminderTime) {
          const notificationId = `pinned-checklist-${checklist.id}`;
          await deleteNotification(notificationId);
        }
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

      if (checklist.reminderTime) {
        cleanChecklist.reminderTime = checklist.reminderTime;
      }

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
        
        const result = await updatePinnedChecklist(updatedPinned);
        
        if (result.success) {
          showSuccessToast(`Moved to "${targetPinned.name}"`, "", 2000, "top");
        }
      }
      
      // FIXED: Properly filter items immutably
      const remainingItems = updatedItems
        .map(item => {
          // If parent is marked for removal, skip it
          if (itemIdsToRemove.has(item.id)) {
            return null;
          }
          
          // If item has sub-items, check if any need to be removed
          if (item.subItems && item.subItems.length > 0) {
            const remainingSubs = item.subItems.filter(sub => !itemIdsToRemove.has(sub.id));
            
            // If no subs remain, remove the parent too
            if (remainingSubs.length === 0) {
              return null;
            }
            
            // If some subs were removed, return new item with filtered subs
            if (remainingSubs.length !== item.subItems.length) {
              return {
                ...item,
                subItems: remainingSubs,
              };
            }
          }
          
          // Item unchanged
          return item;
        })
        .filter(Boolean); // Remove nulls
      
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