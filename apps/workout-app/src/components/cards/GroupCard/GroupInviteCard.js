import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { useGroupActions } from "../../../hooks";
import { useData } from "../../../contexts/DataContext";
import { updateDocument } from "../../../services/firestoreService";
import { addMessageToUser } from "../../../services/messageService";

const GroupInviteCard = ({ invite, onAccept, onDecline }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { joinGroup } = useGroupActions();
  const { user } = useData();

  const handleAccept = async () => {
    console.log('Accepting invite:', invite);
    
    try {
      // Join the group using the existing function
      await joinGroup(invite.groupName, invite.inviteCode);
      
      // Remove the accepted invite from user's groupInvites
      const updatedInvites = user.groupInvites.filter(
        (inv) => inv.groupId !== invite.groupId
      );
      await updateDocument('users', user.userId, {
        groupInvites: updatedInvites
      });
      
      // Show success alert
      Alert.alert(
        'Joined Group',
        `You have successfully joined ${invite.groupName}!`,
        [{ text: 'OK' }]
      );
      
      if (onAccept) onAccept(invite);
      
    } catch (error) {
      console.error('Error accepting invite:', error);
      Alert.alert('Error', error.message || 'Failed to join group. Please try again.');
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Invite',
      `Are you sure you want to decline the invitation to join ${invite.groupName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Declining invite:', invite);
              
              // Remove the declined invite from user's groupInvites
              const updatedInvites = user.groupInvites.filter(
                (inv) => inv.groupId !== invite.groupId
              );
              await updateDocument('users', user.userId, {
                groupInvites: updatedInvites
              });
              
              // Send message to the inviter that their invite was declined
              const messageText = `${user.username} has declined your invitation to join ${invite.groupName}`;
              
              const sendingUserInfo = {
                userId: user.userId,
                username: user.username,
                groupName: invite.groupName,
                screenForNavigation: {
                  screen: 'Groups'
                }
              };
              
              await addMessageToUser(invite.inviterUserId, sendingUserInfo, messageText);
              
              // Show confirmation
              Alert.alert(
                'Invite Declined',
                `You have declined the invitation to join ${invite.groupName}.`,
                [{ text: 'OK' }]
              );
              
              if (onDecline) onDecline(invite);
              
            } catch (error) {
              console.error('Error declining invite:', error);
              Alert.alert('Error', 'Failed to decline invite. Please try again.');
            }
          }
        }
      ]
    );
  };

  const styles = {
    inviteCard: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      padding: getSpacing.lg,
      marginBottom: getSpacing.md,
      shadowColor: theme.shadow || "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      maxWidth: '95%',
        alignSelf: 'center',
        marginTop: getSpacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: getSpacing.md,
    },
    groupInfo: {
      marginLeft: getSpacing.md,
      flex: 1,
    },
    groupName: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: getTypography.h4.fontWeight,
      color: theme.text.primary,
    },
    roleText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: 2,
    },
    inviteMessage: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginBottom: getSpacing.lg,
      lineHeight: 20,
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
      borderRadius: getBorderRadius.md,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    declineButton: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    acceptButton: {
      backgroundColor: theme.primary,
    },
    buttonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      marginLeft: getSpacing.xs,
    },
    declineButtonText: {
      color: theme.text.primary,
    },
    acceptButtonText: {
      color: theme.text.inverse,
    },
  };

  return (
    <View style={styles.inviteCard}>
      {/* Header with group info */}
      <View style={styles.header}>
        <Ionicons name="people" size={24} color={theme.primary} />
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{invite.groupName}</Text>
          <Text style={styles.roleText}>
            Role: {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
          </Text>
        </View>
      </View>

      {/* Invite message */}
      <Text style={styles.inviteMessage}>
        {invite.inviterName} has invited you to join {invite.groupName}
      </Text>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.declineButton]} 
          onPress={handleDecline}
        >
          <Ionicons name="close" size={18} color={theme.text.primary} />
          <Text style={[styles.buttonText, styles.declineButtonText]}>
            Decline
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.acceptButton]} 
          onPress={handleAccept}
        >
          <Ionicons name="checkmark" size={18} color={theme.text.inverse} />
          <Text style={[styles.buttonText, styles.acceptButtonText]}>
            Join
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default GroupInviteCard;