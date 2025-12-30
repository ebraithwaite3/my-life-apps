import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import { PopUpModalWrapper, ModalHeader } from '@my-apps/ui';
import * as Crypto from 'expo-crypto';

const FillInSelectionModal = ({
  visible,
  onConfirm, // (items: string[]) => void
  onCancel,
  itemName = "Item", // For display in header
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [items, setItems] = useState([]);
  const inputRefs = useRef({});

  useEffect(() => {
    // Start with one empty input when modal opens
    if (visible) {
      const initialId = Crypto.randomUUID();
      setItems([{ id: initialId, text: '' }]);
    }
  }, [visible]);

  const updateItem = (id, text) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, text } : item));
  };

  const removeItem = (id) => {
    if (items.length <= 1) {
      // Don't remove last item, just clear it
      updateItem(id, '');
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addItem = () => {
    const id = Crypto.randomUUID();
    setItems(prev => [{ id, text: '' }, ...prev]);
    
    // Focus new input after render
    setTimeout(() => {
      if (inputRefs.current[id]) {
        inputRefs.current[id].focus();
      }
    }, 100);
  };

  const handleSubmitEditing = (currentId) => {
    const index = items.findIndex(i => i.id === currentId);
    const item = items[index];

    // If current is empty and not first, go to next
    if (!item.text.trim() && index > 0) {
      const nextItem = items[index + 1];
      if (nextItem && inputRefs.current[nextItem.id]) {
        inputRefs.current[nextItem.id].focus();
      }
      return;
    }

    // If at top (index 0), add new item
    if (index === 0) {
      addItem();
    } else {
      // Move to next
      const nextItem = items[index + 1];
      if (nextItem && inputRefs.current[nextItem.id]) {
        inputRefs.current[nextItem.id].focus();
      } else {
        addItem();
      }
    }
  };

  const handleBlur = (id) => {
    const item = items.find(i => i.id === id);
    if (item && !item.text.trim() && items.length > 1) {
      removeItem(id);
    }
  };

  const handleConfirm = () => {
    const filledItems = items
      .map(item => item.text.trim())
      .filter(text => text !== '');
    
    if (filledItems.length === 0) {
      // Can't confirm without any items
      return;
    }
    
    onConfirm(filledItems);
  };

  const hasFilledItems = items.some(item => item.text.trim() !== '');
  const showAddButton = !items.some(item => !item.text.trim());

  const styles = StyleSheet.create({
    scrollContent: {
      padding: getSpacing.lg,
    },
    headerText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.md,
      textAlign: 'center',
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: getSpacing.sm,
      paddingVertical: getSpacing.xs,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.sm,
      paddingHorizontal: getSpacing.sm,
    },
    itemNumber: {
      width: 30,
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
    },
    itemInput: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.sm,
    },
    deleteButton: {
      padding: getSpacing.xs,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: getSpacing.md,
      marginTop: getSpacing.sm,
      backgroundColor: theme.primary + '15',
      borderRadius: getBorderRadius.sm,
    },
    addButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.primary,
      marginLeft: getSpacing.xs,
      fontWeight: '600',
    },
  });

  return (
    <PopUpModalWrapper
      visible={visible}
      onClose={onCancel}
      maxHeight="70%"
    >
      <View style={{ height: '100%' }}>
        <ModalHeader
          title="Add Items"
          onCancel={onCancel}
          onDone={handleConfirm}
          doneText="Confirm"
          doneDisabled={!hasFilledItems}
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
            <Text style={styles.headerText}>
              What items for {itemName}?
            </Text>

            {items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemNumber}>{index + 1}.</Text>

                <TextInput
                  ref={(r) => (inputRefs.current[item.id] = r)}
                  style={styles.itemInput}
                  placeholder="Enter item..."
                  placeholderTextColor={theme.text.tertiary}
                  value={item.text}
                  onChangeText={(text) => updateItem(item.id, text)}
                  onSubmitEditing={() => handleSubmitEditing(item.id)}
                  onBlur={() => handleBlur(item.id)}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />

                {item.text.trim() !== '' && (
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {showAddButton && (
              <TouchableOpacity onPress={addItem} style={styles.addButton}>
                <Ionicons name="add" size={20} color={theme.primary} />
                <Text style={styles.addButtonText}>Add Item</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </PopUpModalWrapper>
  );
};

export default FillInSelectionModal;