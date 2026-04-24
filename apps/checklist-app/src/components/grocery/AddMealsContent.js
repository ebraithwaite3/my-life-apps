import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { useMeals } from "@my-apps/hooks";
import MealOptionPicker from "./MealOptionPicker";

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Add Meals tab — scrollable list of all meals as checkbox rows.
 * Checked = already on the grocery list. Tap to add (opens MealOptionPicker) or remove.
 *
 * Props:
 *   list         {object}   - Current working checklist (with items array)
 *   onUpdateList {function} - Called with the fully updated checklist object
 */
const AddMealsContent = ({ list, onUpdateList }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { meals, loading } = useMeals();
  const [pendingMeal, setPendingMeal] = useState(null);

  // Meals already on the list (keyed by mealId)
  const addedMealIds = useMemo(
    () => new Set((list?.items || []).filter((i) => i.mealId).map((i) => i.mealId)),
    [list?.items]
  );

  // ── Item building ─────────────────────────────────────────────────────────

  const buildGroupItem = (meal, resolvedIngredients) => {
    const subItems = resolvedIngredients.map((ing) => ({
      id: uuid(),
      ingredientId: ing.ingredientId,
      name: ing.quantity && ing.unit
        ? `${ing.name} — ${ing.quantity} ${ing.unit}`
        : ing.name,
      completed: false,
    }));

    return {
      id: uuid(),
      name: meal.name,
      itemType: 'group',
      mealId: meal.id,
      completed: false,
      subItems,
    };
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddMeal = (meal, resolvedIngredients = []) => {
    const groupItem = buildGroupItem(meal, resolvedIngredients);
    const updatedItems = [...(list?.items || []), groupItem];
    onUpdateList({ ...list, items: updatedItems });
    setPendingMeal(null);
  };

  const handleRemoveMeal = (mealId) => {
    const updatedItems = (list?.items || []).filter((i) => i.mealId !== mealId);
    onUpdateList({ ...list, items: updatedItems });
  };

  const handleTapMeal = (meal) => {
    if (addedMealIds.has(meal.id)) {
      handleRemoveMeal(meal.id);
      return;
    }

    const hasIngredients = (meal.ingredients || []).length > 0;
    const hasChoices =
      (meal.requiredChoices || []).length > 0 ||
      (meal.optionalChoices || []).length > 0 ||
      (meal.optionGroups || []).length > 0 ||
      (meal.optionalAddOns || []).length > 0;

    if (hasIngredients || hasChoices) {
      setPendingMeal(meal);
    } else {
      handleAddMeal(meal, []);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const styles = StyleSheet.create({
    flex: { flex: 1 },
    scrollContent: {
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
    mealRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.md,
      borderWidth: 1.5,
      marginBottom: getSpacing.sm,
      gap: getSpacing.md,
    },
    mealRowAdded: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    mealRowDefault: {
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    mealName: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      fontWeight: '500',
    },
    subCount: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
    },
  });

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (meals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="restaurant-outline" size={48} color={theme.text.tertiary} />
        <Text style={styles.emptyText}>No meals in the library yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {meals.map((meal) => {
          const added = addedMealIds.has(meal.id);
          const ingredientCount = (meal.ingredients || []).length;
          return (
            <TouchableOpacity
              key={meal.id}
              style={[styles.mealRow, added ? styles.mealRowAdded : styles.mealRowDefault]}
              onPress={() => handleTapMeal(meal)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={added ? 'checkbox' : 'square-outline'}
                size={22}
                color={added ? theme.primary : theme.text.secondary}
              />
              <Text style={styles.mealName}>{meal.name}</Text>
              {ingredientCount > 0 && (
                <Text style={styles.subCount}>{ingredientCount} items</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <MealOptionPicker
        meal={pendingMeal}
        visible={pendingMeal !== null}
        onConfirm={(resolvedIngredients) => handleAddMeal(pendingMeal, resolvedIngredients)}
        onCancel={() => setPendingMeal(null)}
      />
    </View>
  );
};

export default AddMealsContent;
