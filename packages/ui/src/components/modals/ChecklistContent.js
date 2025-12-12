import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';

const ChecklistContent = ({
  checklist,
  onItemToggle, // Callback when item is toggled
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (checklist?.items) {
      setItems(checklist.items);
    }
  }, [checklist]);

  // Sort items: incomplete first, then completed
  const sortedItems = [...items].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  const toggleItem = (itemId) => {
    const updatedItems = items.map(item =>
      item.id === itemId
        ? { ...item, completed: !item.completed }
        : item
    );
    setItems(updatedItems);
    
    // Notify parent of changes
    if (onItemToggle) {
      onItemToggle(updatedItems);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: getSpacing.lg,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    checkbox: {
      marginRight: getSpacing.md,
    },
    itemTextContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    itemText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      flex: 1,
    },
    itemTextCompleted: {
      color: theme.text.tertiary,
      textDecorationLine: 'line-through',
    },
    screenTimeIcon: {
      marginLeft: getSpacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: getSpacing.xl,
    },
    emptyStateText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.md,
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {sortedItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="checkbox-outline"
            size={64}
            color={theme.text.tertiary}
          />
          <Text style={styles.emptyStateText}>
            No items in this checklist
          </Text>
        </View>
      ) : (
        sortedItems.map((item, index) => (
          <TouchableOpacity
            key={item.id || index}
            style={styles.itemRow}
            onPress={() => toggleItem(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.checkbox}>
              <Ionicons
                name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={item.completed ? theme.primary : theme.text.tertiary}
              />
            </View>
            <View style={styles.itemTextContainer}>
              <Text
                style={[
                  styles.itemText,
                  item.completed && styles.itemTextCompleted,
                ]}
              >
                {item.name}
              </Text>
              {item.requiredForScreenTime && (
                <Ionicons
                  name="phone-portrait"
                  size={16}
                  color={item.completed ? theme.primary : theme.text.secondary}
                  style={styles.screenTimeIcon}
                />
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};

export default ChecklistContent;