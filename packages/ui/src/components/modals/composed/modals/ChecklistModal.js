import React, { useRef, useEffect, useState } from "react";
import { View, Alert, Keyboard } from "react-native";
import { useTheme } from "@my-apps/contexts";
import { calculateChecklistProgress } from "@my-apps/utils";
import { showSuccessToast } from "@my-apps/utils";
import ModalWrapper from "../../base/ModalWrapper";
import ModalHeader from "../../../headers/ModalHeader";
import ChecklistContent from "../../content/checklists/ChecklistContent";
import EditChecklistContent from "../../content/checklists/EditChecklistContent";
import PillSelectionButton from "../../../buttons/PillSelectionButton";

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
}) => {
  const { theme, getSpacing } = useTheme();
  const editContentRef = useRef(null);

  // Unified working state for the checklist
  const [workingChecklist, setWorkingChecklist] = useState(null);

  // Initialize working checklist when modal opens
  useEffect(() => {
    if (showChecklistModal && selectedChecklist) {
      setWorkingChecklist(selectedChecklist);
      setUpdatedItems(selectedChecklist.items || []);
      setIsDirtyComplete(false);
    }
  }, [showChecklistModal, selectedChecklist]);

  const progress =
    checklistMode === "complete" && updatedItems.length > 0
      ? calculateChecklistProgress(updatedItems)
      : { completed: 0, total: 0 };

  useEffect(() => {
    if (checklistMode !== "complete" || !selectedChecklist) return;

    const originalItems = selectedChecklist.items || [];
    const hasChanges =
      JSON.stringify(updatedItems) !== JSON.stringify(originalItems);

    setIsDirtyComplete(hasChanges);
  }, [updatedItems, selectedChecklist, checklistMode, setIsDirtyComplete]);

  // Internal handler for updating from Complete mode
  const handleInternalUpdateFromCompleteMode = async () => {
    // Build the updated checklist
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
    
    // Call external handler WITHOUT close callback - it will show Alert
    await handleUpdateChecklist(updatedChecklist, null, wasJustCompleted, true);
    
    // Dismiss keyboard and show toast on top of Alert
    Keyboard.dismiss();
    setTimeout(() => {
      showSuccessToast("Checklist saved", "", 2000, "top");
    }, 100);
    
    // Reset dirty state so button shows "Close"
    setIsDirtyComplete(false);
    
    // Don't close - stay in the checklist!
  };

  // Internal handler for updating from Edit mode
  const handleInternalUpdateChecklist = async (checklist, shouldSaveAsTemplate) => {
    // If saving as template, prompt FIRST before any other actions
    if (shouldSaveAsTemplate && onSaveTemplate && promptForContext) {
      await new Promise((resolve) => {
        promptForContext(async (context) => {
          await onSaveTemplate(checklist, context);
          resolve();
        });
      });
    }
    
    // Call external handler WITHOUT close callback - it will show Alert
    await handleUpdateChecklist(checklist, null);
    
    // Dismiss keyboard and show toast on top of Alert
    Keyboard.dismiss();
    setTimeout(() => {
      showSuccessToast("Checklist saved", "", 2000, "top");
    }, 100);
    
    // Update working state to reflect saved changes
    setWorkingChecklist(checklist);
    setUpdatedItems(checklist.items);
    setIsDirtyComplete(false);
    
    // Don't close - stay in the checklist!
  };

  // Internal handler for closing with confirmation if dirty
  const handleInternalClose = () => {
    if (isDirtyComplete && selectedChecklist) {
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
    return isDirtyComplete ? "Cancel" : "Close";
  };

  return (
    <>
      {/* Add Checklist Modal */}
      <ModalWrapper
        visible={addChecklistModalVisible}
        onClose={closeChecklistModal}
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
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              width: "100%",
              height: "90%",
              overflow: "hidden",
            }}
          >
            <ModalHeader
              title={
                selectedEvent
                  ? `${selectedEvent.title} Checklist`
                  : "New Checklist"
              }
              onCancel={closeChecklistModal}
              onDone={() => editContentRef.current?.save()}
              doneText="Create"
            />

            <EditChecklistContent
              ref={editContentRef}
              addReminder={true}
              eventStartTime={
                selectedEvent && !selectedEvent.isAllDay
                  ? new Date(selectedEvent.startTime)
                  : null
              }
              checklist={null}
              onSave={async (checklist, shouldSaveAsTemplate) => {
                // If saving as template, prompt FIRST before any other actions
                if (shouldSaveAsTemplate && onSaveTemplate && promptForContext) {
                  await new Promise((resolve) => {
                    promptForContext(async (context) => {
                      await onSaveTemplate(checklist, context);
                      resolve();
                    });
                  });
                }
                
                // Now save to event (this will show success alert)
                handleSaveChecklist(checklist, closeChecklistModal);
              }}
              prefilledTitle={
                selectedEvent ? `${selectedEvent.title} Checklist` : ""
              }
              isUserAdmin={user?.admin === true}
              templates={templates || []}
              onSaveTemplate={onSaveTemplate}
              promptForContext={promptForContext}
            />
          </View>
        </View>
      </ModalWrapper>

      {/* View/Complete Checklist Modal */}
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
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              width: "100%",
              height: "90%",
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
                checklistMode === "complete" ? !isDirtyComplete : false
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
                  // Sync state when switching modes
                  if (checklistMode === 'edit' && editContentRef.current) {
                    // Switching FROM edit TO complete - get current state from edit
                    const currentState = editContentRef.current.getCurrentState();
                    const updatedChecklist = { ...workingChecklist, ...currentState };
                    setWorkingChecklist(updatedChecklist);
                    setUpdatedItems(currentState.items);
                    setIsDirtyComplete(false);
                  } else if (checklistMode === 'complete') {
                    // Switching FROM complete TO edit - update working checklist with items
                    setWorkingChecklist(prev => ({ ...prev, items: updatedItems }));
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
                  setWorkingChecklist(prev => ({ ...prev, items: newItems }));
                }}
              />
            ) : (
              <EditChecklistContent
                ref={editContentRef}
                checklist={workingChecklist}
                onSave={(checklist, shouldSaveAsTemplate) => {
                  handleInternalUpdateChecklist(checklist, shouldSaveAsTemplate);
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
        </View>
      </ModalWrapper>
    </>
  );
};

export default ChecklistModal;