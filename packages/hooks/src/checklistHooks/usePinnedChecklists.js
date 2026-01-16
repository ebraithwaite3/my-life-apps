import { useCallback } from 'react';
import { doc, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../../../contexts/src/AuthContext';
import { useData } from '../../../contexts/src/DataContext';
import { useChecklistData } from '../../../contexts/src/ChecklistDataContext';

export const usePinnedChecklists = () => {
  const { db } = useAuth(); // Get user from useAuth, not just db
  const { user } = useData();
  const { allPinned, personalPinned, groupPinned } = useChecklistData();

  // Create a new pinned checklist
  const createPinnedChecklist = useCallback(async (checklist, groupId = null) => {
    if (!db || !user) {
      throw new Error('No database connection or user');
    }

    const targetId = groupId || user.userId;
    const checklistRef = doc(db, 'pinnedChecklists', targetId);

    try {
      console.log(`📝 Creating pinned checklist for ${groupId ? 'group' : 'user'}:`, targetId);

      // Ensure checklist has required fields
      const newChecklist = {
        ...checklist,
        id: checklist.id || `checklist_${Date.now()}`,
        createdAt: checklist.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPinned: true,
        ...(groupId && { groupId, isGroupChecklist: true }),
      };

      // Use setDoc with merge to create document if it doesn't exist
      await setDoc(
        checklistRef,
        {
          pinned: arrayUnion(newChecklist),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      console.log('✅ Pinned checklist created successfully');
      return { success: true, checklist: newChecklist };
    } catch (error) {
      console.error('❌ Error creating pinned checklist:', error);
      return { success: false, error: error.message };
    }
  }, [db, user]);

  // Update an existing pinned checklist
  const updatePinnedChecklist = useCallback(async (updatedChecklist) => {
    if (!db || !user) {
      throw new Error('No database connection or user');
    }

    // Determine if group or personal - check the ORIGINAL checklist in our data
    const originalChecklist = allPinned.find(c => c.id === updatedChecklist.id);
    
    if (!originalChecklist) {
      throw new Error('Checklist not found in pinned list');
    }

    const isGroupChecklist = originalChecklist.isGroupChecklist || originalChecklist.groupId;
    const targetId = isGroupChecklist ? originalChecklist.groupId : user.userId;

    console.log(`📝 Updating pinned checklist:`, {
      checklistId: updatedChecklist.id,
      targetId,
      isGroup: isGroupChecklist
    });

    if (!targetId) {
      console.error('❌ No targetId found:', { originalChecklist, user });
      throw new Error('Cannot determine document ID for checklist');
    }

    const checklistRef = doc(db, 'pinnedChecklists', targetId);

    try {
      // Update the checklist
      const updated = {
        ...updatedChecklist,
        updatedAt: new Date().toISOString(),
        // Preserve metadata from original
        ...(isGroupChecklist && {
          groupId: originalChecklist.groupId,
          isGroupChecklist: true,
        }),
      };

      // Remove old version and add updated version (Firebase atomic operation)
      await updateDoc(checklistRef, {
        pinned: arrayRemove(originalChecklist),
      });

      await updateDoc(checklistRef, {
        pinned: arrayUnion(updated),
        updatedAt: new Date().toISOString(),
      });

      console.log('✅ Pinned checklist updated successfully');
      return { success: true, checklist: updated };
    } catch (error) {
      console.error('❌ Error updating pinned checklist:', error);
      return { success: false, error: error.message };
    }
  }, [db, user, allPinned]);

  // Delete a pinned checklist
  const deletePinnedChecklist = useCallback(async (checklistId, groupId = null) => {
    if (!db || !user) {
      throw new Error('No database connection or user');
    }

    const targetId = groupId || user.userId;
    const checklistRef = doc(db, 'pinnedChecklists', targetId);

    try {
      console.log(`🗑️ Deleting pinned checklist for ${groupId ? 'group' : 'user'}:`, targetId);

      // Get the checklist to delete
      const currentList = groupId ? groupPinned : personalPinned;
      const checklistToDelete = currentList.find(c => c.id === checklistId);

      if (!checklistToDelete) {
        throw new Error('Checklist not found in pinned list');
      }

      await updateDoc(checklistRef, {
        pinned: arrayRemove(checklistToDelete),
        updatedAt: new Date().toISOString(),
      });

      console.log('✅ Pinned checklist deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting pinned checklist:', error);
      return { success: false, error: error.message };
    }
  }, [db, user, personalPinned, groupPinned]);

  return {
    allPinned,
    personalPinned,
    groupPinned,
    createPinnedChecklist,
    updatePinnedChecklist,
    deletePinnedChecklist,
  };
};