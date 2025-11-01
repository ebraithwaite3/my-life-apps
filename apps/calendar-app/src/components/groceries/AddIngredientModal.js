import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import QuantityTracker from '../QuantityTracker';
import * as Crypto from 'expo-crypto';

const AddIngredientModal = ({ visible, onClose, onAdd, allCategories = [], foodBank = {} }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [ingredientName, setIngredientName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [unit, setUnit] = useState('count');
  const [category, setCategory] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [isNewIngredient, setIsNewIngredient] = useState(false);

  const uuidv4 = () => Crypto.randomUUID();

  const unitOptions = [
    { value: 'count', label: 'Count' },
    { value: 'lbs', label: 'Pounds' },
    { value: 'oz', label: 'Ounces' },
    { value: 'gallons', label: 'Gallons' },
    { value: 'quarts', label: 'Quarts' },
    { value: 'boxes', label: 'Boxes' },
    { value: 'bags', label: 'Bags' },
    { value: 'cans', label: 'Cans' },
    { value: 'bottles', label: 'Bottles' },
    { value: 'cups', label: 'Cups' },
    { value: 'tsp', label: 'Teaspoons' },
    { value: 'tbsp', label: 'Tablespoons' },
  ];

  const capitalize = (str) => {
    const withSpaces = str.replace(/([A-Z])/g, ' $1').trim();
    return withSpaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getAllFoodBankItems = () => {
    if (!foodBank) return [];
    const items = [];
    Object.keys(foodBank).forEach(cat => {
      if (Array.isArray(foodBank[cat])) {
        foodBank[cat].forEach(item => {
          items.push({
            name: item.name,
            category: cat,
            id: item.id,
          });
        });
      }
    });
    return items;
  };

  const allItems = getAllFoodBankItems();
  const filteredSuggestions = ingredientName
    ? allItems.filter(item =>
        item.name.toLowerCase().includes(ingredientName.toLowerCase())
      )
    : [];

  const handleSelectSuggestion = (item) => {
    setIngredientName(item.name);
    setCategory(item.category);
    setSelectedItemId(item.id);
    setShowSuggestions(false);
    setIsNewIngredient(false);
  };

  const handleAddAsNew = () => {
    setShowSuggestions(false);
    setIsNewIngredient(true);
    setCategory('');
    setSelectedItemId(null);
  };

  const handleAdd = () => {
    if (ingredientName.trim() && quantity && unit) {
      // If it's a new ingredient, require a category
      if (isNewIngredient && !category) {
        return; // Don't add without category
      }
      
      const ingredient = {
        id: selectedItemId || uuidv4(),
        name: ingredientName.trim(),
        category: category || allItems.find(item => item.name === ingredientName)?.category,
        quantity: quantity,
        unit: unit,
      };
      onAdd(ingredient);
      handleClose();
    }
  };

  const handleClose = () => {
    setIngredientName('');
    setQuantity(1);
    setUnit('count');
    setCategory('');
    setShowSuggestions(false);
    setShowUnitPicker(false);
    setIsNewIngredient(false);
    setSelectedItemId(null);
    onClose();
  };

  const handleUnitSelect = (selectedUnit) => {
    setUnit(selectedUnit);
    setShowUnitPicker(false);
  };

  const getUnitLabel = () => {
    return unitOptions.find(u => u.value === unit)?.label || 'Count';
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
    content: {
      flex: 1,
      padding: getSpacing.lg,
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
    suggestionsContainer: {
      marginTop: getSpacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      backgroundColor: theme.background,
      maxHeight: 200,
    },
    suggestionItem: {
      padding: getSpacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    suggestionText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    suggestionCategory: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: 2,
    },
    addNewButton: {
      padding: getSpacing.md,
      backgroundColor: theme.primary + '10',
      borderTopWidth: 1,
      borderTopColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    addNewButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.primary,
      fontWeight: '600',
    },
    quantityRow: {
      flexDirection: 'row',
      gap: getSpacing.md,
    },
    quantitySection: {
      flex: 1,
    },
    unitSection: {
      flex: 1,
    },
    unitButton: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      padding: getSpacing.md,
      backgroundColor: theme.background,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    unitButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    categoryPicker: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      backgroundColor: theme.background,
    },
    categoryButton: {
      padding: getSpacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    selectedCategory: {
      backgroundColor: theme.primary + '20',
    },
    categoryButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    pickerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    pickerContainer: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: getBorderRadius.lg,
      borderTopRightRadius: getBorderRadius.lg,
      maxHeight: '50%',
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    pickerTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    pickerOption: {
      padding: getSpacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    selectedOption: {
      backgroundColor: theme.primary + '20',
    },
    pickerOptionText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
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
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? -100 : 20}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
              <Text style={[styles.headerButtonText, { color: theme.error }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Add Ingredient</Text>

            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={handleAdd}
              disabled={!ingredientName.trim() || (isNewIngredient && !category)}
            >
              <Text 
                style={[
                  styles.headerButtonText, 
                  { 
                    color: (ingredientName.trim() && !(isNewIngredient && !category)) 
                      ? theme.primary 
                      : theme.text.tertiary 
                  }
                ]}
              >
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Ingredient Name */}
            <View style={styles.section}>
              <Text style={styles.label}>Ingredient Name</Text>
              <TextInput
                style={styles.input}
                value={ingredientName}
                onChangeText={(text) => {
                  setIngredientName(text);
                  setShowSuggestions(text.length > 0);
                  setIsNewIngredient(false);
                }}
                placeholder="Search or enter new ingredient"
                placeholderTextColor={theme.text.tertiary}
                autoFocus
                autoCapitalize="words"
              />

              {/* Suggestions */}
              {showSuggestions && ingredientName.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView style={{ maxHeight: 150 }}>
                    {filteredSuggestions.length > 0 ? (
                      <>
                        {filteredSuggestions.map((item, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.suggestionItem}
                            onPress={() => handleSelectSuggestion(item)}
                          >
                            <Text style={styles.suggestionText}>{item.name}</Text>
                            <Text style={styles.suggestionCategory}>
                              {capitalize(item.category)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    ) : null}
                  </ScrollView>
                  <TouchableOpacity 
                    style={styles.addNewButton}
                    onPress={handleAddAsNew}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                    <Text style={styles.addNewButtonText}>
                      Add "{ingredientName}" as new ingredient
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Quantity and Unit */}
            <View style={styles.quantityRow}>
              <View style={styles.quantitySection}>
                <Text style={styles.label}>Quantity</Text>
                <QuantityTracker
                  value={quantity}
                  onUpdate={setQuantity}
                  min={0.5}
                  max={999}
                  step={0.5}
                  size="medium"
                />
              </View>

              <View style={styles.unitSection}>
                <Text style={styles.label}>Unit</Text>
                <TouchableOpacity 
                  style={styles.unitButton}
                  onPress={() => setShowUnitPicker(true)}
                >
                  <Text style={styles.unitButtonText}>{getUnitLabel()}</Text>
                  <Ionicons 
                    name="chevron-down" 
                    size={20} 
                    color={theme.text.secondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Category (for new ingredients) */}
            {isNewIngredient && allCategories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryPicker}>
                  <ScrollView style={{ maxHeight: 200 }}>
                    {allCategories.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryButton,
                          category === cat && styles.selectedCategory,
                        ]}
                        onPress={() => setCategory(cat)}
                      >
                        <Text style={styles.categoryButtonText}>
                          {capitalize(cat)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Unit Picker Modal */}
          {showUnitPicker && (
            <View style={styles.pickerOverlay}>
              <TouchableOpacity 
                style={{ flex: 1 }}
                onPress={() => setShowUnitPicker(false)}
              />
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select Unit</Text>
                  <TouchableOpacity onPress={() => setShowUnitPicker(false)}>
                    <Text style={[styles.headerButtonText, { color: theme.primary }]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  {unitOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        unit === option.value && styles.selectedOption,
                      ]}
                      onPress={() => handleUnitSelect(option.value)}
                    >
                      <Text style={styles.pickerOptionText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default AddIngredientModal;