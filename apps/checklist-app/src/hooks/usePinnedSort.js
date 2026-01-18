import { useState, useEffect } from 'react';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { applySorting } from '@my-apps/utils';

const SORT_KEY = '@pinned_checklists_sort';

export const usePinnedSort = (allPinned, db, user) => {
  const [currentSort, setCurrentSort] = useState('a-z');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showCustomOrderModal, setShowCustomOrderModal] = useState(false);
  const [hasSortBeenChanged, setHasSortBeenChanged] = useState(false);

  // Sort options
  const sortOptions = [
    { id: 'a-z', label: 'A to Z', icon: 'text-outline' },
    { id: 'z-a', label: 'Z to A', icon: 'text-outline' },
    { id: 'newest', label: 'Newest First', icon: 'time-outline' },
    { id: 'oldest', label: 'Oldest First', icon: 'time-outline' },
    { id: 'custom', label: 'Custom Order', icon: 'list-outline' },
    { id: 'edit-custom', label: 'Edit Custom Order', icon: 'reorder-three-outline', closesModal: true },
  ];

  // Load saved sort preference
  useEffect(() => {
    loadSortPreference();
  }, []);

  const loadSortPreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(SORT_KEY);
      if (saved) {
        setCurrentSort(saved);
      }
    } catch (error) {
      console.error('Failed to load sort preference:', error);
    }
  };

  const saveSortPreference = async (sortType) => {
    try {
      await AsyncStorage.setItem(SORT_KEY, sortType);
      setCurrentSort(sortType);
    } catch (error) {
      console.error('Failed to save sort preference:', error);
    }
  };

  const handleSortChange = (sortType) => {
    if (sortType === 'edit-custom') {
      setShowCustomOrderModal(true);
    } else {
      saveSortPreference(sortType);
      setHasSortBeenChanged(true);
    }
  };

  const handleSaveCustomOrder = async (newOrder) => {
    try {
      // Group checklists by their parent document
      const groupedChecklists = {};
      
      newOrder.forEach((checklist, index) => {
        const checklistWithOrder = { ...checklist, order: index };
        const key = checklist.isGroupChecklist 
          ? `group_${checklist.groupId}`
          : `user_${checklist.userId || user.userId}`;
        
        if (!groupedChecklists[key]) {
          groupedChecklists[key] = [];
        }
        groupedChecklists[key].push(checklistWithOrder);
      });

      // Update each parent document
      const batch = writeBatch(db);
      
      for (const [key, checklists] of Object.entries(groupedChecklists)) {
        const isGroup = key.startsWith('group_');
        const docPath = isGroup 
          ? `pinnedChecklists/${key.replace('group_', '')}`
          : `pinnedChecklists/${key.replace('user_', '')}`;
        
        const docRef = doc(db, docPath);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const currentPinned = docSnap.data().pinned || [];
          
          // Create a map of updated checklists by ID
          const updatedMap = new Map(checklists.map(c => [c.id, c]));
          
          // Update checklists that are in our list, keep others unchanged
          const updatedPinned = currentPinned.map(c => 
            updatedMap.has(c.id) ? { ...updatedMap.get(c.id), updatedAt: new Date().toISOString() } : c
          );
          
          // Sort by order field
          updatedPinned.sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
              return a.order - b.order;
            }
            if (a.order !== undefined) return -1;
            if (b.order !== undefined) return 1;
            return 0;
          });
          
          batch.update(docRef, { 
            pinned: updatedPinned,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      
      await batch.commit();
      saveSortPreference('custom');
      setShowCustomOrderModal(false);
      Alert.alert("Success", "Custom order saved");
    } catch (error) {
      console.error('Error saving custom order:', error);
      Alert.alert("Error", "Failed to save custom order");
    }
  };

  const handleCloseSortModal = () => {
    setShowSortModal(false);
    setHasSortBeenChanged(false);
  };

  // Apply sorting
  const sortedPinned = applySorting(allPinned, currentSort);

  return {
    // State
    currentSort,
    showSortModal,
    setShowSortModal,
    showCustomOrderModal,
    setShowCustomOrderModal,
    hasSortBeenChanged,
    sortOptions,
    sortedPinned,
    
    // Handlers
    handleSortChange,
    handleSaveCustomOrder,
    handleCloseSortModal,
  };
};