// MealCard.js
import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const MealCard = ({ item, checkedInfo, onDelete, onClearMeal }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const swipeableRef = useRef(null);
  console.log("MealCard checkedInfo:", checkedInfo);

  const ingredientCount = item.ingredients?.length || 0;
  const allChecked = checkedInfo?.allChecked || false;
  const greenColor = '#10B981';

  const closeSwipeable = () => {
    swipeableRef.current?.close();
  };

  const handleDelete = () => {
    console.log('Delete meal:', item);
    if (onDelete) {
      onDelete(item.id, item);
    }
  };

  const handleClearMeal = () => {
    console.log('Clear meal:', item);
    if (onClearMeal) {
      onClearMeal(item.id, item);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Meal Item',
      `Are you sure you want to remove "${item.name}" from your shopping list? This will NOT delete the ingredients from your shopping list.`,
      [
        {
          text: 'Cancel',
          onPress: () => closeSwipeable(),
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: handleDelete,
          style: 'destructive',
        },
      ]
    );
  };

  const renderRightActions = () => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={confirmDelete}
      >
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
        <Text style={styles.swipeText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    contentSection: {
      flex: 1,
    },
    itemName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '500',
      color: allChecked ? greenColor : theme.text.primary,
      marginBottom: getSpacing.xs,
    },
    detailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.md,
    },
    detailText: {
      fontSize: getTypography.caption.fontSize,
      color: allChecked ? greenColor : theme.text.secondary,
    },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: greenColor,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: getSpacing.sm,
    },
    deleteAction: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      backgroundColor: theme.error,
      paddingHorizontal: getSpacing.md,
    },
    swipeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
  });

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootFriction={8}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') {
          confirmDelete();
        }
      }}
    >
      <View style={styles.container}>
        <View style={styles.contentSection}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.detailText}>Qty: {item.quantity}</Text>
            <Text style={styles.detailText}>
              Ingredients: {checkedInfo?.checkedCount || 0}/{checkedInfo?.totalCount || ingredientCount}
            </Text>
          </View>
        </View>

        {/* Checkbox - only show when all ingredients are checked */}
        {allChecked && (
          <TouchableOpacity 
            style={styles.checkbox}
            onPress={handleClearMeal}
          >
            {/* Empty checkbox */}
          </TouchableOpacity>
        )}
      </View>
    </Swipeable>
  );
};

export default MealCard;