import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { updateDocument } from "../../../services/firestoreService";
import * as Crypto from "expo-crypto";

const EditChecklist = ({ 
  isVisible, 
  onClose, 
  checklist, // null for new, existing checklist for edit
  user,
  onSave // callback when checklist is saved/updated
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const [checklistName, setChecklistName] = useState('');
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState([]);
  const inputRefs = useRef({});
  const scrollViewRef = useRef(null);
  const uuidv4 = () => Crypto.randomUUID();

  const isEditing = checklist !== null;
  const title = isEditing ? 'Edit Checklist' : 'Create Checklist';

  // Initialize form data when modal opens
  useEffect(() => {
    if (isVisible) {
      if (isEditing && checklist) {
        setChecklistName(checklist.name || '');
        setItems(checklist.items?.map((text, index) => ({
          id: String(Date.now() + index),
          text: typeof text === 'string' ? text : text.text || '',
        })) || [{ id: uuidv4(), text: '' }]);
      } else {
        // New checklist
        setChecklistName('');
        setItems([{ id: uuidv4(), text: '' }]);
      }
      setErrors([]);
    }
  }, [isVisible, checklist, isEditing]);

  const updateItem = useCallback((id, text) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, text } : item
    ));
  }, []);

  const addItem = useCallback(() => {
    const newId = uuidv4();
    const newItem = { id: newId, text: '' };
    
    setItems(prev => [...prev, newItem]);
    
    // Focus and scroll to new item
    setTimeout(() => {
      inputRefs.current[newId]?.focus();
      // Scroll to bottom to ensure new item is visible
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const removeItem = useCallback((id) => {
    if (items.length <= 1) {
      updateItem(id, '');
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  }, [items.length, updateItem]);

  const handleBlur = useCallback((id) => {
    const item = items.find(i => i.id === id);
    if (item && !item.text.trim() && items.length > 1) {
      removeItem(id);
    }
  }, [items, removeItem]);

  // Handle moving to next item when pressing "next"
  const handleSubmitEditing = useCallback((currentId) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < items.length) {
      // Focus next existing item
      const nextId = items[nextIndex].id;
      setTimeout(() => {
        inputRefs.current[nextId]?.focus();
        // Scroll to make sure the next input is visible
        scrollViewRef.current?.scrollTo({
          y: (nextIndex + 1) * 60, // Approximate height per item
          animated: true
        });
      }, 50);
    } else {
      // Add new item if we're at the end
      addItem();
    }
  }, [items, addItem]);

  const validateForm = () => {
    const newErrors = [];
    
    if (!checklistName.trim()) {
      newErrors.push('Checklist name is required.');
    }

    const validItems = items.filter(item => item.text.trim());
    if (validItems.length === 0) {
      newErrors.push('At least one checklist item is required.');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const validItems = items.filter(item => item.text.trim()).map(item => item.text.trim());
      
      if (isEditing) {
        // Update existing checklist
        const updatedChecklists = (user.savedChecklists || []).map(cl => 
          cl.id === checklist.id 
            ? {
                ...cl,
                name: checklistName.trim(),
                items: validItems,
                updatedAt: new Date().toISOString()
              }
            : cl
        );

        await updateDocument('users', user.userId, {
          savedChecklists: updatedChecklists,
        });

        Alert.alert("Success", "Checklist updated successfully!");
      } else {
        // Create new checklist
        const savedChecklists = user.savedChecklists || [];
        
        // Check if user can save more checklists
        if (savedChecklists.length >= 8) {
          Alert.alert("Limit Reached", "You can only save up to 8 checklists. Please delete some to create new ones.");
          return;
        }

        // Check for duplicate names
        const nameExists = savedChecklists.some(cl => 
          cl.name.toLowerCase() === checklistName.trim().toLowerCase()
        );

        if (nameExists) {
          Alert.alert('Error', 'A checklist with this name already exists.');
          return;
        }

        const newChecklist = {
          id: uuidv4(),
          name: checklistName.trim(),
          items: validItems,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const updatedChecklists = [...savedChecklists, newChecklist];
        await updateDocument('users', user.userId, {
          savedChecklists: updatedChecklists,
        });

        Alert.alert("Success", "Checklist created successfully!");
      }

      if (onSave) onSave();
      handleClose();
    } catch (error) {
      console.error('Error saving checklist:', error);
      Alert.alert('Error', 'Failed to save checklist. Please try again.');
    }
  };

  const handleClose = () => {
    setChecklistName('');
    setItems([]);
    setErrors([]);
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
    },
    keyboardOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    nameInput: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginBottom: getSpacing.lg,
    },
    sectionTitle: {
      ...getTypography.h4,
      color: theme.text.primary,
      fontWeight: "600",
      marginBottom: getSpacing.md,
    },
    itemsContainer: {
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: getSpacing.md,
      marginBottom: getSpacing.lg,
      maxHeight: 300,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: getSpacing.sm,
      minHeight: 50, // Consistent height for scroll calculation
    },
    itemNumber: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      width: 30,
    },
    itemInput: {
      flex: 1,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 6,
      padding: getSpacing.sm,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginRight: getSpacing.sm,
    },
    removeButton: {
      padding: getSpacing.xs,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: getSpacing.sm,
      marginTop: getSpacing.md,
      backgroundColor: theme.primary + '15',
      borderRadius: 6,
    },
    addButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.primary,
      marginLeft: getSpacing.xs,
      fontWeight: "600",
    },
    errorContainer: {
      marginBottom: getSpacing.md,
    },
    errorText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.error || "#ef4444",
      marginBottom: getSpacing.xs,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: getSpacing.md,
    },
    button: {
      flex: 1,
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      borderRadius: 8,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    saveButton: {
      backgroundColor: theme.primary,
    },
    cancelButtonText: {
      ...getTypography.body,
      color: theme.text.primary,
      fontWeight: "600",
    },
    saveButtonText: {
      ...getTypography.body,
      color: theme.text.inverse,
      fontWeight: "600",
    },
  });

  if (!isVisible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.keyboardOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                  <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <Ionicons 
                      name="close" 
                      size={24} 
                      color={theme.text.secondary} 
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  ref={scrollViewRef}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Checklist Name */}
                  <Text style={styles.sectionTitle}>Checklist Name</Text>
                  <TextInput
                    style={styles.nameInput}
                    placeholder="Enter checklist name..."
                    placeholderTextColor={theme.text.tertiary}
                    value={checklistName}
                    onChangeText={setChecklistName}
                    autoCapitalize="words"
                  />

                  {/* Items Section */}
                  <Text style={styles.sectionTitle}>Items</Text>
                  <View style={styles.itemsContainer}>
                    <ScrollView 
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled={true}
                    >
                      {items.map((item, index) => (
                        <View key={item.id} style={styles.itemRow}>
                          <Text style={styles.itemNumber}>{index + 1}.</Text>
                          
                          <TextInput
                            ref={ref => inputRefs.current[item.id] = ref}
                            style={styles.itemInput}
                            placeholder="Enter checklist item..."
                            placeholderTextColor={theme.text.tertiary}
                            value={item.text}
                            onChangeText={(text) => updateItem(item.id, text)}
                            onSubmitEditing={() => handleSubmitEditing(item.id)}
                            returnKeyType="next"
                            onBlur={() => handleBlur(item.id)}
                            blurOnSubmit={false}
                          />
                          
                          {item.text.trim() && (
                            <TouchableOpacity
                              onPress={() => removeItem(item.id)}
                              style={styles.removeButton}
                            >
                              <Ionicons 
                                name="trash-outline" 
                                size={20} 
                                color={theme.error || '#ef4444'} 
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      
                      <TouchableOpacity onPress={addItem} style={styles.addButton}>
                        <Ionicons name="add" size={20} color={theme.primary} />
                        <Text style={styles.addButtonText}>Add Item</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>

                  {/* Errors */}
                  {errors.length > 0 && (
                    <View style={styles.errorContainer}>
                      {errors.map((error, index) => (
                        <Text key={index} style={styles.errorText}>• {error}</Text>
                      ))}
                    </View>
                  )}
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[styles.button, styles.cancelButton]} 
                    onPress={handleClose}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.button, styles.saveButton]} 
                    onPress={handleSave}
                  >
                    <Text style={styles.saveButtonText}>
                      {isEditing ? 'Update' : 'Create'}
                    </Text>
                  </TouchableOpacity>
                  </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditChecklist;