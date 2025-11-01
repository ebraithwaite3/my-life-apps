import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import QuantityTracker from '../QuantityTracker';
import { DateTime } from 'luxon';

const QuickAddModal = ({ visible, item, shoppingList, restockAmount, foodBankItem, inventory, onClose, onAddToList }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [quantity, setQuantity] = useState(restockAmount || 1);
  const greenColor = '#10B981';
  console.log("ITEM IN MODAL:", item, "FOODBANK ITEM:", foodBankItem);

  // Reset quantity when modal opens with new item
  useEffect(() => {
    if (visible) {
      setQuantity(restockAmount || 1);
    }
  }, [visible, item, restockAmount]);

  // Is the item already in the shopping list? (Gather the whole object)
  const shoppingListEntry = useMemo(() => {
    return shoppingList?.find(listItem => listItem.id === item?.id) || null;
  }, [shoppingList, item]);
  console.log('Shopping List Entry for', item?.name, ':', shoppingListEntry);

  const handleCancel = () => {
    setQuantity(1);
    onClose();
  };

  const handleAdd = () => {
    let itemHasIngredients = foodBankItem?.ingredients && 
                            Array.isArray(foodBankItem.ingredients) && 
                            foodBankItem.ingredients.length > 0;
    
    console.log('Item has ingredients:', itemHasIngredients);
    
    if (itemHasIngredients) {
      // Process each ingredient to see if we need to add it to the shopping list
      const ingredientsToAdd = [];
      
      foodBankItem.ingredients.forEach(ingredient => {
        // Calculate how much of this ingredient we need total
        const totalNeeded = ingredient.quantity * quantity;
        
        // Check how much we have in inventory
        const inventoryQty = inventory?.[ingredient.id]?.quantity || 0;
        
        // Check if this ingredient is already on the shopping list
        const shoppingListIngredient = shoppingList?.find(item => item.id === ingredient.id);
        
        console.log(`Ingredient ${ingredient.name}: need ${totalNeeded}, have in inventory: ${inventoryQty}, on shopping list: ${!!shoppingListIngredient}`);
        
        // If we don't have enough in inventory, add the deficit to the shopping list
        if (inventoryQty < totalNeeded) {
          const deficit = totalNeeded - inventoryQty;
          
          // Create the ingredient object with the updateItem flag
          ingredientsToAdd.push({
            ...ingredient,
            quantity: deficit,
            updateItem: !!shoppingListIngredient
          });
          
          console.log(`Need to add ${deficit} of ${ingredient.name} (updateItem: ${!!shoppingListIngredient})`);
        } else {
          console.log(`${ingredient.name} is already in inventory`);
        }
      });
      
      console.log('FINAL ingredientsToAdd array:', JSON.stringify(ingredientsToAdd, null, 2));
      
      // Add or update the main item
      if (shoppingListEntry) {
        const updatedItem = {
          ...shoppingListEntry,
          quantity: (shoppingListEntry.quantity || 0) + quantity,
          updatedAt: DateTime.now().toISO(),
        };
        delete updatedItem.key;
        delete updatedItem.restockAmount;
        
        // ALWAYS set ingredients if the item has them defined (even if empty)
        updatedItem.ingredients = ingredientsToAdd;
        
        // ALWAYS call with includeIngredients: true for meal items
        onAddToList(updatedItem, true, true);
      } else {
        const newItem = {
          addedToInventory: false,
          category: item.category || 'Uncategorized',
          checked: false,
          id: item.id,
          name: item.name,
          quantity: quantity,
          updatedAt: DateTime.now().toISO(),
        };
        
        // ALWAYS set ingredients if the item has them defined (even if empty)
        newItem.ingredients = ingredientsToAdd;
        
        // ALWAYS call with includeIngredients: true for meal items
        onAddToList(newItem, false, true);
      }
    } else {
      // No ingredients - just add the item as normal
      if (shoppingListEntry) {
        const updatedItem = {
          ...shoppingListEntry,
          quantity: (shoppingListEntry.quantity || 0) + quantity,
          updatedAt: DateTime.now().toISO(),
        };
        delete updatedItem.key;
        delete updatedItem.restockAmount;
        onAddToList(updatedItem, true, false);
      } else {
        const newItem = {
          addedToInventory: false,
          category: item.category || 'Uncategorized',
          checked: false,
          id: item.id,
          name: item.name,
          quantity: quantity,
          updatedAt: DateTime.now().toISO(),
        };
        onAddToList(newItem, false, false);
      }
    }
    
    setQuantity(1);
    onClose();
  };

  if (!item) return null;

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      padding: getSpacing.xl,
      width: '80%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    modalSubtitle: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
    },
    quantityContainer: {
      alignItems: 'center',
      marginBottom: getSpacing.lg,
      marginTop: getSpacing.md,
    },
    quantityLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.sm,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: getSpacing.md,
    },
    modalButton: {
      flex: 1,
      padding: getSpacing.md,
      borderRadius: getBorderRadius.md,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    confirmButton: {
      backgroundColor: greenColor,
    },
    buttonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: theme.text.primary,
    },
    confirmButtonText: {
      color: '#FFFFFF',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={handleCancel}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add to Shopping List</Text>
            <Text style={styles.modalSubtitle}>{item.name}</Text>
            <Text style={styles.modalSubtitle}>Currently Have: {item.quantity || 0}</Text>
            
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Quantity</Text>
              <QuantityTracker
                value={quantity}
                onUpdate={setQuantity}
                min={1}
                size="large"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAdd}
              >
                <Text style={[styles.buttonText, styles.confirmButtonText]}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default QuickAddModal;