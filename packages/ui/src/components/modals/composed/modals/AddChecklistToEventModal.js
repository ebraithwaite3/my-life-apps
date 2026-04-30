import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "@my-apps/contexts";
import { ModalWrapper } from "../../base";
import { ModalHeader } from "../../../headers";
import { OptionsSelectionModal } from "../pickers";
import EditChecklistContent from "../../content/checklists/EditChecklistContent";

/**
 * AddChecklistToEventModal - Modal for adding a checklist to an existing event
 * 
 * Allows selecting from templates or creating new, with full reminder control
 */
const AddChecklistToEventModal = ({
  visible,
  onClose,
  onSuccess,
  selectedEvent,
  preselectedChecklist = null,
  templates = [],
  onSaveChecklist,
  onSaveTemplate,
  promptForContext,
  isUserAdmin = false,
  useQuickAddMode = false,
  pinnedChecklists = [],
  carryoverItems = [],
}) => {
  const { theme, getBorderRadius } = useTheme();
  const editContentRef = useRef(null);

  const isToDoEvent = selectedEvent?.title?.trim().toLowerCase().includes('to do');

  useEffect(() => {
    if (visible) {
      console.log('[AddChecklist] OPENED — selectedEvent title:', selectedEvent?.title, '| isToDoEvent:', isToDoEvent, '| carryoverItems count:', carryoverItems.length, carryoverItems.map(i => i.name));
    }
  }, [visible]);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [hasPickedTemplate, setHasPickedTemplate] = useState(false);

  // ✅ Initialize with preselected checklist
  useEffect(() => {
    if (visible && preselectedChecklist) {
      setSelectedChecklist(preselectedChecklist);
      setHasPickedTemplate(true);  // Skip template selector
    }
  }, [visible, preselectedChecklist]);

  // Show template picker on mount if templates exist AND no preselected checklist
  useEffect(() => {
    if (visible && templates.length > 0 && !hasPickedTemplate && !preselectedChecklist) {  // ✅ UPDATED
      setShowTemplateModal(true);
    }
  }, [visible, templates.length, hasPickedTemplate, preselectedChecklist]);  // ✅ UPDATED

  // Build template options
  const templateOptions = [
    {
      id: "new",
      label: "➕ Create New Checklist",
      value: "new",
    },
    ...templates.map((template) => ({
      id: template.id,
      label: template.name,
      value: template.id,
      template: template,
    })),
  ];

  // Handle template selection
  const handleTemplateSelect = (option) => {
    console.log('[AddChecklist] handleTemplateSelect — option:', option.value, '| selectedEvent:', selectedEvent?.title, '| isToDoEvent:', isToDoEvent, '| carryoverItems:', carryoverItems.length, carryoverItems.map(i => i.name));
    setShowTemplateModal(false);
    setHasPickedTemplate(true);

    if (option.value === "new") {
      // Create new - clear selection
      setSelectedChecklist(null);
      return;
    }

    // Use template
    const template = option.template;
    const templateItems = template.items.map((item, index) => {
      const instantiated = {
        ...item,
        id: item.id || `item_${Date.now()}_${index}`,
        completed: false,
      };

      // Reset any runtime yesNo state that may have leaked into the template
      if (instantiated.yesNoConfig) {
        const { answered, answer, ...staticConfig } = instantiated.yesNoConfig;
        instantiated.yesNoConfig = staticConfig;
      }

      // Clear runtime-generated sub-items (multiChoice/fillIn/guided generate these at answer time)
      if (instantiated.subItems && instantiated.itemType === 'yesNo' &&
          ['multiChoice', 'fillIn', 'guided', 'assignable'].includes(instantiated.yesNoConfig?.type)) {
        delete instantiated.subItems;
      }

      // Reset completion and yesNo state on header sub-items
      if (instantiated.subItems && Array.isArray(instantiated.subItems)) {
        instantiated.subItems = instantiated.subItems.map((sub) => {
          const resetSub = { ...sub, completed: false };
          if (resetSub.yesNoConfig) {
            const { answered: _a, answer: _b, ...staticSubConfig } = resetSub.yesNoConfig;
            resetSub.yesNoConfig = staticSubConfig;
          }
          return resetSub;
        });
      }

      return instantiated;
    });

    // For To Do events: append yesterday's incomplete items that aren't already in the template
    let carryoverToMerge = [];
    if (isToDoEvent && carryoverItems.length > 0) {
      const templateNames = new Set(
        templateItems.map((item) => (item.name || '').trim().toLowerCase())
      );
      carryoverToMerge = carryoverItems
        .filter((item) => !templateNames.has((item.name || '').trim().toLowerCase()))
        .map((item) => ({
          ...item,
          id: `carryover_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          completed: false,
          yesNoConfig: item.yesNoConfig
            ? { ...item.yesNoConfig, answered: false, answer: null }
            : null,
          subItems: (item.subItems || []).map((sub) => ({
            ...sub,
            completed: false,
            yesNoConfig: sub.yesNoConfig
              ? { ...sub.yesNoConfig, answered: false, answer: null }
              : null,
          })),
        }));
      console.log('[AddChecklist] To Do carryover — raw:', carryoverItems.length, '| template names:', [...templateNames], '| merging:', carryoverToMerge.length, carryoverToMerge.map(i => i.name));
    } else {
      console.log('[AddChecklist] Skipping carryover — isToDoEvent:', isToDoEvent, '| carryoverItems:', carryoverItems.length);
    }

    const newChecklist = {
      id: `checklist_${Date.now()}`,
      name: template.name,
      items: [...templateItems, ...carryoverToMerge],
      createdAt: Date.now(),
      ...(template.defaultNotifyAdmin && { notifyAdmin: true }),
    };

    setSelectedChecklist(newChecklist);
  };

  // Handle save
  const handleSave = () => {
    if (editContentRef.current) {
      editContentRef.current.save();
    }
  };

  // Handle checklist save from EditChecklistContent
  const handleChecklistSave = async (checklist, shouldSaveAsTemplate) => {
    await onSaveChecklist(checklist, handleClose);

    if (shouldSaveAsTemplate && onSaveTemplate && promptForContext) {
      promptForContext(async (context) => {
        await onSaveTemplate(checklist, context);
      });
    }

    // Call onSuccess after saving checklist and template
    if (onSuccess) {
      onSuccess();
    }
  };

  // Handle close
  const handleClose = () => {
    setSelectedChecklist(null);
    setHasPickedTemplate(false);
    setShowTemplateModal(false);
    onClose();
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
    modalContent: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      width: "100%",
      height: "90%",
      overflow: "hidden",
    },
  });

  if (!visible) return null;

  return (
    <ModalWrapper visible={visible} onClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? -55 : 0}
          style={{ width: "100%", height: "90%" }}
        >
          <View style={styles.modalContent}>
            <ModalHeader
              title="Add Checklist"
              subtitle={selectedEvent?.title}
              onCancel={handleClose}
              onDone={handleSave}
              doneText="Add"
            />

            <EditChecklistContent
              key={selectedChecklist?.id || 'new'}
              ref={editContentRef}
              checklist={selectedChecklist}
              carryoverItems={selectedChecklist ? [] : carryoverItems}
              onSave={handleChecklistSave}
              isUserAdmin={isUserAdmin}
              addReminder={true}
              eventStartTime={
                selectedEvent && !selectedEvent.isAllDay
                  ? new Date(selectedEvent.startTime)
                  : null
              }
              templates={templates}
              useQuickAddMode={useQuickAddMode}
              pinnedChecklists={pinnedChecklists}

            />
          </View>
        </KeyboardAvoidingView>

        {/* Template Selection Modal */}
        <OptionsSelectionModal
          visible={showTemplateModal}
          title="Select Template"
          options={templateOptions}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateModal(false)}
        />
      </View>

    </ModalWrapper>
  );
};

export default AddChecklistToEventModal;