import { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applySorting, showSuccessToast, showErrorToast } from '@my-apps/utils';

const SORT_KEY = '@pinned_checklists_sort';

export const usePinnedSort = (allPinned, db, user, pinnedOrder = []) => {
  const [currentSort, setCurrentSort] = useState('a-z');
  const [originalSort, setOriginalSort] = useState('a-z'); // ✅ Track original
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

  // ✅ Track original when modal opens
  useEffect(() => {
    if (showSortModal) {
      setOriginalSort(currentSort);
      setHasSortBeenChanged(false);
    }
  }, [showSortModal]);

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
      setCurrentSort(sortType); // ✅ Just update local state, don't save yet
      setHasSortBeenChanged(true);
    }
  };

  // ✅ NEW: Commit sort changes
  const handleCommitSort = async () => {
    await saveSortPreference(currentSort);
    setShowSortModal(false);
    setHasSortBeenChanged(false);
  };

  const handleSaveCustomOrder = async (newOrder) => {
    try {
      const orderedIds = newOrder.map(c => c.id);
      await setDoc(
        doc(db, 'users', user.userId),
        { pinnedOrder: orderedIds },
        { merge: true }
      );
      await saveSortPreference('custom');
      setShowCustomOrderModal(false);
      return true;
    } catch (error) {
      console.error('Error saving custom order:', error);
      return false;
    }
  };

  // ✅ UPDATED: Handle cancel - revert to original
  const handleCloseSortModal = () => {
    if (hasSortBeenChanged) {
      // Revert to original
      setCurrentSort(originalSort);
    }
    setShowSortModal(false);
    setHasSortBeenChanged(false);
  };

  const handleCloseCustomOrderModal = () => {
    setShowCustomOrderModal(false);
    // Don't change any sort preferences - just close the modal
  };
  

  // Apply sorting — pass pinnedOrder for per-user custom sort
  const sortedPinned = applySorting(allPinned, currentSort, pinnedOrder);

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
    handleCommitSort, // ✅ NEW
    handleSaveCustomOrder,
    handleCloseSortModal,
    handleCloseCustomOrderModal,
  };
};