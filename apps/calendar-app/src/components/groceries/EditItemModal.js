import React, { useState, useEffect, useRef } from 'react';
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
import { useTheme } from '../../contexts/ThemeContext';
import AutoAdd from './AutoAdd';
import IngredientsList from './IngredientsList';
import AddIngredientModal from './AddIngredientModal';

const EditItemModal = ({ visible, item, allCategories = [], foodBank = {}, onClose, onSave }) => {
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

  // Initialize form when modal opens or item changes
  useEffect(() => {
    if (item) {
      setItemName(item.name || '');
      setAutoAdd(item.autoAdd || false);
      setAutoAddAt(item.autoAddAt || 0);
      setRestockAmount(item.restockAmount || 1);
      setHasIngredients(item.hasIngredients || false);
      setIngredients(item.ingredients || []);
      setNotes(item.notes || '');
    }
  }, [item]);

  const handleSave = () => {
    if (itemName.trim()) {
      const updatedItem = {
        ...item,
        name: itemName.trim(),
        autoAdd: autoAdd,
        autoAddAt: autoAdd ? autoAddAt : 0,
        restockAmount: autoAdd ? restockAmount : 1,
        unit: item.unit || 'count'
      };

      if (hasIngredients) {
        updatedItem.hasIngredients = true;
        updatedItem.ingredients = ingredients;
      } else {
        delete updatedItem.hasIngredients;
        delete updatedItem.ingredients;
      }

      if (notes.trim()) {
        updatedItem.notes = notes.trim();
      } else {
        delete updatedItem.notes;
      }

      onSave(updatedItem);
      handleClose();
    }
  };

  const handleClose = () => {
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
      // FIXED: Position absolute to stay pinned
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1,
      backgroundColor: theme.surface, // Match background to avoid transparency issues
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
    contentContainer: { // NEW: Wrapper for content to push below header
      flex: 1,
      marginTop: getSpacing.md * 2 + getSpacing.lg * 2, // Approximate header height (adjust if needed)
    },
    scrollContent: {
      padding: getSpacing.lg,
      // CHANGED: Increase paddingBottom to ensure space below notes for keyboard
      paddingBottom: getSpacing.xl * 3, // Was *4, but tuned for consistency
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
          {/* Header - FIXED POSITION */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
              <Text style={[styles.headerButtonText, { color: theme.error }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Edit Item</Text>

            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={handleSave}
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
                Update
              </Text>
            </TouchableOpacity>
          </View>

          {/* NEW: Content wrapper to offset for fixed header */}
          <View style={styles.contentContainer}>
            {/* CHANGED: KeyboardAvoidingView ONLY around ScrollView for targeted avoidance */}
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined} // Only iOS padding; Android uses ScrollView
              keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
            >
              <ScrollView
                ref={scrollViewRef} // Assign the ref here
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                // NEW: Additional props for better keyboard handling
                showsVerticalScrollIndicator={true}
                keyboardDismissMode="on-drag" // NEW: Dismiss keyboard on scroll drag
                // For iOS, add automatic content inset adjustment
                contentInsetAdjustmentBehavior="automatic"
              >
                {/* Item Name Section */}
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

                {/* Auto Add Section */}
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

                {/* Has Ingredients Section */}
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

                {/* Notes Section - Enhanced for keyboard avoidance */}
                <View style={styles.section}>
                  <Text style={styles.label}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add notes..."
                    placeholderTextColor={theme.text.tertiary}
                    multiline
                    // FIX: Add onFocus to scroll to the notes section
                    onFocus={() => {
                      setTimeout(() => {
                        // Calculate approximate offset to notes (adjust based on your sections)
                        const notesOffset = 300; // Tune this: sum of previous sections' heights
                        scrollViewRef.current?.scrollTo({ y: notesOffset, animated: true });
                      }, 250); // Longer timeout for full keyboard animation
                    }}
                    blurOnSubmit={false} // NEW: Prevent blur on enter for multiline
                  />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>

          {/* Add Ingredient Modal */}
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

export default EditItemModal;