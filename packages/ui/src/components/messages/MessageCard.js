import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import { DateTime } from 'luxon';

const MessageCard = ({ 
  message, 
  isSelected, 
  isEditMode, 
  onPress, 
  onLongPress,
  currentApp
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  
  const isFromOtherApp = message.app && message.app !== currentApp;
  
  const formatTimestamp = (timestamp) => {
    const messageTime = DateTime.fromISO(timestamp);
    const now = DateTime.now();
    const diff = now.diff(messageTime, 'days').days;

    if (diff < 1) return messageTime.toFormat('h:mm a');
    if (diff < 7) return messageTime.toFormat('ccc h:mm a');
    return messageTime.toFormat('MMM d, h:mm a');
  };

  const getMessageIcon = (content) => {
    if (content.includes('joined the group')) return 'person-add-outline';
    if (content.includes('removed from')) return 'person-remove-outline';
    if (content.includes('calendar')) return 'calendar-outline';
    return 'mail-outline';
  };

  const getAppDisplayName = (appId) => {
    const names = {
      'organizer-app': 'Organizer',
      'checklist-app': 'Checklist',
      'golf-app': 'Golf',
      'workout-app': 'Workout'
    };
    return names[appId] || appId;
  };

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      marginHorizontal: getSpacing.md,
      marginVertical: getSpacing.xs,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    unread: {
      backgroundColor: theme.primary + '05',
      borderColor: theme.primary + '30',
    },
    selected: {
      backgroundColor: theme.primary + '15',
      borderColor: theme.primary,
    },
    content: {
      padding: getSpacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: getSpacing.sm,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    icon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: getSpacing.sm,
      backgroundColor: theme.primary + '20',
    },
    info: {
      flex: 1,
    },
    groupName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    timestamp: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
      marginTop: 2,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.primary,
    },
    messageText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      lineHeight: 20,
    },
    unreadText: {
      color: theme.text.primary,
      fontWeight: '700',
    },
    appBadge: {
      backgroundColor: theme.warning + '20',
      paddingHorizontal: getSpacing.sm,
      paddingVertical: getSpacing.xs,
      borderRadius: getBorderRadius.sm,
      alignSelf: 'flex-start',
      marginTop: getSpacing.sm,
    },
    appBadgeText: {
      fontSize: getTypography.caption.fontSize,
      color: theme.warning,
      fontWeight: '600',
    },
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.card,
        !message.read && styles.unread,
        isSelected && styles.selected,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.left}>
            <View style={styles.icon}>
              <Ionicons name={getMessageIcon(message.content)} size={16} color={theme.primary} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.groupName, !message.read && styles.unreadText]}>
                {message.groupName}
              </Text>
              <Text style={styles.timestamp}>
                {message.senderName} - {formatTimestamp(message.timestamp)}
              </Text>
            </View>
          </View>
          {!message.read && <View style={styles.unreadDot} />}
        </View>
        
        <Text style={[styles.messageText, !message.read && styles.unreadText]} numberOfLines={2}>
          {message.content}
        </Text>

        {isFromOtherApp && (
          <View style={styles.appBadge}>
            <Text style={styles.appBadgeText}>
              From {getAppDisplayName(message.app)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default MessageCard;