import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import MealIngredientRow from "./MealIngredientRow";

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Editor for a single option group (e.g. "Choose Protein").
 * Collapsible. Shows choices, each with a name and ingredient sub-list.
 *
 * Props:
 *   group     {object}   - { id, label, required, choices: [{ id, name, ingredients }] }
 *   onChange  {function} - Called with updated group
 *   onDelete  {function} - Called to remove the group
 */
const MealOptionGroupEditor = ({ group, onChange, onDelete }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handleLabelChange = (label) => onChange({ ...group, label });
  const handleRequiredChange = (required) => onChange({ ...group, required });

  const handleAddChoice = () => {
    const newChoice = { id: uuid(), name: "", ingredients: [] };
    onChange({ ...group, choices: [...(group.choices || []), newChoice] });
  };

  const handleChoiceNameChange = (choiceId, name) => {
    onChange({
      ...group,
      choices: group.choices.map((c) =>
        c.id === choiceId ? { ...c, name } : c
      ),
    });
  };

  const handleDeleteChoice = (choiceId) => {
    onChange({
      ...group,
      choices: group.choices.filter((c) => c.id !== choiceId),
    });
  };

  const handleAddChoiceIngredient = (choiceId) => {
    const newIngredient = { id: uuid(), name: "", quantity: undefined };
    onChange({
      ...group,
      choices: group.choices.map((c) =>
        c.id === choiceId
          ? { ...c, ingredients: [...(c.ingredients || []), newIngredient] }
          : c
      ),
    });
  };

  const handleChangeChoiceIngredient = (choiceId, updatedIngredient) => {
    onChange({
      ...group,
      choices: group.choices.map((c) =>
        c.id === choiceId
          ? {
              ...c,
              ingredients: c.ingredients.map((ing) =>
                ing.id === updatedIngredient.id ? updatedIngredient : ing
              ),
            }
          : c
      ),
    });
  };

  const handleDeleteChoiceIngredient = (choiceId, ingredientId) => {
    onChange({
      ...group,
      choices: group.choices.map((c) =>
        c.id === choiceId
          ? {
              ...c,
              ingredients: c.ingredients.filter((ing) => ing.id !== ingredientId),
            }
          : c
      ),
    });
  };

  const styles = StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      marginBottom: getSpacing.sm,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
      padding: getSpacing.sm,
      backgroundColor: theme.surface,
    },
    labelInput: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.background,
    },
    requiredRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
    },
    requiredLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
    },
    body: {
      padding: getSpacing.sm,
      paddingTop: 0,
      gap: getSpacing.sm,
    },
    choiceContainer: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.sm,
      padding: getSpacing.sm,
      marginTop: getSpacing.sm,
    },
    choiceHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
    },
    choiceNameInput: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.md,
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.surface,
    },
    addIngredientBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
      paddingTop: getSpacing.xs,
      paddingLeft: getSpacing.lg,
    },
    addIngredientText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
    },
    addChoiceBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
      paddingTop: getSpacing.sm,
    },
    addChoiceText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
    },
    deleteBtn: {
      padding: getSpacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header row */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <TextInput
          style={styles.labelInput}
          value={group.label}
          onChangeText={handleLabelChange}
          placeholder="Option label (e.g. Choose Protein)"
          placeholderTextColor={theme.text.tertiary}
          autoCorrect={false}
          autoCapitalize="words"
          // Prevent tap-on-input from toggling expand
          onFocus={() => !expanded && setExpanded(true)}
        />
        <View style={styles.requiredRow}>
          <Text style={styles.requiredLabel}>Req</Text>
          <Switch
            value={group.required}
            onValueChange={handleRequiredChange}
            trackColor={{ false: theme.border, true: theme.primary + "40" }}
            thumbColor={group.required ? theme.primary : theme.text.secondary}
          />
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.text.secondary}
        />
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color={theme.error} />
        </TouchableOpacity>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {(group.choices || []).map((choice) => (
            <View key={choice.id} style={styles.choiceContainer}>
              <View style={styles.choiceHeader}>
                <TextInput
                  style={styles.choiceNameInput}
                  value={choice.name}
                  onChangeText={(name) => handleChoiceNameChange(choice.id, name)}
                  placeholder="Choice name (e.g. Ground Meat)"
                  placeholderTextColor={theme.text.tertiary}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteChoice(choice.id)}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={theme.error}
                  />
                </TouchableOpacity>
              </View>

              {(choice.ingredients || []).map((ing) => (
                <MealIngredientRow
                  key={ing.id}
                  ingredient={ing}
                  onChange={(updated) =>
                    handleChangeChoiceIngredient(choice.id, updated)
                  }
                  onDelete={() =>
                    handleDeleteChoiceIngredient(choice.id, ing.id)
                  }
                  indented
                />
              ))}

              <TouchableOpacity
                style={styles.addIngredientBtn}
                onPress={() => handleAddChoiceIngredient(choice.id)}
              >
                <Ionicons name="add-outline" size={16} color={theme.primary} />
                <Text style={styles.addIngredientText}>Add Ingredient</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addChoiceBtn} onPress={handleAddChoice}>
            <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
            <Text style={styles.addChoiceText}>Add Choice</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default MealOptionGroupEditor;
