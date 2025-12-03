import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@my-apps/contexts";
import {
  PageHeader,
  MessageList,
  MessageActions,
  MessageDetailModal,
} from "@my-apps/ui";

const MessagesScreen = ({
  navigation,
  dataContext,
  messageActions,
  currentApp = "organizer-app",
  onMessageNavigation,
}) => {
  const { theme } = useTheme();
  const { messages, messagesLoading, user } = dataContext;

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const messagesList = messages?.messages || [];
  const unreadCount = messagesList.filter((m) => !m.read).length;

  const handleOpenMessage = async (message) => {
    if (!isEditMode) {
      setSelectedMessage(message);
      setIsModalVisible(true);

      if (!message.read) {
        await messageActions.markMessagesAsRead(user?.userId || user?.uid, [
          message.messageId,
        ]);
      }
    } else {
      toggleMessageSelection(message.messageId);
    }
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

  // Build icons array for PageHeader
  const headerIcons = [
    {
        icon: isEditMode ? "close-outline" : "create-outline",
        action: () => {
          setIsEditMode(!isEditMode);
          if (isEditMode) setSelectedMessages(new Set());
        }
      },
      {
      icon: "ellipsis-vertical",
      options: [
        { 
          label: "Mark All as Read", 
          action: () => {/* Handle mark all as read */} 
        },
        { 
          label: "Delete All", 
          action: () => {/* Handle delete all */} 
        },
      ]
    }
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  });

  if (messagesLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <PageHeader
        title="Messages"
        subtext={`${unreadCount} unread`}
        icons={headerIcons}
      />

      {isEditMode && (
        <MessageActions
          selectedCount={selectedMessages.size}
          totalCount={messagesList.length}
          onSelectAll={() =>
            setSelectedMessages(new Set(messagesList.map((m) => m.messageId)))
          }
          onDeselectAll={() => setSelectedMessages(new Set())}
          onDelete={() => {
            /* Handle delete */
          }}
        />
      )}

      <MessageList
        messages={messagesList}
        isEditMode={isEditMode}
        selectedMessages={selectedMessages}
        onMessagePress={handleOpenMessage}
        onMessageLongPress={(messageId) => {
          setIsEditMode(true);
          toggleMessageSelection(messageId);
        }}
        messageActions={messageActions}
        userId={user?.userId || user?.uid}
        currentApp={currentApp}
      />

      {selectedMessage && (
        <MessageDetailModal
          isVisible={isModalVisible}
          onClose={() => {
            setIsModalVisible(false);
            setSelectedMessage(null);
          }}
          message={selectedMessage}
          navigation={navigation}
          currentApp={currentApp}
          messageActions={messageActions}
          userId={user?.userId || user?.uid}
          onMessageNavigation={onMessageNavigation}
        />
      )}
    </SafeAreaView>
  );
};

export default MessagesScreen;