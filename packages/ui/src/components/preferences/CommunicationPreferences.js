import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';

const defaultCategories = [
  { key: 'creation', label: 'Created', description: 'New items' },
  { key: 'edits', label: 'Edited', description: 'Changes to items' },
  { key: 'deletions', label: 'Deleted', description: 'Removed items' },
  { key: 'reminders', label: 'Reminders', description: 'Upcoming reminders' },
  { key: 'messages', label: 'Messages', description: 'Notes and messages' },
];

const defaultItemTypes = [
  { key: 'events', label: 'Events' },
  { key: 'activities', label: 'Activities' },
];

/**
 * CommunicationPreferences Component
 * Reusable accordion-style communication settings for notifications & messages
 * 
 * @param {Object} preferences - Current communication preferences
 * @param {Function} onUpdate - Callback when preferences change
 * @param {Array} categories - Array of category objects: { key, label, description }
 * @param {Array} itemTypes - Array of item type objects: { key, label }
 * @param {Boolean} isMemberInAnyGroup - If true, locks editing (user is a member in a group)
 */
const CommunicationPreferences = ({ 
  preferences, 
  onUpdate,
  categories = defaultCategories,
  itemTypes = defaultItemTypes,
  isMemberInAnyGroup = false,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);
  const [messagesExpanded, setMessagesExpanded] = useState(false);

  // Toggle main notification active/inactive
  const handleNotificationsToggle = (value) => {
    if (isMemberInAnyGroup) return; // Prevent editing if member
    
    onUpdate({
      ...preferences,
      notifications: {
        ...preferences.notifications,
        active: value,
      },
    });
    if (!value) setNotificationsExpanded(false);
  };

  // Toggle main messages active/inactive
  const handleMessagesToggle = (value) => {
    if (isMemberInAnyGroup) return; // Prevent editing if member
    
    onUpdate({
      ...preferences,
      messages: {
        ...preferences.messages,
        active: value,
      },
    });
    if (!value) setMessagesExpanded(false);
  };

  // Toggle specific notification category for a type
  const handleNotificationCategoryToggle = (category, itemType, value) => {
    if (isMemberInAnyGroup) return; // Prevent editing if member
    
    onUpdate({
      ...preferences,
      notifications: {
        ...preferences.notifications,
        notifyFor: {
          ...preferences.notifications.notifyFor,
          [category]: {
            ...preferences.notifications.notifyFor[category],
            [itemType]: value,
          },
        },
      },
    });
  };

  // Toggle specific message category for a type
  const handleMessageCategoryToggle = (category, itemType, value) => {
    if (isMemberInAnyGroup) return; // Prevent editing if member
    
    onUpdate({
      ...preferences,
      messages: {
        ...preferences.messages,
        notifyFor: {
          ...preferences.messages.notifyFor,
          [category]: {
            ...preferences.messages.notifyFor[category],
            [itemType]: value,
          },
        },
      },
    });
  };

  const styles = StyleSheet.create({
    container: {
      width: '100%',
    },
    sectionHeader: {
      ...getTypography.h4,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
    },
    lockedWarning: {
      backgroundColor: theme.warning?.background || '#FFF4E5',
      borderWidth: 1,
      borderColor: theme.warning?.border || '#FFB020',
      borderRadius: 8,
      padding: getSpacing.md,
      marginBottom: getSpacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    lockedWarningIcon: {
      marginRight: getSpacing.sm,
      marginTop: 2,
    },
    lockedWarningText: {
      flex: 1,
      ...getTypography.body,
      color: theme.warning?.text || '#8B4000',
      lineHeight: 20,
    },
    accordionContainer: {
      marginBottom: getSpacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.surface || theme.background,
      overflow: 'hidden',
      opacity: isMemberInAnyGroup ? 0.6 : 1,
    },
    accordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: getSpacing.md,
      backgroundColor: theme.surface || theme.background,
    },
    accordionHeaderLeft: {
      flex: 1,
      marginRight: getSpacing.sm,
    },
    accordionTitle: {
      ...getTypography.h5,
      color: theme.text.primary,
      marginBottom: 2,
    },
    accordionSubtitle: {
      ...getTypography.caption,
      color: theme.text.secondary,
    },
    accordionContent: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      padding: getSpacing.md,
      backgroundColor: theme.background,
    },
    categoryContainer: {
      marginBottom: getSpacing.lg,
    },
    categoryHeader: {
      ...getTypography.body,
      fontWeight: '600',
      color: theme.text.primary,
      marginBottom: getSpacing.xs,
    },
    categoryDescription: {
      ...getTypography.caption,
      color: theme.text.secondary,
      marginBottom: getSpacing.sm,
    },
    itemTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: getSpacing.xs,
      paddingLeft: getSpacing.md,
    },
    itemTypeLabel: {
      ...getTypography.body,
      color: theme.text.primary,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Communication</Text>

      {/* Locked Warning for Group Members */}
      {isMemberInAnyGroup && (
        <View style={styles.lockedWarning}>
          <Ionicons 
            name="lock-closed" 
            size={20} 
            color={theme.warning?.text || '#8B4000'} 
            style={styles.lockedWarningIcon}
          />
          <Text style={styles.lockedWarningText}>
            Your communication preferences are managed by a group admin and cannot be changed. 
            Contact your group admin to request changes.
          </Text>
        </View>
      )}

      {/* ========================================
          PUSH NOTIFICATIONS ACCORDION
      ======================================== */}
      <View style={styles.accordionContainer}>
        {/* Header with toggle */}
        <View style={styles.accordionHeader}>
          <View style={styles.accordionHeaderLeft}>
            <Text style={styles.accordionTitle}>Push Notifications</Text>
            <Text style={styles.accordionSubtitle}>
              Receive alerts on your device
            </Text>
          </View>
          <Switch
            value={preferences.notifications?.active || false}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: '#767577', true: theme.primary }}
            thumbColor="#fff"
            disabled={isMemberInAnyGroup}
          />
        </View>

        {/* Expandable content */}
        {preferences.notifications?.active && (
          <>
            <TouchableOpacity
              style={[styles.accordionHeader, { paddingTop: 0 }]}
              onPress={() => setNotificationsExpanded(!notificationsExpanded)}
            >
              <Text style={styles.accordionSubtitle}>
                {notificationsExpanded ? 'Hide' : 'Show'} detailed settings
              </Text>
              <Ionicons
                name={notificationsExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.text.secondary}
              />
            </TouchableOpacity>

            {notificationsExpanded && (
              <View style={styles.accordionContent}>
                {categories.map((category) => (
                  <View key={category.key} style={styles.categoryContainer}>
                    <Text style={styles.categoryHeader}>{category.label}</Text>
                    <Text style={styles.categoryDescription}>
                      {category.description}
                    </Text>
                    {itemTypes.map((itemType) => (
                      <View key={itemType.key} style={styles.itemTypeRow}>
                        <Text style={styles.itemTypeLabel}>{itemType.label}</Text>
                        <Switch
                          value={
                            preferences.notifications?.notifyFor?.[category.key]?.[
                              itemType.key
                            ] || false
                          }
                          onValueChange={(value) =>
                            handleNotificationCategoryToggle(
                              category.key,
                              itemType.key,
                              value
                            )
                          }
                          trackColor={{ false: '#767577', true: theme.primary }}
                          thumbColor="#fff"
                          disabled={isMemberInAnyGroup}
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {/* ========================================
          IN-APP MESSAGES ACCORDION
      ======================================== */}
      <View style={styles.accordionContainer}>
        {/* Header with toggle */}
        <View style={styles.accordionHeader}>
          <View style={styles.accordionHeaderLeft}>
            <Text style={styles.accordionTitle}>In-App Messages</Text>
            <Text style={styles.accordionSubtitle}>
              Keep a reference log in your inbox
            </Text>
          </View>
          <Switch
            value={preferences.messages?.active || false}
            onValueChange={handleMessagesToggle}
            trackColor={{ false: '#767577', true: theme.primary }}
            thumbColor="#fff"
            disabled={isMemberInAnyGroup}
          />
        </View>

        {/* Expandable content */}
        {preferences.messages?.active && (
          <>
            <TouchableOpacity
              style={[styles.accordionHeader, { paddingTop: 0 }]}
              onPress={() => setMessagesExpanded(!messagesExpanded)}
            >
              <Text style={styles.accordionSubtitle}>
                {messagesExpanded ? 'Hide' : 'Show'} detailed settings
              </Text>
              <Ionicons
                name={messagesExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.text.secondary}
              />
            </TouchableOpacity>

            {messagesExpanded && (
              <View style={styles.accordionContent}>
                {categories.map((category) => (
                  <View key={category.key} style={styles.categoryContainer}>
                    <Text style={styles.categoryHeader}>{category.label}</Text>
                    <Text style={styles.categoryDescription}>
                      {category.description}
                    </Text>
                    {itemTypes.map((itemType) => (
                      <View key={itemType.key} style={styles.itemTypeRow}>
                        <Text style={styles.itemTypeLabel}>{itemType.label}</Text>
                        <Switch
                          value={
                            preferences.messages?.notifyFor?.[category.key]?.[
                              itemType.key
                            ] || false
                          }
                          onValueChange={(value) =>
                            handleMessageCategoryToggle(
                              category.key,
                              itemType.key,
                              value
                            )
                          }
                          trackColor={{ false: '#767577', true: theme.primary }}
                          thumbColor="#fff"
                          disabled={isMemberInAnyGroup}
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

export default CommunicationPreferences;