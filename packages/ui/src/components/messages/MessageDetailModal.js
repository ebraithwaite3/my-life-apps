import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { DateTime } from "luxon";

const MessageDetailModal = ({
  isVisible,
  onClose,
  message,
  navigation,
  currentApp,
  messageActions,
  userId,
  onMessageNavigation,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  if (!message) return null;

  const formatTimestamp = (timestamp) => {
    return DateTime.fromISO(timestamp).toLocaleString(DateTime.DATETIME_SHORT);
  };

  const getAppDisplayName = (appId) => {
    const names = {
      "organizer-app": "Organizer",
      "checklist-app": "Checklist",
      "golf-app": "Golf",
      "workout-app": "Workout",
    };
    return names[appId] || appId;
  };

  const handleNavigate = () => {
    const isSameApp = !message.app || message.app === currentApp;

    if (isSameApp && onMessageNavigation) {
      onMessageNavigation(message.navigationInfo);
      onClose();
    } else if (message.app) {
      const appUrls = {
        "organizer-app": "myorganizer://",
        "checklist-app": "mychecklist://",
        "golf-app": "mygolf://",
        "workout-app": "myworkout://",
      };

      const baseUrl = appUrls[message.app];
      if (baseUrl && message.navigationInfo?.screen) {
        const deepLink = `${baseUrl}${message.navigationInfo.screen}`;
        Linking.openURL(deepLink);
        onClose();
      }
    }
  };

  const handleToggleReadStatus = async () => {
    try {
      if (message.read) {
        await messageActions.markMessagesAsUnread(userId, [message.messageId]);
      } else {
        await messageActions.markMessagesAsRead(userId, [message.messageId]);
      }
      onClose();
    } catch (error) {
      console.error("Failed to toggle message read status:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await messageActions.deleteMessages(userId, [message.messageId]);
      onClose();
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const isSameApp = !message.app || message.app === currentApp;
  const hasNavigation = message.navigationInfo && message.navigationInfo.screen;

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: getBorderRadius.lg,
      borderTopRightRadius: getBorderRadius.lg,
      width: "100%",
      height: "90%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
    content: {
      flex: 1,
    },
    scrollContainer: {
      padding: getSpacing.lg,
      paddingBottom: getSpacing.xl * 2,
    },
    messageHeader: {
      marginBottom: getSpacing.lg,
    },
    groupName: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      marginBottom: getSpacing.xs,
    },
    senderName: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: "500",
      color: theme.text.secondary,
    },
    timestamp: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.xs,
    },
    appBadge: {
      backgroundColor: theme.warning + "20",
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      borderRadius: getBorderRadius.md,
      alignSelf: "flex-start",
      marginTop: getSpacing.md,
    },
    appBadgeText: {
      fontSize: getTypography.body.fontSize,
      color: theme.warning,
      fontWeight: "600",
    },
    messageContent: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      lineHeight: 24,
    },
    actionsContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingVertical: getSpacing.md,
      paddingBottom: getSpacing.lg,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    actionButton: {
      flex: 1,
      alignItems: "center",
      paddingVertical: getSpacing.sm,
    },
    actionText: {
      fontSize: getTypography.button.fontSize,
      fontWeight: getTypography.button.fontWeight,
      marginTop: getSpacing.xs,
    },
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
      color: theme.primary,
    },
  });

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="chevron-back" size={28} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Message</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.messageHeader}>
              <Text style={styles.groupName}>{message.groupName}</Text>
              <Text style={styles.senderName}>{message.senderName}</Text>
              <Text style={styles.timestamp}>
                {formatTimestamp(message.timestamp)}
              </Text>

              {/* App Badge if from different app */}
              {!isSameApp && (
                <View style={styles.appBadge}>
                  <Text style={styles.appBadgeText}>
                    From {getAppDisplayName(message.app)}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.messageContent}>{message.content}</Text>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {/* Mark as Read/Unread */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleToggleReadStatus}
            >
              <Ionicons
                name={message.read ? "mail-unread-outline" : "mail-outline"}
                size={24}
                color={message.read ? theme.primary : theme.text.primary}
              />
              <Text
                style={[
                  styles.actionText,
                  message.read ? styles.unreadButton : styles.readButton,
                ]}
              >
                {message.read ? "Mark as Unread" : "Mark as Read"}
              </Text>
            </TouchableOpacity>

            {/* Navigate Button */}
            {hasNavigation && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleNavigate}
              >
                <Ionicons
                  name={isSameApp ? "arrow-forward-outline" : "open-outline"}
                  size={24}
                  color={theme.primary}
                />
                <Text style={[styles.actionText, styles.navigationButton]}>
                  {isSameApp ? "Go to" : `Open ${getAppDisplayName(message.app)}`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Delete Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={24} color={theme.error} />
              <Text style={[styles.actionText, styles.deleteButton]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default MessageDetailModal;