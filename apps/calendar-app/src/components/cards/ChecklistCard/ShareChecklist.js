import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { useTaskActions } from "../../../hooks/useTaskActions";

const ShareChecklist = ({ 
  isVisible, 
  onClose, 
  checklist, 
  allGroupMembers,
  user,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const { shareChecklist } = useTaskActions();

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleShare = async () => {
    if (selectedUserIds.length === 0) return;

    setIsSharing(true);
    
    try {
      const enhancedChecklist = {
        ...checklist,
        sharedBy: { userId: user.userId, username: user.username },
        accepted: false,
      };
      
      const result = await shareChecklist(enhancedChecklist, selectedUserIds);
      
      if (result.success) {
        const { successful, failed, notificationsSent } = result.summary;
        
        // Create success message
        let successMessage = `Checklist shared successfully with ${successful} user${successful !== 1 ? 's' : ''}`;
        
        if (notificationsSent > 0) {
          successMessage += `\n${notificationsSent} notification${notificationsSent !== 1 ? 's' : ''} sent`;
        }
        
        if (failed > 0) {
          successMessage += `\n${failed} user${failed !== 1 ? 's' : ''} couldn't receive the checklist`;
        }

        Alert.alert(
          "Success",
          successMessage,
          [{ text: "OK", style: "default" }]
        );
        
        // Close modal and reset state
        setSelectedUserIds([]);
        onClose();
      } else {
        // All shares failed
        const failedReasons = result.results
          .filter(r => !r.success)
          .map(r => r.error)
          .join(', ');
          
        Alert.alert(
          "Sharing Failed",
          `Unable to share checklist: ${failedReasons}`,
          [{ text: "OK", style: "default" }]
        );
      }
      
    } catch (error) {
      console.error("Error sharing checklist:", error);
      Alert.alert(
        "Error",
        "Failed to share checklist. Please try again.",
        [{ text: "OK", style: "default" }]
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleCancel = () => {
    setSelectedUserIds([]);
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      backgroundColor: theme.surface || theme.background,
      borderRadius: 16,
      padding: getSpacing.lg,
      margin: getSpacing.lg,
      minHeight: '85%',
      maxHeight: "85%",
      width: "90%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: getSpacing.lg,
    },
    title: {
      ...getTypography.h3,
      color: theme.text.primary,
      fontWeight: "bold",
      flex: 1,
    },
    closeButton: {
      padding: getSpacing.xs,
    },
    checklistInfo: {
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: getSpacing.md,
      marginBottom: getSpacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    checklistName: {
      ...getTypography.body,
      color: theme.text.primary,
      fontWeight: "600",
      marginBottom: getSpacing.xs,
    },
    checklistMeta: {
      ...getTypography.caption,
      color: theme.text.secondary,
    },
    sectionTitle: {
      ...getTypography.h4,
      color: theme.text.primary,
      fontWeight: "600",
      marginBottom: getSpacing.md,
    },
    usersList: {
      maxHeight: 300,
      marginBottom: getSpacing.lg,
    },
    userItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.primary,
      marginRight: getSpacing.md,
      justifyContent: "center",
      alignItems: "center",
    },
    checkedBox: {
      backgroundColor: theme.primary,
    },
    username: {
      ...getTypography.body,
      color: theme.text.primary,
      flex: 1,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: getSpacing.md,
    },
    button: {
      flex: 1,
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      borderRadius: 8,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    cancelButton: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    shareButton: {
      backgroundColor: theme.primary,
    },
    cancelButtonText: {
      ...getTypography.body,
      color: theme.text.primary,
      fontWeight: "600",
    },
    shareButtonText: {
      ...getTypography.body,
      color: theme.text.inverse,
      fontWeight: "600",
      marginLeft: getSpacing.xs,
    },
    disabledButton: {
      opacity: 0.5,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: getSpacing.xl,
    },
    emptyText: {
      ...getTypography.body,
      color: theme.text.secondary,
      textAlign: "center",
    },
  });

  if (!isVisible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Share Checklist</Text>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons 
                    name="close" 
                    size={24} 
                    color={theme.text.secondary} 
                  />
                </TouchableOpacity>
              </View>

              {/* Checklist Info */}
              <View style={styles.checklistInfo}>
                <Text style={styles.checklistName}>{checklist.name}</Text>
                <Text style={styles.checklistMeta}>
                  {checklist.items?.length || 0} items
                </Text>
              </View>

              {/* Users Section */}
              <Text style={styles.sectionTitle}>Select users to share with:</Text>
              
              <ScrollView style={styles.usersList} showsVerticalScrollIndicator={false}>
                {allGroupMembers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                      No group members available to share with.
                    </Text>
                  </View>
                ) : (
                  allGroupMembers.map((member) => (
                    <TouchableOpacity
                      key={member.userId}
                      style={styles.userItem}
                      onPress={() => toggleUserSelection(member.userId)}
                      disabled={isSharing}
                    >
                      <View 
                        style={[
                          styles.checkbox,
                          selectedUserIds.includes(member.userId) && styles.checkedBox
                        ]}
                      >
                        {selectedUserIds.includes(member.userId) && (
                          <Ionicons 
                            name="checkmark" 
                            size={16} 
                            color={theme.text.inverse} 
                          />
                        )}
                      </View>
                      <Text style={styles.username}>{member.username}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              {/* Action Buttons - Only show if users are selected */}
              {selectedUserIds.length > 0 && (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.button, 
                      styles.cancelButton,
                      isSharing && styles.disabledButton
                    ]} 
                    onPress={handleCancel}
                    disabled={isSharing}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.button, 
                      styles.shareButton,
                      isSharing && styles.disabledButton
                    ]} 
                    onPress={handleShare}
                    disabled={isSharing}
                  >
                    {isSharing && (
                      <ActivityIndicator 
                        size="small" 
                        color={theme.text.inverse} 
                      />
                    )}
                    <Text style={styles.shareButtonText}>
                      {isSharing ? 'Sharing...' : 'Share'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default ShareChecklist;