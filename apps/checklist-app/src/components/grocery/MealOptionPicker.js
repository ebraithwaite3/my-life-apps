import React, { useState, useEffect, useMemo } from "react";
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
import { useMeals } from "@my-apps/hooks";
import { ModalWrapper, ModalHeader } from "@my-apps/ui";

/**
 * Modal shown before adding a meal to the grocery list.
 *
 * Supports new schema:
 *   meal.ingredients[]      - base ingredients (all pre-checked, uncheck to exclude)
 *   meal.requiredChoices[]  - { label, options: [{type, id, name}], pickOne }
 *   meal.optionalChoices[]  - { label, options: [{type, id, name}], pickOne }
 *   meal.optionalAddOns[]   - legacy flat array of ingredients (all pre-unchecked/opt-in)
 *
 * When a choice option has type === 'meal', selecting it expands that sub-meal's ingredients
 * and choices inline. Sub-sub-meals are not expanded further (1 level only).
 *
 * Props:
 *   meal       {object|null}
 *   visible    {boolean}
 *   onConfirm  {function(resolvedIngredients: [{ingredientId, name, quantity?, unit?}])}
 *   onCancel   {function}
 */
const MealOptionPicker = ({ meal, visible, onConfirm, onCancel }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { meals } = useMeals();

  // Quick ID-keyed lookup for sub-meal expansion
  const mealMapById = useMemo(() => new Map(meals.map((m) => [m.id, m])), [meals]);

  // Base ingredient IDs the user wants to include (all pre-checked)
  const [checkedBaseIds, setCheckedBaseIds] = useState(new Set());

  // Required: { [groupLabel]: string (pickOne) | Set<string> (!pickOne) }
  const [requiredSelections, setRequiredSelections] = useState({});

  // Optional: { [groupLabel]: Set<string> }
  const [optionalSelections, setOptionalSelections] = useState({});

  // Legacy optionalAddOns: Set of ingredientIds (opt-in, all pre-unchecked)
  const [checkedAddOnIds, setCheckedAddOnIds] = useState(new Set());

  // Sub-meal state: { [optionId]: { checkedIngredientIds, requiredSelections, optionalSelections } }
  const [subMealState, setSubMealState] = useState({});

  // Reset all state when meal changes
  useEffect(() => {
    if (meal) {
      setCheckedBaseIds(new Set((meal.ingredients || []).map((i) => i.ingredientId)));
      setRequiredSelections({});
      setOptionalSelections({});
      setCheckedAddOnIds(new Set());
      setSubMealState({});
    }
  }, [meal?.id]);

  // Extract meal fields above the null guard so hooks aren't conditional
  const baseIngredients = meal?.ingredients || [];
  const requiredChoices = meal?.requiredChoices || [];
  const optionalChoices = meal?.optionalChoices || [];
  const legacyAddOns = meal?.optionalAddOns || [];

  // ── Helpers ──────────────────────────────────────────────────────────────

  const isOptionSelected = (groupLabel, optionId, isRequired) => {
    const selections = isRequired ? requiredSelections : optionalSelections;
    const sel = selections[groupLabel];
    if (!sel) return false;
    if (typeof sel === 'string') return sel === optionId;
    return sel instanceof Set ? sel.has(optionId) : false;
  };

  const handleToggleOption = (groupLabel, optionId, pickOne, isRequired) => {
    const setFn = isRequired ? setRequiredSelections : setOptionalSelections;
    const option = [...requiredChoices, ...optionalChoices]
      .find(g => g.label === groupLabel)
      ?.options?.find(o => o.id === optionId);

    setFn((prev) => {
      if (pickOne) {
        // Radio: toggle off if same, otherwise set
        return { ...prev, [groupLabel]: prev[groupLabel] === optionId ? undefined : optionId };
      } else {
        const current = prev[groupLabel] instanceof Set ? new Set(prev[groupLabel]) : new Set();
        if (current.has(optionId)) {
          current.delete(optionId);
        } else {
          current.add(optionId);
        }
        return { ...prev, [groupLabel]: current };
      }
    });

    // When toggling a meal-type option on, initialize its sub-state
    if (option?.type === 'meal') {
      const nowSelected = !isOptionSelected(groupLabel, optionId, isRequired);
      if (nowSelected) {
        const subMeal = mealMapById.get(optionId);
        if (subMeal && !subMealState[optionId]) {
          setSubMealState((prev) => ({
            ...prev,
            [optionId]: {
              checkedIngredientIds: new Set((subMeal.ingredients || []).map((i) => i.ingredientId)),
              requiredSelections: {},
              optionalSelections: {},
            },
          }));
        }
      } else {
        setSubMealState((prev) => {
          const next = { ...prev };
          delete next[optionId];
          return next;
        });
      }
    }
  };

  const handleToggleSubMealIngredient = (mealOptionId, ingredientId) => {
    setSubMealState((prev) => {
      const entry = prev[mealOptionId] || { checkedIngredientIds: new Set(), requiredSelections: {}, optionalSelections: {} };
      const ids = new Set(entry.checkedIngredientIds);
      if (ids.has(ingredientId)) ids.delete(ingredientId); else ids.add(ingredientId);
      return { ...prev, [mealOptionId]: { ...entry, checkedIngredientIds: ids } };
    });
  };

  const handleToggleSubMealOption = (mealOptionId, groupLabel, optionId, pickOne, isRequired) => {
    setSubMealState((prev) => {
      const entry = prev[mealOptionId] || { checkedIngredientIds: new Set(), requiredSelections: {}, optionalSelections: {} };
      const selKey = isRequired ? 'requiredSelections' : 'optionalSelections';
      const sel = entry[selKey];
      let updated;
      if (pickOne) {
        updated = { ...sel, [groupLabel]: sel[groupLabel] === optionId ? undefined : optionId };
      } else {
        const current = sel[groupLabel] instanceof Set ? new Set(sel[groupLabel]) : new Set();
        if (current.has(optionId)) current.delete(optionId); else current.add(optionId);
        updated = { ...sel, [groupLabel]: current };
      }
      return { ...prev, [mealOptionId]: { ...entry, [selKey]: updated } };
    });
  };

  // ── Validation (must be above null guard — hooks can't be conditional) ────

  const allRequiredSatisfied = useMemo(() => {
    // Top-level required choices
    for (const group of requiredChoices) {
      const sel = requiredSelections[group.label];
      if (!sel) return false;
      if (sel instanceof Set && sel.size === 0) return false;
    }

    // Sub-meal required choices for each selected meal-type option
    const allGroups = [...requiredChoices, ...optionalChoices];
    for (const group of allGroups) {
      const sel = group.label in requiredSelections ? requiredSelections[group.label] : optionalSelections[group.label];
      const selectedIds = sel instanceof Set ? [...sel] : sel ? [sel] : [];
      for (const optionId of selectedIds) {
        const option = group.options?.find(o => o.id === optionId);
        if (option?.type !== 'meal') continue;
        const subMeal = mealMapById.get(optionId);
        if (!subMeal) continue;
        const subState = subMealState[optionId] || {};
        for (const subGroup of (subMeal.requiredChoices || [])) {
          const subSel = subState.requiredSelections?.[subGroup.label];
          if (!subSel) return false;
          if (subSel instanceof Set && subSel.size === 0) return false;
        }
      }
    }
    return true;
  }, [requiredChoices, optionalChoices, requiredSelections, optionalSelections, subMealState, mealMapById]);

  // ── Build result ──────────────────────────────────────────────────────────

  const resolveSubMeal = (mealOptionId, subMeal) => {
    const subState = subMealState[mealOptionId] || {};
    const result = [];

    // Sub-meal base ingredients
    for (const ing of (subMeal.ingredients || [])) {
      const checked = subState.checkedIngredientIds instanceof Set
        ? subState.checkedIngredientIds.has(ing.ingredientId)
        : true;
      if (checked) result.push({ ingredientId: ing.ingredientId, name: ing.name, quantity: ing.quantity, unit: ing.unit });
    }

    // Sub-meal required choices (only ingredient-type; no further meal recursion)
    for (const group of (subMeal.requiredChoices || [])) {
      const sel = subState.requiredSelections?.[group.label];
      const ids = sel instanceof Set ? [...sel] : sel ? [sel] : [];
      for (const optId of ids) {
        const opt = group.options?.find(o => o.id === optId);
        if (opt?.type === 'ingredient') result.push({ ingredientId: opt.id, name: opt.name });
      }
    }

    // Sub-meal optional choices
    for (const group of (subMeal.optionalChoices || [])) {
      const sel = subState.optionalSelections?.[group.label];
      if (!(sel instanceof Set)) continue;
      for (const optId of sel) {
        const opt = group.options?.find(o => o.id === optId);
        if (opt?.type === 'ingredient') result.push({ ingredientId: opt.id, name: opt.name });
      }
    }

    return result;
  };

  const buildResolvedIngredients = () => {
    const result = [];

    // Base ingredients
    for (const ing of baseIngredients) {
      if (checkedBaseIds.has(ing.ingredientId)) {
        result.push({ ingredientId: ing.ingredientId, name: ing.name, quantity: ing.quantity, unit: ing.unit });
      }
    }

    // Required + optional choice selections
    for (const [groups, sel] of [[requiredChoices, requiredSelections], [optionalChoices, optionalSelections]]) {
      for (const group of groups) {
        const groupSel = sel[group.label];
        const selectedIds = groupSel instanceof Set ? [...groupSel] : groupSel ? [groupSel] : [];
        for (const optId of selectedIds) {
          const opt = group.options?.find(o => o.id === optId);
          if (!opt) continue;
          if (opt.type === 'ingredient') {
            result.push({ ingredientId: opt.id, name: opt.name });
          } else if (opt.type === 'meal') {
            const subMeal = mealMapById.get(optId);
            if (subMeal) result.push(...resolveSubMeal(optId, subMeal));
          }
        }
      }
    }

    // Legacy optionalAddOns
    for (const addOn of legacyAddOns) {
      if (checkedAddOnIds.has(addOn.ingredientId)) {
        result.push({ ingredientId: addOn.ingredientId, name: addOn.name, quantity: addOn.quantity, unit: addOn.unit });
      }
    }

    return result;
  };

  const handleConfirm = () => {
    onConfirm(buildResolvedIngredients());
  };

  // ── Sub-meal expansion renderer ───────────────────────────────────────────

  const renderSubMealExpansion = (mealOptionId) => {
    const subMeal = mealMapById.get(mealOptionId);
    if (!subMeal) return null;
    const subState = subMealState[mealOptionId] || {};

    return (
      <View style={styles.subMealContainer}>
        <Text style={styles.subMealHeader}>{subMeal.name} — Ingredients</Text>

        {(subMeal.ingredients || []).map((ing) => {
          const checked = subState.checkedIngredientIds instanceof Set
            ? subState.checkedIngredientIds.has(ing.ingredientId)
            : true;
          const label = ing.quantity && ing.unit ? `${ing.name} — ${ing.quantity} ${ing.unit}` : ing.name;
          return (
            <TouchableOpacity
              key={ing.ingredientId}
              style={[styles.row, styles.rowSub, checked ? styles.rowChecked : styles.rowUnchecked]}
              onPress={() => handleToggleSubMealIngredient(mealOptionId, ing.ingredientId)}
              activeOpacity={0.8}
            >
              <Ionicons name={checked ? "checkbox" : "square-outline"} size={18} color={checked ? theme.primary : theme.text.secondary} />
              <Text style={styles.rowText}>{label}</Text>
            </TouchableOpacity>
          );
        })}

        {(subMeal.requiredChoices || []).map((group) => (
          <View key={group.label}>
            <Text style={styles.subGroupLabel}>{group.label} <Text style={styles.requiredBadge}>Required</Text></Text>
            {(group.options || []).map((opt) => {
              const subSel = subState.requiredSelections?.[group.label];
              const selected = group.pickOne ? subSel === opt.id : (subSel instanceof Set && subSel.has(opt.id));
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.row, styles.rowSub, selected ? styles.rowChecked : styles.rowUnchecked]}
                  onPress={() => handleToggleSubMealOption(mealOptionId, group.label, opt.id, group.pickOne, true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={selected ? (group.pickOne ? "radio-button-on" : "checkbox") : (group.pickOne ? "radio-button-off" : "square-outline")} size={18} color={selected ? theme.primary : theme.text.secondary} />
                  <Text style={styles.rowText}>{opt.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {(subMeal.optionalChoices || []).map((group) => (
          <View key={group.label}>
            <Text style={styles.subGroupLabel}>{group.label}</Text>
            {(group.options || []).map((opt) => {
              const subSel = subState.optionalSelections?.[group.label];
              const selected = group.pickOne ? subSel === opt.id : (subSel instanceof Set && subSel.has(opt.id));
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.row, styles.rowSub, selected ? styles.rowChecked : styles.rowUnchecked]}
                  onPress={() => handleToggleSubMealOption(mealOptionId, group.label, opt.id, group.pickOne, false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={selected ? "checkbox" : "square-outline"} size={18} color={selected ? theme.primary : theme.text.secondary} />
                  <Text style={styles.rowText}>{opt.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  // ── Choice group renderer ─────────────────────────────────────────────────

  const renderChoiceGroup = (group, isRequired) => {
    const metaText = isRequired
      ? group.pickOne ? 'Required — pick one' : 'Required — pick one or more'
      : group.pickOne ? 'Optional — pick one' : 'Optional — pick any';

    return (
      <View key={group.label}>
        <Text style={styles.sectionTitle}>{group.label}</Text>
        <Text style={styles.sectionMeta}>{metaText}</Text>

        {(group.options || []).map((opt) => {
          const selected = isOptionSelected(group.label, opt.id, isRequired);
          const isMealType = opt.type === 'meal';
          return (
            <View key={opt.id}>
              <TouchableOpacity
                style={[styles.row, selected ? styles.rowChecked : styles.rowUnchecked]}
                onPress={() => handleToggleOption(group.label, opt.id, group.pickOne, isRequired)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={selected
                    ? group.pickOne ? 'radio-button-on' : 'checkbox'
                    : group.pickOne ? 'radio-button-off' : 'square-outline'}
                  size={20}
                  color={selected ? theme.primary : theme.text.secondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>{opt.name}</Text>
                  {isMealType && <Text style={styles.rowSubText}>Meal</Text>}
                </View>
                {isMealType && selected && (
                  <Ionicons name="chevron-down" size={16} color={theme.text.secondary} />
                )}
              </TouchableOpacity>

              {isMealType && selected && renderSubMealExpansion(opt.id)}
            </View>
          );
        })}
      </View>
    );
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const styles = StyleSheet.create({
    flex: { flex: 1 },
    overlay: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      width: '100%',
      flex: 1,
      overflow: 'hidden',
    },
    scrollContent: {
      paddingHorizontal: getSpacing.lg,
      paddingBottom: getSpacing.xl,
    },
    sectionTitle: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '700',
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.md,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.md,
      borderWidth: 1.5,
      marginBottom: getSpacing.xs,
    },
    rowSub: {
      marginLeft: getSpacing.lg,
    },
    rowChecked: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
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
    subMealContainer: {
      marginLeft: getSpacing.lg,
      marginTop: getSpacing.xs,
      marginBottom: getSpacing.sm,
      paddingLeft: getSpacing.md,
      borderLeftWidth: 2,
      borderLeftColor: theme.primary + '40',
    },
    subMealHeader: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: '700',
      color: theme.primary,
      marginBottom: getSpacing.xs,
    },
    subGroupLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      marginTop: getSpacing.sm,
      marginBottom: getSpacing.xs,
    },
    requiredBadge: {
      color: theme.error,
      fontWeight: '400',
    },
    addOnMeta: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.sm,
    },
  });

  if (!meal) return null;

  return (
    <ModalWrapper visible={visible} onClose={onCancel}>
      <View style={styles.overlay} pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%', height: '85%' }}
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
              {/* Base ingredients */}
              {baseIngredients.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Ingredients</Text>
                  <Text style={styles.sectionMeta}>Uncheck anything you already have</Text>
                  {baseIngredients.map((ing) => {
                    const checked = checkedBaseIds.has(ing.ingredientId);
                    const label = ing.quantity && ing.unit
                      ? `${ing.name} — ${ing.quantity} ${ing.unit}`
                      : ing.name;
                    return (
                      <TouchableOpacity
                        key={ing.ingredientId}
                        style={[styles.row, checked ? styles.rowChecked : styles.rowUnchecked]}
                        onPress={() => setCheckedBaseIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(ing.ingredientId)) next.delete(ing.ingredientId); else next.add(ing.ingredientId);
                          return next;
                        })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={20} color={checked ? theme.primary : theme.text.secondary} />
                        <Text style={styles.rowText}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Required choices */}
              {requiredChoices.map((group) => renderChoiceGroup(group, true))}

              {/* Optional choices */}
              {optionalChoices.map((group) => renderChoiceGroup(group, false))}

              {/* Legacy optionalAddOns */}
              {legacyAddOns.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Optional Add-ons</Text>
                  <Text style={styles.addOnMeta}>Check anything you'd like to add</Text>
                  {legacyAddOns.map((addOn) => {
                    const checked = checkedAddOnIds.has(addOn.ingredientId);
                    const label = addOn.quantity && addOn.unit
                      ? `${addOn.name} — ${addOn.quantity} ${addOn.unit}`
                      : addOn.name;
                    return (
                      <TouchableOpacity
                        key={addOn.ingredientId}
                        style={[styles.row, checked ? styles.rowChecked : styles.rowUnchecked]}
                        onPress={() => setCheckedAddOnIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(addOn.ingredientId)) next.delete(addOn.ingredientId); else next.add(addOn.ingredientId);
                          return next;
                        })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={20} color={checked ? theme.primary : theme.text.secondary} />
                        <Text style={styles.rowText}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModalWrapper>
  );
};

export default MealOptionPicker;
