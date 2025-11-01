// GroupChecklistViewModal.js - View and interact with checklist items
import React, { useState, useEffect } from "react";
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

const GroupChecklistViewModal = ({ 
  isVisible, 
  onClose, 
  checklist,
  group,
  user,
  onUpdate
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const [items, setItems] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize items when modal opens
  useEffect(() => {
    if (isVisible && checklist) {
      // Handle both old format (strings) and new format (objects)
      const processedItems = (checklist.items || []).map((item, index) => {
        if (typeof item === 'string') {
          // Convert old string format to new object format
          return {
            id: String(Date.now() + index),
            text: item,
            completed: false,
            createdBy: user?.userId,
            createdAt: new Date().toISOString()
          };
        } else {
          // Already in correct object format
          return item;
        }
      });
      
      setItems(processedItems);
      setHasChanges(false);
    }
  }, [isVisible, checklist, user]);

  const handleToggleItem = (itemId) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      const updatedChecklists = (group.checklists || []).map(cl => 
        cl.id === checklist.id 
          ? { ...cl, items: items, updatedAt: new Date().toISOString() }
          : cl
      );

      await updateDocument('groups', group.id || group.groupId, {
        checklists: updatedChecklists,
      });

      if (onUpdate) onUpdate();
      setHasChanges(false);
      Alert.alert("Success", "Checklist updated successfully!");
    } catch (error) {
      console.error('Error saving checklist:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  };

  const handleCancel = () => {
    setItems(checklist.items || []);
    setHasChanges(false);
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;

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
      margin: getSpacing.md,
      maxHeight: "85%",
      width: "95%",
      maxWidth: 500,
      minWidth: 350,
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
    progressContainer: {
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: getSpacing.md,
      marginBottom: getSpacing.lg,
    },
    progressText: {
      ...getTypography.h4,
      color: theme.text.primary,
      fontWeight: "600",
      textAlign: "center",
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      marginTop: getSpacing.sm,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 4,
    },
    itemsList: {
      marginBottom: getSpacing.lg,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      minHeight: 50, // Ensure minimum height
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: getSpacing.sm,
    },
    checkedBox: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    itemText: {
      ...getTypography.body,
      flex: 1,
    },
    completedText: {
      color: theme.text.secondary,
      textDecorationLine: 'line-through',
    },
    activeText: {
      color: theme.text.primary,
    },
    buttonContainer: {
      flexDirection: "row",
      gap: getSpacing.md,
      paddingTop: getSpacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    button: {
      flex: 1,
      paddingVertical: getSpacing.sm,
      borderRadius: 6,
      alignItems: "center",
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    saveButton: {
      backgroundColor: theme.primary,
    },
    cancelButtonText: {
      color: theme.text.secondary,
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
    },
    saveButtonText: {
      color: theme.text.inverse,
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
    },
  });

  // Debug logging
  console.log("VIEW MODAL DEBUG - Items state:", items);
  console.log("VIEW MODAL DEBUG - Items length:", items.length);
  console.log("VIEW MODAL DEBUG - Checklist:", checklist);

  if (!isVisible || !checklist) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>{checklist.name}</Text>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons 
                    name="close" 
                    size={24} 
                    color={theme.text.secondary} 
                  />
                </TouchableOpacity>
              </View>

              {/* Progress */}
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  Items ({completedCount}/{totalCount})
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }
                    ]} 
                  />
                </View>
              </View>

              {/* Items List */}
              <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
                {items.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemRow}
                    onPress={() => handleToggleItem(item.id)}
                    activeOpacity={0.7}
                  >
                    {/* Checkbox */}
                    <View style={[styles.checkbox, item.completed && styles.checkedBox]}>
                      {item.completed && (
                        <Ionicons 
                          name="checkmark" 
                          size={16} 
                          color={theme.text.inverse} 
                        />
                      )}
                    </View>
                    
                    {/* Item Text */}
                    <Text style={[
                      styles.itemText,
                      item.completed ? styles.completedText : styles.activeText
                    ]}>
                      {item.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Save/Cancel Buttons - Only show when there are changes */}
              {hasChanges && (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[styles.button, styles.cancelButton]} 
                    onPress={handleCancel}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.button, styles.saveButton]} 
                    onPress={handleSaveChanges}
                  >
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default GroupChecklistViewModal;