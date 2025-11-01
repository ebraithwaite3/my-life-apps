import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ScrollView,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { useTheme } from '../../contexts/ThemeContext';
import AutoAdd from './AutoAdd';
import IngredientsList from './IngredientsList';
import AddIngredientModal from './AddIngredientModal';

const AddItemModal = ({ visible, onClose, onAdd, allCategories = [], foodBank = {} }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [itemName, setItemName] = useState('');
  const [autoAdd, setAutoAdd] = useState(false);
  const [autoAddAt, setAutoAddAt] = useState(0);
  const [restockAmount, setRestockAmount] = useState(1);
  const [hasIngredients, setHasIngredients] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [addIngredientVisible, setAddIngredientVisible] = useState(false);
  const [notes, setNotes] = useState('');

  const scrollViewRef = useRef(null);

  const handleAdd = () => {
    if (itemName.trim()) {
      const newItem = {
        id: Crypto.randomUUID(), // Generate UUID for new item
        name: itemName.trim(),
        autoAdd: autoAdd,
        autoAddAt: autoAdd ? autoAddAt : 0,
        restockAmount: autoAdd ? restockAmount : 1,
        unit: 'count'
      };

      if (hasIngredients) {
        newItem.hasIngredients = true;
        newItem.ingredients = ingredients;
      }

      if (notes.trim()) {
        newItem.notes = notes.trim();
      }

      onAdd(newItem);
      handleClose();
    }
  };

  const handleClose = () => {
    setItemName('');
    setAutoAdd(false);
    setAutoAddAt(0);
    setRestockAmount(1);
    setHasIngredients(false);
    setIngredients([]);
    setNotes('');
    onClose();
  };

  const handleAddIngredient = (ingredient) => {
    setIngredients([...ingredients, ingredient]);
  };

  const handleDeleteIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: getBorderRadius.lg,
      borderTopRightRadius: getBorderRadius.lg,
      width: '100%',
      height: '95%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1,
      backgroundColor: theme.surface,
    },
    headerButton: {
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.sm,
    },
    headerButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
    },
    headerTitle: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
    },
    contentContainer: {
      flex: 1,
      marginTop: getSpacing.md * 2 + getSpacing.lg * 2,
    },
    scrollContent: {
      padding: getSpacing.lg,
      paddingBottom: getSpacing.xl * 2,
    },
    section: {
      marginBottom: getSpacing.lg,
    },
    label: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      padding: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.background,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: getSpacing.sm,
    },
    switchLabel: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '500',
      color: theme.text.primary,
    },
    autoAddContainer: {
      marginTop: getSpacing.md,
      padding: getSpacing.md,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    ingredientsContainer: {
      marginTop: getSpacing.md,
    },
  });

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
              <Text style={[styles.headerButtonText, { color: theme.error }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Add Item</Text>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleAdd}
              disabled={!itemName.trim()}
            >
              <Text
                style={[
                  styles.headerButtonText,
                  {
                    color: itemName.trim() ? theme.primary : theme.text.tertiary
                  }
                ]}
              >
                Add
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contentContainer}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
            >
              <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                automaticallyAdjustContentInsets={false}
                contentInsetAdjustmentBehavior="automatic"
                contentInset={{ bottom: Platform.OS === 'android' ? 0 : 0 }}
              >
                <View style={styles.section}>
                  <Text style={styles.label}>Item Name</Text>
                  <TextInput
                    style={styles.input}
                    value={itemName}
                    onChangeText={setItemName}
                    placeholder="Enter item name"
                    placeholderTextColor={theme.text.tertiary}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.section}>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Auto Add to Shopping List</Text>
                    <Switch
                      value={autoAdd}
                      onValueChange={setAutoAdd}
                      trackColor={{
                        false: theme.border,
                        true: theme.primary + '50',
                      }}
                      thumbColor={autoAdd ? theme.primary : theme.text.secondary}
                    />
                  </View>

                  {autoAdd && (
                    <View style={styles.autoAddContainer}>
                      <AutoAdd
                        autoAddAt={autoAddAt}
                        onAutoAddAtUpdate={setAutoAddAt}
                        restockAmount={restockAmount}
                        onRestockAmountUpdate={setRestockAmount}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Has Ingredients</Text>
                    <Switch
                      value={hasIngredients}
                      onValueChange={setHasIngredients}
                      trackColor={{
                        false: theme.border,
                        true: theme.primary + '50',
                      }}
                      thumbColor={hasIngredients ? theme.primary : theme.text.secondary}
                    />
                  </View>

                  {hasIngredients && (
                    <View style={styles.ingredientsContainer}>
                      <IngredientsList
                        ingredients={ingredients}
                        onDelete={handleDeleteIngredient}
                        onAdd={() => setAddIngredientVisible(true)}
                        showAddButton={true}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add notes..."
                    placeholderTextColor={theme.text.tertiary}
                    multiline
                    blurOnSubmit={false}
                    returnKeyType="done"
                    onFocus={() => {
                      setTimeout(() => {
                        const notesOffset = 300;
                        scrollViewRef.current?.scrollTo({ y: notesOffset, animated: true });
                      }, 250);
                    }}
                  />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>

          <AddIngredientModal
            visible={addIngredientVisible}
            onClose={() => setAddIngredientVisible(false)}
            onAdd={handleAddIngredient}
            allCategories={allCategories}
            foodBank={foodBank}
          />
        </View>
      </View>
    </Modal>
  );
};

export default AddItemModal;