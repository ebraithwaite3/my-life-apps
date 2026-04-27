import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { PageHeader } from "@my-apps/ui";
import { useIngredients } from "@my-apps/hooks";
import IngredientEditorModal from "./IngredientEditorModal";

const CATEGORY_ORDER = ["produce", "meat", "dairy", "other"];

const IngredientsManagementView = ({ onClose }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { ingredients, ingredientsByCategory, loading } = useIngredients();

  const [search, setSearch] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  const filteredByCategory = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = q
      ? { results: ingredients.filter((i) => i.name?.toLowerCase().includes(q)) }
      : ingredientsByCategory;

    if (q) return [{ category: "results", items: source.results }];

    const categories = Object.keys(source).sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return categories.map((cat) => ({ category: cat, items: source[cat] || [] }));
  }, [ingredients, ingredientsByCategory, search]);

  const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.background },
    searchContainer: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
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
    scrollContent: {
      paddingBottom: getSpacing.xl * 2,
    },
    categoryHeader: {
      paddingHorizontal: getSpacing.lg,
      paddingTop: getSpacing.lg,
      paddingBottom: getSpacing.xs,
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "700",
      color: theme.text.secondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      gap: getSpacing.md,
    },
    iconContainer: {
      width: 34,
      height: 34,
      borderRadius: getBorderRadius.md,
      backgroundColor: theme.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    name: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    badge: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
    },
    separator: { height: 1, backgroundColor: theme.border, marginLeft: getSpacing.lg + 34 + getSpacing.md },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: getSpacing.xl * 2,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: "center",
      marginTop: getSpacing.md,
    },
  });

  return (
    <View style={styles.flex}>
      <PageHeader
        title="Ingredients"
        showBackButton
        onBackPress={onClose}
        icons={[
          {
            icon: "add",
            action: () => { setSelectedIngredient(null); setShowEditor(true); },
          },
        ]}
      />

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

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : ingredients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="leaf-outline" size={48} color={theme.text.secondary} />
          <Text style={styles.emptyText}>No ingredients yet.{"\n"}Tap + to add one.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {filteredByCategory.map(({ category, items }) => (
            <View key={category}>
              <Text style={styles.categoryHeader}>
                {category === "results" ? `${items.length} result${items.length !== 1 ? "s" : ""}` : category}
              </Text>
              {items.map((ingredient, idx) => (
                <View key={ingredient.id}>
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => { setSelectedIngredient(ingredient); setShowEditor(true); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconContainer}>
                      <Ionicons name="leaf-outline" size={16} color={theme.primary} />
                    </View>
                    <Text style={styles.name}>{ingredient.name}</Text>
                    {ingredient.unavailableAt?.length > 0 && (
                      <Text style={styles.badge}>⚠️ {ingredient.unavailableAt.length}</Text>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={theme.text.secondary} />
                  </TouchableOpacity>
                  {idx < items.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <IngredientEditorModal
        visible={showEditor}
        ingredient={selectedIngredient}
        onClose={() => { setShowEditor(false); setSelectedIngredient(null); }}
      />
    </View>
  );
};

export default IngredientsManagementView;
