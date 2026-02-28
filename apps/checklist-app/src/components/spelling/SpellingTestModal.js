import React, { useState, useRef, useEffect } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { useTheme } from "@my-apps/contexts";
import {
  ModalWrapper,
  ModalHeader,
  PillSelectionButton,
  EditChecklistContent,
} from "@my-apps/ui";
import SpellingListContent from "./SpellingListContent";
import SpellingStatsView from "./SpellingStatsView";

/**
 * Modal for spelling list checklists.
 * Tabs: Practice | Stats | Edit
 *
 * Key design notes:
 * - `practiceKey` is the key for SpellingListContent. It only increments when
 *   the Edit tab saves new items, NOT when stats are persisted after a session.
 *   Without this, saving stats would remount SpellingListContent and kill the
 *   summary screen.
 * - `workingChecklist` tracks the latest checklist state locally, including
 *   stats updates from completed sessions.
 *
 * Props:
 *   visible               {boolean}
 *   checklist             {object}   - Pinned checklist object
 *   onClose               {function}
 *   onSaveChecklist       {function(updatedChecklist)} - Persists Edit-tab changes
 *   updatePinnedChecklist {function(updatedChecklist)} - Persists session stats
 *   user                  {object}
 *   allTemplates          {array}
 */
const SpellingTestModal = ({
  visible,
  checklist,
  onClose,
  onSaveChecklist,
  updatePinnedChecklist,
  user,
  allTemplates = [],
}) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();

  const [tabMode, setTabMode] = useState("practice");
  const [workingChecklist, setWorkingChecklist] = useState(null);
  const [hasEditChanges, setHasEditChanges] = useState(false);
  const [initialChecklist, setInitialChecklist] = useState(null);
  // Incrementing this key remounts SpellingListContent (resetting session state).
  // Only do this when the word list changes via Edit tab — not on stats saves.
  const [practiceKey, setPracticeKey] = useState(0);

  const editContentRef = useRef(null);

  // Initialise when modal opens or checklist identity changes
  useEffect(() => {
    if (visible && checklist) {
      setWorkingChecklist(checklist);
      setInitialChecklist(JSON.parse(JSON.stringify(checklist)));
      setTabMode("practice");
      setHasEditChanges(false);
    }
  }, [visible, checklist?.id]);

  const handleClose = () => {
    if (hasEditChanges && tabMode === "edit") {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes to the word list. Are you sure you want to close?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
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

  const handleSaveEdit = async (updatedChecklist) => {
    const saved = {
      ...updatedChecklist,
      updatedAt: new Date().toISOString(),
    };
    await onSaveChecklist(saved);
    setWorkingChecklist(saved);
    setInitialChecklist(JSON.parse(JSON.stringify(saved)));
    setHasEditChanges(false);
    // Force the Practice tab to restart with the updated word list
    setPracticeKey((k) => k + 1);
  };

  /**
   * Called by SpellingListContent when a session ends.
   * Updates workingChecklist in-place WITHOUT changing practiceKey,
   * so SpellingListContent stays mounted and the summary remains visible.
   */
  const handleSaveStats = async (updatedList) => {
    try {
      await updatePinnedChecklist(updatedList);
      // Merge updated stats into local state — do NOT reset practiceKey
      setWorkingChecklist((prev) => ({
        ...prev,
        items: updatedList.items,
        totalSessions: updatedList.totalSessions,
      }));
    } catch (e) {
      console.error("❌ Failed to save spelling stats:", e);
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      width: "100%",
      height: "90%",
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

  const isDoneVisible = tabMode === "edit";

  return (
    <ModalWrapper visible={visible} onClose={handleClose}>
      <View style={styles.overlay} pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%", height: "90%" }}
        >
          <View style={styles.container}>
            <ModalHeader
              title={workingChecklist.name || "Spelling Test"}
              onCancel={handleClose}
              cancelText={hasEditChanges ? "Cancel" : "Close"}
              onDone={
                isDoneVisible
                  ? () => editContentRef.current?.save()
                  : undefined
              }
              doneText="Update"
              doneDisabled={!hasEditChanges}
            />

            <View style={styles.pillRow}>
              <PillSelectionButton
                options={[
                  { label: "Practice", value: "practice" },
                  { label: "Stats", value: "stats" },
                  { label: "Edit", value: "edit" },
                ]}
                selectedValue={tabMode}
                onSelect={setTabMode}
              />
            </View>

            <View style={styles.content}>
              {tabMode === "practice" && (
                <SpellingListContent
                  key={practiceKey}
                  list={workingChecklist}
                  onSaveStats={handleSaveStats}
                />
              )}
              {tabMode === "stats" && (
                <SpellingStatsView list={workingChecklist} />
              )}
              {tabMode === "edit" && (
                <EditChecklistContent
                  ref={editContentRef}
                  checklist={workingChecklist}
                  onSave={handleSaveEdit}
                  onChangesDetected={(hasChanges) =>
                    setHasEditChanges(hasChanges)
                  }
                  initialChecklist={initialChecklist}
                  isUserAdmin={user?.admin === true}
                  addReminder={false}
                  templates={allTemplates}
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModalWrapper>
  );
};

export default SpellingTestModal;
