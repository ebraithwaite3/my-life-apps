// GroupChecklistsModal.js - Main list view
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { updateDocument } from "../../../services/firestoreService";
import GroupChecklistEditModal from "./GroupChecklistEditModal";
import GroupChecklistViewModal from "./GroupChecklistViewModal";

const GroupChecklistsModal = ({ 
  isVisible, 
  onClose, 
  group,
  user,
  onUpdate
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [viewingChecklist, setViewingChecklist] = useState(null);

  const groupChecklists = group?.checklists || [];
  const canCreateEdit = user?.role !== 'child';

  const handleCreateNew = () => {
    setEditingChecklist(null);
    setIsEditModalVisible(true);
  };

  const handleEditChecklist = (checklist) => {
    setEditingChecklist(checklist);
    setIsEditModalVisible(true);
  };

  const handleViewChecklist = (checklist) => {
    setViewingChecklist(checklist);
    setIsViewModalVisible(true);
  };

  const handleCloseEdit = () => {
    setIsEditModalVisible(false);
    setEditingChecklist(null);
  };

  const handleCloseView = () => {
    setIsViewModalVisible(false);
    setViewingChecklist(null);
  };

  const handleChecklistSaved = () => {
    if (onUpdate) onUpdate();
    handleCloseEdit();
  };

  const handleDeleteChecklist = (checklist) => {
    Alert.alert(
      "Delete Checklist",
      `Are you sure you want to delete "${checklist.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedChecklists = groupChecklists.filter(cl => cl.id !== checklist.id);
              
              await updateDocument('groups', group.id || group.groupId, {
                checklists: updatedChecklists,
              });

              if (onUpdate) onUpdate();
              Alert.alert("Deleted", "Checklist deleted successfully.");
            } catch (error) {
              console.error("Error deleting checklist:", error);
              Alert.alert("Error", "Failed to delete checklist. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleResetChecklist = async (checklist) => {
    Alert.alert(
      "Reset Checklist",
      `Reset all items in "${checklist.name}"? This will uncheck all completed items.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: async () => {
            try {
              const resetItems = checklist.items.map(item => ({
                ...item,
                completed: false
              }));

              const updatedChecklists = groupChecklists.map(cl => 
                cl.id === checklist.id 
                  ? { ...cl, items: resetItems, updatedAt: new Date().toISOString() }
                  : cl
              );

              await updateDocument('groups', group.id || group.groupId, {
                checklists: updatedChecklists,
              });

              if (onUpdate) onUpdate();
              Alert.alert("Reset", "All items have been unchecked!");
            } catch (error) {
              console.error("Error resetting checklist:", error);
              Alert.alert("Error", "Failed to reset checklist. Please try again.");
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      backgroundColor: theme.surface || theme.background,
      borderRadius: 16,
      padding: getSpacing.lg,
      margin: getSpacing.lg,
      minHeight: '85%',
      maxHeight: "85%",
      width: "90%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: getSpacing.lg,
    },
    title: {
      ...getTypography.h3,
      color: theme.text.primary,
      fontWeight: "bold",
      flex: 1,
    },
    closeButton: {
      padding: getSpacing.xs,
    },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary + '15',
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.primary,
      marginBottom: getSpacing.lg,
    },
    createButtonText: {
      ...getTypography.body,
      color: theme.primary,
      fontWeight: "600",
      marginLeft: getSpacing.xs,
    },
    checklistsList: {
      flex: 1,
    },
    checklistCard: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: getSpacing.md,
      marginBottom: getSpacing.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    checklistHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: getSpacing.sm,
    },
    checklistName: {
      ...getTypography.h4,
      color: theme.text.primary,
      fontWeight: "600",
      flex: 1,
    },
    checklistMeta: {
      ...getTypography.caption,
      color: theme.text.secondary,
      marginBottom: getSpacing.sm,
    },
    checklistActions: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingTop: getSpacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    actionButton: {
      alignItems: "center",
      padding: getSpacing.sm,
      borderRadius: 6,
      minWidth: 50,
    },
    actionButtonText: {
      ...getTypography.caption,
      marginTop: getSpacing.xs,
      fontSize: 11,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: getSpacing.xl,
    },
    emptyText: {
      ...getTypography.body,
      color: theme.text.secondary,
      textAlign: "center",
      marginBottom: getSpacing.md,
    },
  });

  if (!isVisible) return null;

  return (
    <>
      <Modal
        animationType="fade"
        transparent={true}
        visible={isVisible && !isEditModalVisible && !isViewModalVisible}
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.title}>Group Checklists</Text>
                  <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons 
                      name="close" 
                      size={24} 
                      color={theme.text.secondary} 
                    />
                  </TouchableOpacity>
                </View>

                {/* Create Button */}
                {canCreateEdit && (
                  <TouchableOpacity 
                    style={styles.createButton}
                    onPress={handleCreateNew}
                  >
                    <Ionicons name="add" size={18} color={theme.primary} />
                    <Text style={styles.createButtonText}>
                      Create New Checklist
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Checklists List */}
                <ScrollView style={styles.checklistsList} showsVerticalScrollIndicator={false}>
                  {groupChecklists.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>
                        No checklists yet.{canCreateEdit ? ' Create your first one above!' : ''}
                      </Text>
                    </View>
                  ) : (
                    groupChecklists.map((checklist) => (
                      <View key={checklist.id} style={styles.checklistCard}>
                        <View style={styles.checklistHeader}>
                          <Text style={styles.checklistName}>{checklist.name}</Text>
                        </View>
                        
                        <Text style={styles.checklistMeta}>
                          {(() => {
                            const totalItems = checklist.items?.length || 0;
                            const completedItems = checklist.items?.filter(item => item.completed).length || 0;
                            return `${completedItems}/${totalItems} completed`;
                          })()}
                          {checklist.createdBy && ` • Created by ${checklist.createdBy.username}`}
                        </Text>

                        <View style={styles.checklistActions}>
                          <TouchableOpacity 
                            style={styles.actionButton} 
                            onPress={() => handleViewChecklist(checklist)}
                          >
                            <Ionicons
                              name="eye-outline"
                              size={18}
                              color={theme.primary}
                            />
                            <Text style={[styles.actionButtonText, { color: theme.primary }]}>
                              View
                            </Text>
                          </TouchableOpacity>

                          {canCreateEdit && (
                            <TouchableOpacity 
                              style={styles.actionButton} 
                              onPress={() => handleEditChecklist(checklist)}
                            >
                              <Ionicons
                                name="pencil-outline"
                                size={18}
                                color={theme.text.primary}
                              />
                              <Text style={[styles.actionButtonText, { color: theme.text.secondary }]}>
                                Edit
                              </Text>
                            </TouchableOpacity>
                          )}
                          
                          <TouchableOpacity 
                            style={styles.actionButton} 
                            onPress={() => handleResetChecklist(checklist)}
                          >
                            <Ionicons
                              name="refresh-outline"
                              size={18}
                              color={theme.text.secondary}
                            />
                            <Text style={[styles.actionButtonText, { color: theme.text.secondary }]}>
                              Reset
                            </Text>
                          </TouchableOpacity>

                          {canCreateEdit && (
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handleDeleteChecklist(checklist)}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color={theme.error || "#ef4444"}
                              />
                              <Text style={[styles.actionButtonText, { color: theme.error || "#ef4444" }]}>
                                Delete
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* View Modal */}
      <GroupChecklistViewModal
        isVisible={isViewModalVisible}
        onClose={handleCloseView}
        checklist={viewingChecklist}
        group={group}
        user={user}
        onUpdate={onUpdate}
      />

      {/* Edit Modal */}
      <GroupChecklistEditModal
        isVisible={isEditModalVisible}
        onClose={handleCloseEdit}
        onSave={handleChecklistSaved}
        group={group}
        user={user}
        checklist={editingChecklist}
      />
    </>
  );
};

export default GroupChecklistsModal;