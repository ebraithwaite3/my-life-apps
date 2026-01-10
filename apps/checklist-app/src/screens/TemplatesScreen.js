import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme, useData } from "@my-apps/contexts";
import {
  PageHeader,
  EditChecklistContent,
  ModalWrapper,
  ModalHeader,
} from "@my-apps/ui";
import { Ionicons } from "@expo/vector-icons";
import TemplateCard from "../components/cards/TemplateCard";
import { useChecklistTemplates } from "@my-apps/hooks"; // NEW IMPORT

const TemplatesScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user } = useData();
  const editContentRef = React.useRef(null);
  const tabBarHeight = useBottomTabBarHeight();

  // NEW: Use the hook instead of inline logic
  const {
    allTemplates,
    saveTemplate,
    deleteTemplate,
    moveTemplate,
    getAvailableMoveTargets,
    promptForContext,
  } = useChecklistTemplates();

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateContext, setTemplateContext] = useState(null);

  const closeTemplateModal = () => {
    setShowEditModal(false);
    setSelectedTemplate(null);
    setTemplateContext(null);
  };

  // SIMPLIFIED: Uses hook's promptForContext
  const handleCreateTemplate = () => {
    promptForContext((context) => {
      setTemplateContext(context);
      setSelectedTemplate(null);
      setShowEditModal(true);
    });
  };

  const handleEditTemplate = (template) => {
    if (template.isGroupTemplate) {
      setTemplateContext({
        type: "group",
        groupId: template.groupId,
        groupName: template.groupName,
      });
    } else {
      setTemplateContext({ type: "personal" });
    }

    setSelectedTemplate(template);
    setShowEditModal(true);
  };

  // SIMPLIFIED: Uses hook's saveTemplate
  const handleSaveTemplate = async (template) => {
    const success = await saveTemplate(template, templateContext);
    
    if (success) {
      Alert.alert(
        "Success",
        `Template "${template.name}" ${
          selectedTemplate ? "updated" : "created"
        } successfully`
      );
      closeTemplateModal();
    }
  };

  // SIMPLIFIED: Uses hook's deleteTemplate
const handleDeleteTemplate = async (template) => {
  // Remove the Alert.alert wrapper - TemplateCard already confirms
  const success = await deleteTemplate(template);
  if (success) {
    Alert.alert("Success", "Template deleted successfully");
  }
};

  // SIMPLIFIED: Uses hook's moveTemplate
  const handleMoveTemplate = async (template, target) => {
    const success = await moveTemplate(template, target);
    if (success) {
      Alert.alert("Success", "Template moved successfully");
    }
  };

  const renderTemplate = ({ item }) => (
    <TemplateCard
      template={item}
      onPress={handleEditTemplate}
      onDelete={handleDeleteTemplate}
      onMove={handleMoveTemplate}
      availableMoveTargets={getAvailableMoveTargets(item)} // Uses hook method
    />
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      padding: getSpacing.sm,
      paddingTop: getSpacing.lg,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: getSpacing.xl,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: "center",
      marginTop: getSpacing.md,
    },
  });

  return (
    <View style={styles.container}>
      <PageHeader
        title="Templates"
        subtext="Reusable checklists"
        icons={[{ icon: "add", action: handleCreateTemplate }]}
      />

      <View style={styles.content}>
        {allTemplates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="document-text-outline"
              size={64}
              color={theme.text.tertiary}
            />
            <Text style={styles.emptyText}>
              No templates yet.{"\n"}Create a template to reuse checklists.
            </Text>
          </View>
        ) : (
          <FlatList
            data={allTemplates}
            renderItem={renderTemplate}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: tabBarHeight,
            }}
          />
        )}
      </View>

      <ModalWrapper visible={showEditModal} onClose={closeTemplateModal}>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
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
              title={selectedTemplate ? "Edit Template" : "New Template"}
              onCancel={closeTemplateModal}
              onDone={() => editContentRef.current?.save()}
              doneText={selectedTemplate ? "Update" : "Create"}
            />

            <EditChecklistContent
              ref={editContentRef}
              checklist={selectedTemplate}
              onSave={handleSaveTemplate} // CHANGED: No more onClose callback
              isUserAdmin={user?.admin === true}
              isTemplate
              addReminder
              templates={allTemplates} // NEW: Pass templates for "Save as Template" detection
            />
          </View>
        </View>
      </ModalWrapper>
    </View>
  );
};

export default TemplatesScreen;