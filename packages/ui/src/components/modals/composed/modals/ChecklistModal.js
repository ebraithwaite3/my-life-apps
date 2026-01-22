import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "@my-apps/contexts";
import { calculateChecklistProgress } from "@my-apps/utils";
import { showSuccessToast } from "@my-apps/utils";
import ModalWrapper from "../../base/ModalWrapper";
import ModalHeader from "../../../headers/ModalHeader";
import ChecklistContent from "../../content/checklists/ChecklistContent";
import EditChecklistContent from "../../content/checklists/EditChecklistContent";
import PillSelectionButton from "../../../buttons/PillSelectionButton";
import { generateUUID } from "@my-apps/utils";

const ChecklistModal = ({
  // From calendarState
  addChecklistModalVisible,
  showChecklistModal,
  checklistMode,
  setChecklistMode,
  selectedChecklist,
  selectedChecklistEvent,
  selectedEvent,
  updatedItems,
  setUpdatedItems,
  isDirtyComplete,
  setIsDirtyComplete,

  // From calendarHandlers
  closeChecklistModal,
  closeViewChecklistModal,
  handleSaveChecklist,
  handleUpdateChecklist,
  handleUpdateFromCompleteMode,

  // From context
  user,

  // Templates and save function for saving a template
  templates,
  onSaveTemplate,
  promptForContext,

  // NEW: Pinned checklists for move functionality
  pinnedChecklists = [],
  onUpdatePinnedChecklist, // Function to update a pinned checklist
  onCreatePinnedChecklist, // Function to create new pinned checklist
}) => {
  console.log("🔍 ChecklistModal received pinnedChecklists:", pinnedChecklists);

  const { theme, getSpacing } = useTheme();
  const editContentRef = useRef(null);

  // Unified working state for the checklist
  const [workingChecklist, setWorkingChecklist] = useState(null);

  // Track initial state for comparison
  const [initialChecklist, setInitialChecklist] = useState(null);

  // Initialize working checklist AND initial snapshot when modal opens
  useEffect(() => {
    if (showChecklistModal && selectedChecklist) {
      setWorkingChecklist(selectedChecklist);
      setUpdatedItems(selectedChecklist.items || []);
      setInitialChecklist(JSON.parse(JSON.stringify(selectedChecklist)));
      setIsDirtyComplete(false);
    }
  }, [showChecklistModal, selectedChecklist]);

  const progress =
    checklistMode === "complete" && updatedItems.length > 0
      ? calculateChecklistProgress(updatedItems)
      : { completed: 0, total: 0 };

  // Check if Complete mode has changes
  useEffect(() => {
    if (checklistMode !== "complete" || !initialChecklist) return;

    const hasChanges =
      JSON.stringify(updatedItems) !== JSON.stringify(initialChecklist.items);

    setIsDirtyComplete(hasChanges);
  }, [updatedItems, initialChecklist, checklistMode]);

  // Check if Edit mode has changes
  const hasEditChanges = () => {
    if (
      checklistMode !== "edit" ||
      !editContentRef.current ||
      !initialChecklist
    ) {
      return false;
    }

    const currentState = editContentRef.current.getCurrentState();

    const nameChanged = currentState.name !== initialChecklist.name;
    const itemsChanged =
      JSON.stringify(currentState.items) !==
      JSON.stringify(initialChecklist.items);
    const reminderChanged =
      currentState.reminderMinutes !== initialChecklist.reminderMinutes ||
      currentState.reminderTime !== initialChecklist.reminderTime;
    const notifyChanged =
      currentState.notifyAdmin !== initialChecklist.notifyAdmin;

    return nameChanged || itemsChanged || reminderChanged || notifyChanged;
  };

  // NEW: Smart nesting - check if item should nest under existing group
  const findMatchingGroup = (itemName, destinationItems) => {
    // Look for groups with matching names (case insensitive, partial match)
    return destinationItems.find((destItem) => {
      if (destItem.itemType !== "group" || !destItem.subItems) return false;

      // Check if destination group name is contained in item name or vice versa
      const destNameLower = destItem.name.toLowerCase();
      const itemNameLower = itemName.toLowerCase();

      return (
        destNameLower.includes(itemNameLower) ||
        itemNameLower.includes(destNameLower)
      );
    });
  };

  // NEW: Handle move items
  const handleMoveItems = async (itemsToMove, itemIdsToRemove, destination) => {
    console.log("📦 Moving items:", itemsToMove);
    console.log("📍 Destination:", destination);

    try {
      if (destination.type === "new-pinned") {
        // Create new pinned checklist with moved items
        const newPinned = {
          id: generateUUID(),
          name: destination.name,
          items: itemsToMove.map((item) => ({
            ...item,
            completed: false, // Reset completion for new checklist
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPinned: true,
        };

        if (onCreatePinnedChecklist) {
          await onCreatePinnedChecklist(newPinned);
        }

        showSuccessToast(`Moved to "${destination.name}"`, "", 2000, "top");
      } else if (destination.type === "pinned") {
        // Add to existing pinned checklist
        const targetPinned = destination.checklist;
        const updatedItems = [...targetPinned.items];

        itemsToMove.forEach((movedItem) => {
          // If moving a single item, check for smart nesting
          if (!movedItem.subItems || movedItem.subItems.length === 0) {
            const matchingGroup = findMatchingGroup(
              movedItem.name,
              updatedItems
            );

            if (matchingGroup) {
              // Nest under matching group
              matchingGroup.subItems = matchingGroup.subItems || [];
              matchingGroup.subItems.push({
                ...movedItem,
                id: generateUUID(), // New ID to avoid conflicts
                parentId: matchingGroup.id,
                completed: false,
              });
            } else {
              // Add as new item
              updatedItems.push({
                ...movedItem,
                id: generateUUID(),
                completed: false,
              });
            }
          } else {
            // Moving a group - add as is
            updatedItems.push({
              ...movedItem,
              id: generateUUID(),
              subItems: movedItem.subItems.map((sub) => ({
                ...sub,
                id: generateUUID(),
                completed: false,
              })),
            });
          }
        });

        const updatedPinned = {
          ...targetPinned,
          items: updatedItems,
          updatedAt: new Date().toISOString(),
        };

        if (onUpdatePinnedChecklist) {
          await onUpdatePinnedChecklist(updatedPinned);
        }

        showSuccessToast(`Moved to "${targetPinned.name}"`, "", 2000, "top");
      }

      // Remove items from source checklist
      const remainingItems = updatedItems.filter((item) => {
        // Keep items that aren't in the remove list
        if (itemIdsToRemove.has(item.id)) return false;

        // For groups, filter out removed sub-items
        if (item.subItems && item.subItems.length > 0) {
          const remainingSubs = item.subItems.filter(
            (sub) => !itemIdsToRemove.has(sub.id)
          );

          if (remainingSubs.length === 0) {
            // No subs left, remove the parent too
            return false;
          }

          // Update item with remaining subs
          item.subItems = remainingSubs;
        }

        return true;
      });

      // Update source checklist
      const updatedSourceChecklist = {
        ...selectedChecklist,
        items: remainingItems,
        updatedAt: new Date().toISOString(),
      };

      await handleUpdateChecklist(updatedSourceChecklist, null);

      // Update local state
      setUpdatedItems(remainingItems);
      setWorkingChecklist(updatedSourceChecklist);
      setInitialChecklist(JSON.parse(JSON.stringify(updatedSourceChecklist)));
    } catch (error) {
      console.error("❌ Error moving items:", error);
      Alert.alert("Error", "Failed to move items. Please try again.");
    }
  };

  // Internal handler for updating from Complete mode
  const handleInternalUpdateFromCompleteMode = async () => {
    const updatedChecklist = {
      ...selectedChecklist,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    const wasJustCompleted =
      !selectedChecklist.completedAt &&
      updatedItems.every((item) => item.completed);

    if (wasJustCompleted) {
      updatedChecklist.completedAt = new Date().toISOString();
    }

    await handleUpdateChecklist(updatedChecklist, null, wasJustCompleted, true);

    Keyboard.dismiss();
    setTimeout(() => {
      showSuccessToast("Checklist saved", "", 2000, "top");
    }, 100);

    setInitialChecklist(JSON.parse(JSON.stringify(updatedChecklist)));
    setIsDirtyComplete(false);
  };

  // Internal handler for updating from Edit mode
  const handleInternalUpdateChecklist = async (
    checklist,
    shouldSaveAsTemplate
  ) => {
    if (shouldSaveAsTemplate && onSaveTemplate && promptForContext) {
      await new Promise((resolve) => {
        promptForContext(async (context) => {
          await onSaveTemplate(checklist, context);
          resolve();
        });
      });
    }

    await handleUpdateChecklist(checklist, null);

    Keyboard.dismiss();
    setTimeout(() => {
      showSuccessToast("Checklist saved", "", 2000, "top");
    }, 100);

    setWorkingChecklist(checklist);
    setUpdatedItems(checklist.items);
    setInitialChecklist(JSON.parse(JSON.stringify(checklist)));
    setIsDirtyComplete(false);
  };

  // Internal handler for closing with confirmation if dirty
  const handleInternalClose = () => {
    const hasChanges =
      checklistMode === "complete" ? isDirtyComplete : hasEditChanges();

    if (hasChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to close?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: closeViewChecklistModal,
          },
        ]
      );
    } else {
      closeViewChecklistModal();
    }
  };

  // Get cancel button text based on dirty state
  const getCancelText = () => {
    const hasChanges =
      checklistMode === "complete" ? isDirtyComplete : hasEditChanges();
    return hasChanges ? "Cancel" : "Close";
  };

  return (
    <>
      {/* Add Checklist Modal */}
      <ModalWrapper
        visible={showChecklistModal}
        onClose={closeViewChecklistModal}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* ✅ ADD KeyboardAvoidingView HERE */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", height: "90%" }}
          >
            <View
              style={{
                backgroundColor: theme.surface,
                borderRadius: 12,
                width: "100%",
                height: "100%",
                overflow: "hidden",
              }}
            >
              <ModalHeader
                title={selectedChecklist?.name || "Checklist"}
                subtitle={
                  checklistMode === "complete"
                    ? `${progress.completed}/${progress.total} Complete`
                    : undefined
                }
                onCancel={handleInternalClose}
                cancelText={getCancelText()}
                onDone={
                  checklistMode === "complete"
                    ? handleInternalUpdateFromCompleteMode
                    : () => editContentRef.current?.save()
                }
                doneText="Update"
                doneDisabled={
                  checklistMode === "complete"
                    ? !isDirtyComplete
                    : !hasEditChanges()
                }
              />

              <View
                style={{
                  paddingHorizontal: getSpacing.lg,
                  paddingVertical: getSpacing.md,
                  backgroundColor: theme.surface,
                }}
              >
                <PillSelectionButton
                  options={[
                    { label: "Complete", value: "complete" },
                    { label: "Edit", value: "edit" },
                  ]}
                  selectedValue={checklistMode}
                  onSelect={(value) => {
                    if (checklistMode === "edit" && editContentRef.current) {
                      const currentState = editContentRef.current.getCurrentState();
                      const updatedChecklist = {
                        ...workingChecklist,
                        ...currentState,
                      };
                      setWorkingChecklist(updatedChecklist);
                      setUpdatedItems(currentState.items);
                      setInitialChecklist(JSON.parse(JSON.stringify(updatedChecklist))); // ← ADD THIS LINE
                    } else if (checklistMode === "complete") {
                      setWorkingChecklist((prev) => ({
                        ...prev,
                        items: updatedItems,
                      }));
                    }
                    setChecklistMode(value);
                  }}
                />
              </View>

              {checklistMode === "complete" ? (
                <ChecklistContent
                  checklist={{ ...workingChecklist, items: updatedItems }}
                  onItemToggle={(newItems) => {
                    setUpdatedItems(newItems);
                    setWorkingChecklist((prev) => ({
                      ...prev,
                      items: newItems,
                    }));
                  }}
                  onMoveItems={handleMoveItems}
                  pinnedChecklists={pinnedChecklists}
                />
              ) : (
                <EditChecklistContent
                  ref={editContentRef}
                  checklist={workingChecklist}
                  onSave={(checklist, shouldSaveAsTemplate) => {
                    handleInternalUpdateChecklist(
                      checklist,
                      shouldSaveAsTemplate
                    );
                  }}
                  isUserAdmin={user?.admin === true}
                  addReminder={true}
                  eventStartTime={
                    selectedChecklistEvent && !selectedChecklistEvent.isAllDay
                      ? new Date(selectedChecklistEvent.startTime)
                      : null
                  }
                  templates={templates || []}
                  onSaveTemplate={onSaveTemplate}
                  promptForContext={promptForContext}
                />
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </ModalWrapper>
    </>
  );
};

export default ChecklistModal;
