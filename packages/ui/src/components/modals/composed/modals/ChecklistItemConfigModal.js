// ChecklistItemConfigModal.js

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

const uuidv4 = () => Crypto.randomUUID();

const TYPE_CARDS = [
  {
    itemType: 'checkbox',
    yesNoType: null,
    icon: 'checkbox-outline',
    label: 'Simple Checkbox',
    description: 'Basic checkable item',
  },
  {
    itemType: 'yesNo',
    yesNoType: 'simple',
    icon: 'help-circle-outline',
    label: 'Simple Yes/No',
    description: 'Yes or no, no extras',
  },
  {
    itemType: 'yesNo',
    yesNoType: 'multiChoice',
    icon: 'list-outline',
    label: 'Multiple Choice',
    description: 'Pick from a list of options',
  },
  {
    itemType: 'yesNo',
    yesNoType: 'fillIn',
    icon: 'pencil-outline',
    label: 'Fill in Blank',
    description: 'User types items at runtime',
  },
  {
    itemType: 'yesNo',
    yesNoType: 'guided',
    icon: 'git-branch-outline',
    label: 'Guided Workflow',
    description: 'Step-by-step, optionally repeated',
  },
  {
    itemType: 'yesNo',
    yesNoType: 'header',
    icon: 'layers-outline',
    label: 'Header w/ Sub-Items',
    description: 'Reveals sub-items on Yes — add them in the editor',
  },
  {
    itemType: 'yesNo',
    yesNoType: 'assignable',
    icon: 'person-add-outline',
    label: 'Assignable Task',
    description: 'Tap Yes to assign to family members',
  },
];

const TYPE_TITLES = {
  checkbox: 'Simple Checkbox',
  simple: 'Simple Yes/No',
  multiChoice: 'Multiple Choice',
  fillIn: 'Fill in Blank',
  guided: 'Guided Workflow',
  header: 'Header w/ Sub-Items',
  assignable: 'Assignable Task',
};

