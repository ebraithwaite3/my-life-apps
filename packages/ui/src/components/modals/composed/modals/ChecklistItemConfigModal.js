// ChecklistItemConfigModal.js - UPDATED VERSION

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import { PopUpModalWrapper } from '../../base';
import ModalHeader from '../../../headers/ModalHeader';
import ChecklistEditingRow from '../../../checklists/ChecklistEditingRow';
import * as Crypto from 'expo-crypto';

const ChecklistItemConfigModal = ({
  visible,
  item,
  onSave,
  onCancel,
  isUserAdmin,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const [itemType, setItemType] = useState('checkbox');
  const [requiredForScreenTime, setRequiredForScreenTime] = useState(false);
  const [requiresParentApproval, setRequiresParentApproval] = useState(false);
  const [yesNoType, setYesNoType] = useState('simple');
  const [options, setOptions] = useState([]);
  const [guidedSteps, setGuidedSteps] = useState([]);
  const [quantityLabel, setQuantityLabel] = useState('');

  const inputRefs = useRef({});

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
        setGuidedSteps(item.yesNoConfig.steps || []);
        setQuantityLabel(item.yesNoConfig.quantityLabel || '');
      } else {
        setYesNoType('simple');
        setOptions([]);
        setGuidedSteps([]);
        setQuantityLabel('');
      }
    }
  }, [item, visible]);

  const handleSave = () => {
    const updatedItem = {
      ...item,
      itemType,
      requiredForScreenTime: requiredForScreenTime || undefined,
      requiresParentApproval: requiresParentApproval || undefined,
    };

    if (itemType === 'yesNo') {
      updatedItem.yesNoConfig = {
        type: yesNoType,
        ...(yesNoType === 'multiChoice' && {
          options: options.map(opt => opt.name).filter(name => name.trim() !== ''),
        }),
        ...(yesNoType === 'guided' && {
          ...(quantityLabel.trim() && { quantityLabel: quantityLabel.trim() }),
          steps: guidedSteps
            .filter(s => s.name.trim() !== '')
            .map(s => ({
              id: s.id,
              name: s.name.trim(),
              hasTimer: s.hasTimer || false,
              ...(s.hasTimer && { timerMinutes: s.timerMinutes || 30 }),
            })),
        }),
      };
    } else {
      updatedItem.yesNoConfig = undefined;
    }

    // Preserve subItems if they exist (managed in EditChecklistContent now)
    if (item.subItems) {
      updatedItem.subItems = item.subItems;
    }

    onSave(updatedItem);
  };

  const handleCancel = () => {
    setItemType(item?.itemType || 'checkbox');
    setRequiredForScreenTime(item?.requiredForScreenTime || false);
    setRequiresParentApproval(item?.requiresParentApproval || false);
    setYesNoType(item?.yesNoConfig?.type || 'simple');
    setOptions([]);
    setGuidedSteps(item?.yesNoConfig?.steps || []);
    setQuantityLabel(item?.yesNoConfig?.quantityLabel || '');
    onCancel();
  };

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

  const registerInput = (id, ref) => {
    inputRefs.current[id] = ref;
  };

  const focusNextInput = (currentId) => {
    const allIds = options.map(opt => opt.id);
    const currentIndex = allIds.indexOf(currentId);
    const nextId = allIds[currentIndex + 1];

    if (nextId && inputRefs.current[nextId]) {
      inputRefs.current[nextId].focus();
    } else {
      addOption();
    }
  };

  // Guided step helpers
  const addStep = () => {
    setGuidedSteps(prev => [
      ...prev,
      { id: Crypto.randomUUID(), name: '', hasTimer: false, timerMinutes: 30 },
    ]);
  };

  const updateStep = (id, field, value) => {
    setGuidedSteps(prev =>
      prev.map(s => s.id === id ? { ...s, [field]: value } : s)
    );
  };

  const removeStep = (id) => {
    setGuidedSteps(prev => prev.filter(s => s.id !== id));
  };

  const moveStep = (id, direction) => {
    setGuidedSteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
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
    stepCard: {
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      padding: getSpacing.md,
      marginBottom: getSpacing.sm,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    stepInput: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
    },
    stepReorderBtn: {
      padding: getSpacing.xs,
    },
    stepDeleteBtn: {
      padding: getSpacing.xs,
    },
    timerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: getSpacing.sm,
      gap: getSpacing.sm,
    },
    timerLabel: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
      flex: 1,
    },
    timerMinutesInput: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.xs,
      textAlign: 'center',
      minWidth: 56,
    },
    timerMinutesLabel: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
    },
    quantityInput: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      marginBottom: getSpacing.md,
    },
    quantityHint: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.tertiary,
      marginBottom: getSpacing.md,
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

                  {/* Guided Workflow */}
                  <TouchableOpacity
                    style={[
                      styles.radioOption,
                      yesNoType === 'guided' && styles.radioOptionSelected,
                    ]}
                    onPress={() => setYesNoType('guided')}
                  >
                    <View style={[
                      styles.radioCircle,
                      yesNoType === 'guided' && styles.radioCircleSelected,
                    ]}>
                      {yesNoType === 'guided' && <View style={styles.radioCircleInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.radioLabel}>Guided Workflow</Text>
                      <Text style={styles.radioDescription}>
                        Step-by-step tasks, optionally repeated N times
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

                {/* GUIDED WORKFLOW STEP BUILDER */}
                {yesNoType === 'guided' && (
                  <View style={{ marginTop: getSpacing.lg }}>
                    <Text style={styles.subSectionTitle}>Quantity Prompt (optional)</Text>
                    <TextInput
                      style={styles.quantityInput}
                      value={quantityLabel}
                      onChangeText={setQuantityLabel}
                      placeholder="e.g. How many loads?"
                      placeholderTextColor={theme.text.tertiary}
                    />
                    <Text style={styles.quantityHint}>
                      Leave blank to run steps once with no quantity prompt.
                    </Text>

                    <Text style={styles.subSectionTitle}>Steps</Text>
                    {guidedSteps.map((step, index) => (
                      <View key={step.id} style={styles.stepCard}>
                        <View style={styles.stepRow}>
                          {/* Reorder buttons */}
                          <View style={{ gap: 2 }}>
                            <TouchableOpacity
                              style={styles.stepReorderBtn}
                              onPress={() => moveStep(step.id, 'up')}
                              disabled={index === 0}
                            >
                              <Ionicons
                                name="chevron-up"
                                size={16}
                                color={index === 0 ? theme.text.tertiary : theme.text.secondary}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.stepReorderBtn}
                              onPress={() => moveStep(step.id, 'down')}
                              disabled={index === guidedSteps.length - 1}
                            >
                              <Ionicons
                                name="chevron-down"
                                size={16}
                                color={index === guidedSteps.length - 1 ? theme.text.tertiary : theme.text.secondary}
                              />
                            </TouchableOpacity>
                          </View>

                          <TextInput
                            style={styles.stepInput}
                            value={step.name}
                            onChangeText={val => updateStep(step.id, 'name', val)}
                            placeholder={`Step ${index + 1} name`}
                            placeholderTextColor={theme.text.tertiary}
                          />

                          <TouchableOpacity
                            style={styles.stepDeleteBtn}
                            onPress={() => removeStep(step.id)}
                          >
                            <Ionicons name="trash-outline" size={18} color={theme.error} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.timerRow}>
                          <Text style={styles.timerLabel}>Has timer</Text>
                          <Switch
                            value={step.hasTimer}
                            onValueChange={val => updateStep(step.id, 'hasTimer', val)}
                            trackColor={{ false: theme.border, true: theme.primary + '80' }}
                            thumbColor={step.hasTimer ? theme.primary : theme.text.tertiary}
                          />
                          {step.hasTimer && (
                            <>
                              <TextInput
                                style={styles.timerMinutesInput}
                                value={String(step.timerMinutes || 30)}
                                onChangeText={val => {
                                  const n = parseInt(val, 10);
                                  updateStep(step.id, 'timerMinutes', isNaN(n) ? 0 : n);
                                }}
                                keyboardType="number-pad"
                                selectTextOnFocus
                              />
                              <Text style={styles.timerMinutesLabel}>min</Text>
                            </>
                          )}
                        </View>
                      </View>
                    ))}

                    <TouchableOpacity style={styles.addButton} onPress={addStep}>
                      <Text style={styles.addButtonText}>+ Add Step</Text>
                    </TouchableOpacity>
                  </View>
                )}
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