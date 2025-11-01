import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const CheckedShoppingListItem = ({ item, inventory, onUndo }) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const inventoryQty = inventory?.[item.id]?.quantity || 0;

  const handleUndo = () => {
    console.log('undo', item);
    if (onUndo) {
      onUndo(item.id);
    }
  };

  const styles = StyleSheet.create({
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
    leftSection: {
      flex: 1,
      marginHorizontal: getSpacing.sm,
    },
    itemName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '500',
      color: theme.text.secondary,
      marginBottom: 4,
    },
    inventoryInfo: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
    },
    undoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
      backgroundColor: theme.primary,
      borderRadius: 6,
      gap: 4,
    },
    undoButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      {/* Item details */}
      <View style={styles.leftSection}>
        <Text style={styles.itemName}>{item.name}</Text>
        {inventoryQty > 0 && (
          <Text style={styles.inventoryInfo}>In Stock: {inventoryQty}</Text>
        )}
      </View>

      {/* Undo button */}
      <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
        <Ionicons name="arrow-undo" size={16} color="#FFFFFF" />
        <Text style={styles.undoButtonText}>Undo</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CheckedShoppingListItem;