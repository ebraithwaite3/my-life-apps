import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import FoodBankItem from './FoodBankItem';
import AddItemModal from './AddItemModal';
import EditItemModal from './EditItemModal';

const CategorySection = ({
  category,
  items,
  allCategories,
  foodBank,
  onUpdateFoodBank,
  onDeleteCategory,
  onRenameCategory,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [addItemVisible, setAddItemVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const capitalize = (str) => {
    const withSpaces = str.replace(/([A-Z])/g, ' $1').trim();
    return withSpaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper Function: Add new ingredients to food bank if they don't exist
const addNewIngredientsToFoodBank = (ingredients, currentFoodBank) => {
  if (!ingredients || ingredients.length === 0) return currentFoodBank;

  let updatedBank = { ...currentFoodBank };
  
  ingredients.forEach(ingredient => {
    // Check if this ingredient ID exists anywhere in the food bank
    const existsInBank = Object.values(currentFoodBank).some(categoryItems => 
      Array.isArray(categoryItems) && categoryItems.some(item => item.id === ingredient.id)
    );

    // If it doesn't exist, add it to the food bank
    if (!existsInBank && ingredient.category) {
      const ingredientCategory = ingredient.category;
      
      // Create the ingredient item for the food bank (strip out quantity/unit which are recipe-specific)
      const foodBankItem = {
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit || 'count',
        autoAdd: false,
        autoAddAt: 0,
        restockAmount: 1,
      };

      // Add to the appropriate category
      if (!updatedBank[ingredientCategory]) {
        updatedBank[ingredientCategory] = [];
      }
      updatedBank[ingredientCategory] = [...updatedBank[ingredientCategory], foodBankItem];
    }
  });

  return updatedBank;
};

  // Sort items: favorites first, then alphabetically
  const sortedItems = [...items].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleAddItem = (itemData) => {
    // First, add any new ingredients to the food bank
    let updatedBank = addNewIngredientsToFoodBank(itemData.ingredients, foodBank);
    
    // Then add the item to this category
    updatedBank = {
      ...updatedBank,
      [category]: [...(updatedBank[category] || []), itemData]
    };
    
    onUpdateFoodBank(updatedBank);
  };
  
  const handleUpdateItem = (itemId, updatedItem) => {
    // First, add any new ingredients to the food bank
    let updatedBank = addNewIngredientsToFoodBank(updatedItem.ingredients, foodBank);
    
    // Then update the item in this category
    updatedBank = {
      ...updatedBank,
      [category]: (updatedBank[category] || []).map(item => 
        item.id === itemId ? updatedItem : item
      )
    };
    
    onUpdateFoodBank(updatedBank);
  };

  const handleDeleteItem = (itemId) => {
    const itemToDelete = items.find(item => item.id === itemId);
    
    Alert.alert(
      'Delete Item',
      `Delete "${itemToDelete?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newBank = {
              ...foodBank,
              [category]: items.filter(item => item.id !== itemId)
            };
            onUpdateFoodBank(newBank);
          }
        }
      ]
    );
  };

  const handleRename = () => {
    Alert.prompt(
      'Rename Category',
      `Enter new name for "${capitalize(category)}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rename',
          onPress: (newName) => {
            if (newName && newName.trim()) {
              onRenameCategory(category, newName.trim().toLowerCase());
            }
          }
        }
      ],
      'plain-text',
      category
    );
  };

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: getSpacing.md,
      marginVertical: getSpacing.sm,
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: showMenu ? 'visible' : 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: getSpacing.md,
      backgroundColor: theme.surface,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      marginLeft: getSpacing.sm,
    },
    itemCount: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
      marginLeft: getSpacing.xs,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    content: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: getSpacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    addButtonText: {
      color: theme.primary,
      fontSize: getTypography.body.fontSize,
      marginLeft: getSpacing.sm,
      fontWeight: '500',
    },
    menuOverlay: {
      position: 'absolute',
      right: getSpacing.md,
      top: 50,
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 1001,
    },
    menuBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: getSpacing.md,
      minWidth: 150,
    },
    menuItemText: {
      color: theme.text.primary,
      fontSize: getTypography.body.fontSize,
      marginLeft: getSpacing.sm,
    },
    menuItemDanger: {
      color: theme.error,
    },
    emptyState: {
      padding: getSpacing.lg,
      alignItems: 'center',
    },
    emptyText: {
      color: theme.text.secondary,
      fontSize: getTypography.body.fontSize,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color={theme.text.secondary}
          />
          <Text style={styles.headerTitle}>
            {capitalize(category)}
            <Text style={styles.itemCount}> ({items.length})</Text>
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.text.secondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Menu */}
      {showMenu && (
        <>
          <TouchableOpacity
            style={styles.menuBackdrop}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          />
          <View style={styles.menuOverlay}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleRename();
              }}
            >
              <Ionicons name="create-outline" size={20} color={theme.text.primary} />
              <Text style={styles.menuItemText}>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onDeleteCategory(category);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={theme.error} />
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Content */}
      {expanded && (
        <View style={styles.content}>
          {sortedItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items yet</Text>
            </View>
          ) : (
            sortedItems.map((item) => (
              <FoodBankItem
                key={item.id}
                item={item}
                onEdit={() => setEditingItem(item)}
                onDelete={() => handleDeleteItem(item.id)}
                onToggleFavorite={() => {
                  handleUpdateItem(item.id, {
                    ...item,
                    favorite: !item.favorite
                  });
                }}
              />
            ))
          )}
          
          {/* Add Item Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setAddItemVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
            <Text style={styles.addButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Item Modal */}
      <AddItemModal
        visible={addItemVisible}
        onClose={() => setAddItemVisible(false)}
        onAdd={handleAddItem}
        allCategories={allCategories}
        foodBank={foodBank}
      />

      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          visible={true}
          item={editingItem}
          allCategories={allCategories}
          foodBank={foodBank}
          onClose={() => setEditingItem(null)}
          onSave={(updatedItem) => {
            handleUpdateItem(editingItem.id, updatedItem);
            setEditingItem(null);
          }}
        />
      )}
    </View>
  );
};

export default CategorySection;