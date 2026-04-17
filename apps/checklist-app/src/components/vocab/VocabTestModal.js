import React, { useState, useEffect, useRef } from "react";
import * as Crypto from 'expo-crypto';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { useTheme } from "@my-apps/contexts";
import { ModalWrapper, ModalHeader, PillSelectionButton } from "@my-apps/ui";
import FlashCardContent from "./FlashCardContent";
import VocabQuizContent from "./VocabQuizContent";
import EditVocabContent from "./EditVocabContent";

/**
 * Modal for vocab list checklists.
 * Tabs: Flash Cards (default) | Quiz | Edit
 *
 * Key design notes (mirrors SpellingTestModal):
 * - `practiceKey` increments only when Edit tab saves new items, NOT on stats saves.
 * - `workingChecklist` tracks the latest checklist state locally.
 * - Create mode: when `checklist` prop is null, opens in Edit tab with blank state.
 *
 * Props:
 *   visible               {boolean}
 *   checklist             {object|null}  - null for create mode
 *   onClose               {function}
 *   onSaveChecklist       {function(updatedChecklist)} - Persists edit-tab changes (create or update)
 *   updatePinnedChecklist {function(updatedChecklist)} - Persists session stats
 *   user                  {object}
 */
const VocabTestModal = ({
  visible,
  checklist,
  onClose,
  onSaveChecklist,
  updatePinnedChecklist,
  user,
}) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();

  const isCreateMode = !checklist;

  const [tabMode, setTabMode] = useState(isCreateMode ? "edit" : "flashcards");
  const [workingChecklist, setWorkingChecklist] = useState(null);
  const [hasEditChanges, setHasEditChanges] = useState(false);
  const [initialChecklist, setInitialChecklist] = useState(null);
  const [practiceKey, setPracticeKey] = useState(0);

  const editContentRef = useRef(null);

  // Initialise when modal opens or checklist identity changes
  useEffect(() => {
    if (visible) {
      if (checklist) {
        setWorkingChecklist(checklist);
        setInitialChecklist(JSON.parse(JSON.stringify(checklist)));
        setTabMode("flashcards");
      } else {
        // Create mode — assign ID now so a second list doesn't overwrite the first
        const newId = Crypto.randomUUID();
        setWorkingChecklist({
          id: newId,
          name: "",
          items: [],
          listType: "vocab",
          totalSessions: 0,
        });
        setInitialChecklist({ id: newId, name: "", items: [], listType: "vocab", totalSessions: 0 });
        setTabMode("edit");
      }
      setHasEditChanges(false);
    }
  }, [visible, checklist?.id]);

  const handleClose = () => {
    if (hasEditChanges && tabMode === "edit") {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to close?",
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
      listType: "vocab",
      updatedAt: new Date().toISOString(),
    };
    await onSaveChecklist(saved);
    setWorkingChecklist(saved);
    setInitialChecklist(JSON.parse(JSON.stringify(saved)));
    setHasEditChanges(false);
    // Increment to reset any active quiz session with new word list
    setPracticeKey((k) => k + 1);
    // After creating/saving, move to Flash Cards tab
    setTabMode("flashcards");
  };

  /**
   * Called by VocabQuizContent when a quiz session ends.
   * Updates workingChecklist in-place WITHOUT incrementing practiceKey,
   * so VocabQuizContent stays mounted and the summary remains visible.
   */
  const handleSaveStats = async (updatedList) => {
    try {
      await updatePinnedChecklist(updatedList);
      setWorkingChecklist((prev) => ({
        ...prev,
        items: updatedList.items,
        totalSessions: updatedList.totalSessions,
      }));
    } catch (e) {
      console.error("❌ Failed to save vocab stats:", e);
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

  const isDoneVisible = tabMode === "edit";
  const modalTitle = isCreateMode && !workingChecklist.id
    ? "New Vocab List"
    : workingChecklist.name || "Vocab List";

  return (
    <ModalWrapper visible={visible} onClose={handleClose}>
      <View style={styles.overlay} pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%", height: "90%" }}
        >
        <View style={styles.container}>
            <ModalHeader
              title={modalTitle}
              onCancel={handleClose}
              cancelText={hasEditChanges ? "Cancel" : "Close"}
              onDone={isDoneVisible ? () => editContentRef.current?.save() : undefined}
              doneText={workingChecklist.id ? "Update" : "Create"}
              doneDisabled={!hasEditChanges}
            />

            <View style={styles.pillRow}>
              <PillSelectionButton
                options={[
                  { label: "Flash Cards", value: "flashcards" },
                  { label: "Quiz", value: "quiz" },
                  { label: "Edit", value: "edit" },
                ]}
                selectedValue={tabMode}
                onSelect={setTabMode}
              />
            </View>

            <View style={styles.content}>
              {tabMode === "flashcards" && (
                <FlashCardContent list={workingChecklist} />
              )}
              {tabMode === "quiz" && (
                <VocabQuizContent
                  key={practiceKey}
                  list={workingChecklist}
                  onSaveStats={handleSaveStats}
                />
              )}
              {tabMode === "edit" && (
                <EditVocabContent
                  ref={editContentRef}
                  checklist={workingChecklist}
                  onSave={handleSaveEdit}
                  onChangesDetected={(hasChanges) => setHasEditChanges(hasChanges)}
                />
              )}
            </View>
        </View>
        </KeyboardAvoidingView>
      </View>
    </ModalWrapper>
  );
};

export default VocabTestModal;
