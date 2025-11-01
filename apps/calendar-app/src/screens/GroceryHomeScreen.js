import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";

const GroceryHomeScreen = ({ navigation }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { groceries, groceriesLoading } = useData();
  console.log("GROCERIES IN GROCERY HOME SCREEN:", groceries);

  // Count the number of items in the foodBank (in each category for a total)
  const foodBankItemCount = useMemo(() => {
    if (!groceries?.foodBank) return 0;
    return Object.values(groceries.foodBank).reduce(
      (sum, category) => sum + (category?.length || 0),
      0
    );
  }, [groceries?.foodBank]);
  console.log("FOOD BANK ITEM COUNT:", foodBankItemCount);

  const inventoryCount = useMemo(() => {
    if (!groceries?.inventory) return 0;
    return Object.keys(groceries.inventory).length;
  }, [groceries?.inventory]);

  const mealsCount = useMemo(
    () => groceries?.meals?.length || 0,
    [groceries?.meals]
  );
  
  const shoppingListCount = useMemo(
    () => groceries?.shoppingList?.length || 0,
    [groceries?.shoppingList]
  );

  const sections = [
    {
      id: "bank",
      title: "Grocery Bank",
      icon: "basket",
      count: foodBankItemCount,
      route: "GroceryBank",
      color: theme.primary,
    },
    {
      id: "inventory",
      title: "Inventory",
      icon: "cube",
      count: inventoryCount,
      route: "GroceryInventory",
      color: "#4CAF50",
    },
    {
      id: "meals",
      title: "Meals",
      icon: "restaurant",
      count: mealsCount,
      route: "GroceryMeals",
      color: "#FF9800",
    },
    {
      id: "shopping",
      title: "Shopping List",
      icon: "cart",
      count: shoppingListCount,
      route: "GroceryShoppingList",
      color: "#2196F3",
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    backButton: {
      marginRight: getSpacing.md,
      padding: getSpacing.sm,
    },
    headerTitle: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
    },
    actionButton: {
      padding: getSpacing.sm,
      borderRadius: getBorderRadius.sm,
    },
    content: {
      flex: 1,
      padding: getSpacing.lg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.md,
    },
    sectionCard: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      padding: getSpacing.lg,
      marginBottom: getSpacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sectionLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    iconContainer: {
      width: 50,
      height: 50,
      borderRadius: getBorderRadius.md,
      justifyContent: "center",
      alignItems: "center",
      marginRight: getSpacing.md,
    },
    sectionInfo: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: getTypography.h4.fontWeight,
      color: theme.text.primary,
      marginBottom: 4,
    },
    sectionCount: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
    },
    chevronContainer: {
      padding: getSpacing.sm,
    },
  });

  if (groceriesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation?.goBack()}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.text.primary}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Groceries</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons
            name="hourglass-outline"
            size={48}
            color={theme.text.secondary}
          />
          <Text style={styles.loadingText}>Loading groceries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Groceries</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Add action buttons here if needed */}
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {sections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={styles.sectionCard}
            onPress={() => navigation?.navigate(section.route)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: section.color + "20" },
                ]}
              >
                <Ionicons name={section.icon} size={28} color={section.color} />
              </View>
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>
                  {section.count} {section.count === 1 ? "item" : "items"}
                </Text>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={theme.text.secondary}
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default GroceryHomeScreen;
