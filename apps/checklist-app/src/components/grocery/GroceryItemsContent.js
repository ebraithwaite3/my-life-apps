import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { STORES } from "./groceryConstants";

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Items tab for the Grocery List modal.
 *
 * Top:    Ingredient search bar — tap a result to add a flat ingredient item.
 * Below:  Full current list.
 *         - Meal groups show as a header row + indented sub-item rows, all with trash icons.
 *           Trash on the header = remove whole meal group.
 *           Trash on a sub-item = remove just that ingredient (auto-removes meal if 0 sub-items left).
 *         - Standalone (flat) ingredient rows have a trash icon too.
 *
 * Props:
 *   list         {object}   - Current working checklist (with items array)
 *   onUpdateList {function} - Called with fully updated checklist object
 */
const GroceryItemsContent = ({
  list,
  onUpdateList,
  ingredients,
  ingredientsByCategory,
  ingredientsLoading,
  addIngredient,
  updateIngredient,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [searchText, setSearchText] = useState("");
  const [creating, setCreating] = useState(false);
  const listScrollRef = useRef(null);
  const prevItemCountRef = useRef(0);

  // Scroll to bottom when items are added
  useEffect(() => {
    const count = (list?.items || []).length;
    if (count > prevItemCountRef.current) {
      setTimeout(() => listScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
    prevItemCountRef.current = count;
  }, [(list?.items || []).length]);

  // ── Search results ────────────────────────────────────────────────────────

  const searchResults = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];
    return ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [searchText, ingredients]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddIngredient = (ingredient) => {
    const newItem = {
      id: uuid(),
      ingredientId: ingredient.id,
      name: ingredient.name,
      completed: false,
    };
    onUpdateList({ ...list, items: [...(list?.items || []), newItem] });
  };

  const handleDeleteItem = (itemId) => {
    const updatedItems = (list?.items || []).filter((i) => i.id !== itemId);
    onUpdateList({ ...list, items: updatedItems });
  };

  const handleDeleteSubItem = (parentId, subItemId) => {
    const updatedItems = (list?.items || [])
      .map((item) => {
        if (item.id !== parentId) return item;
        const updatedSubs = (item.subItems || []).filter((s) => s.id !== subItemId);
        // Auto-remove meal group if no sub-items remain
        if (updatedSubs.length === 0) return null;
        return { ...item, subItems: updatedSubs };
      })
      .filter(Boolean);
    onUpdateList({ ...list, items: updatedItems });
  };

  const doAdd = async (displayName, category) => {
    setCreating(true);
    try {
      const newIngredient = await addIngredient(displayName, category);
      handleAddIngredient(newIngredient);
      setSearchText("");
    } catch {
      Alert.alert("Error", "Could not add ingredient. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const pickCategory = (displayName) => {
    const existingCategories = Object.keys(ingredientsByCategory).filter(
      (c) => c !== "other"
    );
    Alert.alert(
      "Choose Category",
      `Category for "${displayName}"`,
      [
        ...existingCategories.map((cat) => ({
          text: cat.charAt(0).toUpperCase() + cat.slice(1),
          onPress: () => doAdd(displayName, cat),
        })),
        {
          text: "Other",
          onPress: () => doAdd(displayName, null),
        },
        {
          text: "+ New Category",
          onPress: () =>
            Alert.prompt(
              "New Category",
              "Enter a category name:",
              (input) => {
                const trimmed = input?.trim().toLowerCase();
                doAdd(displayName, trimmed || null);
              },
              "plain-text"
            ),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleSubmitSearch = () => {
    const trimmed = searchText.trim();
    if (!trimmed || creating || searchResults.length > 0) return;
    const displayName = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    Alert.alert(
      "Add New Ingredient",
      `"${displayName}" isn't in your library yet. Add it?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "No Category",
          onPress: () => doAdd(displayName, null),
        },
        {
          text: "Pick Category",
          onPress: () => pickCategory(displayName),
        },
      ]
    );
  };

  const handleLongPressIngredient = (ingredientId) => {
    if (!ingredientId) return;
    const ingredient = (ingredients || []).find((i) => i.id === ingredientId);
    if (!ingredient) return;
    const currentUnavailable = ingredient.unavailableAt || [];
    Alert.alert(
      `Availability — ${ingredient.name}`,
      'Tap a store to toggle. Checkmark = currently unavailable there.',
      [
        ...STORES.map((store) => ({
          text: currentUnavailable.includes(store) ? `✓ ${store}` : store,
          onPress: async () => {
            const updated = currentUnavailable.includes(store)
              ? currentUnavailable.filter((s) => s !== store)
              : [...currentUnavailable, store];
            await updateIngredient(ingredientId, { unavailableAt: updated });
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const styles = StyleSheet.create({
    flex: { flex: 1 },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    searchInput: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      paddingVertical: getSpacing.sm,
    },
    searchResults: {
      maxHeight: 200,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.background,
    },
    searchResultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.sm,
      gap: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border + '60',
    },
    searchResultName: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    categoryTag: {
      paddingHorizontal: getSpacing.sm,
      paddingVertical: 2,
      borderRadius: getBorderRadius.full,
      backgroundColor: theme.primary + '20',
    },
    categoryTagText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    noResultsRow: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.sm,
    },
    noResultsText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
    },
    listScroll: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: getSpacing.lg,
      paddingTop: getSpacing.md,
      paddingBottom: getSpacing.xl,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: getSpacing.xl,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
      marginTop: getSpacing.md,
    },
    // Meal group header
    mealHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.md,
      backgroundColor: theme.primary + '12',
      borderWidth: 1,
      borderColor: theme.primary + '40',
      marginBottom: getSpacing.xs,
      gap: getSpacing.sm,
    },
    mealHeaderName: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      fontWeight: '700',
      color: theme.text.primary,
    },
    mealHeaderCount: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
    },
    // Sub-item
    subItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.xs + 2,
      paddingHorizontal: getSpacing.md,
      marginLeft: getSpacing.lg,
      borderRadius: getBorderRadius.sm,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: getSpacing.xs,
      gap: getSpacing.sm,
    },
    subItemName: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    // Flat ingredient row
    flatItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.md,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: getSpacing.sm,
      gap: getSpacing.sm,
    },
    flatItemName: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    trashButton: {
      padding: getSpacing.xs,
    },
    mealGroupWrapper: {
      marginBottom: getSpacing.sm,
    },
  });

  if (ingredientsLoading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const currentItems = list?.items || [];

  return (
    <View style={styles.flex}>
      {/* Ingredient search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={theme.text.secondary} />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search ingredients to add…"
          placeholderTextColor={theme.text.tertiary}
          autoCorrect={false}
          autoCapitalize="words"
          clearButtonMode="while-editing"
          returnKeyType="done"
          onSubmitEditing={handleSubmitSearch}
          blurOnSubmit={false}
        />
      </View>

      {/* Search results dropdown */}
      {searchText.trim().length > 0 && (
        <View style={styles.searchResults}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {searchResults.length === 0 ? (
              <View style={styles.noResultsRow}>
                <Text style={styles.noResultsText}>
                  No match for "{searchText}" — press Done to add it to your library
                </Text>
              </View>
            ) : (
              searchResults.map((ing) => (
                <TouchableOpacity
                  key={ing.id}
                  style={styles.searchResultRow}
                  onPress={() => {
                    handleAddIngredient(ing);
                    setSearchText("");
                  }}
                >
                  <Text style={styles.searchResultName}>{ing.name}</Text>
                  {ing.category && (
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{ing.category}</Text>
                    </View>
                  )}
                  <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Current list */}
      {currentItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={48} color={theme.text.tertiary} />
          <Text style={styles.emptyText}>
            No items yet.{"\n"}Add meals from the Meals tab or search for ingredients above.
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={listScrollRef}
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        >
          {currentItems.map((item) => {
            const isMealGroup = item.itemType === 'group' && Array.isArray(item.subItems);

            if (isMealGroup) {
              return (
                <View key={item.id} style={styles.mealGroupWrapper}>
                  {/* Meal header */}
                  <View style={styles.mealHeader}>
                    <Ionicons name="restaurant-outline" size={16} color={theme.primary} />
                    <Text style={styles.mealHeaderName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.mealHeaderCount}>
                      {item.subItems.length} item{item.subItems.length !== 1 ? 's' : ''}
                    </Text>
                    <TouchableOpacity
                      style={styles.trashButton}
                      onPress={() => handleDeleteItem(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.error} />
                    </TouchableOpacity>
                  </View>

                  {/* Sub-items */}
                  {item.subItems.map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      style={styles.subItemRow}
                      onLongPress={() => handleLongPressIngredient(sub.ingredientId)}
                      delayLongPress={400}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove-outline" size={14} color={theme.text.tertiary} />
                      <Text style={styles.subItemName} numberOfLines={1}>{sub.name}</Text>
                      <TouchableOpacity
                        style={styles.trashButton}
                        onPress={() => handleDeleteSubItem(item.id, sub.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={theme.error} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            }

            // Flat ingredient item
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.flatItemRow}
                onLongPress={() => handleLongPressIngredient(item.ingredientId)}
                delayLongPress={400}
                activeOpacity={0.7}
              >
                <Ionicons name="cart-outline" size={16} color={theme.text.secondary} />
                <Text style={styles.flatItemName} numberOfLines={1}>{item.name}</Text>
                <TouchableOpacity
                  style={styles.trashButton}
                  onPress={() => handleDeleteItem(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default GroceryItemsContent;
