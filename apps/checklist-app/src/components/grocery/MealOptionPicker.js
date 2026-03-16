import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { ModalWrapper, ModalHeader } from "@my-apps/ui";

/**
 * Modal shown before adding a meal to the grocery list.
 * - Base ingredients are listed pre-checked; uncheck any you already have.
 * - Option groups (required/optional) let you pick variants.
 *
 * Props:
 *   meal       {object|null}  - The meal being added
 *   visible    {boolean}
 *   onConfirm  {function(checkedIngredients, selectedChoices)}
 *   onCancel   {function}
 */
const MealOptionPicker = ({ meal, visible, onConfirm, onCancel }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  // Set of ingredient IDs the user wants to include (all pre-checked)
  const [checkedIngredientIds, setCheckedIngredientIds] = useState(new Set());

  // { [groupId]: choiceId } for required, { [groupId]: Set<choiceId> } for optional
  const [selections, setSelections] = useState({});

  // Reset when meal changes
  useEffect(() => {
    if (meal) {
      setCheckedIngredientIds(
        new Set((meal.ingredients || []).map((ing) => ing.id))
      );
      setSelections({});
    }
  }, [meal?.id]);

  if (!meal) return null;

  const baseIngredients = meal.ingredients || [];
  const optionGroups = meal.optionGroups || [];
  const requiredGroups = optionGroups.filter((g) => g.required);

  const allRequiredSatisfied =
    requiredGroups.length === 0 ||
    requiredGroups.every((g) => selections[g.id]);

  const handleToggleIngredient = (ingId) => {
    setCheckedIngredientIds((prev) => {
      const next = new Set(prev);
      if (next.has(ingId)) {
        next.delete(ingId);
      } else {
        next.add(ingId);
      }
      return next;
    });
  };

  const handleToggleChoice = (group, choiceId) => {
    if (group.required) {
      setSelections((prev) => ({
        ...prev,
        [group.id]: prev[group.id] === choiceId ? undefined : choiceId,
      }));
    } else {
      setSelections((prev) => {
        const current = prev[group.id] ? new Set(prev[group.id]) : new Set();
        if (current.has(choiceId)) {
          current.delete(choiceId);
        } else {
          current.add(choiceId);
        }
        return { ...prev, [group.id]: current };
      });
    }
  };

  const isChoiceSelected = (group, choiceId) => {
    if (group.required) return selections[group.id] === choiceId;
    return selections[group.id]?.has(choiceId) ?? false;
  };

  const buildSelectedChoices = () => {
    const result = [];
    for (const group of optionGroups) {
      if (group.required) {
        const choiceId = selections[group.id];
        if (choiceId) {
          const choice = group.choices.find((c) => c.id === choiceId);
          if (choice) result.push(choice);
        }
      } else {
        const choiceSet = selections[group.id];
        if (choiceSet) {
          for (const choiceId of choiceSet) {
            const choice = group.choices.find((c) => c.id === choiceId);
            if (choice) result.push(choice);
          }
        }
      }
    }
    return result;
  };

  const handleConfirm = () => {
    const checkedIngredients = baseIngredients.filter((ing) =>
      checkedIngredientIds.has(ing.id)
    );
    onConfirm(checkedIngredients, buildSelectedChoices());
  };

  const styles = StyleSheet.create({
    flex: { flex: 1 },
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      width: "100%",
      flex: 1,
      overflow: "hidden",
    },
    scrollContent: {
      paddingHorizontal: getSpacing.lg,
      paddingBottom: getSpacing.xl,
    },
    sectionTitle: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: theme.text.primary,
      marginTop: getSpacing.lg,
      marginBottom: getSpacing.xs,
    },
    sectionMeta: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.md,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.md,
      borderWidth: 1.5,
      marginBottom: getSpacing.xs,
    },
    rowChecked: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + "10",
    },
    rowUnchecked: {
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    rowText: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    rowSubText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: 2,
    },
  });

  return (
    <ModalWrapper visible={visible} onClose={onCancel}>
      <View style={styles.overlay} pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%", height: "80%" }}
        >
          <View style={styles.container}>
            <ModalHeader
              title={meal.name}
              onCancel={onCancel}
              cancelText="Cancel"
              onDone={handleConfirm}
              doneText="Add to List"
              doneDisabled={!allRequiredSatisfied}
            />

            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Base ingredients — pre-checked, uncheck to exclude */}
              {baseIngredients.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Ingredients</Text>
                  <Text style={styles.sectionMeta}>
                    Uncheck anything you already have
                  </Text>
                  {baseIngredients.map((ing) => {
                    const checked = checkedIngredientIds.has(ing.id);
                    const label = ing.quantity
                      ? `${ing.name} (${ing.quantity})`
                      : ing.name;
                    return (
                      <TouchableOpacity
                        key={ing.id}
                        style={[
                          styles.row,
                          checked ? styles.rowChecked : styles.rowUnchecked,
                        ]}
                        onPress={() => handleToggleIngredient(ing.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={checked ? "checkbox" : "square-outline"}
                          size={20}
                          color={checked ? theme.primary : theme.text.secondary}
                        />
                        <Text style={styles.rowText}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Option groups */}
              {optionGroups.map((group) => (
                <View key={group.id}>
                  <Text style={styles.sectionTitle}>{group.label}</Text>
                  <Text style={styles.sectionMeta}>
                    {group.required ? "Required — pick one" : "Optional — pick any"}
                  </Text>

                  {(group.choices || []).map((choice) => {
                    const selected = isChoiceSelected(group, choice.id);
                    const ingredientNames = (choice.ingredients || [])
                      .slice(0, 3)
                      .map((i) => i.name)
                      .join(", ");

                    return (
                      <TouchableOpacity
                        key={choice.id}
                        style={[
                          styles.row,
                          selected ? styles.rowChecked : styles.rowUnchecked,
                        ]}
                        onPress={() => handleToggleChoice(group, choice.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={
                            selected
                              ? group.required
                                ? "radio-button-on"
                                : "checkbox"
                              : group.required
                              ? "radio-button-off"
                              : "square-outline"
                          }
                          size={20}
                          color={selected ? theme.primary : theme.text.secondary}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowText}>{choice.name}</Text>
                          {ingredientNames ? (
                            <Text style={styles.rowSubText}>
                              {ingredientNames}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModalWrapper>
  );
};

export default MealOptionPicker;
