import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { ModalWrapper, ModalHeader } from "@my-apps/ui";
import MealIngredientRow from "./MealIngredientRow";
import MealOptionGroupEditor from "./MealOptionGroupEditor";
import useMeals from "../../hooks/useMeals";

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Admin-only modal for creating or editing a meal.
 *
 * Props:
 *   visible  {boolean}
 *   meal     {object|null}  - null = create mode
 *   onClose  {function}
 */
const MealEditorModal = ({ visible, meal, onClose }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { meals, saveMeal, deleteMeal } = useMeals();

  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [optionGroups, setOptionGroups] = useState([]);

  // Sync state when modal opens or meal changes
  useEffect(() => {
    if (visible) {
      setName(meal?.name || "");
      setIngredients(meal?.ingredients || []);
      setOptionGroups(meal?.optionGroups || []);
    }
  }, [visible, meal?.id]);

  const handleAddIngredient = () => {
    setIngredients((prev) => [...prev, { id: uuid(), name: "", quantity: undefined }]);
  };

  const handleChangeIngredient = (updated) => {
    setIngredients((prev) =>
      prev.map((ing) => (ing.id === updated.id ? updated : ing))
    );
  };

  const handleDeleteIngredient = (id) => {
    setIngredients((prev) => prev.filter((ing) => ing.id !== id));
  };

  const handleAddOptionGroup = () => {
    setOptionGroups((prev) => [
      ...prev,
      { id: uuid(), label: "", required: false, choices: [] },
    ]);
  };

  const handleChangeOptionGroup = (updated) => {
    setOptionGroups((prev) =>
      prev.map((g) => (g.id === updated.id ? updated : g))
    );
  };

  const handleDeleteOptionGroup = (id) => {
    setOptionGroups((prev) => prev.filter((g) => g.id !== id));
  };

  // Firestore rejects undefined values — strip them recursively
  const cleanForFirestore = (obj) => {
    if (Array.isArray(obj)) return obj.map(cleanForFirestore);
    if (obj !== null && typeof obj === "object") {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) out[k] = cleanForFirestore(v);
      }
      return out;
    }
    return obj;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter a meal name.");
      return;
    }
    const isNew = !meal?.id;
    const mealData = cleanForFirestore({
      id: meal?.id || uuid(),
      name: name.trim(),
      ingredients,
      optionGroups,
      sortOrder: isNew ? meals.length : (meal.sortOrder ?? meals.length),
      createdAt: meal?.createdAt || new Date().toISOString(),
    });
    try {
      await saveMeal(mealData);
      onClose();
    } catch (e) {
      console.error("❌ Failed to save meal:", e);
      Alert.alert("Save Failed", e?.message || "Could not save the meal. Check Firestore rules.");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Meal",
      `Are you sure you want to delete "${name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteMeal(meal.id);
            onClose();
          },
        },
      ]
    );
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
    sectionHeader: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "700",
      color: theme.text.secondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: getSpacing.lg,
      marginBottom: getSpacing.xs,
    },
    nameInput: {
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      backgroundColor: theme.surface,
      marginTop: getSpacing.md,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
      paddingVertical: getSpacing.sm,
      marginTop: getSpacing.xs,
    },
    addButtonText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.primary,
    },
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: getSpacing.xs,
      marginTop: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderRadius: getBorderRadius.md,
      borderWidth: 1.5,
      borderColor: theme.error,
    },
    deleteButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.error,
    },
    emptyText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
      fontStyle: "italic",
      paddingVertical: getSpacing.xs,
    },
  });

  return (
    <ModalWrapper visible={visible} onClose={onClose}>
      <View style={styles.overlay} pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%", height: "90%" }}
        >
          <View style={styles.container}>
            <ModalHeader
              title={meal?.id ? "Edit Meal" : "New Meal"}
              onCancel={onClose}
              cancelText="Cancel"
              onDone={handleSave}
              doneText={meal?.id ? "Update" : "Create"}
            />

            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sectionHeader}>Meal Name</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Pasta with Sauce"
                placeholderTextColor={theme.text.tertiary}
                autoCorrect={false}
                autoCapitalize="words"
              />

              <Text style={styles.sectionHeader}>Base Ingredients</Text>
              {ingredients.length === 0 && (
                <Text style={styles.emptyText}>No base ingredients yet.</Text>
              )}
              {ingredients.map((ing) => (
                <MealIngredientRow
                  key={ing.id}
                  ingredient={ing}
                  onChange={handleChangeIngredient}
                  onDelete={() => handleDeleteIngredient(ing.id)}
                />
              ))}
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddIngredient}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                <Text style={styles.addButtonText}>Add Ingredient</Text>
              </TouchableOpacity>

              <Text style={styles.sectionHeader}>Option Groups</Text>
              {optionGroups.length === 0 && (
                <Text style={styles.emptyText}>No option groups yet.</Text>
              )}
              {optionGroups.map((group) => (
                <MealOptionGroupEditor
                  key={group.id}
                  group={group}
                  onChange={handleChangeOptionGroup}
                  onDelete={() => handleDeleteOptionGroup(group.id)}
                />
              ))}
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddOptionGroup}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                <Text style={styles.addButtonText}>Add Option Group</Text>
              </TouchableOpacity>

              {meal?.id && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.error} />
                  <Text style={styles.deleteButtonText}>Delete Meal</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModalWrapper>
  );
};

export default MealEditorModal;
