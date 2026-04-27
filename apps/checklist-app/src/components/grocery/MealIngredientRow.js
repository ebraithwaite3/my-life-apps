import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import IngredientPickerModal from "./IngredientPickerModal";

/**
 * A single base-ingredient row for meal editing.
 * Tap the name to open the ingredient picker (search + create).
 *
 * Props:
 *   ingredient     {object}   - { id, name, quantity?, ingredientId? }
 *   onChange       {function} - Called with updated ingredient object
 *   onDelete       {function} - Called to remove the ingredient
 *   indented       {boolean}  - Adds left indent (for choice ingredients)
 *   allIngredients {array}    - Full ingredients list for search
 *   addIngredient  {function} - async (name, category?) => newIngredient
 */
const MealIngredientRow = ({
  ingredient,
  onChange,
  onDelete,
  indented = false,
  allIngredients = [],
  addIngredient,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);
  const isLinked = !!ingredient.ingredientId;

  const handleSelect = (found) => {
    onChange({ ...ingredient, name: found.name, ingredientId: found.id });
    setPickerVisible(false);
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
      paddingLeft: indented ? getSpacing.lg : 0,
      paddingVertical: getSpacing.xs,
    },
    nameButton: {
      flex: 2,
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
      borderWidth: 1.5,
      borderColor: isLinked ? theme.primary : theme.border,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      backgroundColor: theme.surface,
    },
    nameText: {
      flex: 1,
      fontSize: getTypography.bodySmall.fontSize,
      color: ingredient.name ? theme.text.primary : theme.text.tertiary,
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
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.nameButton}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.7}
        >
          {isLinked && <Ionicons name="link" size={11} color={theme.primary} />}
          <Text style={styles.nameText} numberOfLines={1}>
            {ingredient.name || "Tap to select ingredient…"}
          </Text>
          <Ionicons name="chevron-down" size={13} color={theme.text.tertiary} />
        </TouchableOpacity>

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

      <IngredientPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelect}
        allIngredients={allIngredients}
        addIngredient={addIngredient}
      />
    </>
  );
};

export default MealIngredientRow;
