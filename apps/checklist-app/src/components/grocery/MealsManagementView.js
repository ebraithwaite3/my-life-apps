import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@my-apps/contexts";
import { Ionicons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useMeals, useIngredients } from "@my-apps/hooks";
import MealEditorModal from "./MealEditorModal";
import { PageHeader } from "@my-apps/ui";

/**
 * Full-page meals management view (rendered inside PreferencesScreen via currentView).
 * Lists all meals; tap to edit. Header has back + Add Meal button.
 *
 * Props:
 *   onClose {function} - Navigates back to preferences
 */
const MealsManagementView = ({ onClose }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { meals, loading, saveMeal, deleteMeal } = useMeals();
  const { ingredients: allIngredients, addIngredient } = useIngredients();

  const [showEditor, setShowEditor] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);

  const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.background },
    scrollContent: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
    },
    mealCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getSpacing.md,
      gap: getSpacing.md,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: getBorderRadius.md,
      backgroundColor: theme.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    mealInfo: {
      flex: 1,
    },
    mealName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: theme.text.primary,
    },
    mealDetails: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: 2,
    },
    separator: {
      height: 1,
      backgroundColor: theme.border,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: getSpacing.xl * 2,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: "center",
      marginTop: getSpacing.md,
    },
  });

  return (
    <View style={styles.flex}>
      <PageHeader
        title="Meals"
        showBackButton
        onBackPress={onClose}
        icons={[
          { icon: "add", action: () => { setSelectedMeal(null); setShowEditor(true); } },
        ]}
      />

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : meals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="food-fork-drink" size={48} color={theme.text.secondary} />
          <Text style={styles.emptyText}>
            No meals yet.{"\n"}Tap Add Meal to create your first.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {meals.map((meal) => (
            <View key={meal.id}>
              <TouchableOpacity
                style={styles.mealCard}
                onPress={() => {
                  setSelectedMeal(meal);
                  setShowEditor(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <Icon name="food" size={18} color={theme.primary} />
                </View>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealDetails}>
                    {meal.ingredients?.length || 0} ingredient
                    {meal.ingredients?.length !== 1 ? "s" : ""}
                    {meal.optionGroups?.length > 0
                      ? ` · ${meal.optionGroups.length} option group${
                          meal.optionGroups.length !== 1 ? "s" : ""
                        }`
                      : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.text.secondary} />
              </TouchableOpacity>
              <View style={styles.separator} />
            </View>
          ))}
        </ScrollView>
      )}

      <MealEditorModal
        visible={showEditor}
        meal={selectedMeal}
        meals={meals}
        saveMeal={saveMeal}
        deleteMeal={deleteMeal}
        allIngredients={allIngredients}
        addIngredient={addIngredient}
        onClose={() => {
          setShowEditor(false);
          setSelectedMeal(null);
        }}
      />
    </View>
  );
};

export default MealsManagementView;
