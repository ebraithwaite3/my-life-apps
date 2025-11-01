import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const FoodBankItem = ({ item, onEdit, onDelete, onToggleFavorite }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: item.favorite ? '#fff9e6' : 'transparent',
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    favoriteButton: {
      padding: getSpacing.xs,
      marginRight: getSpacing.sm,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '500',
      color: theme.text.primary,
      marginBottom: 4,
    },
    itemDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: getSpacing.sm,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary + '20',
      paddingHorizontal: getSpacing.sm,
      paddingVertical: 2,
      borderRadius: getBorderRadius.sm,
    },
    badgeText: {
      fontSize: getTypography.caption.fontSize,
      color: theme.primary,
      marginLeft: 4,
    },
    ingredientBadge: {
      backgroundColor: '#4CAF50' + '20',
    },
    ingredientBadgeText: {
      color: '#4CAF50',
    },
    notesBadge: {
      backgroundColor: '#FF9800' + '20',
    },
    notesBadgeText: {
      color: '#FF9800',
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    iconButton: {
      padding: getSpacing.sm,
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onEdit}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          <Ionicons
            name={item.favorite ? 'star' : 'star-outline'}
            size={20}
            color={item.favorite ? '#FFB300' : theme.text.secondary}
          />
        </TouchableOpacity>

        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.itemDetails}>
            {item.autoAdd && (
              <View style={styles.badge}>
                <Ionicons name="refresh" size={12} color={theme.primary} />
                <Text style={styles.badgeText}>
                  Auto @ {item.autoAddAt} → {item.restockAmount} {item.unit || 'count'}
                </Text>
              </View>
            )}
            {item.hasIngredients && item.ingredients?.length > 0 && (
              <View style={[styles.badge, styles.ingredientBadge]}>
                <Ionicons name="restaurant" size={12} color="#4CAF50" />
                <Text style={[styles.badgeText, styles.ingredientBadgeText]}>
                  {item.ingredients.length} ingredients
                </Text>
              </View>
            )}
            {item.notes && (
              <View style={[styles.badge, styles.notesBadge]}>
                <Ionicons name="document-text" size={12} color="#FF9800" />
                <Text style={[styles.badgeText, styles.notesBadgeText]}>
                  Notes
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Ionicons name="trash-outline" size={20} color={theme.error} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={20} color={theme.text.secondary} />
      </View>
    </TouchableOpacity>
  );
};

export default FoodBankItem;