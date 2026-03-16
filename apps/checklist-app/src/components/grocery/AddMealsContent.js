import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import useMeals from "../../hooks/useMeals";
import MealCard from "./MealCard";
import MealOptionPicker from "./MealOptionPicker";

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Add Meals tab content.
 * Displays a searchable list of meals; lets the user add/remove them from the grocery list.
 *
 * When a meal is added, it becomes an `itemType: 'group'` item with `mealId` and `subItems`
 * (ingredients) so the existing ChecklistItemRow renders it as a header + nested list.
 *
 * Props:
 *   list         {object}   - Current working checklist (with items array)
 *   onUpdateList {function} - Called with the fully updated checklist object
 */
const AddMealsContent = ({ list, onUpdateList }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { meals, loading } = useMeals();

  const [searchText, setSearchText] = useState("");
  const [pendingMeal, setPendingMeal] = useState(null);

  // Meals already on the list (keyed by mealId)
  const addedMealIds = new Set(
    (list?.items || []).filter((i) => i.mealId).map((i) => i.mealId)
  );

  const filteredMeals = meals.filter((m) =>
    m.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const buildIngredientName = (ing) =>
    ing.quantity ? `${ing.name} (${ing.quantity})` : ing.name;

  // checkedIngredients = base ingredients the user kept checked (needs to buy)
  // selectedChoices = option group choices picked in the picker
  const buildGroupItem = (meal, checkedIngredients, selectedChoices) => {
    const baseSubItems = checkedIngredients.map((ing) => ({
      id: uuid(),
      name: buildIngredientName(ing),
      completed: false,
    }));

    // Option choice ingredients — if a choice has no sub-ingredients, add the choice name itself
    const optionSubItems = selectedChoices.flatMap((choice) => {
      const ings = choice.ingredients || [];
      if (ings.length === 0) {
        return [{ id: uuid(), name: choice.name, completed: false }];
      }
      return ings.map((ing) => ({
        id: uuid(),
        name: buildIngredientName(ing),
        completed: false,
      }));
    });

    return {
      id: uuid(),
      name: meal.name,
      itemType: "group",
      mealId: meal.id,
      completed: false,
      subItems: [...baseSubItems, ...optionSubItems],
    };
  };

  const handleAddMeal = (meal, checkedIngredients = [], selectedChoices = []) => {
    const groupItem = buildGroupItem(meal, checkedIngredients, selectedChoices);
    const updatedItems = [...(list?.items || []), groupItem];
    onUpdateList({ ...list, items: updatedItems });
    setPendingMeal(null);
  };

  const handleRemoveMeal = (mealId) => {
    const updatedItems = (list?.items || []).filter((i) => i.mealId !== mealId);
    onUpdateList({ ...list, items: updatedItems });
  };

  const handleTapAdd = (meal) => {
    const hasIngredients = (meal.ingredients || []).length > 0;
    const hasOptions = (meal.optionGroups || []).length > 0;
    if (hasIngredients || hasOptions) {
      setPendingMeal(meal);
    } else {
      // No ingredients, no options — add directly with nothing to pick
      handleAddMeal(meal, [], []);
    }
  };

  const styles = StyleSheet.create({
    flex: { flex: 1 },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
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
    scrollContent: {
      paddingHorizontal: getSpacing.lg,
      paddingBottom: getSpacing.xl,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: getSpacing.xl,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: "center",
      marginTop: getSpacing.md,
    },
  });

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={theme.text.secondary} />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search meals…"
          placeholderTextColor={theme.text.tertiary}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {filteredMeals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={48} color={theme.text.tertiary} />
          <Text style={styles.emptyText}>
            {searchText ? "No meals match your search." : "No meals in the library yet."}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {filteredMeals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              isAdded={addedMealIds.has(meal.id)}
              onAdd={() => handleTapAdd(meal)}
              onRemove={() => handleRemoveMeal(meal.id)}
            />
          ))}
        </ScrollView>
      )}

      <MealOptionPicker
        meal={pendingMeal}
        visible={pendingMeal !== null}
        onConfirm={(checkedIngredients, selectedChoices) =>
          handleAddMeal(pendingMeal, checkedIngredients, selectedChoices)
        }
        onCancel={() => setPendingMeal(null)}
      />
    </View>
  );
};

export default AddMealsContent;
