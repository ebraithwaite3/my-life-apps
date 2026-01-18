import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme, useData } from "@my-apps/contexts";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PageHeader,
  EditChecklistContent,
  ModalWrapper,
  ModalHeader,
  SortModal,
  CustomOrderModal,
} from "@my-apps/ui";
import { Ionicons } from "@expo/vector-icons";
import TemplateCard from "../components/cards/TemplateCard";
import { useChecklistTemplates } from "@my-apps/hooks";
import { applySorting } from "@my-apps/utils";

const SORT_KEY = '@checklist_templates_sort';

const TemplatesScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user, isUserAdmin } = useData();
  const editContentRef = React.useRef(null);
  const tabBarHeight = useBottomTabBarHeight();

  const {
    allTemplates,
    saveTemplate,
    deleteTemplate,
    moveTemplate,
    getAvailableMoveTargets,
    updateTemplateOrder,
    promptForContext,
  } = useChecklistTemplates();

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateContext, setTemplateContext] = useState(null);
  const [currentSort, setCurrentSort] = useState('a-z');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showCustomOrderModal, setShowCustomOrderModal] = useState(false);
  const [hasSortBeenChanged, setHasSortBeenChanged] = useState(false);

  // Load saved sort preference
  useEffect(() => {
    loadSortPreference();
  }, []);

  const loadSortPreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(SORT_KEY);
      if (saved) {
        setCurrentSort(saved);
      }
    } catch (error) {
      console.error('Failed to load sort preference:', error);
    }
  };

  const saveSortPreference = async (sortType) => {
    try {
      await AsyncStorage.setItem(SORT_KEY, sortType);
      setCurrentSort(sortType);
    } catch (error) {
      console.error('Failed to save sort preference:', error);
    }
  };

  // Sort options
  const sortOptions = [
    { id: 'a-z', label: 'A to Z', icon: 'text-outline' },
    { id: 'z-a', label: 'Z to A', icon: 'text-outline' },
    { id: 'newest', label: 'Newest First', icon: 'time-outline' },
    { id: 'oldest', label: 'Oldest First', icon: 'time-outline' },
    { id: 'custom', label: 'Custom Order', icon: 'list-outline' },
    { id: 'edit-custom', label: 'Edit Custom Order', icon: 'reorder-three-outline', closesModal: true },
  ];

  // Apply current sort
  const sortedTemplates = applySorting(allTemplates, currentSort);

  const closeTemplateModal = () => {
    setShowEditModal(false);
    setSelectedTemplate(null);
    setTemplateContext(null);
  };

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

  const handleSaveTemplate = async (template) => {
    const templateToSave = selectedTemplate
      ? {
          ...selectedTemplate,
          ...template,
          updatedAt: new Date().toISOString(),
        }
      : {
          ...template,
          id: template.id || `template_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };

    const success = await saveTemplate(templateToSave, templateContext);
    
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

  const handleDeleteTemplate = async (template) => {
    const success = await deleteTemplate(template);
    if (success) {
      Alert.alert("Success", "Template deleted successfully");
    }
  };

  const handleMoveTemplate = async (template, target) => {
    const success = await moveTemplate(template, target);
    if (success) {
      Alert.alert("Success", "Template moved successfully");
    }
  };

  // Handle sort selection
  const handleSortChange = (sortType) => {
    if (sortType === 'edit-custom') {
      setShowCustomOrderModal(true);
    } else {
      saveSortPreference(sortType);
      setHasSortBeenChanged(true); // Mark that sort has changed
    }
  };

  // Save custom order
  const handleSaveCustomOrder = async (newOrder) => {
    const success = await updateTemplateOrder(newOrder);
    if (success) {
      saveSortPreference('custom');
      setShowCustomOrderModal(false);
      Alert.alert("Success", "Custom order saved");
    }
  };

  const handleCloseSortModal = () => {
    setShowSortModal(false);
    setHasSortBeenChanged(false); // Reset when closing
  };

  const renderTemplate = ({ item }) => (
    <TemplateCard
      template={item}
      onPress={handleEditTemplate}
      onDelete={handleDeleteTemplate}
      onMove={handleMoveTemplate}
      availableMoveTargets={getAvailableMoveTargets(item)}
    />
  );

  const EmptyState = () => (
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
        icons={[
          ...(user?.admin ? [{ 
            icon: "swap-vertical", 
            action: () => {
              setShowSortModal(true);
              setHasSortBeenChanged(false); // Reset when opening
            }
          }] : []),
          { 
            icon: "add", 
            action: handleCreateTemplate 
          },
        ]}
      />

      <View style={styles.content}>
        {allTemplates.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            data={sortedTemplates}
            renderItem={renderTemplate}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: tabBarHeight,
            }}
          />
        )}
      </View>

      {/* Sort Selection Modal */}
      <SortModal
        visible={showSortModal}
        onClose={handleCloseSortModal}
        options={sortOptions}
        currentSort={currentSort}
        onSelectSort={handleSortChange}
        headerRightContent={
          <TouchableOpacity onPress={handleCloseSortModal}>
            <Ionicons 
              name={hasSortBeenChanged ? "checkmark" : "close"} 
              size={24} 
              color={hasSortBeenChanged ? theme.success : theme.text.secondary} 
            />
          </TouchableOpacity>
        }
      />

      {/* Custom Order Modal */}
      <CustomOrderModal
        visible={showCustomOrderModal}
        items={sortedTemplates}
        onSave={handleSaveCustomOrder}
        onClose={() => setShowCustomOrderModal(false)}
        keyExtractor={(item) => item.id}
        getItemName={(item) => item.name}
      />

      {/* Edit Template Modal */}
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
                title={selectedTemplate ? "Edit Template" : "New Template"}
                onCancel={closeTemplateModal}
                onDone={() => editContentRef.current?.save()}
                doneText={selectedTemplate ? "Update" : "Create"}
              />

              <EditChecklistContent
                ref={editContentRef}
                checklist={selectedTemplate}
                onSave={handleSaveTemplate}
                isUserAdmin={user?.admin === true}
                isTemplate
                addReminder
                templates={allTemplates}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </ModalWrapper>
    </View>
  );
};

export default TemplatesScreen;