import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { PopUpModalWrapper } from '../../base';
import ModalHeader from '../../../headers/ModalHeader';
import ChecklistEditingRow from '../../../checklists/ChecklistEditingRow';
import * as Crypto from 'expo-crypto';

const ChecklistItemConfigModal = ({
  visible,
  item, // Current item being configured
  onSave, // (updatedItem) => void
  onCancel,
  isUserAdmin,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  // Local state for editing
  const [itemType, setItemType] = useState('checkbox');
  const [requiredForScreenTime, setRequiredForScreenTime] = useState(false);
  const [requiresParentApproval, setRequiresParentApproval] = useState(false);
  const [yesNoType, setYesNoType] = useState('simple');
  const [options, setOptions] = useState([]);
  const [subItems, setSubItems] = useState([]);
  
  const inputRefs = useRef({});

  // Initialize from item prop
  useEffect(() => {
    if (item) {
      setItemType(item.itemType || 'checkbox');
      setRequiredForScreenTime(item.requiredForScreenTime || false);
      setRequiresParentApproval(item.requiresParentApproval || false);
      
      if (item.yesNoConfig) {
        setYesNoType(item.yesNoConfig.type || 'simple');
        setOptions(
          (item.yesNoConfig.options || []).map(opt => ({
            id: Crypto.randomUUID(),
            name: opt,
          }))
        );
      } else {
        setYesNoType('simple');
        setOptions([]);
      }
      
      setSubItems(item.subItems || []);
    }
  }, [item, visible]);

  const handleSave = () => {
    const updatedItem = {
      ...item,
      itemType,
      // Explicitly set to false if unchecked (for sparse storage cleanup)
      requiredForScreenTime: requiredForScreenTime || undefined,
      requiresParentApproval: requiresParentApproval || undefined,
    };

    // Add yesNoConfig if itemType is yesNo
    if (itemType === 'yesNo') {
      updatedItem.yesNoConfig = {
        type: yesNoType,
        ...(yesNoType === 'multiChoice' && {
          options: options.map(opt => opt.name).filter(name => name.trim() !== ''),
        }),
      };
    } else {
      // Clear yesNoConfig if not a yesNo item
      updatedItem.yesNoConfig = undefined;
    }

    // Add subItems if itemType is group
    if (itemType === 'group') {
      updatedItem.subItems = subItems
        .filter(sub => sub.name.trim() !== '')
        .map(sub => ({
          id: sub.id,
          name: sub.name,
          itemType: 'checkbox',
          parentId: item.id,
        }));
    } else {
      // Clear subItems if not a group
      updatedItem.subItems = undefined;
    }

    onSave(updatedItem);
  };

  const handleCancel = () => {
    // Reset to original state
    setItemType(item?.itemType || 'checkbox');
    setRequiredForScreenTime(item?.requiredForScreenTime || false);
    setRequiresParentApproval(item?.requiresParentApproval || false);
    setYesNoType(item?.yesNoConfig?.type || 'simple');
    setOptions([]);
    setSubItems([]);
    onCancel();
  };

  // Options management (for multiChoice)
  const addOption = () => {
    const newOption = {
      id: Crypto.randomUUID(),
      name: '',
    };
    setOptions([...options, newOption]);
  };

  const updateOption = (id, name) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, name } : opt));
  };

  const removeOption = (id) => {
    setOptions(options.filter(opt => opt.id !== id));
  };

  // SubItems management (for group)
  const addSubItem = () => {
    const newSubItem = {
      id: Crypto.randomUUID(),
      name: '',
    };
    setSubItems([...subItems, newSubItem]);
  };

  const updateSubItem = (id, name) => {
    setSubItems(subItems.map(sub => sub.id === id ? { ...sub, name } : sub));
  };

  const removeSubItem = (id) => {
    setSubItems(subItems.filter(sub => sub.id !== id));
  };

  const registerInput = (id, ref) => {
    inputRefs.current[id] = ref;
  };

  const focusNextInput = (currentId) => {
    const allIds = itemType === 'yesNo' 
      ? options.map(opt => opt.id)
      : subItems.map(sub => sub.id);
    const currentIndex = allIds.indexOf(currentId);
    const nextId = allIds[currentIndex + 1];
    
    if (nextId && inputRefs.current[nextId]) {
      inputRefs.current[nextId].focus();
    } else {
      // At the end - add new item
      if (itemType === 'yesNo') {
        addOption();
      } else {
        addSubItem();
      }
    }
  };

  const styles = StyleSheet.create({
    scrollContent: {
      padding: getSpacing.lg,
    },
    section: {
      marginBottom: getSpacing.xl,
    },
    sectionTitle: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      marginBottom: getSpacing.md,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    radioGroup: {
      gap: getSpacing.sm,
    },
    radioOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.md,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    radioOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}10`,
    },
    radioCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.text.tertiary,
      marginRight: getSpacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioCircleSelected: {
      borderColor: theme.primary,
    },
    radioCircleInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.primary,
    },
    radioLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      flex: 1,
    },
    radioDescription: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.xs,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.md,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      marginBottom: getSpacing.sm,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: getBorderRadius.sm,
      borderWidth: 2,
      borderColor: theme.text.tertiary,
      marginRight: getSpacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    checkboxLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    subSection: {
      marginTop: getSpacing.md,
      paddingLeft: getSpacing.lg,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary + '40',
    },
    subSectionTitle: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.secondary,
      marginBottom: getSpacing.sm,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      marginTop: getSpacing.sm,
    },
    addButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.primary,
      marginLeft: getSpacing.xs,
    },
    indentedRow: {
      paddingLeft: getSpacing.lg,
    },
  });

  return (
    <PopUpModalWrapper
      visible={visible}
      onClose={handleCancel}
      maxHeight="90%"
    >
      <View style={{ height: '100%' }}>
        <ModalHeader
          title="Configure Item"
          onCancel={handleCancel}
          onDone={handleSave}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
        {/* ITEM TYPE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item Type</Text>
          
          <View style={styles.radioGroup}>
            {/* Simple Checkbox */}
            <TouchableOpacity
              style={[
                styles.radioOption,
                itemType === 'checkbox' && styles.radioOptionSelected,
              ]}
              onPress={() => setItemType('checkbox')}
            >
              <View style={[
                styles.radioCircle,
                itemType === 'checkbox' && styles.radioCircleSelected,
              ]}>
                {itemType === 'checkbox' && <View style={styles.radioCircleInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.radioLabel}>Simple Checkbox</Text>
                <Text style={styles.radioDescription}>
                  Basic checkable item
                </Text>
              </View>
            </TouchableOpacity>

            {/* Yes/No Question */}
            <TouchableOpacity
              style={[
                styles.radioOption,
                itemType === 'yesNo' && styles.radioOptionSelected,
              ]}
              onPress={() => setItemType('yesNo')}
            >
              <View style={[
                styles.radioCircle,
                itemType === 'yesNo' && styles.radioCircleSelected,
              ]}>
                {itemType === 'yesNo' && <View style={styles.radioCircleInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.radioLabel}>Yes/No Question</Text>
                <Text style={styles.radioDescription}>
                  Interactive question with answers
                </Text>
              </View>
            </TouchableOpacity>

            {/* Pre-filled Group */}
            <TouchableOpacity
              style={[
                styles.radioOption,
                itemType === 'group' && styles.radioOptionSelected,
              ]}
              onPress={() => setItemType('group')}
            >
              <View style={[
                styles.radioCircle,
                itemType === 'group' && styles.radioCircleSelected,
              ]}>
                {itemType === 'group' && <View style={styles.radioCircleInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.radioLabel}>Pre-filled Group</Text>
                <Text style={styles.radioDescription}>
                  Contains multiple sub-tasks
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* YES/NO TYPE (only if itemType is yesNo) */}
        {itemType === 'yesNo' && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Yes/No Type</Text>
            
            <View style={styles.radioGroup}>
              {/* Simple */}
              <TouchableOpacity
                style={[
                  styles.radioOption,
                  yesNoType === 'simple' && styles.radioOptionSelected,
                ]}
                onPress={() => setYesNoType('simple')}
              >
                <View style={[
                  styles.radioCircle,
                  yesNoType === 'simple' && styles.radioCircleSelected,
                ]}>
                  {yesNoType === 'simple' && <View style={styles.radioCircleInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.radioLabel}>Simple</Text>
                  <Text style={styles.radioDescription}>
                    Just yes or no
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Multiple Choice */}
              <TouchableOpacity
                style={[
                  styles.radioOption,
                  yesNoType === 'multiChoice' && styles.radioOptionSelected,
                ]}
                onPress={() => setYesNoType('multiChoice')}
              >
                <View style={[
                  styles.radioCircle,
                  yesNoType === 'multiChoice' && styles.radioCircleSelected,
                ]}>
                  {yesNoType === 'multiChoice' && <View style={styles.radioCircleInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.radioLabel}>Multiple Choice</Text>
                  <Text style={styles.radioDescription}>
                    Pick from pre-filled options
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Fill in Blank */}
              <TouchableOpacity
                style={[
                  styles.radioOption,
                  yesNoType === 'fillIn' && styles.radioOptionSelected,
                ]}
                onPress={() => setYesNoType('fillIn')}
              >
                <View style={[
                  styles.radioCircle,
                  yesNoType === 'fillIn' && styles.radioCircleSelected,
                ]}>
                  {yesNoType === 'fillIn' && <View style={styles.radioCircleInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.radioLabel}>Fill in Blank</Text>
                  <Text style={styles.radioDescription}>
                    User adds items at runtime
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* OPTIONS EDITOR (only for multiChoice) */}
            {yesNoType === 'multiChoice' && (
              <View style={{ marginTop: getSpacing.lg }}>
                <Text style={styles.subSectionTitle}>Options</Text>
                {options.map((option, index) => (
                  <View key={option.id} style={styles.indentedRow}>
                    <ChecklistEditingRow
                      item={option}
                      index={index}
                      theme={theme}
                      getSpacing={getSpacing}
                      getTypography={getTypography}
                      getBorderRadius={getBorderRadius}
                      isUserAdmin={false}
                      onUpdateItem={updateOption}
                      onRemoveItem={removeOption}
                      onToggleConfig={() => {}}
                      onFocus={() => {}}
                      onBlur={() => {}}
                      onSubmitEditing={focusNextInput}
                      registerInput={registerInput}
                    />
                  </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={addOption}>
                  <Text style={styles.addButtonText}>+ Add Option</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* SUBTASKS EDITOR (only for group) */}
        {itemType === 'group' && (
          <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>Subtasks</Text>
            {subItems.map((subItem, index) => (
              <View key={subItem.id} style={styles.indentedRow}>
                <ChecklistEditingRow
                  item={subItem}
                  index={index}
                  theme={theme}
                  getSpacing={getSpacing}
                  getTypography={getTypography}
                  getBorderRadius={getBorderRadius}
                  isUserAdmin={false}
                  onUpdateItem={updateSubItem}
                  onRemoveItem={removeSubItem}
                  onToggleConfig={() => {}}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onSubmitEditing={focusNextInput}
                  registerInput={registerInput}
                />
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addSubItem}>
              <Text style={styles.addButtonText}>+ Add Subtask</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* REQUIREMENTS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requirements</Text>
          
          {/* Screen Time */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setRequiredForScreenTime(!requiredForScreenTime)}
          >
            <View style={[
              styles.checkbox,
              requiredForScreenTime && styles.checkboxChecked,
            ]}>
              {requiredForScreenTime && (
                <Text style={{ color: '#fff', fontSize: 16 }}>✓</Text>
              )}
            </View>
            <Text style={styles.checkboxLabel}>Required for screen time</Text>
          </TouchableOpacity>

          {/* Parent Approval */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setRequiresParentApproval(!requiresParentApproval)}
          >
            <View style={[
              styles.checkbox,
              requiresParentApproval && styles.checkboxChecked,
            ]}>
              {requiresParentApproval && (
                <Text style={{ color: '#fff', fontSize: 16 }}>✓</Text>
              )}
            </View>
            <Text style={styles.checkboxLabel}>Parent approval needed</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
      </View>
    </PopUpModalWrapper>
  );
};

export default ChecklistItemConfigModal;