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
import { useIngredients } from "@my-apps/hooks";
import { STORES } from "./groceryConstants";

const KNOWN_CATEGORIES = ["produce", "meat", "dairy", "bakery", "frozen", "canned", "beverages", "snacks", "other"];

const IngredientEditorModal = ({ visible, ingredient, onClose }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { ingredients, addIngredient, updateIngredient, deleteIngredient } = useIngredients();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [customCategory, setCustomCategory] = useState("");
  const [unavailableAt, setUnavailableAt] = useState([]);
  const [saving, setSaving] = useState(false);

  const isNew = !ingredient?.id;

  useEffect(() => {
    if (visible) {
      setName(ingredient?.name || "");
      const cat = ingredient?.category || "other";
      if (KNOWN_CATEGORIES.includes(cat)) {
        setCategory(cat);
        setCustomCategory("");
      } else {
        setCategory("custom");
        setCustomCategory(cat || "");
      }
      setUnavailableAt(ingredient?.unavailableAt || []);
    }
  }, [visible, ingredient?.id]);

  const resolvedCategory = category === "custom" ? customCategory.trim() || "other" : category;

  const toggleStore = (store) => {
    setUnavailableAt((prev) =>
      prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter an ingredient name.");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await addIngredient(name.trim(), resolvedCategory);
      } else {
        await updateIngredient(ingredient.id, {
          name: name.trim(),
          category: resolvedCategory,
          unavailableAt,
        });
      }
      onClose();
    } catch (e) {
      console.error("❌ Failed to save ingredient:", e);
      Alert.alert("Save Failed", e?.message || "Could not save the ingredient.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Ingredient",
      `Delete "${name}"? This won't remove it from existing grocery lists.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteIngredient(ingredient.id);
              onClose();
            } catch (e) {
              Alert.alert("Delete Failed", e?.message || "Could not delete the ingredient.");
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    flex: { flex: 1 },
    overlay: {
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
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
    input: {
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      backgroundColor: theme.surface,
      marginTop: getSpacing.xs,
    },
    categoryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: getSpacing.sm,
      marginTop: getSpacing.sm,
    },
    categoryChip: {
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.full || 999,
      borderWidth: 1.5,
    },
    categoryChipText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    storeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    storeName: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    storeUnavailable: {
      color: theme.error,
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
  });

  return (
    <ModalWrapper visible={visible} onClose={onClose}>
      <View style={styles.overlay} pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%", height: "85%" }}
        >
          <View style={styles.container}>
            <ModalHeader
              title={isNew ? "New Ingredient" : "Edit Ingredient"}
              onCancel={onClose}
              cancelText="Cancel"
              onDone={handleSave}
              doneText={saving ? "Saving…" : isNew ? "Add" : "Save"}
            />

            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sectionHeader}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Chicken Breast"
                placeholderTextColor={theme.text.tertiary}
                autoCorrect={false}
                autoCapitalize="words"
                autoFocus={isNew}
              />

              <Text style={styles.sectionHeader}>Category</Text>
              <View style={styles.categoryRow}>
                {KNOWN_CATEGORIES.map((cat) => {
                  const active = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: active ? theme.primary : theme.surface,
                          borderColor: active ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: active ? "#fff" : theme.text.secondary },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: category === "custom" ? theme.primary : theme.surface,
                      borderColor: category === "custom" ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setCategory("custom")}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: category === "custom" ? "#fff" : theme.text.secondary },
                    ]}
                  >
                    custom…
                  </Text>
                </TouchableOpacity>
              </View>
              {category === "custom" && (
                <TextInput
                  style={[styles.input, { marginTop: getSpacing.sm }]}
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder="Enter category name"
                  placeholderTextColor={theme.text.tertiary}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
              )}

              <Text style={styles.sectionHeader}>Unavailable At</Text>
              {STORES.map((store) => {
                const unavailable = unavailableAt.includes(store);
                return (
                  <TouchableOpacity
                    key={store}
                    style={styles.storeRow}
                    onPress={() => toggleStore(store)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.storeName, unavailable && styles.storeUnavailable]}>
                      {store}
                    </Text>
                    <Ionicons
                      name={unavailable ? "close-circle" : "checkmark-circle-outline"}
                      size={22}
                      color={unavailable ? theme.error : theme.text.tertiary}
                    />
                  </TouchableOpacity>
                );
              })}

              {!isNew && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.error} />
                  <Text style={styles.deleteButtonText}>Delete Ingredient</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModalWrapper>
  );
};

export default IngredientEditorModal;
