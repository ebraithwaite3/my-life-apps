import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";

/**
 * A single ingredient row: Name input + optional Quantity input + Delete button.
 *
 * Props:
 *   ingredient  {object}   - { id, name, quantity? }
 *   onChange    {function} - Called with updated ingredient
 *   onDelete    {function} - Called to remove the ingredient
 *   indented    {boolean}  - Adds left indent (for choice ingredients)
 */
const MealIngredientRow = ({ ingredient, onChange, onDelete, indented = false }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
      paddingLeft: indented ? getSpacing.lg : 0,
      paddingVertical: getSpacing.xs,
    },
    nameInput: {
      flex: 2,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.surface,
    },
    quantityInput: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.surface,
    },
    deleteButton: {
      padding: getSpacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.nameInput}
        value={ingredient.name}
        onChangeText={(text) => onChange({ ...ingredient, name: text })}
        placeholder="Ingredient"
        placeholderTextColor={theme.text.tertiary}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="next"
      />
      <TextInput
        style={styles.quantityInput}
        value={ingredient.quantity || ""}
        onChangeText={(text) =>
          onChange({ ...ingredient, quantity: text || undefined })
        }
        placeholder="qty (opt.)"
        placeholderTextColor={theme.text.tertiary}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="next"
      />
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close-circle-outline" size={20} color={theme.error} />
      </TouchableOpacity>
    </View>
  );
};

export default MealIngredientRow;
