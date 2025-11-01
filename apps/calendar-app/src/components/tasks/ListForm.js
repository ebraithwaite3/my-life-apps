import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useData } from '../../contexts/DataContext';
import { updateUserDoc } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import * as Crytpo from 'expo-crypto';

const ListForm = ({ taskData, setTaskData, setErrors }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user } = useData();
  const { db } = useAuth();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveChecklistName, setSaveChecklistName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentChecklistId, setCurrentChecklistId] = useState(null); // Track which saved checklist is loaded

    const uuidv4 = () => Crytpo.randomUUID();

  // Get saved checklists from user data
  const savedChecklists = user?.savedChecklists || [];
  const canSaveMore = savedChecklists.length < 8;

  // Convenience access to the checklist items from parent state
  const items = useMemo(() => taskData.checklistData?.items || [], [taskData.checklistData]);
  
  const inputRefs = useRef({});

  // Check if current checklist is new (not based on a saved one)
  const isNewChecklist = currentChecklistId === null;

  // Use useCallback to memoize the update function
  const updateItem = useCallback((id, text) => {
    setTaskData(prev => {
      const currentItems = prev.checklistData?.items || [];
      const newItems = currentItems.map(item =>
        item.id === id ? { ...item, text } : item
      );
      return {
        ...prev,
        checklistData: { ...prev.checklistData, items: newItems }
      };
    });
  }, [setTaskData]);
  
  const addItem = useCallback(() => {
    const newId = String(Date.now());
    const newItem = {
      id: newId,
      text: '',
      completed: false,
      createdBy: user?.userId,
      createdAt: new Date().toISOString()
    };
    
    setTaskData(prev => {
      const currentItems = prev.checklistData?.items || [];
      return {
        ...prev,
        checklistData: { ...prev.checklistData, items: [...currentItems, newItem] }
      };
    });
    
    setTimeout(() => {
      inputRefs.current[newId]?.focus();
    }, 100);
  }, [setTaskData, user]);

  const removeItem = useCallback((id) => {
    // If only one item remains, just clear its text instead of removing it
    if (items.length <= 1) {
      updateItem(id, '');
      return;
    }
    setTaskData(prev => {
      const currentItems = prev.checklistData?.items || [];
      const newItems = currentItems.filter(item => item.id !== id);
      return {
        ...prev,
        checklistData: { ...prev.checklistData, items: newItems }
      };
    });
  }, [items, setTaskData, updateItem]);
  
  const handleBlur = useCallback((id) => {
    const item = items.find(i => i.id === id);
    if (item && !item.text.trim() && items.length > 1) {
      removeItem(id);
    }
  }, [items, removeItem]);

  // Load a saved checklist
  const loadChecklist = useCallback((checklist) => {
    const loadedItems = checklist.items.map((text, index) => ({
      id: String(Date.now() + index),
      text,
      completed: false,
      createdBy: user?.userId,
      createdAt: new Date().toISOString()
    }));

    setTaskData(prev => ({
      ...prev,
      checklistData: { ...prev.checklistData, items: loadedItems }
    }));

    setCurrentChecklistId(checklist.id);
    setShowDropdown(false);
  }, [setTaskData, user]);

  // Start a new checklist
  const startNewChecklist = useCallback(() => {
    const newItem = {
      id: uuidv4(),
      text: '',
      completed: false,
      createdBy: user?.userId,
      createdAt: new Date().toISOString()
    };

    setTaskData(prev => ({
      ...prev,
      checklistData: { ...prev.checklistData, items: [newItem] }
    }));

    setCurrentChecklistId(null);
    setShowDropdown(false);
  }, [setTaskData, user]);

  // Save current checklist
  const saveChecklist = useCallback(async () => {
    if (!saveChecklistName.trim()) {
      Alert.alert('Error', 'Please enter a name for the checklist.');
      return;
    }

    // Check for duplicate names
    const nameExists = savedChecklists.some(checklist => 
      checklist.name.toLowerCase() === saveChecklistName.trim().toLowerCase()
    );

    if (nameExists) {
      Alert.alert('Error', 'A checklist with this name already exists.');
      return;
    }

    // Get non-empty items
    const itemTexts = items.filter(item => item.text.trim()).map(item => item.text.trim());
    
    if (itemTexts.length === 0) {
      Alert.alert('Error', 'Please add at least one item to save the checklist.');
      return;
    }

    const newChecklist = {
      id: `checklist-${Date.now()}`,
      name: saveChecklistName.trim(),
      items: itemTexts,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const updatedChecklists = [...savedChecklists, newChecklist];
      await updateUserDoc(db, user.userId, { savedChecklists: updatedChecklists });
      
      setCurrentChecklistId(newChecklist.id);
      setShowSaveModal(false);
      setSaveChecklistName('');
      
      Alert.alert('Success', 'Checklist saved successfully!  You can edit this checklist in Preferences.  Make sure to save your check list before navigating away.');
    } catch (error) {
      console.error('Error saving checklist:', error);
      Alert.alert('Error', 'Failed to save checklist. Please try again.');
    }
  }, [saveChecklistName, items, savedChecklists, db, user?.userId]);
  
  // Set initial state for checklist if it doesn't exist
  useEffect(() => {
    setTaskData(prev => {
      const initialItems = (prev.checklistData?.items && prev.checklistData.items.length > 0)
        ? prev.checklistData.items
        : [{
            id: String(Date.now()),
            text: '',
            completed: false,
            createdBy: user?.userId,
            createdAt: new Date().toISOString()
          }];
          
      return {
        ...prev,
        checklistData: { ...prev.checklistData, items: initialItems }
      };
    });
  }, [setTaskData, user]);
  
  // Validation for list items
  useEffect(() => {
    const errors = [];
    const hasValidItem = items.some(item => item.text.trim() !== '');

    if (items.length === 0 || !hasValidItem) {
      errors.push('Checklist must have at least one item.');
    }

    setErrors(errors);
  }, [items, setErrors]);

  // Check if current items have content for save button
  const hasContent = items.some(item => item.text.trim());

  return (
    <View style={{ marginBottom: getSpacing.lg }}>
      {/* Dropdown for saved checklists */}
      {savedChecklists.length > 0 && (
        <View style={{ marginBottom: getSpacing.md }}>
          <TouchableOpacity
            onPress={() => setShowDropdown(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 8,
              padding: getSpacing.sm,
            }}
          >
            <Text style={{
              fontSize: getTypography.body.fontSize,
              color: currentChecklistId ? theme.text.primary : theme.text.secondary,
            }}>
              {currentChecklistId 
                ? savedChecklists.find(c => c.id === currentChecklistId)?.name || 'New Checklist'
                : 'Load Saved Checklist'
              }
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.text.secondary} />
          </TouchableOpacity>
        </View>
      )}

      <Text style={{ 
        fontSize: getTypography.h4.fontSize,
        fontWeight: getTypography.h4.fontWeight,
        color: theme.text.primary,
        marginBottom: getSpacing.md,
      }}>
        Checklist Items
      </Text>
      
      <View style={{ 
        backgroundColor: theme.surface,
        borderRadius: 8,
        padding: getSpacing.md,
      }}>
        {items.map((item, index) => (
          <View 
            key={item.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: index === items.length - 1 ? 0 : getSpacing.sm,
            }}
          >
            <Text style={{
              fontSize: getTypography.body.fontSize,
              color: theme.text.secondary,
              width: 30,
            }}>
              {index + 1}.
            </Text>
            
            <TextInput
              ref={ref => inputRefs.current[item.id] = ref}
              style={{
                flex: 1,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 6,
                padding: getSpacing.sm,
                fontSize: getTypography.body.fontSize,
                color: theme.text.primary,
                marginRight: getSpacing.sm,
              }}
              placeholder="Enter checklist item..."
              placeholderTextColor={theme.text.tertiary}
              value={item.text}
              onChangeText={(text) => updateItem(item.id, text)}
              onSubmitEditing={addItem}
              returnKeyType="next"
              onBlur={() => handleBlur(item.id)}
              blurOnSubmit={false}
            />
            
            {item.text.trim() && (
              <TouchableOpacity
                onPress={() => removeItem(item.id)}
                style={{ padding: getSpacing.xs }}
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
        
        <TouchableOpacity
          onPress={addItem}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: getSpacing.sm,
            marginTop: getSpacing.md,
            backgroundColor: theme.primary + '15',
            borderRadius: 6,
          }}
        >
          <Ionicons name="add" size={20} color={theme.primary} />
          <Text style={{
            fontSize: getTypography.body.fontSize,
            color: theme.primary,
            marginLeft: getSpacing.xs,
            fontWeight: '600',
          }}>
            Add Item
          </Text>
        </TouchableOpacity>

        {/* Save Checklist Button */}
        {isNewChecklist && hasContent && canSaveMore && (
          <TouchableOpacity
            onPress={() => setShowSaveModal(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: getSpacing.sm,
              marginTop: getSpacing.sm,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.primary,
              borderRadius: 6,
            }}
          >
            <Ionicons name="bookmark-outline" size={20} color={theme.primary} />
            <Text style={{
              fontSize: getTypography.body.fontSize,
              color: theme.primary,
              marginLeft: getSpacing.xs,
              fontWeight: '600',
            }}>
              Save Checklist
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={{
            backgroundColor: theme.surface,
            borderRadius: 12,
            padding: getSpacing.lg,
            margin: getSpacing.lg,
            minWidth: 280,
            maxHeight: '70%',
          }}>
            <Text style={{
              fontSize: getTypography.h3.fontSize,
              fontWeight: getTypography.h3.fontWeight,
              color: theme.text.primary,
              marginBottom: getSpacing.md,
              textAlign: 'center',
            }}>
              Select Checklist
            </Text>

            <TouchableOpacity
              onPress={startNewChecklist}
              style={{
                padding: getSpacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text style={{
                fontSize: getTypography.body.fontSize,
                color: theme.primary,
                fontWeight: '600',
              }}>
                + New Checklist
              </Text>
            </TouchableOpacity>

            <FlatList
              data={savedChecklists}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => loadChecklist(item)}
                  style={{
                    padding: getSpacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text style={{
                    fontSize: getTypography.body.fontSize,
                    color: theme.text.primary,
                    fontWeight: item.id === currentChecklistId ? '600' : 'normal',
                  }}>
                    {item.name}
                  </Text>
                  <Text style={{
                    fontSize: getTypography.bodySmall.fontSize,
                    color: theme.text.secondary,
                    marginTop: 2,
                  }}>
                    {item.items.length} items
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Save Checklist Modal */}
      <Modal
        visible={showSaveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={() => setShowSaveModal(false)}
        >
          <View style={{
            backgroundColor: theme.surface,
            borderRadius: 12,
            padding: getSpacing.lg,
            margin: getSpacing.lg,
            minWidth: 280,
          }}>
            <Text style={{
              fontSize: getTypography.h3.fontSize,
              fontWeight: getTypography.h3.fontWeight,
              color: theme.text.primary,
              marginBottom: getSpacing.md,
              textAlign: 'center',
            }}>
              Save Checklist
            </Text>

            <TextInput
              style={{
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
                padding: getSpacing.sm,
                fontSize: getTypography.body.fontSize,
                color: theme.text.primary,
                marginBottom: getSpacing.lg,
              }}
              placeholder="Enter checklist name..."
              placeholderTextColor={theme.text.tertiary}
              value={saveChecklistName}
              onChangeText={setSaveChecklistName}
              autoFocus={true}
            />

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: getSpacing.md,
            }}>
              <TouchableOpacity
                onPress={() => {
                  setShowSaveModal(false);
                  setSaveChecklistName('');
                }}
                style={{
                  flex: 1,
                  padding: getSpacing.sm,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontSize: getTypography.body.fontSize,
                  color: theme.text.primary,
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveChecklist}
                style={{
                  flex: 1,
                  padding: getSpacing.sm,
                  backgroundColor: theme.primary,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontSize: getTypography.body.fontSize,
                  color: theme.text.inverse,
                  fontWeight: '600',
                }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default memo(ListForm);