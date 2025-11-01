import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import CategorySection from '../components/groceries/CategorySection';
import AddCategoryModal from '../components/groceries/AddCategoryModal';
import { useGroceryActions } from '../hooks';

const GroceryBankScreen = ({ navigation }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { groceries, groceriesLoading } = useData();
  const { updateGroceryBank } = useGroceryActions();
  const [foodBank, setFoodBank] = useState({});
  const [addCategoryVisible, setAddCategoryVisible] = useState(false);

  useEffect(() => {
    if (groceries?.foodBank) {
      setFoodBank(groceries.foodBank);
    }
  }, [groceries?.foodBank]);

  const categories = Object.keys(foodBank).filter(key => Array.isArray(foodBank[key]));

  const capitalize = (str) => {
    // Handle camelCase: split on uppercase letters and join with spaces
    const withSpaces = str.replace(/([A-Z])/g, ' $1').trim();
    // Capitalize each word
    return withSpaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const toCamelCase = (str) => {
    // Remove extra spaces and split into words
    const words = str.trim().split(/\s+/);
    
    // First word is lowercase, rest are capitalized
    return words
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  };

  const handleUpdateFoodBank = async (updatedBank) => {
    setFoodBank(updatedBank);
    try {
      await updateGroceryBank({ foodBank: updatedBank });
    } catch (error) {
      console.error('Error saving food bank:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleAddCategory = (categoryName) => {
    // categoryName is already in camelCase from the modal
    const newBank = {
      ...foodBank,
      [categoryName]: []
    };
    handleUpdateFoodBank(newBank);
  };

  const handleDeleteCategory = (categoryName) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${capitalize(categoryName)}"? All items will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newBank = { ...foodBank };
            delete newBank[categoryName];
            handleUpdateFoodBank(newBank);
          }
        }
      ]
    );
  };

  const handleRenameCategory = (oldName, newName) => {
    if (foodBank[newName]) {
      Alert.alert('Error', 'Category already exists');
      return;
    }
    const newBank = { ...foodBank };
    newBank[newName] = newBank[oldName];
    delete newBank[oldName];
    handleUpdateFoodBank(newBank);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    actionButton: {
      padding: getSpacing.sm,
    },
    content: {
      flex: 1,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: getSpacing.xl,
    },
    emptyText: {
      color: theme.text.secondary,
      fontSize: getTypography.body.fontSize,
      textAlign: 'center',
      marginTop: getSpacing.md,
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
              <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Grocery Bank</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="hourglass-outline" size={48} color={theme.text.secondary} />
          <Text style={styles.emptyText}>Loading...</Text>
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
          <Text style={styles.headerTitle}>Grocery Bank</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setAddCategoryVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={28} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="basket-outline" size={64} color={theme.text.secondary} />
            <Text style={styles.emptyText}>
              No categories yet.{'\n'}Tap the + button to add your first category.
            </Text>
          </View>
        ) : (
          categories.map(category => (
            <CategorySection
              key={category}
              category={category}
              items={foodBank[category]}
              allCategories={categories}
              foodBank={foodBank}
              onUpdateFoodBank={handleUpdateFoodBank}
              onDeleteCategory={handleDeleteCategory}
              onRenameCategory={handleRenameCategory}
            />
          ))
        )}
      </ScrollView>

      {/* Add Category Modal */}
      <AddCategoryModal
        visible={addCategoryVisible}
        onClose={() => setAddCategoryVisible(false)}
        onAdd={handleAddCategory}
        existingCategories={categories}
      />
    </SafeAreaView>
  );
};

export default GroceryBankScreen;