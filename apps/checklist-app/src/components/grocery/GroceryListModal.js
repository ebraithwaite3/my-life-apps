import React, { useState, useEffect, useRef } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { useTheme } from "@my-apps/contexts";
import { showSuccessToast } from "@my-apps/utils";
import {
  ModalWrapper,
  ModalHeader,
  PillSelectionButton,
  ChecklistContent,
  EditChecklistContent,
} from "@my-apps/ui";
import AddMealsContent from "./AddMealsContent";

/**
 * Modal for "Grocery List" checklists.
 * Tabs: List | Add Meals | Edit
 * Mirrors the usePinnedChecklistModal pattern used by the regular checklist modal.
 *
 * Props:
 *   visible         {boolean}
 *   checklist       {object}
 *   onClose         {function}
 *   onSaveChecklist {function(updatedChecklist)} - Index-based replace, no duplicates
 */
const GroceryListModal = ({
  visible,
  checklist,
  onClose,
  onSaveChecklist,
}) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();

  const [tabMode, setTabMode] = useState("list");
  const [workingChecklist, setWorkingChecklist] = useState(null);
  const [initialChecklist, setInitialChecklist] = useState(null);
  const [updatedItems, setUpdatedItems] = useState([]);
  const [isDirtyList, setIsDirtyList] = useState(false);
  const [hasEditChanges, setHasEditChanges] = useState(false);

  const editContentRef = useRef(null);

  // Init / reset when modal opens
  useEffect(() => {
    if (visible && checklist) {
      setWorkingChecklist(checklist);
      setInitialChecklist(JSON.parse(JSON.stringify(checklist)));
      setUpdatedItems(checklist.items || []);
      setTabMode("list");
      setIsDirtyList(false);
      setHasEditChanges(false);
    }
  }, [visible, checklist?.id]);

  // Track unsaved toggle changes in List tab (mirrors isDirtyComplete)
  useEffect(() => {
    if (!initialChecklist) return;
    const hasChanges =
      JSON.stringify(updatedItems) !==
      JSON.stringify(initialChecklist.items || []);
    setIsDirtyList(hasChanges);
  }, [updatedItems, initialChecklist]);

  const hasPendingChanges =
    (tabMode === "list" && isDirtyList) ||
    (tabMode === "edit" && hasEditChanges);

  const handleClose = () => {
    if (hasPendingChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to close?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setIsDirtyList(false);
              setHasEditChanges(false);
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  // List tab: item toggled — local state only (same as regular modal's onItemToggle)
  const handleItemToggle = (newItems) => {
    setUpdatedItems(newItems);
    setWorkingChecklist((prev) => ({ ...prev, items: newItems }));
  };

  // List tab: explicit Update button (mirrors handleUpdateFromCompleteMode)
  const handleSaveList = async () => {
    const updated = {
      ...workingChecklist,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };
    await onSaveChecklist(updated);
    setWorkingChecklist(updated);
    setInitialChecklist(JSON.parse(JSON.stringify(updated)));
    setIsDirtyList(false);
    setTimeout(() => showSuccessToast("Checklist saved", "", 2000, "top"), 100);
  };

  // List tab: sort/clear save (called by ChecklistContent internally)
  const handleSaveListFromContent = async (updatedChecklist) => {
    await onSaveChecklist(updatedChecklist);
    setWorkingChecklist(updatedChecklist);
    setUpdatedItems(updatedChecklist.items || []);
    setInitialChecklist(JSON.parse(JSON.stringify(updatedChecklist)));
    setIsDirtyList(false);
  };

  // Add Meals tab: meal added or removed — saves immediately and advances baseline
  // so switching to List/Edit tab afterwards doesn't show false "Cancel"
  const handleUpdateList = async (updatedChecklist) => {
    setWorkingChecklist(updatedChecklist);
    setUpdatedItems(updatedChecklist.items || []);
    try {
      await onSaveChecklist(updatedChecklist);
      setInitialChecklist(JSON.parse(JSON.stringify(updatedChecklist)));
    } catch (e) {
      console.error("❌ GroceryListModal meal update failed:", e);
    }
  };

  // Edit tab: saved — spread workingChecklist first to preserve isGroupChecklist,
  // groupId, order, etc. so handleSaveGroceryChecklist builds the right context
  const handleSaveEdit = async (updatedChecklist) => {
    const saved = {
      ...workingChecklist,
      ...updatedChecklist,
      updatedAt: new Date().toISOString(),
    };
    await onSaveChecklist(saved);
    const snapshot = JSON.parse(JSON.stringify(saved));
    setWorkingChecklist(saved);
    setInitialChecklist(snapshot);
    setUpdatedItems(saved.items || []);
    setHasEditChanges(false);
    setTabMode("list");
  };

  const getDoneHandler = () => {
    if (tabMode === "edit") return () => editContentRef.current?.save();
    if (tabMode === "list") return handleSaveList;
    return undefined; // meals tab saves immediately on add/remove
  };

  const getDoneDisabled = () => {
    if (tabMode === "edit") return !hasEditChanges;
    if (tabMode === "list") return !isDirtyList;
    return true;
  };

  const styles = StyleSheet.create({
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      width: "100%",
      flex: 1,
      overflow: "hidden",
    },
    pillRow: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      backgroundColor: theme.surface,
    },
    content: {
      flex: 1,
    },
  });

  if (!workingChecklist) return null;

  return (
    <ModalWrapper visible={visible} onClose={handleClose}>
      <View style={styles.overlay} pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%", height: "90%" }}
        >
          <View style={styles.container}>
            <ModalHeader
              title={workingChecklist.name || "Grocery List"}
              onCancel={handleClose}
              cancelText={hasPendingChanges ? "Cancel" : "Close"}
              onDone={getDoneHandler()}
              doneText="Update"
              doneDisabled={getDoneDisabled()}
            />

            <View style={styles.pillRow}>
              <PillSelectionButton
                options={[
                  { label: "List", value: "list" },
                  { label: "Add Meals", value: "meals" },
                  { label: "Edit", value: "edit" },
                ]}
                selectedValue={tabMode}
                onSelect={setTabMode}
              />
            </View>

            <View style={styles.content}>
              {tabMode === "list" && (
                <ChecklistContent
                  checklist={{ ...workingChecklist, items: updatedItems }}
                  onItemToggle={handleItemToggle}
                  onSaveChecklist={handleSaveListFromContent}
                  onCloseParentModal={handleClose}
                />
              )}
              {tabMode === "meals" && (
                <AddMealsContent
                  list={{ ...workingChecklist, items: updatedItems }}
                  onUpdateList={handleUpdateList}
                />
              )}
              {tabMode === "edit" && (
                <EditChecklistContent
                  ref={editContentRef}
                  checklist={workingChecklist}
                  initialChecklist={initialChecklist}
                  onSave={handleSaveEdit}
                  onChangesDetected={(hasChanges) =>
                    setHasEditChanges(hasChanges)
                  }
                  addReminder={false}
                  isUserAdmin={false}
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModalWrapper>
  );
};

export default GroceryListModal;
