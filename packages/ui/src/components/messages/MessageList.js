import React, { useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '@my-apps/contexts';
import MessageCard from './MessageCard';
import SwipeActions from './SwipeActions';

const MessageList = ({
  messages,
  isEditMode,
  selectedMessages,
  onMessagePress,
  onMessageLongPress,
  messageActions,
  userId,
  currentApp
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const rowRefs = useRef({});
  const [openRowId, setOpenRowId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Close previously open row when opening a new one
  const closeOtherRows = (rowId) => {
    if (openRowId && openRowId !== rowId) {
      const prevRow = rowRefs.current[openRowId];
      if (prevRow) {
        prevRow.close();
      }
    }
    setOpenRowId(rowId);
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      setActionLoading(true);
      await messageActions.markMessagesAsRead(userId, [messageId]);
      
      if (rowRefs.current[messageId]) {
        rowRefs.current[messageId].close();
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsUnread = async (messageId) => {
    try {
      setActionLoading(true);
      await messageActions.markMessagesAsUnread(userId, [messageId]);
      
      if (rowRefs.current[messageId]) {
        rowRefs.current[messageId].close();
      }
    } catch (error) {
      console.error('Failed to mark message as unread:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (messageId) => {
    try {
      setActionLoading(true);
      await messageActions.deleteMessages(userId, [messageId]);
      
      if (rowRefs.current[messageId]) {
        rowRefs.current[messageId].close();
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isSelected = selectedMessages.has(item.messageId);

    const messageCard = (
      <MessageCard
        message={item}
        isSelected={isSelected}
        isEditMode={isEditMode}
        onPress={() => onMessagePress(item)}
        onLongPress={() => onMessageLongPress(item.messageId)}
        currentApp={currentApp}
      />
    );

    // In edit mode, don't wrap with Swipeable
    if (isEditMode) {
      return messageCard;
    }

    // Wrap with swipeable actions
    return (
      <Swipeable
        ref={ref => (rowRefs.current[item.messageId] = ref)}
        renderLeftActions={() => (
          <SwipeActions
            type="read"
            isRead={item.read}
            onPress={() => item.read ? handleMarkAsUnread(item.messageId) : handleMarkAsRead(item.messageId)}
          />
        )}
        renderRightActions={() => (
          <SwipeActions
            type="delete"
            onPress={() => handleDelete(item.messageId)}
          />
        )}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableWillOpen={() => closeOtherRows(item.messageId)}
        enabled={!actionLoading}
      >
        {messageCard}
      </Swipeable>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: getSpacing.xl,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
      marginTop: getSpacing.md,
    },
  });

  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="mail-outline" size={64} color={theme.text.tertiary} />
        <Text style={styles.emptyText}>
          No messages yet.{'\n'}You'll receive notifications about group activity here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))}
        renderItem={renderMessage}
        keyExtractor={(item) => item.messageId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: getSpacing.sm }}
      />
    </View>
  );
};

export default MessageList;