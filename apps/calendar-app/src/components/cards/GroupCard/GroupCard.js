import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "../../../contexts/ThemeContext";
import ExpandableCalendarsSection from "./ExpandableCalendarsSection";
import ExpandableMembersSection from "./ExpandableMembersSection";
import { useGroupActions } from "../../../hooks";
import { useData } from "../../../contexts/DataContext";
import GroupChecklistsModal from "./GroupChecklistsModal";
import GroupInviteModal from "./GroupInviteModal";

const GroupCard = ({ group, currentUserId }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { myUserId, myUsername, user } = useData();
  const {
    leaveGroup,
    rejoinGroup,
    deleteGroup,
    removeCalendarFromGroup,
    addCalendarsToGroup,
    updateGroupRole,
  } = useGroupActions();
  const [isChecklistModalVisible, setIsChecklistModalVisible] = useState(false);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);

  // Check if current user is admin
  const currentUserMember = group.members?.find(
    (member) => member.userId === currentUserId
  );
  const isAdmin = currentUserMember?.role === "admin";
  const isCreator = currentUserMember?.groupCreator === true;

  const activeMembersCount =
    group.members?.filter((member) => member.active).length || 0;
  const amIActive = currentUserMember?.active === true;
  const wasRemovedByOther = currentUserMember?.removedBy && !amIActive;
  const isMyRoleChild = currentUserMember?.role === "child";
  console.log(
    "Am I active in group?",
    group.groupId,
    amIActive,
    "Was I removed by someone else?",
    wasRemovedByOther,
    "Is my role child?",
    isMyRoleChild,
    "currentUserMember:",
    currentUserMember
  );

  const groupChecklists = useMemo(() => {
    return group.checklists || [];
  }, [group]);
  console.log("Group Checklists:", groupChecklists);

  const handleInvitePress = () => {
    setIsInviteModalVisible(true);
  };

  const handleDeleteGroup = async () => {
    console.log("🗑️ DELETE GROUP:", group.id || group.groupId);
    Alert.alert(
      "Delete Group",
      `Are you sure you want to delete "${
        group.name || group.groupName
      }"?\n\nThis action will:\n• Remove all group tasks\n• Remove the group from shared calendars\n• Remove all members from the group\n\nThis cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Second confirmation for extra safety
            Alert.alert(
              "Confirm Deletion",
              `${
                group.name || group.groupName
              } will be permanently deleted. Are you absolutely sure?`,
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Yes, Delete Forever",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      console.log(
                        "🗑️ CONFIRMED DELETE GROUP:",
                        group.id || group.groupId
                      );

                      await deleteGroup(group.id || group.groupId, {
                        userId: currentUserId,
                        username: user?.username || "Unknown User",
                      });

                      Alert.alert(
                        "Group Deleted",
                        `${
                          group.name || group.groupName
                        } has been successfully deleted.`
                      );
                    } catch (error) {
                      console.error("Error deleting group:", error);
                      Alert.alert(
                        "Delete Failed",
                        error.message ||
                          "Failed to delete group. Please try again."
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    console.log("🚪 LEAVE GROUP:", group.id || group.groupId);
    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave "${
        group.name || group.groupName
      }"?\n\nYou will no longer have access to group tasks and shared calendars. You can rejoin later with the invite code if needed.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Leave Group",
          style: "destructive",
          onPress: async () => {
            console.log(
              "🚪 CONFIRMED LEAVE GROUP:",
              group.id || group.groupId,
              group.name || group.groupName
            );

            try {
              // Call leaveGroup function with required parameters
              await leaveGroup(
                group.id || group.groupId, // groupId
                myUserId, // removedUserId (user leaving themselves)
                { userId: myUserId, username: myUsername } // removingUserInfo (same user)
              );

              console.log("✅ Successfully left group");

              // Optional: Show success message
              Alert.alert(
                "Left Group",
                `You have successfully left "${group.name || group.groupName}".`
              );

              // Optional: Navigate back or refresh the screen
              //navigation.goBack();
            } catch (error) {
              console.error("❌ Error leaving group:", error);

              Alert.alert("Error", `Failed to leave group: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const handleRejoinGroup = () => {
    console.log("↩️ REJOIN GROUP:", group.id || group.groupId);
    Alert.alert(
      "Rejoin Group",
      `Do you want to rejoin "${
        group.name || group.groupName
      }"?\n\nYou will regain access to group tasks and shared calendars.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Rejoin Group",
          onPress: async () => {
            console.log(
              "↩️ CONFIRMED REJOIN GROUP:",
              group.id || group.groupId,
              group.name || group.groupName
            );

            try {
              // Call rejoinGroup function with required parameters
              await rejoinGroup(
                group.id || group.groupId, // groupId
                myUserId, // userId
                { userId: myUserId, username: myUsername } // reinstateByInfo (same user)
              );

              console.log("✅ Successfully rejoined group");

              // Optional: Show success message
              Alert.alert(
                "Rejoined Group",
                `You have successfully rejoined "${
                  group.name || group.groupName
                }".`
              );
            } catch (error) {
              console.error("❌ Error rejoining group:", error);

              Alert.alert("Error", `Failed to rejoin group: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const handleUpdateGroupMembers = (groupId, memberChanges) => {
    console.log("👥 UPDATE GROUP MEMBERS:", groupId, memberChanges);
    // TODO: Wire up to useGroupActions.updateGroupMembers
  };

  const handleUpdateGroupCalendars = (groupData, selectedCalendars) => {
    console.log(
      "📅 UPDATE GROUP CALENDARS:",
      groupData.id || groupData.groupId,
      selectedCalendars
    );
    // TODO: Wire up to useGroupActions.updateGroupCalendars
  };

  const handleRemoveGroupMember = (groupId, userId, username) => {
    console.log("❌ REMOVE GROUP MEMBER:", groupId, userId, username);
    // TODO: Wire up to useGroupActions.removeGroupMember
  };

  const handleReinstateMember = (groupId, userId, username) => {
    console.log("↩️ REINSTATE MEMBER:", groupId, userId, username);
    // TODO: Wire up to useGroupActions.reinstateMember
  };

  const handleSettingsPress = () => {
    console.log("⚙️ GROUP SETTINGS:", group.id || group.groupId);
    Alert.alert(
      "Group Settings",
      `Settings for ${group.name || group.groupName} - Coming Soon!`
    );
  };

  const styles = {
    groupCard: {
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
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: getSpacing.md,
    },
    groupInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    groupName: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: getTypography.h4.fontWeight,
      color: theme.text.primary,
    },
    memberCount: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: 2,
    },
    actionButtons: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
    },
    rejoinButton: {
      padding: getSpacing.sm,
      borderRadius: getBorderRadius.sm,
      backgroundColor: theme.success?.background || "#F0FDF4",
    },
    settingsButton: {
      padding: getSpacing.sm,
    },
    deleteButton: {
      padding: getSpacing.sm,
      borderRadius: getBorderRadius.sm,
      backgroundColor: theme.error?.background || "#FEF2F2",
    },
    leaveButton: {
      padding: getSpacing.sm,
      borderRadius: getBorderRadius.sm,
      backgroundColor: theme.warning?.background || "#FFFBEB",
    },
    // Admin invite section
    adminInviteSection: {
      position: "relative",
      marginBottom: getSpacing.sm,
    },
    inviteButton: {
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      padding: getSpacing.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    inviteContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    inviteText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.primary,
      marginLeft: getSpacing.sm,
    },
    // Member section (non-admin)
    memberSection: {
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.sm,
      marginBottom: getSpacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    memberContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    memberText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginLeft: getSpacing.xs,
      fontStyle: "italic",
    },
  };

  return (
    <View style={styles.groupCard}>
      {/* Header with group info and action buttons */}
      <View style={styles.groupHeader}>
        <View style={styles.groupInfo}>
          <Ionicons name="people" size={24} color={theme.primary} />
          <View style={{ marginLeft: getSpacing.md }}>
            <Text style={styles.groupName}>
              {group.name || group.groupName}
            </Text>
            <Text style={styles.memberCount}>
              {activeMembersCount} active member
              {activeMembersCount !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          {/* Do we need Settings? */}
          {/* <TouchableOpacity 
            style={styles.settingsButton}
            onPress={handleSettingsPress}
          >
            <Ionicons name="settings-outline" size={20} color={theme.text.secondary} />
          </TouchableOpacity> */}

          {isCreator ? (
            // Case 1: Creator gets delete button
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteGroup}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={theme.error?.text || "#EF4444"}
              />
            </TouchableOpacity>
          ) : isMyRoleChild ? null : !amIActive && // Case 2: Child gets nothing
            wasRemovedByOther ? null : !amIActive ? ( // Case 3: Removed by admin gets nothing
            // Case 4: Left themselves gets rejoin button
            <TouchableOpacity
              style={styles.rejoinButton}
              onPress={handleRejoinGroup}
            >
              <Ionicons
                name="return-up-back-outline"
                size={20}
                color={theme.success?.text || "#059669"}
              />
            </TouchableOpacity>
          ) : (
            // Case 5: Default - active non-creator, non-child gets leave button
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={handleLeaveGroup}
            >
              <Ionicons
                name="exit-outline"
                size={20}
                color={theme.warning?.text || "#F59E0B"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Admin invite section - only for admins */}
      {isAdmin && amIActive && (
        <View style={styles.adminInviteSection}>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={handleInvitePress}
          >
            <View style={styles.inviteContent}>
              <Ionicons
                name="person-add-outline"
                size={18}
                color={theme.primary}
              />
              <Text style={styles.inviteText}>Invite Members</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Button to open Group Checklist - only for active members */}
      {amIActive && (
        <TouchableOpacity
          style={{
            marginBottom: getSpacing.md,
            padding: getSpacing.md,
            backgroundColor: theme.background,
            borderRadius: getBorderRadius.md,
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={() => setIsChecklistModalVisible(true)}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="list-outline" size={18} color={theme.primary} />
            <Text
              style={{
                fontSize: getTypography.body.fontSize,
                fontWeight: "600",
                color: theme.primary,
                marginLeft: getSpacing.sm,
              }}
            >
              Group Checklists ({groupChecklists.length})
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Member indicator - only for non-admins */}
      {!isAdmin && amIActive && (
        <View style={styles.memberSection}>
          <View style={styles.memberContent}>
            <Ionicons
              name="person-outline"
              size={16}
              color={theme.text.secondary}
            />
            <Text style={styles.memberText}>Group Member</Text>
          </View>
        </View>
      )}

      {amIActive && (
        <>
          <ExpandableMembersSection
            group={group}
            currentUserId={currentUserId}
            user={user}
            onUpdateGroupMembers={handleUpdateGroupMembers}
            onRemoveGroupMember={handleRemoveGroupMember}
            onReinstateMember={handleReinstateMember}
          />

          <ExpandableCalendarsSection
            group={group}
            currentUserId={currentUserId}
            onUpdateCalendars={handleUpdateGroupCalendars}
          />
        </>
      )}
      {!amIActive && (
        <Text
          style={{
            fontSize: getTypography.body.fontSize,
            color: theme.text.secondary,
            fontStyle: "italic",
            textAlign: "center",
            marginTop: getSpacing.md,
          }}
        >
          {wasRemovedByOther
            ? `You were removed from this group by ${currentUserMember?.removedBy?.username}. Please reach out to them to be re-instated.`
            : "You have left this group. Rejoin to see members and calendars."}{" "}
        </Text>
      )}

      <GroupChecklistsModal
        isVisible={isChecklistModalVisible}
        onClose={() => setIsChecklistModalVisible(false)}
        group={group}
        user={user}
        onUpdate={() => {
          // Refresh group data if needed
          console.log("Group checklists updated");
        }}
      />

      <GroupInviteModal
        isVisible={isInviteModalVisible}
        onClose={() => setIsInviteModalVisible(false)}
        user={user}
        group={group}
      />
    </View>
  );
};

export default GroupCard;