const ChecklistItemConfigModal = ({
  visible,
  item,
  onSave,
  onCancel,
  isUserAdmin,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const [step, setStep] = useState(1);

  // Core type state
  const [itemType, setItemType] = useState('checkbox');
  const [yesNoType, setYesNoType] = useState(null);

  // Requirements
  const [requiredForScreenTime, setRequiredForScreenTime] = useState(false);
  const [requiresParentApproval, setRequiresParentApproval] = useState(false);

  // MultiChoice
  const [options, setOptions] = useState([]);

  // Guided
  const [guidedSteps, setGuidedSteps] = useState([]);
  const [quantityLabel, setQuantityLabel] = useState('');

  // Assignable
  const [notificationText, setNotificationText] = useState('');

  const inputRefs = useRef({});

  useEffect(() => {
    if (item) {
      setStep(1);
      setItemType(item.itemType || 'checkbox');
      setRequiredForScreenTime(item.requiredForScreenTime || false);
      setRequiresParentApproval(item.requiresParentApproval || false);

      const cfg = item.yesNoConfig;
      if (cfg) {
        setYesNoType(cfg.type || 'simple');
        setOptions((cfg.options || []).map(opt => ({ id: uuidv4(), name: opt })));
        setGuidedSteps(cfg.steps || []);
        setQuantityLabel(cfg.quantityLabel || '');
        setNotificationText(cfg.notificationText || '');
      } else {
        setYesNoType(null);
        setOptions([]);
        setGuidedSteps([]);
        setQuantityLabel('');
        setNotificationText('');
      }
    }
  }, [item, visible]);

  const currentTypeKey = itemType === 'checkbox' ? 'checkbox' : (yesNoType || 'simple');

  const isCardSelected = (card) => {
    if (card.itemType === 'checkbox') return itemType === 'checkbox';
    return itemType === 'yesNo' && yesNoType === card.yesNoType;
  };

  const selectCard = (card) => {
    setItemType(card.itemType);
    setYesNoType(card.yesNoType);
  };

  // --- MultiChoice helpers ---
  const addOption = () => setOptions(prev => [...prev, { id: uuidv4(), name: '' }]);
  const updateOption = (id, name) => setOptions(prev => prev.map(o => o.id === id ? { ...o, name } : o));
  const removeOption = (id) => setOptions(prev => prev.filter(o => o.id !== id));
  const registerInput = (id, ref) => { inputRefs.current[id] = ref; };
  const focusNextInput = (currentId) => {
    const allIds = options.map(o => o.id);
    const next = allIds[allIds.indexOf(currentId) + 1];
    if (next && inputRefs.current[next]) inputRefs.current[next].focus();
    else addOption();
  };

  // --- Guided step helpers ---
  const addStep = () => setGuidedSteps(prev => [
    ...prev, { id: uuidv4(), name: '', hasTimer: false, timerMinutes: 30 },
  ]);
  const updateStep = (id, field, value) =>
    setGuidedSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  const removeStep = (id) => setGuidedSteps(prev => prev.filter(s => s.id !== id));
  const moveStep = (id, dir) => setGuidedSteps(prev => {
    const idx = prev.findIndex(s => s.id === id);
    if (idx === -1) return prev;
    const t = dir === 'up' ? idx - 1 : idx + 1;
    if (t < 0 || t >= prev.length) return prev;
    const next = [...prev];
    [next[idx], next[t]] = [next[t], next[idx]];
    return next;
  });

  // --- Save ---
  const handleSave = () => {
    const updatedItem = {
      ...item,
      itemType,
      requiredForScreenTime: requiredForScreenTime || undefined,
      requiresParentApproval: requiresParentApproval || undefined,
    };

    if (itemType === 'yesNo') {
      if (yesNoType === 'multiChoice') {
        updatedItem.yesNoConfig = {
          type: 'multiChoice',
          options: options.map(o => o.name).filter(n => n.trim() !== ''),
        };
      } else if (yesNoType === 'guided') {
        updatedItem.yesNoConfig = {
          type: 'guided',
          ...(quantityLabel.trim() && { quantityLabel: quantityLabel.trim() }),
          steps: guidedSteps.filter(s => s.name.trim() !== '').map(s => ({
            id: s.id,
            name: s.name.trim(),
            hasTimer: s.hasTimer || false,
            ...(s.hasTimer && { timerMinutes: s.timerMinutes || 30 }),
          })),
        };
      } else if (yesNoType === 'assignable') {
        updatedItem.yesNoConfig = {
          type: 'assignable',
          ...(notificationText.trim() && { notificationText: notificationText.trim() }),
        };
      } else if (yesNoType === 'header') {
        updatedItem.yesNoConfig = { type: 'header' };
        // Sub-items are managed in the editing view, preserve them
        if (item.subItems) updatedItem.subItems = item.subItems;
      } else {
        updatedItem.yesNoConfig = { type: yesNoType || 'simple' };
      }
    } else {
      updatedItem.yesNoConfig = undefined;
      // Preserve non-header sub-items
      if (item.subItems && item.yesNoConfig?.type !== 'header') {
        updatedItem.subItems = item.subItems;
      }
    }

    // Switching away from header clears its sub-items
    if (item.yesNoConfig?.type === 'header' && yesNoType !== 'header') {
      updatedItem.subItems = undefined;
    }

    onSave(updatedItem);
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleBack = () => setStep(1);

  const handleNext = () => setStep(2);

  const styles = StyleSheet.create({
    // Step 1 - card grid
    step1Container: {
      flex: 1,
      padding: getSpacing.lg,
    },
    cardRow: {
      flexDirection: 'row',
      marginBottom: getSpacing.md,
      gap: getSpacing.md,
    },
    card: {
      flex: 1,
      paddingVertical: getSpacing.lg,
      paddingHorizontal: getSpacing.md,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.lg,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      minHeight: 100,
    },
    cardSelected: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}10`,
    },
    cardSpacer: {
      flex: 1,
    },
    cardIcon: {
      marginBottom: getSpacing.sm,
    },
    cardLabel: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '700',
      color: theme.text.primary,
      textAlign: 'center',
      marginBottom: 4,
    },
    cardLabelSelected: {
      color: theme.primary,
    },
    cardDescription: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
    },
    // Step 2 - config
    scrollContent: {
      padding: getSpacing.lg,
    },
    section: {
      marginBottom: getSpacing.xl,
    },
    sectionTitle: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.secondary,
      marginBottom: getSpacing.md,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
    stepReorderBtn: { padding: getSpacing.xs },
    stepDeleteBtn: { padding: getSpacing.xs },
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
    notifInput: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
    },
    headerInfo: {
      backgroundColor: `${theme.primary}10`,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: `${theme.primary}30`,
      padding: getSpacing.md,
      marginBottom: getSpacing.md,
    },
    headerInfoText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      lineHeight: 20,
    },
  });

  const cardRows = [
    TYPE_CARDS.slice(0, 2),
    TYPE_CARDS.slice(2, 4),
    TYPE_CARDS.slice(4, 6),
    TYPE_CARDS.slice(6),
  ];

  const renderStep1 = () => (
    <>
      <ModalHeader
        title="Item Type"
        onCancel={handleCancel}
        cancelText="Cancel"
        onDone={handleNext}
        doneText="Next →"
      />
      <ScrollView contentContainerStyle={styles.step1Container} keyboardShouldPersistTaps="handled">
        {cardRows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.cardRow}>
            {row.map(card => {
              const selected = isCardSelected(card);
              return (
                <TouchableOpacity
                  key={`${card.itemType}-${card.yesNoType}`}
                  style={[styles.card, selected && styles.cardSelected]}
                  onPress={() => selectCard(card)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={card.icon}
                    size={28}
                    color={selected ? theme.primary : theme.text.secondary}
                    style={styles.cardIcon}
                  />
                  <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>
                    {card.label}
                  </Text>
                  <Text style={styles.cardDescription}>{card.description}</Text>
                </TouchableOpacity>
              );
            })}
            {row.length < 2 && <View style={styles.cardSpacer} />}
          </View>
        ))}
      </ScrollView>
    </>
  );

  const renderStep2 = () => (
    <>
      <ModalHeader
        title={TYPE_TITLES[currentTypeKey] || 'Configure'}
        onCancel={handleBack}
        cancelText="← Back"
        cancelColor={theme.text.secondary}
        onDone={handleSave}
        doneText="Done"
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
          {/* Multiple Choice: options */}
          {yesNoType === 'multiChoice' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Options</Text>
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
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={styles.addButtonText}>Add Option</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Guided Workflow: quantity + steps */}
          {yesNoType === 'guided' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quantity Prompt (optional)</Text>
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
              <Text style={styles.sectionTitle}>Steps</Text>
              {guidedSteps.map((step, index) => (
                <View key={step.id} style={styles.stepCard}>
                  <View style={styles.stepRow}>
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
                    <TouchableOpacity style={styles.stepDeleteBtn} onPress={() => removeStep(step.id)}>
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
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={styles.addButtonText}>Add Step</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Assignable: notification text */}
          {yesNoType === 'assignable' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notification Text (optional)</Text>
              <TextInput
                style={styles.notifInput}
                value={notificationText}
                onChangeText={setNotificationText}
                placeholder="e.g. Bring Mom your dirty laundry!"
                placeholderTextColor={theme.text.tertiary}
                multiline
              />
            </View>
          )}

          {/* Header: info message */}
          {yesNoType === 'header' && (
            <View style={styles.section}>
              <View style={styles.headerInfo}>
                <Text style={styles.headerInfoText}>
                  Save this item, then add sub-items directly in the editing view. Tap the ⭐ on any sub-item to configure it as a Yes/No, Guided, Assignable, etc.
                </Text>
              </View>
            </View>
          )}

          {/* Requirements - shown for all types */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setRequiredForScreenTime(!requiredForScreenTime)}
            >
              <View style={[styles.checkbox, requiredForScreenTime && styles.checkboxChecked]}>
                {requiredForScreenTime && <Text style={{ color: '#fff', fontSize: 16 }}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Required for screen time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setRequiresParentApproval(!requiresParentApproval)}
            >
              <View style={[styles.checkbox, requiresParentApproval && styles.checkboxChecked]}>
                {requiresParentApproval && <Text style={{ color: '#fff', fontSize: 16 }}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Parent approval needed</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );

  return (
    <PopUpModalWrapper
      visible={visible}
      onClose={handleCancel}
      maxHeight="90%"
    >
      <View style={{ height: '100%' }}>
        {step === 1 ? renderStep1() : renderStep2()}
      </View>
    </PopUpModalWrapper>
  );
};

export default ChecklistItemConfigModal;
