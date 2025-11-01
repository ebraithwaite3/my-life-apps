import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";
import { useGroceryActions } from "../hooks";
import CategorySectionForLists from "../components/groceries/CategorySectionForLists";
import FoodItemForList from "../components/groceries/FoodItemForList";
import QuickAddModal from "../components/groceries/QuickAddModal";

const GroceryInventoryScreen = ({ navigation }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { groceries, groups } = useData();
  const {
    updateInventoryItem,
    removeInventoryItem,
    addToShoppingList,
    updateShoppingListItem,
    updateItemWithIngredients,
  } = useGroceryActions();
  const [quickAddModalVisible, setQuickAddModalVisible] = useState(false);
  const [selectedItemForQuickAdd, setSelectedItemForQuickAdd] = useState(null);
  const [restockAmountForQuickAdd, setRestockAmountForQuickAdd] = useState(1);
  const [selectedFoodBankItemForQuickAdd, setSelectedFoodBankItemForQuickAdd] =
    useState(null);

  const handleQuickAddPress = (item, restockAmount, foodBankItem) => {
    setSelectedItemForQuickAdd(item);
    setRestockAmountForQuickAdd(restockAmount || 1);
    setSelectedFoodBankItemForQuickAdd(foodBankItem || null);
    setQuickAddModalVisible(true);
  };

  const foodBank = useMemo(
    () => groceries?.foodBank || null,
    [groceries?.foodBank]
  );
  const shoppingList = useMemo(
    () => groceries?.shoppingList || [],
    [groceries?.shoppingList]
  );
  const meals = useMemo(() => groceries?.meals || [], [groceries?.meals]);

  const [activeTab, setActiveTab] = useState("current");
  const [viewMode, setViewMode] = useState("categorized");
  const [searchQuery, setSearchQuery] = useState("");

  // Check if an item is already on the Shopping List
  const isItemOnShoppingList = (itemId) => {
    return (
      Array.isArray(shoppingList) &&
      shoppingList.some((item) => item.id === itemId)
    );
  };

  // Auto-add to shopping list helper - NOW HANDLES INGREDIENTS
  // Auto-add to shopping list helper - NOW HANDLES INGREDIENTS
  const autoAddToShoppingList = async (
    itemId,
    item,
    restockAmount,
    itemFromFoodBank
  ) => {
    const isOnList = isItemOnShoppingList(itemId);
    const hasIngredients =
      itemFromFoodBank?.ingredients &&
      Array.isArray(itemFromFoodBank.ingredients) &&
      itemFromFoodBank.ingredients.length > 0;

    console.log("Is on List:", isOnList, "Has Ingredients:", hasIngredients);
    if (!isOnList) {
      // Item not on list - add it
      const newShoppingListItem = {
        addedToInventory: false,
        category: item.category || "Uncategorized",
        checked: false,
        id: itemId,
        name: item.name,
        quantity: restockAmount,
        updatedAt: new Date().toISOString(),
      };

      // If it has ingredients defined, process them
      if (hasIngredients) {
        const ingredientsToAdd = [];

        itemFromFoodBank.ingredients.forEach((ingredient) => {
          const totalNeeded = ingredient.quantity * restockAmount;
          const inventoryQty =
            groceries?.inventory?.[ingredient.id]?.quantity || 0;
          const shoppingListIngredient = shoppingList?.find(
            (item) => item.id === ingredient.id
          );

          if (inventoryQty < totalNeeded) {
            const deficit = totalNeeded - inventoryQty;
            ingredientsToAdd.push({
              ...ingredient,
              quantity: deficit,
              updateItem: !!shoppingListIngredient,
            });
          }
        });

        // ALWAYS set ingredients if the item has them defined (even if empty)
        newShoppingListItem.ingredients = ingredientsToAdd;

        // Call updateItemWithIngredients for messaging, even with empty ingredients
        await updateItemWithIngredients(newShoppingListItem, false, groups);

        if (ingredientsToAdd.length > 0) {
          Toast.show({
            type: "success",
            text1: "Added to Shopping List with Ingredients",
            text2: `${item.name} (${restockAmount}) + ${ingredientsToAdd.length} ingredients`,
            position: "bottom",
            visibilityTime: 2500,
          });
        } else {
          Toast.show({
            type: "success",
            text1: "Added to Shopping List",
            text2: `${item.name} (${restockAmount}) - All ingredients in stock!`,
            position: "bottom",
            visibilityTime: 2500,
          });
        }
      } else {
        await addToShoppingList(newShoppingListItem);

        Toast.show({
          type: "success",
          text1: "Added to Shopping List",
          text2: `${item.name} (${restockAmount})`,
          position: "bottom",
          visibilityTime: 2000,
        });
      }
    } else {
      // Item already on list - check if we need to update quantity
      const existingItem = shoppingList.find(
        (listItem) => listItem.id === itemId
      );
      const currentQuantity = existingItem.quantity || 0;

      if (currentQuantity < restockAmount) {
        const updatedItem = {
          ...existingItem,
          quantity: restockAmount,
          updatedAt: new Date().toISOString(),
        };

        // If it has ingredients, process them for the UPDATE case
        if (hasIngredients) {
          const ingredientsToAdd = [];

          itemFromFoodBank.ingredients.forEach((ingredient) => {
            const totalNeeded = ingredient.quantity * restockAmount;
            const inventoryQty =
              groceries?.inventory?.[ingredient.id]?.quantity || 0;
            const shoppingListIngredient = shoppingList?.find(
              (item) => item.id === ingredient.id
            );

            if (inventoryQty < totalNeeded) {
              const deficit = totalNeeded - inventoryQty;
              ingredientsToAdd.push({
                ...ingredient,
                quantity: deficit,
                updateItem: !!shoppingListIngredient,
              });
            }
          });

          // ALWAYS set ingredients if the item has them defined (even if empty)
          updatedItem.ingredients = ingredientsToAdd;

          // Call updateItemWithIngredients for messaging, even with empty ingredients
          await updateItemWithIngredients(updatedItem, true, groups);

          if (ingredientsToAdd.length > 0) {
            Toast.show({
              type: "info",
              text1: "Updated Shopping List with Ingredients",
              text2: `${item.name}: ${currentQuantity} → ${restockAmount} + ${ingredientsToAdd.length} ingredients`,
              position: "bottom",
              visibilityTime: 2500,
            });
          } else {
            Toast.show({
              type: "info",
              text1: "Updated Shopping List",
              text2: `${item.name}: ${currentQuantity} → ${restockAmount} - All ingredients in stock!`,
              position: "bottom",
              visibilityTime: 2500,
            });
          }
        } else {
          await updateShoppingListItem(itemId, updatedItem);

          Toast.show({
            type: "info",
            text1: "Updated Shopping List",
            text2: `${item.name}: ${currentQuantity} → ${restockAmount}`,
            position: "bottom",
            visibilityTime: 2000,
          });
        }
      } else {
        Toast.show({
          type: "info",
          text1: "Already on Shopping List",
          text2: `${item.name} (${currentQuantity}) - no update needed`,
          position: "bottom",
          visibilityTime: 1500,
        });
      }
    }
  };

  // Get current inventory items (quantity > 0)
  const getCurrentInventory = () => {
    if (!groceries?.inventory) return {};

    const filtered = {};
    Object.entries(groceries.inventory).forEach(([key, item]) => {
      if (item.quantity > 0) {
        filtered[key] = item;
      }
    });
    return filtered;
  };

  // Get all food bank items with their inventory quantities
  const getAllItemsWithInventory = () => {
    if (!foodBank) return {};

    const items = {};

    Object.entries(foodBank).forEach(([category, categoryItems]) => {
      if (!Array.isArray(categoryItems)) return;

      categoryItems.forEach((item) => {
        const itemId = item.id;
        const inventoryItem = groceries?.inventory?.[itemId];

        items[itemId] = {
          id: itemId,
          name: item.name,
          category: category,
          quantity: inventoryItem?.quantity || 0,
          dateUpdated: inventoryItem?.dateUpdated || null,
        };
      });
    });

    return items;
  };

  // Filter items based on search query
  const filterItems = (items) => {
    if (!searchQuery.trim()) return items;

    const filtered = {};
    Object.entries(items).forEach(([key, item]) => {
      if (item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        filtered[key] = item;
      }
    });
    return filtered;
  };

  // Sort items alphabetically
  const sortItemsAlphabetically = (items) => {
    return Object.entries(items)
      .sort(([, a], [, b]) => a.name.localeCompare(b.name))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
  };

  // Handle quantity change - PASS itemFromFoodBank
  const handleQuantityChange = async (itemId, newQuantity) => {
    console.log(
      `[Inventory Update] Item ID: ${itemId}, New Quantity: ${newQuantity}`
    );

    const items =
      activeTab === "current"
        ? getCurrentInventory()
        : getAllItemsWithInventory();
    const item = items[itemId];

    if (!item) {
      console.error("[Inventory Error] Item not found:", itemId);
      return;
    }

    const oldQuantity = item.quantity;

    // Find the item in the food bank to get its restock amount
    const itemFromFoodBank = Object.values(foodBank || {})
      .flat()
      .find((bankItem) => bankItem.id === itemId);
    const autoAdd = itemFromFoodBank?.autoAdd || false;
    const autoAddThreshold = itemFromFoodBank?.autoAddAt || 0;
    const restockAmount = itemFromFoodBank?.restockAmount || 1;

    try {
      if (newQuantity <= 0 && oldQuantity > 0) {
        // CASE 3: Remove from inventory (going to 0)
        console.log(`[Firestore] Removing ${item.name} from inventory`);
        await removeInventoryItem(itemId);

        if (autoAdd && autoAddThreshold === 0) {
          console.log(
            `[Auto-Add] Adding ${item.name} to shopping list with quantity:`,
            restockAmount
          );
          await autoAddToShoppingList(
            itemId,
            item,
            restockAmount,
            itemFromFoodBank
          );
        }
      } else if (newQuantity > 0 && oldQuantity === 0) {
        // CASE 1: Add to inventory (0 → positive)
        console.log(`[Firestore] Adding ${item.name} to inventory`);
        const itemData = {
          id: itemId,
          name: item.name,
          category: item.category,
          quantity: newQuantity,
          dateUpdated: new Date().toISOString(),
        };

        await updateInventoryItem(itemId, itemData);
      } else if (newQuantity > 0 && oldQuantity > 0) {
        // CASE 2: Update existing inventory
        console.log(`[Firestore] Updating ${item.name} quantity`);
        const itemData = {
          id: itemId,
          name: item.name,
          category: item.category,
          quantity: newQuantity,
          dateUpdated: new Date().toISOString(),
        };

        await updateInventoryItem(itemId, itemData);

        // Check if we hit the auto-add threshold
        if (
          newQuantity < oldQuantity &&
          autoAdd &&
          newQuantity === autoAddThreshold
        ) {
          console.log(
            `[Auto-Add] Adding ${item.name} to shopping list with quantity:`,
            restockAmount
          );
          await autoAddToShoppingList(
            itemId,
            item,
            restockAmount,
            itemFromFoodBank
          );
        }
      }

      console.log(
        `[Inventory Updated] ${item.name}: ${oldQuantity} → ${newQuantity}`
      );
    } catch (error) {
      console.error("[Firestore Error] Failed to update inventory:", error);
    }
  };

  // Add stable sorting to organizeByCategory
  const organizeByCategory = (items) => {
    const organized = {};

    Object.entries(items).forEach(([key, item]) => {
      if (!organized[item.category]) {
        organized[item.category] = [];
      }
      organized[item.category].push({ key, ...item });
    });

    // Sort categories alphabetically
    const sortedOrganized = {};
    Object.keys(organized)
      .sort((a, b) => a.localeCompare(b))
      .forEach((category) => {
        // Sort items within each category alphabetically by name
        sortedOrganized[category] = organized[category].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      });

    return sortedOrganized;
  };

  // Render item card
const renderItemCard = (item, itemId) => {
  // Get shopping list quantity for this item (shoppingList is an array)
  const shoppingListItem = Array.isArray(groceries?.shoppingList)
    ? groceries.shoppingList.find((listItem) => listItem.id === itemId)
    : null;
  const shoppingListQty = shoppingListItem?.quantity || 0;

  // Get inventory quantity for this item
  const inventoryQty = groceries?.inventory?.[itemId]?.quantity || 0;

  // Get restock amount from food bank
  const foodBankItem = Object.values(foodBank || {})
    .flat()
    .find((bankItem) => bankItem.id === itemId);
  const restockAmount = foodBankItem?.restockAmount || 1;

  // Check if item has ingredients
  const hasIngredients = foodBankItem?.ingredients && 
                        Array.isArray(foodBankItem.ingredients) && 
                        foodBankItem.ingredients.length > 0;

  // If item has ingredients, check if it's in meals too
  const mealItem = hasIngredients
    ? meals.find((meal) => meal.id === itemId)
    : null;

  return (
    <FoodItemForList
      key={itemId}
      item={item}
      foodBankItem={foodBankItem}
      mealItem={mealItem}
      currentQuantity={item.quantity}
      shoppingListQuantity={shoppingListQty}
      restockAmount={restockAmount}
      inventoryQuantity={inventoryQty}
      onUpdateQuantity={handleQuantityChange}
      onQuickAddPress={handleQuickAddPress}
      isInventory={true}
    />
  );
};

  // Render content based on view mode
  const renderContent = () => {
    const items =
      activeTab === "current"
        ? getCurrentInventory()
        : getAllItemsWithInventory();

    // Filter items based on search
    const filteredItems = filterItems(items);

    if (Object.keys(filteredItems).length === 0) {
      return (
        <Text style={styles.placeholderText}>
          {searchQuery.trim()
            ? `No items found matching "${searchQuery}"`
            : activeTab === "current"
            ? "No items in inventory yet"
            : "No items in food bank"}
        </Text>
      );
    }

    if (viewMode === "list") {
      // List view - flat list of all items, sorted alphabetically
      const sortedItems = sortItemsAlphabetically(filteredItems);

      return (
        <View style={styles.listContainer}>
          {Object.entries(sortedItems).map(([key, item]) =>
            renderItemCard(item, key)
          )}
        </View>
      );
    } else {
      // Categorized view - grouped by category
      const categorized = organizeByCategory(filteredItems);

      return (
        <View style={styles.categorizedContainer}>
          {Object.entries(categorized).map(([category, categoryItems]) => (
            <CategorySectionForLists
              key={category}
              category={category}
              items={categoryItems}
              foodBank={foodBank}
              meals={meals}
              groups={groups}
              inventory={groceries?.inventory}
              shoppingList={groceries?.shoppingList}
              onQuantityChange={handleQuantityChange}
            />
          ))}
        </View>
      );
    }
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
    viewToggleButton: {
      padding: getSpacing.sm,
    },
    tabContainer: {
      flexDirection: "row",
      margin: getSpacing.md,
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.full,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tabButton: {
      flex: 1,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.full,
      alignItems: "center",
    },
    tabButtonActive: {
      backgroundColor: theme.primary,
    },
    tabButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      fontWeight: "500",
    },
    tabButtonTextActive: {
      color: "#FFFFFF",
    },
    searchContainer: {
      paddingHorizontal: getSpacing.md,
      marginBottom: getSpacing.sm,
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingRight: getSpacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    clearButton: {
      padding: getSpacing.xs,
    },
    content: {
      flex: 1,
      padding: getSpacing.md,
    },
    placeholderText: {
      color: theme.text.secondary,
      fontSize: getTypography.body.fontSize,
      textAlign: "center",
      padding: getSpacing.xl,
    },
    listContainer: {
      gap: getSpacing.sm,
    },
    categorizedContainer: {},
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
          <Text style={styles.headerTitle}>Grocery Inventory</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.viewToggleButton}
            onPress={() =>
              setViewMode(viewMode === "categorized" ? "list" : "categorized")
            }
          >
            <Ionicons
              name={
                viewMode === "categorized" ? "grid-outline" : "list-outline"
              }
              size={24}
              color={theme.text.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {!foodBank ? (
        <View style={styles.content}>
          <Text style={styles.placeholderText}>Loading food bank...</Text>
        </View>
      ) : (
        <>
          {/* Tab Toggle */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "current" && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("current")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "current" && styles.tabButtonTextActive,
                ]}
              >
                Current Inventory
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "update" && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("update")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "update" && styles.tabButtonTextActive,
                ]}
              >
                Update Inventory
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar - only show in list view */}
          {viewMode === "list" && (
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search items..."
                  placeholderTextColor={theme.text.secondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setSearchQuery("")}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={theme.text.secondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Content */}
          <ScrollView style={styles.content}>{renderContent()}</ScrollView>
        </>
      )}

      {/* Toast for notifications */}
      <Toast />
      <QuickAddModal
        visible={quickAddModalVisible}
        restockAmount={restockAmountForQuickAdd}
        foodBankItem={selectedFoodBankItemForQuickAdd}
        item={selectedItemForQuickAdd}
        shoppingList={shoppingList}
        inventory={groceries?.inventory}
        onClose={() => setQuickAddModalVisible(false)}
        onAddToList={(itemData, isUpdate, includeIngredients) => {
          if (includeIngredients) {
            console.log("Including ingredients in shopping list item.");
            updateItemWithIngredients(itemData, isUpdate, groups);
          } else if (isUpdate) {
            console.log("Updating existing shopping list item.");
            updateShoppingListItem(itemData.id, itemData);
          } else {
            console.log("Adding new item to shopping list.");
            addToShoppingList(itemData);
          }
        }}
      />
    </SafeAreaView>
  );
};

export default GroceryInventoryScreen;
