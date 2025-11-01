import { useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  arrayUnion,
} from "firebase/firestore";
import { addMessageToUser } from "../services/messageService"; // Add this import at the top
import { DateTime } from "luxon";

export const useGroceryActions = () => {
  const { db } = useAuth();
  const { user } = useData();

  const groceryId = user?.groceryId;

  const updateGroceryBank = useCallback(
    async (newFoodBank) => {
      if (!groceryId) {
        console.error("No groceriesId found for user");
        return;
      }
      try {
        const groceryDocId = `${groceryId}_foodBank`;
        const foodBankRef = doc(db, "groceries", groceryDocId);

        // Use setDoc to REPLACE the entire document (not merge)
        await setDoc(foodBankRef, newFoodBank);

        console.log("Grocery bank updated successfully");
      } catch (error) {
        console.error("Error updating grocery bank:", error);
        throw error;
      }
    },
    [groceryId, db]
  );

  const updateInventoryItem = useCallback(
    async (itemKey, itemData) => {
      if (!groceryId) {
        console.error("No groceriesId found for user");
        return;
      }
      try {
        const groceryDocId = `${groceryId}_inventory`;
        const inventoryRef = doc(db, "groceries", groceryDocId);

        // Use updateDoc with dot notation for partial update
        await updateDoc(inventoryRef, {
          [`inventory.${itemKey}`]: itemData,
        });

        console.log(`Inventory item ${itemKey} updated successfully`);
      } catch (error) {
        console.error("Error updating inventory item:", error);
        throw error;
      }
    },
    [groceryId, db]
  );

  const removeInventoryItem = useCallback(
    async (itemKey) => {
      if (!groceryId) {
        console.error("No groceriesId found for user");
        return;
      }
      try {
        const groceryDocId = `${groceryId}_inventory`;
        const inventoryRef = doc(db, "groceries", groceryDocId);

        // Use deleteField to remove the item
        await updateDoc(inventoryRef, {
          [`inventory.${itemKey}`]: deleteField(),
        });

        console.log(`Inventory item ${itemKey} removed successfully`);
      } catch (error) {
        console.error("Error removing inventory item:", error);
        throw error;
      }
    },
    [groceryId, db]
  );

  // Add new item to shopping list
  const addToShoppingList = useCallback(
    async (newItem) => {
      if (!groceryId) {
        console.error("No groceriesId found for user");
        return;
      }

      try {
        const groceryDocId = `${groceryId}_shoppingList`;
        const shoppingListRef = doc(db, "groceries", groceryDocId);

        await updateDoc(shoppingListRef, {
          shoppingList: arrayUnion(newItem),
        });

        console.log(`Added ${newItem.name} to shopping list`);
      } catch (error) {
        console.error("Error adding to shopping list:", error);
        throw error;
      }
    },
    [groceryId, db]
  );

  // Update existing shopping list item
  const updateShoppingListItem = useCallback(
    async (itemId, updatedItem) => {
      if (!groceryId) {
        console.error("No groceriesId found for user");
        return;
      }

      try {
        const groceryDocId = `${groceryId}_shoppingList`;
        const shoppingListRef = doc(db, "groceries", groceryDocId);

        // Get current shopping list
        const shoppingListSnap = await getDoc(shoppingListRef);
        const currentList = shoppingListSnap.exists()
          ? shoppingListSnap.data().shoppingList || []
          : [];

        // Find and update the item
        const itemIndex = currentList.findIndex((item) => item.id === itemId);
        if (itemIndex === -1) {
          console.error("Item not found in shopping list");
          return;
        }

        const updatedList = [...currentList];
        updatedList[itemIndex] = updatedItem;

        await updateDoc(shoppingListRef, {
          shoppingList: updatedList,
        });

        console.log(`Shopping list item ${itemId} updated successfully`);
      } catch (error) {
        console.error("Error updating shopping list item:", error);
        throw error;
      }
    },
    [groceryId, db]
  );

  const deleteShoppingListItem = useCallback(
    async (itemId) => {
      if (!groceryId) {
        console.error("No groceriesId found for user");
        return;
      }

      try {
        const groceryDocId = `${groceryId}_shoppingList`;
        const shoppingListRef = doc(db, "groceries", groceryDocId);

        // Get current shopping list
        const shoppingListSnap = await getDoc(shoppingListRef);
        const currentList = shoppingListSnap.exists()
          ? shoppingListSnap.data().shoppingList || []
          : [];

        // Filter out the item to delete
        const updatedList = currentList.filter((item) => item.id !== itemId);

        await updateDoc(shoppingListRef, {
          shoppingList: updatedList,
        });

        console.log(`Shopping list item ${itemId} deleted successfully`);
      } catch (error) {
        console.error("Error deleting shopping list item:", error);
        throw error;
      }
    },
    [groceryId, db]
  );

  const clearPurchasedFromShoppingList = useCallback(async () => {
    if (!groceryId) {
      console.error("No groceriesId found for user");
      return;
    }

    try {
      const groceryDocId = `${groceryId}_shoppingList`;
      const shoppingListRef = doc(db, "groceries", groceryDocId);

      // Get current shopping list
      const shoppingListSnap = await getDoc(shoppingListRef);
      const currentList = shoppingListSnap.exists()
        ? shoppingListSnap.data().shoppingList || []
        : [];

      // Filter out purchased items
      const updatedList = currentList.filter((item) => !item.checked);

      await updateDoc(shoppingListRef, {
        shoppingList: updatedList,
      });

      console.log(`Cleared purchased items from shopping list`);
    } catch (error) {
      console.error(
        "Error clearing purchased items from shopping list:",
        error
      );
      throw error;
    }
  }, [groceryId, db]);

  const updateItemWithIngredients = useCallback(
    async (updatedItem, isUpdate, groups) => {
      if (!groceryId) {
        console.error("No groceriesId found for user");
        return;
      }

      try {
        // Split ingredients into add and update arrays first to check if any need to be added
        let ingredientsToAdd = [];
        let ingredientsToUpdate = [];

        if (updatedItem.ingredients && Array.isArray(updatedItem.ingredients)) {
          updatedItem.ingredients.forEach((ingredient) => {
            if (ingredient.updateItem) {
              ingredientsToUpdate.push(ingredient);
            } else {
              ingredientsToAdd.push(ingredient);
            }
          });
        }

        console.log("Ingredients to add:", ingredientsToAdd);
        console.log("Ingredients to update:", ingredientsToUpdate);

        const hasIngredientsInStock =
          updatedItem.ingredients !== undefined &&
          ingredientsToAdd.length === 0 &&
          ingredientsToUpdate.length === 0;

        // If all ingredients are in stock, add to meals collection instead
        if (hasIngredientsInStock) {
          const mealsDocId = `${groceryId}_meals`;
          const mealsRef = doc(db, "groceries", mealsDocId);

          // Get current meals list
          const mealsSnap = await getDoc(mealsRef);
          const currentMeals = mealsSnap.exists()
            ? mealsSnap.data().meals || []
            : [];

          // Add the meal
          const newMeal = {
            id: updatedItem.id,
            name: updatedItem.name,
            category: updatedItem.category,
            quantity: updatedItem.quantity,
            ingredients: updatedItem.ingredients,
            made: false,
            addedAt: DateTime.now().toISO(),
          };

          await updateDoc(mealsRef, {
            meals: [...currentMeals, newMeal],
          });

          console.log(
            `Added ${updatedItem.name} to meals (all ingredients in stock)`
          );

          // Get admin user IDs
          const adminUserIds = [];
          groups.forEach((group) => {
            if (group.members && Array.isArray(group.members)) {
              group.members.forEach((member) => {
                if (
                  member.role === "admin" &&
                  member.userId &&
                  !adminUserIds.includes(member.userId)
                ) {
                  adminUserIds.push(member.userId);
                }
              });
            }
          });

          // Send notifications to admins
          if (adminUserIds.length > 0) {
            const notificationMessage = `${updatedItem.name} was added to meals (all ingredients in stock)`;
            const messagePromises = adminUserIds.map(async (adminUserId) => {
              try {
                await addMessageToUser(
                  adminUserId,
                  {
                    userId: user?.userId || user?.uid,
                    username: "Grocery List",
                    groupName: groups[0]?.name || "Grocery Group",
                    screenForNavigation: {
                      screen: "Grocery",
                      params: {
                        screen: "GroceryMeals",
                      },
                    },
                  },
                  notificationMessage
                );
                console.log(`✅ Notification sent to admin ${adminUserId}`);
              } catch (error) {
                console.error(
                  `❌ Error sending notification to admin ${adminUserId}:`,
                  error
                );
              }
            });
            await Promise.all(messagePromises);
          }

          return; // Exit early since we added to meals
        }

        // Otherwise, continue with normal shopping list logic
        const groceryDocId = `${groceryId}_shoppingList`;
        const shoppingListRef = doc(db, "groceries", groceryDocId);

        // Get current shopping list
        const shoppingListSnap = await getDoc(shoppingListRef);
        const currentList = shoppingListSnap.exists()
          ? shoppingListSnap.data().shoppingList || []
          : [];

        // Get the user Ids of the groups members whose role is admin
        const adminUserIds = [];
        groups.forEach((group) => {
          if (group.members && Array.isArray(group.members)) {
            group.members.forEach((member) => {
              if (
                member.role === "admin" &&
                member.userId &&
                !adminUserIds.includes(member.userId)
              ) {
                adminUserIds.push(member.userId);
              }
            });
          }
        });
        console.log("Admin User IDs for ingredient updates:", adminUserIds);

        // Start with the current list
        let updatedList = [...currentList];

        // Handle the main item (add or update) - KEEP ingredients property
        if (isUpdate) {
          // Update existing main item
          const mainItemIndex = updatedList.findIndex(
            (item) => item.id === updatedItem.id
          );
          if (mainItemIndex !== -1) {
            updatedList[mainItemIndex] = updatedItem; // Keep ingredients intact
            console.log("Updated main item with ingredients:", updatedItem);
          }
        } else {
          // Add new main item
          updatedList.push(updatedItem); // Keep ingredients intact
          console.log("Added new main item with ingredients:", updatedItem);
        }

        // Add new ingredients as shopping list items
        ingredientsToAdd.forEach((ingredient) => {
          const newIngredientItem = {
            id: ingredient.id,
            name: ingredient.name,
            category: ingredient.category,
            quantity: ingredient.quantity,
            addedToInventory: false,
            checked: false,
            updatedAt: DateTime.now().toISO(),
          };
          updatedList.push(newIngredientItem);
          console.log("Adding new ingredient to list:", newIngredientItem);
        });

        // Update existing ingredients
        ingredientsToUpdate.forEach((ingredient) => {
          const existingIndex = updatedList.findIndex(
            (item) => item.id === ingredient.id
          );
          if (existingIndex !== -1) {
            // Add to existing quantity
            updatedList[existingIndex] = {
              ...updatedList[existingIndex],
              quantity:
                (updatedList[existingIndex].quantity || 0) +
                ingredient.quantity,
              updatedAt: DateTime.now().toISO(),
            };
            console.log(
              "Updated existing ingredient:",
              updatedList[existingIndex]
            );
          }
        });

        // Save the updated shopping list
        await updateDoc(shoppingListRef, {
          shoppingList: updatedList,
        });

        console.log("Shopping list updated with ingredients successfully");

        // Send notifications to all admin users
        if (adminUserIds.length > 0) {
          console.log("Admin user IDs found:", adminUserIds);

          const totalIngredientsChanged =
            ingredientsToAdd.length + ingredientsToUpdate.length;

          // Send message if this is a meal item (has ingredients property), regardless of count
          const hasMealItem = updatedItem.ingredients !== undefined;

          console.log("Has meal item?", hasMealItem);
          console.log("Updated item ingredients:", updatedItem.ingredients);

          if (hasMealItem) {
            const actionText = isUpdate ? "updated" : "added";
            const notificationMessage = `${
              updatedItem.name
            } was ${actionText} to the shopping list with ${totalIngredientsChanged} ingredient${
              totalIngredientsChanged > 1 ? "s" : ""
            }`;

            console.log("Sending notification message:", notificationMessage);
            console.log("To admin users:", adminUserIds);
            console.log("Current user:", user?.userId || user?.uid);

            // Send message to each admin user
            const messagePromises = adminUserIds.map(async (adminUserId) => {
              console.log(`Attempting to send to admin: ${adminUserId}`);
              try {
                await addMessageToUser(
                  adminUserId,
                  {
                    userId: user?.userId || user?.uid,
                    username: "Grocery List",
                    groupName: groups[0]?.name || "Grocery Group",
                    screenForNavigation: {
                      screen: "Grocery",
                      params: {
                        screen: "GroceryShoppingList",
                      },
                    },
                  },
                  notificationMessage
                );
                console.log(
                  `✅ Notification successfully sent to admin ${adminUserId}`
                );
              } catch (error) {
                console.error(
                  `❌ Error sending notification to admin ${adminUserId}:`,
                  error
                );
              }
            });

            await Promise.all(messagePromises);
            console.log("All message promises completed");
          } else {
            console.log("Not a meal item, skipping notifications");
          }
        } else {
          console.log("No admin users found");
        }
      } catch (error) {
        console.error("Error updating item with ingredients:", error);
        throw error;
      }
    },
    [groceryId, db, user]
  );

  const addMealToMeals = useCallback(
    async (mealItem) => {
      if (!groceryId) {
        console.error("No groceriesId found for user");
        return;
      }

      try {
        const mealsDocId = `${groceryId}_meals`;
        const mealsRef = doc(db, "groceries", mealsDocId);

        // Get current meals list
        const mealsSnap = await getDoc(mealsRef);
        const currentMeals = mealsSnap.exists()
          ? mealsSnap.data().meals || []
          : [];

        console.log("Original meal item:", JSON.stringify(mealItem, null, 2));

        // Clean ingredients to remove any undefined values
        const cleanedIngredients = (mealItem.ingredients || []).map(
          (ingredient) => {
            const cleaned = {};
            Object.keys(ingredient).forEach((key) => {
              if (ingredient[key] !== undefined) {
                cleaned[key] = ingredient[key];
              }
            });
            return cleaned;
          }
        );

        console.log(
          "Cleaned ingredients:",
          JSON.stringify(cleanedIngredients, null, 2)
        );

        // Add the meal with cleaned data - remove any undefined top-level fields too
        const newMeal = {
          id: mealItem.id,
          name: mealItem.name,
          quantity: mealItem.quantity,
          ingredients: cleanedIngredients,
          addedAt: DateTime.now().toISO(),
        };

        // Only add category if it's defined
        if (mealItem.category !== undefined) {
          newMeal.category = mealItem.category;
        }

        console.log("New meal to save:", JSON.stringify(newMeal, null, 2));

        await updateDoc(mealsRef, {
          meals: [...currentMeals, newMeal],
        });

        console.log(`Added ${mealItem.name} to meals`);
      } catch (error) {
        console.error("Error adding meal to meals:", error);
        throw error;
      }
    },
    [groceryId, db]
  );

  const updateShoppingListOrder = useCallback(
    async (reorderedList) => {
      if (!groceryId) {
        console.error("No groceriesId found for user");
        return;
      }

      try {
        const groceryDocId = `${groceryId}_shoppingList`;
        const shoppingListRef = doc(db, "groceries", groceryDocId);

        await updateDoc(shoppingListRef, {
          shoppingList: reorderedList,
        });

        console.log("Shopping list order updated successfully");
      } catch (error) {
        console.error("Error updating shopping list order:", error);
        throw error;
      }
    },
    [groceryId, db]
  );

  return {
    updateGroceryBank,
    updateInventoryItem,
    removeInventoryItem,
    addToShoppingList,
    updateShoppingListItem,
    deleteShoppingListItem,
    clearPurchasedFromShoppingList,
    updateItemWithIngredients,
    addMealToMeals,
    updateShoppingListOrder,
  };
};
