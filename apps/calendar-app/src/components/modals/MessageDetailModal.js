import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { DateTime } from 'luxon';
import { useData } from '../../contexts/DataContext';
import { useMessageActions } from '../../hooks';

const MessageDetailModal = ({ isVisible, onClose, message }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { user } = useData();
  const { deleteMessages, markMessagesAsUnread, markMessagesAsRead } = useMessageActions();
  const navigation = useNavigation();
  
  console.log('MessageDetailModal rendered with message:', message);

  if (!message) {
    return null;
  }

  const formatTimestamp = (timestamp) => {
    return DateTime.fromISO(timestamp).toLocaleString(DateTime.DATETIME_SHORT);
  };

  const handleNavigate = () => {
    console.log('Navigating from message:', message.navigationInfo);
    
    if (message.navigationInfo) {
      const { screen, params } = message.navigationInfo;
      
      // Close the modal first
      onClose();
      
      // Navigate based on the screen type
      switch (screen) {
        case 'Groups':
          // Navigate to Groups tab home screen
          navigation.navigate('Groups', { 
            screen: 'GroupsHome',
            params: params 
          });
          break;
        
        case 'Event':
          // Navigate to appropriate tab, then to EventDetails
          navigation.navigate('Today', { 
            screen: 'EventDetails', 
            params: { eventId: params.eventId } 
          });
          break;
        
          case 'Calendar':
            // Navigate to Calendar tab with nested navigation
            if (params && params.screen === 'DayScreen') {
              // For DayScreen navigation (like event notifications)
              navigation.navigate('Calendar', {
                screen: 'DayScreen',
                params: params.params // This contains { date, highlightEvent }
              });
            } else {
              // Default Calendar navigation
              navigation.navigate('Calendar', { 
                screen: 'CalendarHome',
                params: params 
              });
            }
            break;

        case 'Preferences':
          // Navigate to Preferences tab home screen
          navigation.navigate('Preferences', { 
            screen: 'PreferencesHome',
            params: params 
          });
          break;
          case 'Grocery':
        // Navigate to Grocery stack with nested navigation
        navigation.navigate('Grocery', {
          screen: params.screen || 'GroceryHome',
          params: params.params
        });
        break;
        
        default:
          console.warn('Unknown navigation screen:', screen);
      }
    }
  };

  const handleToggleReadStatus = async () => {
    try {
        if (message.read) {
            console.log('Marking message as unread:', message.messageId);
            await markMessagesAsUnread(user?.userId || user?.uid, [message.messageId]);
        } else {
            console.log('Marking message as read:', message.messageId);
            await markMessagesAsRead(user?.userId || user?.uid, [message.messageId]);
        }
        onClose();
    } catch (error) {
        console.error('Failed to toggle message read status:', error);
        // You might want to show an error toast here
    }
  };

  const handleDelete = async () => {
    try {
      console.log('Deleting message:', message.messageId);
      // Pass the userId to delete from the correct user's messages collection
      await deleteMessages(user?.userId || user?.uid, [message.messageId]);
      onClose();
    } catch (error) {
      console.error('Failed to delete message:', error);
      // You might want to show an error toast here
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
    headerTitle: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
    },
    closeButton: {
      padding: getSpacing.sm,
    },
    contentContainer: {
      flex: 1,
      padding: getSpacing.md,
    },
    messageHeader: {
      marginBottom: getSpacing.lg,
    },
    groupName: {
      fontSize: getTypography.h1.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      marginBottom: getSpacing.xs,
    },
    senderName: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: 'bold',
      color: theme.text.primary,
    },
    timestamp: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.xs,
    },
    messageContent: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      lineHeight: 24,
    },
    actionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: getSpacing.md,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    actionButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: getSpacing.sm,
    },
    actionText: {
      fontSize: getTypography.button.fontSize,
      fontWeight: getTypography.button.fontWeight,
      marginTop: getSpacing.xs,
    },
    // Styles for the new action bar
    readButton: {
      color: theme.text.primary,
    },
    unreadButton: {
      color: theme.primary,
    },
    deleteButton: {
      color: theme.error,
    },
    navigationButton: {
        color: theme.text.primary,
    },
  });

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="chevron-back" size={28} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Message</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.messageHeader}>
            <Text style={styles.groupName}>{message.groupName}</Text>
            <Text style={styles.senderName}>{message.senderName}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(message.timestamp)}</Text>
          </View>
          <Text style={styles.messageContent}>{message.content}</Text>
        </ScrollView>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleToggleReadStatus}>
            <Ionicons 
                name={message.read ? "mail-unread-outline" : "mail-outline"} 
                size={24} 
                color={message.read ? theme.primary : theme.text.primary} 
            />
            <Text style={[styles.actionText, message.read ? styles.unreadButton : styles.readButton]}>
                {message.read ? "Mark as Unread" : "Mark as Read"}
            </Text>
          </TouchableOpacity>
          
          {message.navigationInfo && (
            <TouchableOpacity style={styles.actionButton} onPress={handleNavigate}>
              <Ionicons name="arrow-forward-outline" size={24} color={theme.text.primary} />
              <Text style={[styles.actionText, styles.navigationButton]}>Go to</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color={theme.error} />
            <Text style={[styles.actionText, styles.deleteButton]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default MessageDetailModal;