// MealsSection.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import MealCard from './MealCard';
import { useGroceryActions } from '../../hooks';

const MealsSection = ({ items, checkedItems, onDelete }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { addMealToMeals } = useGroceryActions();
  const [expanded, setExpanded] = useState(false);

  // Function that takes an item, gathers its ingredients, and checks how many (and if ALL) are checked off
  const countCheckedIngredients = (meal) => {
    if (!meal.ingredients || meal.ingredients.length === 0) {
      return { checkedCount: 0, totalCount: 0, allChecked: false };
    }

    const totalCount = meal.ingredients.length;
    let checkedCount = 0;

    meal.ingredients.forEach((ingredient) => {
      if (checkedItems.some((checkedItem) => checkedItem.id === ingredient.id)) {
        checkedCount += 1;
      }
    });

    return {
      checkedCount,
      totalCount,
      allChecked: checkedCount === totalCount,
    };
  };

  // Count how many meals have all ingredients checked
  const fullyCheckedMealsCount = items.filter(item => 
    countCheckedIngredients(item).allChecked
  ).length;

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: getSpacing.md,
      marginVertical: getSpacing.sm,
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
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
    content: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
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
            Meals
            <Text style={styles.itemCount}> ({fullyCheckedMealsCount}/{items.length})</Text>
          </Text>
        </View>
      </TouchableOpacity>

      {/* Content */}
      {expanded && (
        <View style={styles.content}>
          {items.map((item) => (
            <MealCard 
                key={item.id} 
                item={item}
                checkedInfo={countCheckedIngredients(item)}
                onDelete={onDelete}
                onClearMeal={(itemId, itemData) => {
                    console.log('Clear meal from MealsSection:', itemId, itemData);
                    // You can handle the clear logic here or pass it up to the parent screen if needed
                    addMealToMeals(itemData);
                    onDelete(itemId);
                  }}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default MealsSection;