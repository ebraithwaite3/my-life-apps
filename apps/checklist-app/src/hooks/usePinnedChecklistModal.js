import { useState, useEffect } from 'react';
import { Alert, Keyboard } from 'react-native';
import { calculateChecklistProgress, showSuccessToast } from '@my-apps/utils';

export const usePinnedChecklistModal = (handleSaveChecklist) => {
  const [checklistMode, setChecklistMode] = useState("complete");
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [updatedItems, setUpdatedItems] = useState([]);
  const [isDirtyComplete, setIsDirtyComplete] = useState(false);
  const [workingChecklist, setWorkingChecklist] = useState(null);
  const [initialChecklist, setInitialChecklist] = useState(null);

  // Initialize working checklist when selected
  useEffect(() => {
    if (selectedChecklist) {
      setWorkingChecklist(selectedChecklist);
      setUpdatedItems(selectedChecklist.items || []);
      setInitialChecklist(JSON.parse(JSON.stringify(selectedChecklist)));
      setIsDirtyComplete(false);
    }
  }, [selectedChecklist]);

  // Detect changes in complete mode
  useEffect(() => {
    if (checklistMode !== "complete" || !initialChecklist) return;

    const originalItems = initialChecklist.items || [];
    const hasChanges = JSON.stringify(updatedItems) !== JSON.stringify(originalItems);
    
    setIsDirtyComplete(hasChanges);
  }, [updatedItems, initialChecklist, checklistMode]);

  const closeChecklistModal = (onClose) => {
    if (isDirtyComplete && selectedChecklist) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to close?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              resetModalState();
              onClose();
            },
          },
        ]
      );
    } else {
      resetModalState();
      onClose();
    }
  };

  const resetModalState = () => {
    setSelectedChecklist(null);
    setChecklistMode("complete");
    setUpdatedItems([]);
    setIsDirtyComplete(false);
    setWorkingChecklist(null);
    setInitialChecklist(null);
  };

  const getCancelText = () => {
    return isDirtyComplete ? "Cancel" : "Close";
  };

  const handleUpdateFromCompleteMode = async () => {
    const updatedChecklist = {
      ...selectedChecklist,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };
    await handleSaveChecklist(updatedChecklist);
    
    Keyboard.dismiss();
    setTimeout(() => {
      showSuccessToast("Checklist saved", "", 2000, "top");
    }, 100);
    
    setIsDirtyComplete(false);
  };

  const getActionDisabled = () => {
    if (checklistMode === "edit") {
      return false;
    }
    return !isDirtyComplete;
  };

  const progress =
    checklistMode === "complete" && updatedItems.length > 0
      ? calculateChecklistProgress(updatedItems)
      : { completed: 0, total: 0 };

  return {
    // State
    checklistMode,
    setChecklistMode,
    selectedChecklist,
    setSelectedChecklist,
    updatedItems,
    setUpdatedItems,
    isDirtyComplete,
    setIsDirtyComplete,
    workingChecklist,
    setWorkingChecklist,
    progress,
    
    // Handlers
    closeChecklistModal,
    getCancelText,
    handleUpdateFromCompleteMode,
    getActionDisabled,
  };
};