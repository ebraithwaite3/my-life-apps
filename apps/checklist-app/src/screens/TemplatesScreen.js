import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, useData, useAuth } from "@my-apps/contexts";
import { PageHeader, EditChecklistContent, ModalWrapper, ModalHeader } from "@my-apps/ui";
import { Ionicons } from "@expo/vector-icons";
import { doc, updateDoc } from "firebase/firestore";
import TemplateCard from "../components/cards/TemplateCard";

const TemplatesScreen = () => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { db } = useAuth();
  const { user, groups } = useData();
  const editContentRef = React.useRef(null); // Ref for EditChecklistContent
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateContext, setTemplateContext] = useState(null); // { type: 'personal' | 'group', groupId?: string, groupName?: string }
  console.log("templateContext:", templateContext);

  // Get all templates from user and groups
  const allTemplates = useMemo(() => {
    const templates = [];

    // Personal templates from user doc
    if (user?.checklistTemplates) {
      user.checklistTemplates.forEach(template => {
        templates.push({
          ...template,
          userId: user.userId,
          isPersonal: true,
        });
      });
    }

    // Group templates from each group (groups is an array)
    if (groups && groups.length > 0) {
      groups.forEach(group => {
        if (group?.checklistTemplates) {
          group.checklistTemplates.forEach(template => {
            templates.push({
              ...template,
              groupId: group.groupId || group.id,
              groupName: group.name || group.groupId,
              isGroupTemplate: true,
            });
          });
        }
      });
    }

    return templates;
  }, [user, groups]);

  const closeTemplateModal = () => {
    setShowEditModal(false);
    setSelectedTemplate(null);
    setTemplateContext(null);
  };

  const handleCreateTemplate = () => {
    // groups is already an array from useData()
    if (!groups || groups.length === 0) {
      // No groups - create personal template directly
      setTemplateContext({ type: 'personal' });
      setSelectedTemplate(null);
      setShowEditModal(true);
    } else {
      // Has groups - show alert to choose
      const options = [
        {
          text: 'Personal Template',
          onPress: () => {
            setTemplateContext({ type: 'personal' });
            setSelectedTemplate(null);
            setShowEditModal(true);
          }
        },
        ...groups.map((group) => ({
          text: `${group.name || group.groupId} Template`,
          onPress: () => {
            setTemplateContext({ 
              type: 'group', 
              groupId: group.groupId || group.id,
              groupName: group.name || group.groupId 
            });
            setSelectedTemplate(null);
            setShowEditModal(true);
          }
        })),
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ];

      Alert.alert(
        'Create Template',
        'Where would you like to create this template?',
        options
      );
    }
  };

  const handleEditTemplate = (template) => {
    // Set context based on template type
    if (template.isGroupTemplate) {
      setTemplateContext({
        type: 'group',
        groupId: template.groupId,
        groupName: template.groupName
      });
    } else {
      setTemplateContext({ type: 'personal' });
    }
    setSelectedTemplate(template);
    setShowEditModal(true);
  };

  const handleSaveTemplate = async (template, onClose) => {
    try {
      console.log("Saving template:", template, "Context:", templateContext);
      
      if (templateContext?.type === 'personal') {
        console.log("Save to user doc:", user.userId);
        
        // Get current templates
        const currentTemplates = user?.checklistTemplates || [];
        
        // Check if we're updating or creating
        const existingIndex = currentTemplates.findIndex(t => t.id === template.id);
        
        let updatedTemplates;
        if (existingIndex !== -1) {
          // Update existing template
          updatedTemplates = [...currentTemplates];
          updatedTemplates[existingIndex] = template;
        } else {
          // Add new template
          updatedTemplates = [...currentTemplates, template];
        }
        
        await updateDoc(doc(db, 'users', user.userId), {
          checklistTemplates: updatedTemplates
        });
        
      } else if (templateContext?.type === 'group') {
        console.log("Save to group doc:", templateContext.groupId);
        
        // Find the group from groups array
        const group = groups.find(g => (g.groupId || g.id) === templateContext.groupId);
        const currentTemplates = group?.checklistTemplates || [];
        
        // Check if we're updating or creating
        const existingIndex = currentTemplates.findIndex(t => t.id === template.id);
        
        let updatedTemplates;
        if (existingIndex !== -1) {
          // Update existing template
          updatedTemplates = [...currentTemplates];
          updatedTemplates[existingIndex] = template;
        } else {
          // Add new template
          updatedTemplates = [...currentTemplates, template];
        }
        
        await updateDoc(doc(db, 'groups', templateContext.groupId), {
          checklistTemplates: updatedTemplates
        });
      }
      
      // Close modal via callback
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error saving template:", error);
      Alert.alert("Error", "Failed to save template. Please try again.");
    }
  };

  const handleDeleteTemplate = async (template) => {
    try {
      if (template.isGroupTemplate) {
        // Delete from group
        const group = groups.find(g => (g.groupId || g.id) === template.groupId);
        const currentTemplates = group?.checklistTemplates || [];
        const updatedTemplates = currentTemplates.filter(t => t.id !== template.id);
        
        await updateDoc(doc(db, 'groups', template.groupId), {
          checklistTemplates: updatedTemplates
        });
      } else {
        // Delete from user
        const currentTemplates = user?.checklistTemplates || [];
        const updatedTemplates = currentTemplates.filter(t => t.id !== template.id);
        
        await updateDoc(doc(db, 'users', user.userId), {
          checklistTemplates: updatedTemplates
        });
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      Alert.alert("Error", "Failed to delete template. Please try again.");
    }
  };

  const handleMoveTemplate = async (template, target) => {
    try {
      // Remove from source
      if (template.isGroupTemplate) {
        // Remove from group
        const group = groups.find(g => (g.groupId || g.id) === template.groupId);
        const currentTemplates = group?.checklistTemplates || [];
        const updatedTemplates = currentTemplates.filter(t => t.id !== template.id);
        
        await updateDoc(doc(db, 'groups', template.groupId), {
          checklistTemplates: updatedTemplates
        });
      } else {
        // Remove from user
        const currentTemplates = user?.checklistTemplates || [];
        const updatedTemplates = currentTemplates.filter(t => t.id !== template.id);
        
        await updateDoc(doc(db, 'users', user.userId), {
          checklistTemplates: updatedTemplates
        });
      }

      // Add to target (strip out source metadata)
      const cleanTemplate = {
        id: template.id,
        name: template.name,
        items: template.items,
        createdAt: template.createdAt,
        updatedAt: new Date().toISOString()
      };

      if (target.type === 'personal') {
        // Add to user
        const currentTemplates = user?.checklistTemplates || [];
        const updatedTemplates = [...currentTemplates, cleanTemplate];
        
        await updateDoc(doc(db, 'users', user.userId), {
          checklistTemplates: updatedTemplates
        });
      } else {
        // Add to group
        const group = groups.find(g => (g.groupId || g.id) === target.groupId);
        const currentTemplates = group?.checklistTemplates || [];
        const updatedTemplates = [...currentTemplates, cleanTemplate];
        
        await updateDoc(doc(db, 'groups', target.groupId), {
          checklistTemplates: updatedTemplates
        });
      }
    } catch (error) {
      console.error("Error moving template:", error);
      Alert.alert("Error", "Failed to move template. Please try again.");
    }
  };

  // Calculate available move targets for a template
  const getAvailableMoveTargets = (template) => {
    const targets = [];
    
    if (template.isGroupTemplate) {
      // Group template can move to personal
      targets.push({ type: 'personal' });
      
      // And to other groups (not its current group)
      groups.forEach(group => {
        const groupId = group.groupId || group.id;
        if (groupId !== template.groupId) {
          targets.push({
            type: 'group',
            groupId: groupId,
            groupName: group.name || groupId
          });
        }
      });
    } else {
      // Personal template can move to any group
      groups.forEach(group => {
        targets.push({
          type: 'group',
          groupId: group.groupId || group.id,
          groupName: group.name || (group.groupId || group.id)
        });
      });
    }
    
    return targets;
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      padding: getSpacing.lg,
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
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <PageHeader 
        title="Templates" 
        subtext="Reusable checklists"
        icons={[
          { 
            icon: 'add', 
            action: handleCreateTemplate 
          }
        ]}
      />
      <View style={styles.content}>
        {allTemplates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={theme.text.tertiary} />
            <Text style={styles.emptyText}>
              No templates yet.{"\n"}
              Create a template to reuse checklists.
            </Text>
          </View>
        ) : (
          <FlatList
            data={allTemplates}
            renderItem={renderTemplate}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Edit/Create Template Modal */}
      <ModalWrapper
        visible={showEditModal}
        onClose={closeTemplateModal}
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
            {/* Modal Header */}
            <ModalHeader
              title={selectedTemplate ? "Edit Template" : "New Template"}
              onCancel={closeTemplateModal}
              onAction={() => editContentRef.current?.save()}
              actionText={selectedTemplate ? "Update" : "Create"}
              actionDisabled={false} // Templates always enabled (EditChecklistContent handles validation)
            />

            {/* Template Edit Content */}
            <EditChecklistContent
              ref={editContentRef}
              checklist={selectedTemplate}
              onSave={(template) => handleSaveTemplate(template, closeTemplateModal)}
              isUserAdmin={user?.admin === true}
              isTemplate={true}
            />
          </View>
        </View>
      </ModalWrapper>
    </SafeAreaView>
  );
};

export default TemplatesScreen;