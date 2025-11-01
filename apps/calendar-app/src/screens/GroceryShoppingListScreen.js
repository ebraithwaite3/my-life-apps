import React, { useMemo, useRef, useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";
import { useGroceryActions } from "../hooks";
import ShoppingListItem from "../components/groceries/ShoppingListItem";
import CheckedShoppingListItem from "../components/groceries/CheckedShoppingListItem";
import { DateTime } from "luxon";
import MealsSection from "../components/groceries/MealSection";

const GroceryShoppingListScreen = ({ navigation }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { groceries, groceriesLoading } = useData();
  const {
    updateShoppingListItem,
    deleteShoppingListItem,
    updateInventoryItem,
    clearPurchasedFromShoppingList,
    updateShoppingListOrder,
  } = useGroceryActions();

  // Debounce timer ref
  const saveTimerRef = useRef(null);

  // Local state for instant UI updates
  const [localUncheckedItems, setLocalUncheckedItems] = useState([]);

  // Handler to delete a meal BUT NOT its ingredients from the shopping list
  const handleDeleteMeal = async (itemId) => {
    console.log(`Deleting meal ${itemId} from shopping list`);
    await deleteShoppingListItem(itemId);
  };

  // Get the shopping list
  const shoppingList = useMemo(() => {
    if (!groceries) return [];
    return groceries.shoppingList || [];
  }, [groceries]);

  // Get unchecked items (without local state)
  const uncheckedItems = useMemo(() => {
    if (!groceries) return [];
    return (groceries.shoppingList || [])
      .filter((item) => !item.checked && !item.ingredients > 0);
  }, [groceries]);

  const checkedItems = useMemo(() => {
    if (!groceries) return [];
    return (groceries.shoppingList || [])
      .filter((item) => item.checked);
  }, [groceries]);

  const itemsWithIngredients = useMemo(() => {
    if (!groceries) return [];
    return (groceries.shoppingList || [])
      .filter((item) => item.ingredients && item.ingredients.length > 0);
  }, [groceries]);
  console.log("Items with Ingredients:", itemsWithIngredients);

  // Initialize local state when uncheckedItems changes
  useEffect(() => {
    setLocalUncheckedItems(uncheckedItems);
  }, [uncheckedItems]);

  const inventory = useMemo(() => {
    if (!groceries) return {};
    return groceries.inventory || {};
  }, [groceries]);
  console.log("Inventory:", inventory);

  const foodBank = useMemo(() => {
    if (!groceries) return {};
    return groceries.foodBank || {};
  }, [groceries]);
  console.log("Food Bank:", foodBank);

  // Debounced save function
  const debouncedSave = useCallback((newList) => {
    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer to save after 1 second of no changes
    saveTimerRef.current = setTimeout(() => {
      console.log("Saving new order...");
      updateShoppingListOrder(newList);
    }, 1000);
  }, [updateShoppingListOrder]);

  const handleMoveUp = useCallback((itemId) => {
    setLocalUncheckedItems(prevItems => {
      const index = prevItems.findIndex(item => item.id === itemId);
      if (index > 0) {
        const newList = [...prevItems];
        [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
        
        // Save to Firebase in background
        const fullList = [...newList, ...checkedItems, ...itemsWithIngredients];
        debouncedSave(fullList);
        
        return newList;
      }
      return prevItems;
    });
  }, [checkedItems, itemsWithIngredients, debouncedSave]);

  const handleMoveDown = useCallback((itemId) => {
    setLocalUncheckedItems(prevItems => {
      const index = prevItems.findIndex(item => item.id === itemId);
      if (index < prevItems.length - 1) {
        const newList = [...prevItems];
        [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
        
        // Save to Firebase in background
        const fullList = [...newList, ...checkedItems, ...itemsWithIngredients];
        debouncedSave(fullList);
        
        return newList;
      }
      return prevItems;
    });
  }, [checkedItems, itemsWithIngredients, debouncedSave]);

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    console.log(`Updating ${itemId} to quantity ${newQuantity}`);
    // Update the item in the shopping list with the new quantity
    const updatedItem = shoppingList.find((item) => item.id === itemId);
    if (updatedItem) {
      const newItem = { ...updatedItem, quantity: newQuantity };
      console.log("New Item:", newItem);
      await updateShoppingListItem(itemId, newItem);
    } else {
      // Alert if item not found
      Alert.alert("Error", "Item not found in shopping list");
    }
  };

  const handleDeleteItem = async (itemId) => {
    console.log(`Deleting ${itemId} from shopping list`);
    await deleteShoppingListItem(itemId);
  };

  const handleMarkPurchased = (itemId, quantity) => {
    console.log(`Marking ${itemId} as purchased with quantity ${quantity}`);

    // Find the item in the inventory
    const inventoryItem = inventory[itemId];
    const currentInventoryQty = inventoryItem ? inventoryItem.quantity : 0;
    const newInventoryQty = currentInventoryQty + quantity;
    console.log(
      `Updating inventory for ${itemId} to quantity ${newInventoryQty}`
    );
    console.log("Inventory Item:", inventoryItem);

    // Find the shopping list item first (we'll need it either way)
    const shoppingListItem = shoppingList.find((item) => item.id === itemId);

    if (inventoryItem) {
      const newInventoryItem = {
        ...inventoryItem,
        quantity: newInventoryQty,
        dateUpdated: DateTime.now().toISO(),
      };
      // Update the inventory item
      updateInventoryItem(itemId, newInventoryItem);
    } else {
      if (shoppingListItem && shoppingListItem.category) {
        // Use the category to find the item directly in foodBank
        const foodBankItem = foodBank[shoppingListItem.category]?.find(
          (item) => item.id === itemId
        );

        if (foodBankItem) {
          const newInventoryItem = {
            id: itemId,
            name: foodBankItem.name,
            category: shoppingListItem.category,
            quantity: newInventoryQty,
            dateUpdated: DateTime.now().toISO(),
          };
          // Add the new inventory item
          updateInventoryItem(itemId, newInventoryItem);
        } else {
          Alert.alert("Error", "Item details not found in food bank");
          return;
        }
      } else {
        Alert.alert("Error", "Shopping list item or category not found");
        return;
      }
    }

    // Mark the shopping list addedToInventory as true and checked as true
    if (shoppingListItem) {
      const updatedShoppingListItem = {
        ...shoppingListItem,
        addedToInventory: true,
        checked: true,
      };
      updateShoppingListItem(itemId, updatedShoppingListItem);
    }
  };

  const handleUndo = async (itemId) => {
    console.log(`Undo purchase for ${itemId}`);
    // Update the shopping list item to set checked to false and addedToInventory to false
    const shoppingListItem = shoppingList.find((item) => item.id === itemId);
    if (shoppingListItem) {
      const updatedShoppingListItem = {
        ...shoppingListItem,
        checked: false,
        addedToInventory: false,
      };
      await updateShoppingListItem(itemId, updatedShoppingListItem);
    }

    // Take the shopping list item's quantity away from the inventory
    const inventoryItem = inventory[itemId];
    if (inventoryItem) {
      const newInventoryQty =
        inventoryItem.quantity - shoppingListItem.quantity;
      const updatedInventoryItem = {
        ...inventoryItem,
        quantity: newInventoryQty >= 0 ? newInventoryQty : 0,
        dateUpdated: DateTime.now().toISO(),
      };
      await updateInventoryItem(itemId, updatedInventoryItem);
    }
  };

  const handleClearPurchased = async () => {
    console.log("Clear purchased confirmed");
    await clearPurchasedFromShoppingList();
  };

  const confirmClearPurchased = () => {
    Alert.alert(
      "Clear Purchased Items",
      `Are you sure you want to remove all ${checkedItems.length} purchased items from your shopping list?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear All",
          onPress: handleClearPurchased,
          style: "destructive",
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    backButton: {
      marginRight: getSpacing.md,
      padding: getSpacing.sm,
    },
    headerTitle: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
    },
    content: {
      flex: 1,
    },
    listContainer: {
      paddingTop: getSpacing.md,
      paddingHorizontal: getSpacing.sm,
    },
    placeholderText: {
      color: theme.text.secondary,
      fontSize: getTypography.body.fontSize,
      textAlign: "center",
      padding: getSpacing.xl,
    },
    itemCount: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
      marginLeft: getSpacing.xs,
    },
    sectionHeader: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
      marginTop: 150,
      marginBottom: getSpacing.sm,
      paddingHorizontal: getSpacing.sm,
    },
    clearButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: '#CC293C',
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.md,
      marginHorizontal: getSpacing.sm,
      marginBottom: getSpacing.sm,
      gap: getSpacing.xs,
    },
    clearButtonText: {
      color: "#FFFFFF",
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Shopping List
            {(localUncheckedItems.length > 0 || checkedItems.length > 0) && (
              <Text style={styles.headerTitle}>
                {" "}
                ({checkedItems.length}/
                {checkedItems.length + localUncheckedItems.length})
              </Text>
            )}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {/* Add action buttons here if needed */}
        </View>
      </View>

      {/* Meals Section */}
      {itemsWithIngredients.length > 0 && (
        <MealsSection 
          items={itemsWithIngredients}
          checkedItems={checkedItems}
          onDelete={handleDeleteMeal}
        />
      )}

      {/* Content */}
      <ScrollView style={styles.content}>
        {groceriesLoading ? (
          <Text style={styles.placeholderText}>Loading shopping list...</Text>
        ) : localUncheckedItems.length === 0 && checkedItems.length === 0 ? (
          <Text style={styles.placeholderText}>
            No items in your shopping list yet
          </Text>
        ) : (
          <View style={styles.listContainer}>
            {/* Unchecked items - use localUncheckedItems */}
            {localUncheckedItems.map((item, index) => (
              <ShoppingListItem
                key={item.id}
                item={item}
                inventory={inventory}
                onUpdateQuantity={handleUpdateQuantity}
                onDelete={handleDeleteItem}
                onMarkPurchased={handleMarkPurchased}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                isFirst={index === 0}
                isLast={index === localUncheckedItems.length - 1}
              />
            ))}

            {/* Checked items */}
            {checkedItems.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Purchased Items</Text>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={confirmClearPurchased}
                >
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.clearButtonText}>
                    Clear All Purchased
                  </Text>
                </TouchableOpacity>
                {checkedItems.map((item) => (
                  <CheckedShoppingListItem
                    key={item.id}
                    item={item}
                    inventory={inventory}
                    onUndo={handleUndo}
                  />
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default GroceryShoppingListScreen;