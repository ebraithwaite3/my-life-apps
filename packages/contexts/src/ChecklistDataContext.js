import React, { createContext, useContext, useMemo } from 'react';
import { useData } from './DataContext';
import { useChecklistDoc, useGroupChecklistDocs } from '../../hooks/src/checklistHooks';

const ChecklistDataContext = createContext();

export const useChecklistData = () => {
  const context = useContext(ChecklistDataContext);
  if (!context) {
    throw new Error('useChecklistData must be used within ChecklistDataProvider');
  }
  return context;
};

export const ChecklistDataProvider = ({ children }) => {
  const sharedData = useData();
  
  // Get personal pinned checklists document
  const { 
    checklists: personalChecklists, 
    loading: personalLoading,
    error: personalError 
  } = useChecklistDoc(sharedData.user?.userId);

  // Get group pinned checklists documents
  const {
    groupChecklists,
    loading: groupChecklistsLoading,
    error: groupChecklistsError
  } = useGroupChecklistDocs(sharedData.user?.groups);

  // Personal pinned checklists
  const personalPinned = useMemo(() => {
    return personalChecklists?.pinned || [];
  }, [personalChecklists]);

  // Group pinned checklists (flattened with group info)
  const groupPinned = useMemo(() => {
    if (!groupChecklists) return [];
    return Object.values(groupChecklists).flatMap(group => 
      (group.pinned || []).map(checklist => ({
        ...checklist,
        groupId: group.groupId,
        groupName: group.groupName,
        isGroupChecklist: true
      }))
    );
  }, [groupChecklists]);

  // Combined pinned (personal + group)
  const allPinned = useMemo(() => {
    return [...personalPinned, ...groupPinned];
  }, [personalPinned, groupPinned]);

  // Helper: Get pinned checklists for a specific group
  const getPinnedForGroup = (groupId) => {
    return groupChecklists?.[groupId]?.pinned || [];
  };

  const value = useMemo(() => ({
    // Personal pinned checklists
    personalPinned,
    
    // Group pinned checklists
    groupPinned,
    groupChecklists, // Raw group checklists by groupId (in case you need the full object)
    
    // Combined (personal + group)
    allPinned,
    
    // Loading states
    checklistsLoading: personalLoading || groupChecklistsLoading,
    personalLoading,
    groupChecklistsLoading,
    
    // Errors
    checklistsError: personalError || groupChecklistsError,
    personalError,
    groupChecklistsError,
    
    // Helper functions
    getPinnedForGroup,
  }), [
    personalPinned,
    groupPinned,
    groupChecklists,
    allPinned,
    personalLoading,
    groupChecklistsLoading,
    personalError,
    groupChecklistsError
  ]);

  return (
    <ChecklistDataContext.Provider value={value}>
      {children}
    </ChecklistDataContext.Provider>
  );
};