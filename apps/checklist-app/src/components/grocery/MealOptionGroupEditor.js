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
import IngredientPickerModal from "./IngredientPickerModal";

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Editor for a single option group.
 * Choices are { id, name, type: 'ingredient' | 'meal' }.
 * Ingredient choices open the ingredient picker; meal choices are free-text.
 *
 * Props:
 *   group          {object}   - { id, label, required, pickOne, choices: [{id, name, type}] }
 *   onChange       {function} - Called with updated group
 *   onDelete       {function}
 *   allIngredients {array}
 *   addIngredient  {function}
 */
const MealOptionGroupEditor = ({ group, onChange, onDelete, allIngredients = [], addIngredient }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [pickerForChoiceId, setPickerForChoiceId] = useState(null);

  const handleLabelChange = (label) => onChange({ ...group, label });
  const handleRequiredChange = (required) => onChange({ ...group, required });
  const handlePickOneChange = (pickOne) => onChange({ ...group, pickOne });

  const handleAddChoice = () => {
    const newChoice = { id: uuid(), name: "", type: "ingredient" };
    const safeChoices = (group.choices || []).map((c) => ({ ...c, id: c.id || uuid() }));
    onChange({ ...group, choices: [...safeChoices, newChoice] });
  };

  const handleChoiceChange = (choiceId, updates) => {
    onChange({
      ...group,
      choices: group.choices.map((c) =>
        c.id === choiceId ? { ...c, ...updates } : c
      ),
    });
  };

  const handleDeleteChoice = (choiceId) => {
    onChange({ ...group, choices: group.choices.filter((c) => c.id !== choiceId) });
  };

  const handleIngredientSelect = (ingredient) => {
    handleChoiceChange(pickerForChoiceId, { name: ingredient.name, ingredientId: ingredient.id });
    setPickerForChoiceId(null);
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
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
    },
    toggleLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
    },
    body: {
      padding: getSpacing.sm,
      gap: getSpacing.sm,
    },
    choiceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
      paddingVertical: getSpacing.xs,
    },
    choiceNameButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
      borderWidth: 1.5,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      backgroundColor: theme.surface,
    },
    choiceNameText: {
      flex: 1,
      fontSize: getTypography.bodySmall.fontSize,
    },
    choiceMealInput: {
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
    typeToggle: {
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    typeToggleText: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    deleteBtn: {
      padding: getSpacing.xs,
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
    separator: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: getSpacing.xs,
    },
  });

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <TouchableOpacity
          style={styles.header}
          onPress={() => setExpanded((v) => !v)}
          activeOpacity={0.8}
        >
          <TextInput
            style={styles.labelInput}
            value={group.label}
            onChangeText={handleLabelChange}
            placeholder="Group label (e.g. Sauce)"
            placeholderTextColor={theme.text.tertiary}
            autoCorrect={false}
            autoCapitalize="words"
            onFocus={() => !expanded && setExpanded(true)}
          />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Req</Text>
            <Switch
              value={!!group.required}
              onValueChange={handleRequiredChange}
              trackColor={{ false: theme.border, true: theme.primary + "40" }}
              thumbColor={group.required ? theme.primary : theme.text.secondary}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>1</Text>
            <Switch
              value={!!group.pickOne}
              onValueChange={handlePickOneChange}
              trackColor={{ false: theme.border, true: theme.primary + "40" }}
              thumbColor={group.pickOne ? theme.primary : theme.text.secondary}
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
            {(group.choices || []).map((choice, idx) => {
              const isIngredient = !choice.type || choice.type === "ingredient";
              const isLinked = !!choice.ingredientId;
              return (
                <View key={choice.id || idx}>
                  <View style={styles.choiceRow}>
                    {isIngredient ? (
                      <TouchableOpacity
                        style={[
                          styles.choiceNameButton,
                          { borderColor: isLinked ? theme.primary : theme.border },
                        ]}
                        onPress={() => setPickerForChoiceId(choice.id)}
                        activeOpacity={0.7}
                      >
                        {isLinked && <Ionicons name="link" size={11} color={theme.primary} />}
                        <Text
                          style={[
                            styles.choiceNameText,
                            { color: choice.name ? theme.text.primary : theme.text.tertiary },
                          ]}
                          numberOfLines={1}
                        >
                          {choice.name || "Tap to select ingredient…"}
                        </Text>
                        <Ionicons name="chevron-down" size={13} color={theme.text.tertiary} />
                      </TouchableOpacity>
                    ) : (
                      <TextInput
                        style={styles.choiceMealInput}
                        value={choice.name}
                        onChangeText={(name) => handleChoiceChange(choice.id, { name })}
                        placeholder="Meal name…"
                        placeholderTextColor={theme.text.tertiary}
                        autoCorrect={false}
                        autoCapitalize="words"
                      />
                    )}

                    <TouchableOpacity
                      style={styles.typeToggle}
                      onPress={() =>
                        handleChoiceChange(choice.id, {
                          type: isIngredient ? "meal" : "ingredient",
                          ingredientId: undefined,
                        })
                      }
                    >
                      <Text style={styles.typeToggleText}>
                        {isIngredient ? "ING" : "MEAL"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteChoice(choice.id)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                  {idx < (group.choices || []).length - 1 && (
                    <View style={styles.separator} />
                  )}
                </View>
              );
            })}

            <TouchableOpacity style={styles.addChoiceBtn} onPress={handleAddChoice}>
              <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
              <Text style={styles.addChoiceText}>Add Choice</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <IngredientPickerModal
        visible={pickerForChoiceId !== null}
        onClose={() => setPickerForChoiceId(null)}
        onSelect={handleIngredientSelect}
        allIngredients={allIngredients}
        addIngredient={addIngredient}
      />
    </>
  );
};

export default MealOptionGroupEditor;
