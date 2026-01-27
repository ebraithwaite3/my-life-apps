import React, { useRef, useState } from "react";
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
  preselectedChecklist = null,  // ✅ ADDED
  templates = [],
  onSaveChecklist,
  onSaveTemplate,
  promptForContext,
  isUserAdmin = false,
}) => {
  const { theme, getBorderRadius } = useTheme();
  const editContentRef = useRef(null);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [hasPickedTemplate, setHasPickedTemplate] = useState(false);

  // ✅ Initialize with preselected checklist
  React.useEffect(() => {
    if (visible && preselectedChecklist) {
      setSelectedChecklist(preselectedChecklist);
      setHasPickedTemplate(true);  // Skip template selector
    }
  }, [visible, preselectedChecklist]);

  // Show template picker on mount if templates exist AND no preselected checklist
  React.useEffect(() => {
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
    setShowTemplateModal(false);
    setHasPickedTemplate(true);

    if (option.value === "new") {
      // Create new - clear selection
      setSelectedChecklist(null);
      return;
    }

    // Use template
    const template = option.template;
    const newChecklist = {
      id: `checklist_${Date.now()}`,
      name: template.name,
      items: template.items.map((item, index) => ({
        ...item,
        id: item.id || `item_${Date.now()}_${index}`,
        completed: false,
      })),
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
              onSave={handleChecklistSave}
              isUserAdmin={isUserAdmin}
              addReminder={true}
              eventStartTime={
                selectedEvent && !selectedEvent.isAllDay
                  ? new Date(selectedEvent.startTime)
                  : null
              }
              templates={templates}
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