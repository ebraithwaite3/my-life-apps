import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';

const ChecklistItemRow = ({ item, onToggle, onYesNoAnswer, onResetYesNo, isSubItem = false }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  // Check if this is a yes/no item
  const isYesNo = item.itemType === 'yesNo';
  const isGroup = item.itemType === 'group';
  const yesNoConfig = item.yesNoConfig || {};
  const isAnswered = yesNoConfig.answered || false;
  const answer = yesNoConfig.answer;
  const isMultiChoice = isYesNo && yesNoConfig.type === 'multiChoice';
  const isFillIn = isYesNo && yesNoConfig.type === 'fillIn';

  // For groups AND answered multiChoice/fillIn, calculate completion
  const subItems = item.subItems || [];
  const completedSubItems = subItems.filter(sub => sub.completed).length;
  const allSubItemsComplete = subItems.length > 0 && completedSubItems === subItems.length;

  // MultiChoice/FillIn answered "yes" with subItems should behave like a group
  const shouldRenderAsGroup = (isGroup || ((isMultiChoice || isFillIn) && isAnswered && answer === 'yes')) && !isSubItem;

  // Determine display text
  let displayText = item.name;
  if (isAnswered && answer === 'no') {
    displayText = `${item.name} - No`;
  } else if ((isGroup || ((isMultiChoice || isFillIn) && isAnswered)) && subItems.length > 0) {
    displayText = `${item.name} (${completedSubItems}/${subItems.length})`;
  }

  const styles = StyleSheet.create({
    itemRow: {
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      marginBottom: getSpacing.sm,
      borderRadius: getBorderRadius.md,
      backgroundColor: theme.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    itemRowCompleted: {
      backgroundColor: `${theme.primary}15`,
    },
    rowContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: { 
      marginRight: getSpacing.lg,
      width: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemTextContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    itemText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      flex: 1,
      lineHeight: getTypography.body.fontSize * 1.5,
    },
    itemTextCompleted: {
      color: theme.text.tertiary,
      textDecorationLine: 'line-through',
    },
    screenTimeIcon: {
      padding: getSpacing.xs,
      borderRadius: getBorderRadius.sm,
      backgroundColor: `${theme.primary}10`,
    },
    yesNoButtons: {
      flexDirection: 'row',
      gap: getSpacing.sm,
      marginTop: getSpacing.sm,
    },
    yesNoButton: {
      flex: 1,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.sm,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    yesButton: {
      borderColor: theme.success || theme.primary,
      backgroundColor: `${theme.success || theme.primary}10`,
    },
    noButton: {
      borderColor: theme.error,
      backgroundColor: `${theme.error}10`,
    },
    yesNoButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
    },
    yesButtonText: {
      color: theme.success || theme.primary,
    },
    noButtonText: {
      color: theme.error,
    },
    resetButton: {
      padding: getSpacing.xs,
      marginLeft: getSpacing.sm,
    },
    indentedRow: {
      marginLeft: getSpacing.xl,
      borderLeftWidth: 2,
      borderLeftColor: `${theme.primary}30`,
      paddingLeft: getSpacing.md,
    },
    groupContainer: {
      marginBottom: getSpacing.sm,
    },
    disabledRow: {
      opacity: 0.6,
    },
  });

  // GROUP OR MULTICHOICE (answered yes) - Show parent + indented sub-items
  if (shouldRenderAsGroup) {
    return (
      <View style={styles.groupContainer}>
        {/* Parent Group/MultiChoice Item - NOT clickable, controlled by sub-items */}
        <View
          style={[
            styles.itemRow,
            item.completed && styles.itemRowCompleted,
          ]}
        >
          <View style={styles.rowContent}>
            <View style={styles.checkbox}>
              <Ionicons
                name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                size={28}
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
                {displayText}
              </Text>

              {item.requiredForScreenTime && (
                <View style={styles.screenTimeIcon}>
                  <Ionicons name="phone-portrait" size={16} color={theme.primary} />
                </View>
              )}

              {/* Reset button for multiChoice/fillIn (allows re-selection) */}
              {(isMultiChoice || isFillIn) && onResetYesNo && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onResetYesNo(item.id);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="refresh-circle"
                    size={24}
                    color={theme.text.secondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Sub-items (indented) */}
        {subItems.map(subItem => (
          <View key={subItem.id} style={styles.indentedRow}>
            <ChecklistItemRow
              item={subItem}
              onToggle={onToggle}
              isSubItem={true}
            />
          </View>
        ))}
      </View>
    );
  }

  // YES/NO UNANSWERED - Show buttons
  if (isYesNo && !isAnswered) {
    return (
      <View style={styles.itemRow}>
        <View style={styles.rowContent}>
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemText}>{item.name}</Text>
            {item.requiredForScreenTime && (
              <View style={styles.screenTimeIcon}>
                <Ionicons name="phone-portrait" size={16} color={theme.primary} />
              </View>
            )}
          </View>
        </View>

        {/* Yes/No Buttons */}
        <View style={styles.yesNoButtons}>
          <TouchableOpacity
            style={[styles.yesNoButton, styles.yesButton]}
            onPress={() => onYesNoAnswer(item.id, 'yes')}
            activeOpacity={0.7}
          >
            <Text style={[styles.yesNoButtonText, styles.yesButtonText]}>
              Yes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.yesNoButton, styles.noButton]}
            onPress={() => onYesNoAnswer(item.id, 'no')}
            activeOpacity={0.7}
          >
            <Text style={[styles.yesNoButtonText, styles.noButtonText]}>
              No
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // YES/NO ANSWERED OR REGULAR CHECKBOX - Show as normal checkbox
  return (
    <TouchableOpacity
      style={[
        styles.itemRow,
        item.completed && styles.itemRowCompleted,
      ]}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.6}
    >
      <View style={styles.rowContent}>
        <View style={styles.checkbox}>
          <Ionicons
            name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
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
            {displayText}
          </Text>

          {item.requiredForScreenTime && (
            <View style={styles.screenTimeIcon}>
              <Ionicons
                name="phone-portrait"
                size={16}
                color={theme.primary}
              />
            </View>
          )}

          {/* Reset Yes/No Answer Button */}
          {isYesNo && isAnswered && onResetYesNo && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={(e) => {
                e.stopPropagation();
                onResetYesNo(item.id);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="refresh-circle"
                size={24}
                color={theme.text.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ChecklistItemRow;