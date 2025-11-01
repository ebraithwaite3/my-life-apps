import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { useMessageActions } from '../hooks/useMessageActions';
import { DateTime } from 'luxon';
import { Swipeable } from 'react-native-gesture-handler';
import MessageDetailModal from '../components/modals/MessageDetailModal';

const MessagesScreen = ({ navigation }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { messages, messagesLoading, user, refreshMessages } = useData();
  const { markMessagesAsRead, markMessagesAsUnread, deleteMessages } = useMessageActions();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // CORRECT WAY: Use a ref object to hold refs for each row
  const rowRefs = useRef({});
  const [openRowId, setOpenRowId] = useState(null);

  const messagesList = messages?.messages || [];
  const unreadCount = messagesList.filter(m => !m.read).length;

  const formatTimestamp = (timestamp) => {
    const messageTime = DateTime.fromISO(timestamp);
    const now = DateTime.now();
    const diff = now.diff(messageTime, 'days').days;

    if (diff < 1) {
      return messageTime.toFormat('h:mm a'); // Today: "3:45 PM"
    } else if (diff < 7) {
      return messageTime.toFormat('ccc h:mm a'); // This week: "Mon 3:45 PM"
    } else {
      return messageTime.toFormat('MMM d, h:mm a'); // Older: "Sep 5, 3:45 PM"
    }
  };

  const getMessageIcon = (content) => {
    if (content.includes('joined the group')) return 'person-add-outline';
    if (content.includes('removed from the group')) return 'person-remove-outline';
    if (content.includes('added back to the group')) return 'return-up-back-outline';
    if (content.includes('role in the group')) return 'shield-outline';
    if (content.includes('calendar(s) have been added')) return 'calendar-outline';
    if (content.includes('calendar(s) have been removed')) return 'calendar-clear-outline';
    if (content.includes('group') && content.includes('deleted')) return 'trash-outline';
    return 'mail-outline';
  };

  const getMessageColor = (content) => {
    if (content.includes('removed from') || content.includes('deleted')) return theme.error;
    if (content.includes('added') || content.includes('joined')) return theme.success;
    if (content.includes('role')) return theme.warning;
    return theme.primary;
  };

  const toggleMessageSelection = (messageId) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      setActionLoading(true);
      await markMessagesAsRead(user?.userId || user?.uid, [messageId]);
      
      // Close the swipe row
      if (rowRefs.current[messageId]) {
        rowRefs.current[messageId].close();
      }
      
      console.log('Message marked as read:', messageId);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      Alert.alert('Error', 'Failed to mark message as read. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsUnread = async (messageId) => {
    try {
      setActionLoading(true);
      await markMessagesAsUnread(user?.userId || user?.uid, [messageId]);
      
      // Close the swipe row
      if (rowRefs.current[messageId]) {
        rowRefs.current[messageId].close();
      }
      
      console.log('Message marked as unread:', messageId);
    } catch (error) {
      console.error('Failed to mark message as unread:', error);
      Alert.alert('Error', 'Failed to mark message as unread. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadMessageIds = messagesList.filter(m => !m.read).map(m => m.messageId);
    
    if (unreadMessageIds.length === 0) {
      Alert.alert('Info', 'All messages are already marked as read.');
      return;
    }

    Alert.alert(
      'Mark All as Read',
      `Are you sure you want to mark ${unreadMessageIds.length} message(s) as read?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          style: 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              await markMessagesAsRead(user?.userId || user?.uid, unreadMessageIds);
              console.log('All messages marked as read');
            } catch (error) {
              console.error('Failed to mark all messages as read:', error);
              Alert.alert('Error', 'Failed to mark all messages as read. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteMessage = async (messageId) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await deleteMessages(user?.userId || user?.uid, [messageId]);
              
              // Close the swipe row
              if (rowRefs.current[messageId]) {
                rowRefs.current[messageId].close();
              }
              
              console.log('Message deleted:', messageId);
            } catch (error) {
              console.error('Failed to delete message:', error);
              Alert.alert('Error', 'Failed to delete message. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteSelected = async () => {
    const selectedIds = Array.from(selectedMessages);
    
    Alert.alert(
      'Delete Messages',
      `Are you sure you want to delete ${selectedIds.length} message(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await deleteMessages(user?.userId || user?.uid, selectedIds);
              
              // Reset selection and edit mode
              setSelectedMessages(new Set());
              setIsEditMode(false);
              
              console.log('Selected messages deleted:', selectedIds);
            } catch (error) {
              console.error('Failed to delete selected messages:', error);
              Alert.alert('Error', 'Failed to delete messages. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAll = async () => {
    const allMessageIds = messagesList.map(m => m.messageId);
    
    Alert.alert(
      'Delete All Messages',
      'Are you sure you want to delete ALL messages? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await deleteMessages(user?.userId || user?.uid, allMessageIds);
              
              // Reset selection and edit mode
              setSelectedMessages(new Set());
              setIsEditMode(false);
              
              console.log('All messages deleted');
            } catch (error) {
              console.error('Failed to delete all messages:', error);
              Alert.alert('Error', 'Failed to delete all messages. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSelectAll = () => {
    const allMessageIds = new Set(messagesList.map(m => m.messageId));
    setSelectedMessages(allMessageIds);
  };

  const handleDeselectAll = () => {
    setSelectedMessages(new Set());
  };

  // Function to close the previously open row
  const closeOtherRows = (rowId) => {
    if (openRowId && openRowId !== rowId) {
      const prevRow = rowRefs.current[openRowId];
      if (prevRow) {
        prevRow.close();
      }
    }
    setOpenRowId(rowId);
  };

  // NEW: Handle opening message modal and auto-mark as read
  const handleOpenMessage = async (message) => {
    // If not in edit mode, open the modal
    if (!isEditMode) {
      setSelectedMessage(message);
      setIsModalVisible(true);
      
      // Auto-mark as read if it's unread
      if (!message.read) {
        try {
          await markMessagesAsRead(user?.userId || user?.uid, [message.messageId]);
          
          console.log('Message auto-marked as read on open:', message.messageId);
        } catch (error) {
          console.error('Failed to auto-mark message as read:', error);
          // Don't show error to user for this background action
        }
      }
    } else {
      // In edit mode, toggle selection
      toggleMessageSelection(message.messageId);
    }
  };

  const renderSwipeLeftActions = (item) => (
    <View style={styles.swipeActionContainerLeft}>
      <TouchableOpacity
        style={[styles.swipeAction, styles.deleteSwipeAction]}
        onPress={() => handleDeleteMessage(item.messageId)}
        disabled={actionLoading}
      >
        <Ionicons name="trash-outline" size={24} color="white" />
        <Text style={styles.swipeActionText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSwipeRightActions = (item) => (
    <View style={styles.swipeActionContainerRight}>
      <TouchableOpacity
        style={[styles.swipeAction, styles.readSwipeAction]}
        onPress={() => {
          if (!item.read) {
            handleMarkAsRead(item.messageId);
          } else {
            handleMarkAsUnread(item.messageId);
          }
        }}
        disabled={actionLoading}
      >
        <Ionicons 
          name={item.read ? "mail-unread-outline" : "mail-open-outline"} 
          size={24} 
          color="white" 
        />
        <Text style={styles.swipeActionText}>{item.read ? 'Unread' : 'Read'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMessage = ({ item }) => {
    const isSelected = selectedMessages.has(item.messageId);
    const messageColor = getMessageColor(item.content);
    const iconName = getMessageIcon(item.content);

    const MessageCard = (
      <View style={[
        styles.messageCard,
        !item.read && styles.unreadMessage,
        isSelected && styles.selectedMessage,
      ]}>
        <TouchableOpacity
          style={styles.messageContentWrapper}
          onPress={() => handleOpenMessage(item)}
          onLongPress={() => {
            if (!isEditMode) {
              setIsEditMode(true);
              toggleMessageSelection(item.messageId);
            }
          }}
          disabled={actionLoading}
        >
          <View style={styles.messageHeader}>
            <View style={styles.messageLeft}>
              <View style={[styles.iconContainer, { backgroundColor: messageColor + '20' }]}>
                <Ionicons name={iconName} size={16} color={messageColor} />
              </View>
              <View style={styles.messageInfo}>
                <Text style={[styles.senderName, !item.read && styles.unreadText]}>{item.groupName}</Text>
                <Text style={styles.timestamp}>{item.senderName}-{formatTimestamp(item.timestamp)}</Text>
              </View>
            </View>
            <View style={styles.messageRight}>
              {!item.read && <View style={styles.unreadDot} />}
              {isEditMode && (
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                </View>
              )}
            </View>
          </View>
          <Text style={[styles.messageContent, !item.read && styles.unreadText]}>
            {item.content}
          </Text>
        </TouchableOpacity>
      </View>
    );

    if (isEditMode) {
      return MessageCard;
    } else {
      return (
        <Swipeable
          ref={ref => (rowRefs.current[item.messageId] = ref)}
          renderRightActions={() => renderSwipeLeftActions(item)}
          renderLeftActions={() => renderSwipeRightActions(item)}
          overshootRight={false}
          overshootLeft={false}
          onSwipeableWillOpen={() => closeOtherRows(item.messageId)}
          enabled={!actionLoading}
        >
          {MessageCard}
        </Swipeable>
      );
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: getSpacing.md,
      padding: getSpacing.sm,
    },
    headerTitle: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
    },
    unreadBadge: {
      backgroundColor: theme.error,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: getSpacing.sm,
    },
    unreadBadgeText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    actionButton: {
      padding: getSpacing.sm,
      borderRadius: getBorderRadius.sm,
    },
    editModeActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      backgroundColor: theme.primary + '10',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    editModeLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.md,
    },
    editModeText: {
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
    editModeRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    listContainer: {
      flex: 1,
    },
    // Message Card Styles
    messageCard: {
      backgroundColor: theme.surface,
      marginHorizontal: getSpacing.md,
      marginVertical: getSpacing.xs,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden', // Required for swipeable
    },
    messageContentWrapper: {
      padding: getSpacing.md,
    },
    unreadMessage: {
      backgroundColor: theme.primary + '05',
      borderColor: theme.primary + '30',
    },
    selectedMessage: {
      backgroundColor: theme.primary + '15',
      borderColor: theme.primary,
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: getSpacing.sm,
    },
    messageLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: getSpacing.sm,
    },
    messageInfo: {
      flex: 1,
    },
    senderName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    timestamp: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
      marginTop: 2,
    },
    messageRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.primary,
      marginRight: getSpacing.xs,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderRadius: getBorderRadius.xs,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    messageContent: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      lineHeight: 20,
    },
    unreadText: {
      color: theme.text.primary,
      fontWeight: '700',
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Swipe Action Styles
    swipeActionContainerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingLeft: getSpacing.md,
      marginVertical: getSpacing.xs,
      marginLeft: getSpacing.md,
      borderRadius: getBorderRadius.md,
    },
    swipeActionContainerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: getSpacing.md,
      marginVertical: getSpacing.xs,
      marginRight: getSpacing.md,
      borderRadius: getBorderRadius.md,
    },
    swipeAction: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      height: '100%',
    },
    deleteSwipeAction: {
      backgroundColor: theme.error,
    },
    readSwipeAction: {
      backgroundColor: theme.primary,
    },
    swipeActionText: {
      color: 'white',
      fontSize: getTypography.caption.fontSize,
      fontWeight: 'bold',
      marginTop: getSpacing.xs,
    },
  });

  if (messagesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {!isEditMode && messagesList.length > 0 && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => setIsEditMode(true)}
              disabled={actionLoading}
            >
              <Ionicons name="create-outline" size={24} color={theme.text.secondary} />
            </TouchableOpacity>
          )}
          {isEditMode && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => {
                setIsEditMode(false);
                setSelectedMessages(new Set());
              }}
              disabled={actionLoading}
            >
              <Ionicons name="close-outline" size={24} color={theme.text.secondary} />
            </TouchableOpacity>
          )}
          {!isEditMode && messagesList.length > 0 && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Alert.alert(
                "Message Actions",
                "Choose an action:",
                [
                  { text: "Mark All as Read", onPress: handleMarkAllAsRead },
                  { text: "Delete All", onPress: handleDeleteAll, style: 'destructive' },
                  { text: "Cancel", style: "cancel" }
                ]
              )}
              disabled={actionLoading}
            >
              <Ionicons name="ellipsis-vertical" size={24} color={theme.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Edit Mode Actions */}
      {isEditMode && (
        <View style={styles.editModeActions}>
          <View style={styles.editModeLeft}>
            <Text style={styles.editModeText}>
              {selectedMessages.size} selected
            </Text>
            <TouchableOpacity 
              style={styles.selectButton}
              onPress={selectedMessages.size === messagesList.length ? handleDeselectAll : handleSelectAll}
              disabled={actionLoading}
            >
              <Text style={styles.selectButtonText}>
                {selectedMessages.size === messagesList.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.editModeRight}>
            {selectedMessages.size > 0 && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleDeleteSelected}
                disabled={actionLoading}
              >
                <Ionicons name="trash-outline" size={20} color={theme.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Messages List */}
      <View style={styles.listContainer}>
        {messagesList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-outline" size={64} color={theme.text.tertiary} />
            <Text style={styles.emptyText}>
              No messages yet.{'\n'}You'll receive notifications about group activity here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={messagesList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))}
            renderItem={renderMessage}
            keyExtractor={(item) => item.messageId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: getSpacing.sm }}
          />
        )}
      </View>

      {/* Loading Overlay */}
      {actionLoading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <MessageDetailModal
          isVisible={isModalVisible}
          onClose={() => {
            setIsModalVisible(false);
            setSelectedMessage(null);
          }}
          message={selectedMessage}
        />
      )}
    </SafeAreaView>
  );
};

export default MessagesScreen;