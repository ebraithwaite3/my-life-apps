import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';

const MessageActions = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const allSelected = selectedCount === totalCount;

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      backgroundColor: theme.primary + '10',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.md,
    },
    selectedText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      fontWeight: '600',
    },
    selectButton: {
      padding: getSpacing.xs,
    },
    selectButtonText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
      fontWeight: '600',
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    actionButton: {
      padding: getSpacing.sm,
      borderRadius: getBorderRadius.sm,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.selectedText}>
          {selectedCount} selected
        </Text>
        <TouchableOpacity 
          style={styles.selectButton}
          onPress={allSelected ? onDeselectAll : onSelectAll}
        >
          <Text style={styles.selectButtonText}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.right}>
        {selectedCount > 0 && (
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={onDelete}
          >
            <Ionicons name="trash-outline" size={20} color={theme.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default MessageActions;