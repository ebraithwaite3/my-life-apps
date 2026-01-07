import React, { useRef, useEffect } from "react";
import { View } from "react-native";
import { useTheme } from "@my-apps/contexts";
import { calculateChecklistProgress } from "@my-apps/utils";
import ModalWrapper from "../../base/ModalWrapper";
import ModalHeader from "../../../headers/ModalHeader";
import ChecklistContent from "../../content/checklists/ChecklistContent";
import EditChecklistContent from "../../content/checklists/EditChecklistContent";
import PillSelectionButton from "../../../buttons/PillSelectionButton";

/**
 * ChecklistModal - Reusable checklist modal component
 *
 * Used by ALL apps (checklist, workout, golf)
 * Renders both Add and View/Edit checklist modals
 */
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
}) => {
  const { theme, getSpacing } = useTheme();
  const editContentRef = useRef(null);

  // Calculate progress directly (no memo needed - it's fast)
  const progress =
    checklistMode === "complete" && updatedItems.length > 0
      ? calculateChecklistProgress(updatedItems)
      : { completed: 0, total: 0 };

  // Detect changes in complete mode
  useEffect(() => {
    if (checklistMode !== "complete" || !selectedChecklist) return;

    const originalItems = selectedChecklist.items || [];

    // Deep compare using JSON.stringify to catch sub-item changes
    const hasChanges =
      JSON.stringify(updatedItems) !== JSON.stringify(originalItems);

    console.log("🔍 Dirty check:", {
      checklistMode,
      originalItemsCount: originalItems.length,
      updatedItemsCount: updatedItems.length,
      hasChanges,
    });

    setIsDirtyComplete(hasChanges);
  }, [updatedItems, selectedChecklist, checklistMode, setIsDirtyComplete]);

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
              onSave={(checklist, shouldSaveAsTemplate) => {
                // Ignore shouldSaveAsTemplate - calendar events don't use templates
                handleSaveChecklist(checklist, closeChecklistModal);
              }}
              prefilledTitle={
                selectedEvent ? `${selectedEvent.title} Checklist` : ""
              }
              isUserAdmin={user?.admin === true}
              templates={[]} // Empty array - calendar checklists don't use templates
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
              onCancel={closeViewChecklistModal}
              onDone={
                checklistMode === "complete"
                  ? handleUpdateFromCompleteMode
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
                  setChecklistMode(value);
                  if (value === "complete") {
                    setUpdatedItems(selectedChecklist?.items || []);
                    setIsDirtyComplete(false);
                  }
                }}
              />
            </View>

            {checklistMode === "complete" ? (
              <ChecklistContent
                checklist={{ ...selectedChecklist, items: updatedItems }}
                onItemToggle={setUpdatedItems}
              />
            ) : (
              <EditChecklistContent
                ref={editContentRef}
                checklist={selectedChecklist}
                onSave={(checklist, shouldSaveAsTemplate) => {
                  // Ignore shouldSaveAsTemplate - calendar events don't use templates
                  handleUpdateChecklist(checklist, closeViewChecklistModal);
                }}
                isUserAdmin={user?.admin === true}
                addReminder={true}
                eventStartTime={
                  selectedChecklistEvent && !selectedChecklistEvent.isAllDay
                    ? new Date(selectedChecklistEvent.startTime)
                    : null
                }
                templates={[]} // Empty array - calendar checklists don't use templates
              />
            )}
          </View>
        </View>
      </ModalWrapper>
    </>
  );
};

export default ChecklistModal;
