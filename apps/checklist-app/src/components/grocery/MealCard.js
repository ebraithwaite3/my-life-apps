import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";

/**
 * A single meal row in the Add Meals search list.
 *
 * Props:
 *   meal      {object}   - Meal data
 *   isAdded   {boolean}  - Whether this meal is already on the list
 *   onAdd     {function} - Called when user taps Add
 *   onRemove  {function} - Called when user taps Remove
 */
const MealCard = ({ meal, isAdded, onAdd, onRemove }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const ingredientPreview = (() => {
    const all = meal.ingredients || [];
    const names = all.slice(0, 3).map((i) => i.name);
    if (all.length > 3) names.push("…");
    return names.join(", ");
  })();

  const optionGroupCount = meal.optionGroups?.length || 0;

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getSpacing.md,
      gap: getSpacing.sm,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: theme.text.primary,
      marginBottom: 2,
    },
    preview: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
    },
    optionBadge: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
      marginTop: 2,
    },
    addedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 2,
    },
    addedText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.success,
      fontWeight: "600",
    },
    addButton: {
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.full,
      backgroundColor: theme.primary,
    },
    addButtonText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    removeButton: {
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.full,
      borderWidth: 1.5,
      borderColor: theme.error,
    },
    removeButtonText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "700",
      color: theme.error,
    },
    separator: {
      height: 1,
      backgroundColor: theme.border,
    },
  });

  return (
    <>
      <View style={styles.container}>
        <View style={styles.info}>
          <Text style={styles.name}>{meal.name}</Text>
          {ingredientPreview ? (
            <Text style={styles.preview}>{ingredientPreview}</Text>
          ) : null}
          {optionGroupCount > 0 && (
            <Text style={styles.optionBadge}>
              {optionGroupCount} option group{optionGroupCount > 1 ? "s" : ""}
            </Text>
          )}
          {isAdded && (
            <View style={styles.addedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={theme.success} />
              <Text style={styles.addedText}>Added</Text>
            </View>
          )}
        </View>

        {isAdded ? (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={onRemove}
            activeOpacity={0.8}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAdd}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.separator} />
    </>
  );
};

export default MealCard;
