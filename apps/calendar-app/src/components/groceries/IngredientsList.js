import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const IngredientsList = ({ 
  ingredients = [], 
  onDelete = null, 
  onAdd = null,
  showAddButton = true,
  emptyText = "No ingredients added"
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      padding: getSpacing.md,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: getSpacing.sm,
    },
    title: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    addButton: {
      padding: getSpacing.xs,
    },
    ingredientsWrapper: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: getSpacing.sm,
    },
    ingredientChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary + '20',
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      borderRadius: getBorderRadius.full,
    },
    ingredientText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
      marginRight: getSpacing.xs,
    },
    deleteButton: {
      padding: 2,
    },
    emptyText: {
      color: theme.text.secondary,
      fontSize: getTypography.body.fontSize,
      fontStyle: 'italic',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ingredients</Text>
        {showAddButton && onAdd && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAdd}
          >
            <Ionicons name="add-circle" size={24} color={theme.primary} />
          </TouchableOpacity>
        )}
      </View>

      {ingredients.length > 0 ? (
        <View style={styles.ingredientsWrapper}>
          {ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientChip}>
              <Text style={styles.ingredientText}>
                {ingredient.quantity} {ingredient.unit} {ingredient.name}
              </Text>
              {onDelete && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => onDelete(index)}
                >
                  <Ionicons name="close-circle" size={16} color={theme.primary} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>{emptyText}</Text>
      )}
    </View>
  );
};

export default IngredientsList;