import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChecklistEditingRow = ({
  item,
  index,
  theme,
  getSpacing,
  getTypography,
  getBorderRadius,
  isUserAdmin,
  isSubItem = false, // NEW: Indicates this is a sub-item
  onUpdateItem,
  onRemoveItem,
  onToggleScreenTime,
  onToggleYesNo,
  onToggleConfig,
  onFocus,
  onBlur,
  onSubmitEditing,
  registerInput,
  hideIcons = false,
}) => {
  // Check if item is configured (not just simple checkbox)
  const isConfigured = item.itemType && item.itemType !== 'checkbox' ||
                      item.requiredForScreenTime ||
                      item.requiresParentApproval ||
                      item.yesNoConfig ||
                      (item.subItems && item.subItems.length > 0);

  const styles = StyleSheet.create({
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: getSpacing.sm,
      paddingVertical: getSpacing.xs,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.sm,
      paddingHorizontal: getSpacing.sm,
      // Add left margin for sub-items
      marginLeft: isSubItem ? 24 : 0,
    },
    itemNumber: {
      width: 30,
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
    },
    bulletPoint: {
      width: 30,
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
    },
    itemInput: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.sm,
    },
    iconButton: {
      padding: getSpacing.xs,
    },
    iconActive: {
      backgroundColor: theme.primary + '20',
      borderRadius: getBorderRadius.xs,
    },
  });

  return (
    <View style={styles.itemRow}>
      {/* Show bullet for sub-items, number for parent items */}
      {isSubItem ? (
        <Text style={styles.bulletPoint}>•</Text>
      ) : (
        <Text style={styles.itemNumber}>{index + 1}.</Text>
      )}

      <TextInput
        ref={(r) => registerInput(item.id, r)}
        style={styles.itemInput}
        placeholder={isSubItem ? "Enter sub-item..." : "Enter checklist item..."}
        placeholderTextColor={theme.text.tertiary}
        value={item.name}
        onChangeText={(text) => onUpdateItem(item.id, text)}
        onFocus={() => onFocus(item.id)}
        onBlur={() => onBlur(item.id)}
        onSubmitEditing={() => onSubmitEditing(item.id)}
        returnKeyType="next"
        blurOnSubmit={false}
      />

      {!hideIcons && (
        <>
          {/* Delete - Always show for all items (even sub-items) */}
          <TouchableOpacity
            onPress={() => onRemoveItem(item.id)}
            style={styles.iconButton}
          >
            <Ionicons name="trash-outline" size={20} color={theme.error} />
          </TouchableOpacity>

          {/* Config - Only show for parent items (not sub-items) */}
          {isUserAdmin && !isSubItem && item.name.trim() !== '' && (
            <TouchableOpacity
              onPress={() => onToggleConfig && onToggleConfig(item.id)}
              style={[
                styles.iconButton,
                isConfigured && styles.iconActive,
              ]}
            >
              <Ionicons
                name={isConfigured ? 'git-branch' : 'git-branch-outline'}
                size={20}
                color={isConfigured ? theme.primary : theme.text.secondary}
              />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

export default ChecklistEditingRow;