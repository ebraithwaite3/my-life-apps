import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import * as Crypto from "expo-crypto";

const EditChecklist = ({ 
  isVisible, 
  onClose, 
  checklist,
  user,
  onSave,
  updateDocument,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [checklistName, setChecklistName] = useState('');
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState([]);
  const inputRefs = useRef({});
  const scrollViewRef = useRef(null);
  const uuidv4 = () => Crypto.randomUUID();

  const isEditing = checklist !== null;

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
    
    setTimeout(() => {
      inputRefs.current[newId]?.focus();
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

  const handleSubmitEditing = useCallback((currentId) => {
    const currentIndex = items.findIndex(item => item.id === currentId);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < items.length) {
      const nextId = items[nextIndex].id;
      setTimeout(() => {
        inputRefs.current[nextId]?.focus();
        scrollViewRef.current?.scrollTo({
          y: (nextIndex + 1) * 60,
          animated: true
        });
      }, 50);
    } else {
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
      
      const newChecklist = {
        id: uuidv4(),
        name: checklistName.trim(),
        items: validItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (onSave) onSave(newChecklist);
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
    wrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      width: '90%',
      maxWidth: 500,
      maxHeight: '80%',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    headerButton: {
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.sm,
    },
    headerButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
    },
    cancelText: {
      color: theme.error,
    },
    saveText: {
      color: theme.primary,
    },
    content: {
      flex: 1,
    },
    scrollContainer: {
      padding: getSpacing.lg,
    },
    sectionHeader: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    nameInput: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.sm,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginBottom: getSpacing.lg,
    },
    itemsContainer: {
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.border,
      padding: getSpacing.sm,
      maxHeight: 300,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: getSpacing.sm,
      minHeight: 40,
    },
    itemNumber: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      width: 30,
    },
    itemInput: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginRight: getSpacing.sm,
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.sm,
    },
    removeButton: {
      padding: getSpacing.xs,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: getSpacing.sm,
      marginTop: getSpacing.sm,
      backgroundColor: theme.primary + '15',
      borderRadius: getBorderRadius.sm,
    },
    addButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.primary,
      marginLeft: getSpacing.xs,
      fontWeight: "600",
    },
    errorContainer: {
      marginTop: getSpacing.md,
      padding: getSpacing.md,
      backgroundColor: theme.error + "20",
      borderRadius: getBorderRadius.sm,
    },
    errorText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.error,
      marginBottom: getSpacing.xs,
    },
  });

  if (!isVisible) return null;

  // NO MODAL WRAPPER - Just return the content
  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.wrapper}>
        <TouchableWithoutFeedback>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                <Text style={[styles.headerButtonText, styles.cancelText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.headerTitle}>
                {isEditing ? "Edit Checklist" : "New Checklist"}
              </Text>
              
              <TouchableOpacity style={styles.headerButton} onPress={handleSave}>
                <Text style={[styles.headerButtonText, styles.saveText]}>
                  {isEditing ? "Update" : "Create"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              ref={scrollViewRef}
              style={styles.content}
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Checklist Name */}
              <Text style={styles.sectionHeader}>Checklist Name</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="Enter checklist name..."
                placeholderTextColor={theme.text.tertiary}
                value={checklistName}
                onChangeText={setChecklistName}
                autoCapitalize="words"
              />

              {/* Items Section */}
              <Text style={styles.sectionHeader}>Items</Text>
              <ScrollView 
                style={styles.itemsContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps={"handled"}
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

              {/* Errors */}
              {errors.length > 0 && (
                <View style={styles.errorContainer}>
                  {errors.map((error, index) => (
                    <Text key={index} style={styles.errorText}>• {error}</Text>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default EditChecklist;