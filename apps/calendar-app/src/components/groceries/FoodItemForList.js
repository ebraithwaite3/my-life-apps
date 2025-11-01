import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const FoodItemForList = ({ 
  item, 
  foodBankItem,
  mealItem,
  currentQuantity,
  shoppingListQuantity,
  restockAmount,
  inventoryQuantity,
  onUpdateQuantity,
  onQuickAddPress,
  isInventory = true 
}) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const handleQuantityChange = (newQuantity) => {
    const adjustedQuantity = Math.max(0, newQuantity);
    console.log(`[${isInventory ? 'Inventory' : 'Shopping List'}] ${item.name}: ${currentQuantity} → ${adjustedQuantity}`);
    onUpdateQuantity(item.id, adjustedQuantity);
  };

  const handleQuickAdd = () => {
    if (onQuickAddPress) {
      onQuickAddPress(item, restockAmount, foodBankItem);
    }
  };

  // Determine what to show under the item name
const getSecondaryInfo = () => {
  // First priority: Check if it's a meal item
  if (mealItem) {
    return 'Ready to Make';
  }
  
  // Second priority: Check shopping list/inventory based on context
  if (isInventory) {
    // Show shopping list quantity if any
    if (shoppingListQuantity && shoppingListQuantity > 0) {
      return `Shopping List: ${shoppingListQuantity}`;
    }
  } else {
    // Show inventory quantity if any
    if (inventoryQuantity && inventoryQuantity > 0) {
      return `Inventory: ${inventoryQuantity}`;
    }
  }
  
  return null;
};

  const secondaryInfo = getSecondaryInfo();
  const greenColor = '#10B981';

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: 'transparent',
    },
    leftSection: {
      flex: 1,
      marginRight: getSpacing.sm,
      marginLeft: getSpacing.sm,
    },
    itemName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '500',
      color: theme.text.primary,
      marginBottom: secondaryInfo ? 4 : 0,
    },
    secondaryInfo: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.xs,
    },
    quantityButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      borderRadius: 4,
    },
    quantityText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      minWidth: 32,
      textAlign: 'center',
    },
    quickAddButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: greenColor,
      backgroundColor: greenColor + '20',
      borderRadius: 4,
      marginRight: getSpacing.lg,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Text style={styles.itemName}>{item.name}</Text>
        {secondaryInfo && (
          <Text style={styles.secondaryInfo}>{secondaryInfo}</Text>
        )}
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity
          style={styles.quickAddButton}
          onPress={handleQuickAdd}
        >
          <Ionicons name="add-circle" size={20} color={greenColor} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleQuantityChange(currentQuantity - 1)}
        >
          <Ionicons name="remove" size={18} color={theme.text.primary} />
        </TouchableOpacity>

        <Text style={styles.quantityText}>{currentQuantity}</Text>

        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleQuantityChange(currentQuantity + 1)}
        >
          <Ionicons name="add" size={18} color={theme.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default FoodItemForList;