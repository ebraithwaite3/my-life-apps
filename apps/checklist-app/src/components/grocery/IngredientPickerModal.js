import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";

/**
 * Bottom-sheet ingredient picker.
 *
 * Props:
 *   visible        {boolean}
 *   onClose        {function}
 *   onSelect       {function(ingredient)} - called with { id, name, category }
 *   allIngredients {array}
 *   addIngredient  {function} async (name, category?) => ingredient
 */
const IngredientPickerModal = ({ visible, onClose, onSelect, allIngredients = [], addIngredient }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allIngredients.slice(0, 40);
    return allIngredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [search, allIngredients]);

  const exactMatch = results.some(
    (i) => i.name.toLowerCase() === search.trim().toLowerCase()
  );

  const handleSelect = (ingredient) => {
    onSelect(ingredient);
    setSearch("");
  };

  const handleCreate = async () => {
    const name = search.trim();
    if (!name || !addIngredient) return;
    setCreating(true);
    try {
      const newIng = await addIngredient(name, null);
      handleSelect(newIng);
    } catch {
      Alert.alert("Error", "Could not create ingredient.");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: getBorderRadius.lg,
      borderTopRightRadius: getBorderRadius.lg,
      maxHeight: "70%",
      minHeight: 300,
      paddingBottom: getSpacing.xl,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: theme.text.primary,
    },
    searchContainer: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.sm,
    },
    searchInput: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    itemName: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    itemCategory: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
      textTransform: "capitalize",
    },
    createRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
    },
    createText: {
      fontSize: getTypography.body.fontSize,
      color: theme.primary,
      fontWeight: "600",
    },
    emptyText: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      fontStyle: "italic",
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
              <View style={styles.header}>
                <Text style={styles.title}>Select Ingredient</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={theme.text.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search ingredients…"
                  placeholderTextColor={theme.text.tertiary}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </View>

              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="always"
                style={{ flexShrink: 1 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
                    <Ionicons name="leaf-outline" size={16} color={theme.primary} />
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.category && (
                      <Text style={styles.itemCategory}>{item.category}</Text>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  search.trim().length === 0 ? null : (
                    <Text style={styles.emptyText}>No matches found.</Text>
                  )
                }
                ListFooterComponent={
                  search.trim().length > 0 && !exactMatch ? (
                    <TouchableOpacity
                      style={styles.createRow}
                      onPress={handleCreate}
                      disabled={creating}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
                      <Text style={styles.createText}>
                        {creating ? "Creating…" : `Add "${search.trim()}" as new ingredient`}
                      </Text>
                    </TouchableOpacity>
                  ) : null
                }
              />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default IngredientPickerModal;
