import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import FoodItemForList from "./FoodItemForList";
import QuickAddModal from "./QuickAddModal";
import { useGroceryActions } from "../../hooks";

const CategorySectionForLists = ({
  category,
  items,
  groups,
  foodBank,
  meals,
  inventory,
  shoppingList,
  onQuantityChange,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
    const { addToShoppingList, updateShoppingListItem, updateItemWithIngredients } = useGroceryActions();
  const [expanded, setExpanded] = useState(false);
  const [quickAddModalVisible, setQuickAddModalVisible] = useState(false);
  const [selectedItemForQuickAdd, setSelectedItemForQuickAdd] = useState(null);
  const [restockAmountForQuickAdd, setRestockAmountForQuickAdd] = useState(1);
  const [selectedFoodBankItemForQuickAdd, setSelectedFoodBankItemForQuickAdd] = useState(null);

  const handleQuickAddPress = (item, restockAmount, foodBankItem) => {
    setSelectedItemForQuickAdd(item);
    setRestockAmountForQuickAdd(restockAmount || 1);
    setSelectedFoodBankItemForQuickAdd(foodBankItem || null);
    setQuickAddModalVisible(true);
  };

  const capitalize = (str) => {
    // Handle camelCase: split on uppercase letters and join with spaces
    const withSpaces = str.replace(/([A-Z])/g, " $1").trim();
    // Capitalize each word
    return withSpaces
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Render item card
const renderItemCard = (item) => {
  // Find the shopping list item by matching the id
  const shoppingListItem = Array.isArray(shoppingList) 
    ? shoppingList.find((listItem) => listItem.id === item.id)
    : null;
  const shoppingListQty = shoppingListItem?.quantity || 0;
  
  // Find the item in the food bank to get its restock amount
  const foodBankItem = Object.values(foodBank || {})
    .flat()
    .find((bankItem) => bankItem.id === item.id);
  console.log('Food Bank Item for', item.name, ':', foodBankItem);
  const restockAmount = foodBankItem?.restockAmount || 1;

  // Get inventory quantity for this item
  const inventoryQty = inventory?.[item.id]?.quantity || 0;

  // Check if item has ingredients
  const hasIngredients = foodBankItem?.ingredients && 
                        Array.isArray(foodBankItem.ingredients) && 
                        foodBankItem.ingredients.length > 0;

  // If item has ingredients, check if it's in meals too
  const mealItem = hasIngredients
    ? meals.find((meal) => meal.id === item.id)
    : null;

  return (
    <FoodItemForList
      key={item.id}
      item={item}
      foodBankItem={foodBankItem}
      mealItem={mealItem}
      onQuickAddPress={handleQuickAddPress}
      currentQuantity={item.quantity}
      shoppingListQuantity={shoppingListQty}
      restockAmount={restockAmount}
      inventoryQuantity={inventoryQty}
      onUpdateQuantity={onQuantityChange}
      isInventory={true}
    />
  );
};

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: getSpacing.sm,
      marginVertical: getSpacing.sm,
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: getSpacing.md,
      backgroundColor: theme.surface,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    headerTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      marginLeft: getSpacing.sm,
    },
    itemCount: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
      marginLeft: getSpacing.xs,
    },
    content: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    categoryItems: {
      gap: 0,
      padding: 0,
    },
  });

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <TouchableOpacity
          style={styles.header}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            <Ionicons
              name={expanded ? "chevron-down" : "chevron-forward"}
              size={20}
              color={theme.text.secondary}
            />
            <Text style={styles.headerTitle}>
              {capitalize(category)}
              <Text style={styles.itemCount}> ({items.length})</Text>
            </Text>
          </View>
        </TouchableOpacity>

        {/* Content */}
        {expanded && (
          <View style={styles.content}>
            <View style={styles.categoryItems}>
              {items.map((item) => renderItemCard(item))}
            </View>
          </View>
        )}
      </View>

      {/* Single modal for the entire category */}
      <QuickAddModal
        visible={quickAddModalVisible}
        restockAmount={restockAmountForQuickAdd}
        foodBankItem={selectedFoodBankItemForQuickAdd}
        item={selectedItemForQuickAdd}
        shoppingList={shoppingList}
        inventory={inventory}
        onClose={() => setQuickAddModalVisible(false)}
        onAddToList={(itemData, isUpdate, includeIngredients) => {
          if (includeIngredients) {
            console.log('Including ingredients in shopping list item.');
            updateItemWithIngredients(itemData, isUpdate, groups, isUpdate);
          } else if (isUpdate) {
            console.log('Updating existing shopping list item.');
            updateShoppingListItem(itemData.id, itemData);
          } else {
            console.log('Adding new item to shopping list.');
            addToShoppingList(itemData);
          }
        }}
      />
    </>
  );
};

export default CategorySectionForLists;
