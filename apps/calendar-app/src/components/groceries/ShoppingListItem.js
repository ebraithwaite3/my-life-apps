import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import QuantityTracker from '../QuantityTracker';

const ShoppingListItem = ({ 
  item, 
  inventory, 
  onUpdateQuantity, 
  onDelete, 
  onMarkPurchased, 
  onMoveUp, 
  onMoveDown, 
  isFirst, 
  isLast 
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const swipeableRef = useRef(null);

  const inventoryQty = inventory?.[item.id]?.quantity || 0;

  const handleQuantityChange = (newQuantity) => {
    if (onUpdateQuantity) {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  const closeSwipeable = () => {
    swipeableRef.current?.close();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(item.id);
    }
  };

  const handleMarkPurchased = () => {
    if (onMarkPurchased) {
      onMarkPurchased(item.id, item.quantity);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to permanently delete "${item.name}"?`,
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
        style={[styles.swipeAction, styles.deleteAction]}
        onPress={confirmDelete}
      >
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
        <Text style={styles.swipeText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    swipeAction: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      paddingHorizontal: getSpacing.md,
    },
    deleteAction: { backgroundColor: theme.error },
    swipeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.sm,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    reorderButtons: {
      flexDirection: 'column',
      marginRight: getSpacing.xs,
    },
    reorderButton: {
      padding: 2,
    },
    leftSection: {
      flex: 1,
      marginRight: getSpacing.sm,
    },
    itemName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '500',
      color: theme.text.primary,
      marginBottom: 4,
    },
    inventoryInfo: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.xs,
    },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.success || '#10B981',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: getSpacing.xs,
    },
    swipeIndicators: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: getSpacing.xs,
    },
    swipeIcon: {
      opacity: 0.8,
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
        {/* Reorder buttons */}
        <View style={styles.reorderButtons}>
          <TouchableOpacity 
            onPress={() => onMoveUp && onMoveUp(item.id)}
            disabled={isFirst}
            style={styles.reorderButton}
          >
            <Ionicons 
              name="chevron-up" 
              size={20} 
              color={isFirst ? theme.text.tertiary : theme.text.secondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => onMoveDown && onMoveDown(item.id)}
            disabled={isLast}
            style={styles.reorderButton}
          >
            <Ionicons 
              name="chevron-down" 
              size={20} 
              color={isLast ? theme.text.tertiary : theme.text.secondary} 
            />
          </TouchableOpacity>
        </View>

        {/* Item details */}
        <View style={styles.leftSection}>
          <Text style={styles.itemName}>{item.name}</Text>
          {inventoryQty > 0 && (
            <Text style={styles.inventoryInfo}>In Stock: {inventoryQty}</Text>
          )}
        </View>

        {/* Right section with checkbox, quantity, and swipe indicators */}
        <View style={styles.rightSection}>
          {/* Checkbox */}
          <TouchableOpacity 
            style={styles.checkbox}
            onPress={handleMarkPurchased}
          >
          </TouchableOpacity>

          {/* Quantity controls */}
          <QuantityTracker
            value={item.quantity || 1}
            onUpdate={handleQuantityChange}
            min={1}
            size="small"
          />

          {/* Swipe indicators */}
          <View style={styles.swipeIndicators}>
            <Ionicons
              name="trash-outline"
              size={14}
              color={'#CC293C'}
              style={styles.swipeIcon}
            />
            <Ionicons
              name="chevron-back"
              size={14}
              color={theme.text.tertiary}
              style={styles.swipeIcon}
            />
          </View>
        </View>
      </View>
    </Swipeable>
  );
};

export default ShoppingListItem;