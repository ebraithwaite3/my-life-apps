import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useGroupActions } from '../../../hooks';

const ExpandableMembersSection = ({ 
  group, 
  currentUserId,
  user
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { leaveGroup, rejoinGroup, updateGroupRole } = useGroupActions();
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingMembers, setEditingMembers] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if current user is admin
  const currentUserMember = group.members?.find(member => member.userId === currentUserId);
  const isAdmin = currentUserMember?.role === 'admin';

  // Separate active and inactive/removed members
  const activeMembers = group.members?.filter(member => 
    member.active === true || member.active === undefined // Default to active if no active field
  ) || [];
  const inactiveMembers = group.members?.filter(member => 
    member.active === false
  ) || [];

  const handleRoleChange = async (memberId, newRole) => {
    console.log('🔄 Role Change for Group ID:', group.groupId,
        "Changing member ID:", memberId, "to role:", newRole,
        "By User", user?.username);
  
    try {
      await updateGroupRole(
        group.groupId,
        memberId,
        newRole,
        {
          userId: user?.userId || currentUserId,
          username: user?.username
        }
      );
      
      console.log('✅ Successfully updated role');
      
    } catch (error) {
      console.error('❌ Error updating role:', error);
      Alert.alert('Error', `Failed to update role: ${error.message}`);
    }
  };

  const handleRemoveMember = (member) => {
    if (member.userId === currentUserId) {
      Alert.alert('Error', 'You cannot remove yourself from the group. Use the leave group option instead.');
      return;
    }

    if (member.groupCreator) {
      Alert.alert('Error', 'The group creator cannot be removed from the group.');
      return;
    }

    Alert.alert(
        'Remove Member',
        `Are you sure you want to remove "${member.username}" from "${group.name || group.groupName}"?...`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await leaveGroup(
                  group.groupId, 
                  member.userId, 
                  { userId: currentUserId, username: user?.username }
                );
                Alert.alert('Success', `${member.username} has been removed from the group.`);
              } catch (error) {
                console.error('Error removing member:', error);
                Alert.alert('Error', 'Failed to remove member from the group.');
              }
            }
          }
        ]
      );
  };

  const handleReinstateMember = (member) => {
    Alert.alert(
      'Reinstate Member',
      `Are you sure you want to reinstate "${member.username}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reinstate',
          onPress: async () => {
            try {
              await rejoinGroup(
                group.groupId,
                member.userId,
                { userId: currentUserId, username: user?.username }
              );
              Alert.alert('Success', `${member.username} has been reinstated to the group.`);
            } catch (error) {
              console.error('Error reinstating member:', error);
              Alert.alert('Error', 'Failed to reinstate member.');
            }
          }
        }
      ]
    );
  };

  const getMemberRole = (member) => {
    return editingMembers[member.userId] || member.role;
  };

  const RoleDropdown = ({ member }) => {
    const currentRole = getMemberRole(member);

    return (
      <View style={styles.roleDropdownContainer}>
        <TouchableOpacity
          style={[
            styles.roleDropdown,
            currentRole === 'admin' && styles.adminRoleDropdown
          ]}
          onPress={() => {
            Alert.alert(
              'Change Role',
              `Change ${member.username}'s role:`,
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Child',
                  onPress: () => handleRoleChange(member.userId, 'child')
                },
                {
                  text: 'Member',
                  onPress: () => handleRoleChange(member.userId, 'member')
                },
                {
                  text: 'Admin',
                  onPress: () => handleRoleChange(member.userId, 'admin')
                }
              ]
            );
          }}
          disabled={loading}
        >
          <Text style={[
            styles.roleDropdownText,
            currentRole === 'admin' && styles.adminRoleDropdownText
          ]}>
            {currentRole?.charAt(0).toUpperCase() + currentRole?.slice(1)}
          </Text>
          <Ionicons 
            name="chevron-down" 
            size={14} 
            color={currentRole === 'admin' ? theme.primary : theme.text.secondary} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  const styles = {
    container: {
      marginTop: getSpacing.sm,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      backgroundColor: theme.background,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginLeft: getSpacing.sm,
      fontWeight: '500',
    },
    expandedContent: {
      backgroundColor: theme.surface,
      paddingTop: getSpacing.xs,
      paddingBottom: getSpacing.md,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.lg,
    },
    inactiveMemberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.lg,
      opacity: 0.7,
    },
    inactiveMemberInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    inactiveMemberIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inactiveMemberText: {
      flex: 1,
      marginLeft: getSpacing.sm,
    },
    inactiveMemberName: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
      fontWeight: '500',
    },
    inactiveMemberStatus: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.tertiary,
      fontStyle: 'italic',
      marginTop: 1,
    },
    compactReinstateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: getSpacing.sm,
      backgroundColor: theme.success?.background || '#ECFDF5',
      borderRadius: getBorderRadius.sm,
    },
    compactReinstateText: {
      fontSize: getTypography.caption.fontSize,
      color: theme.success?.text || '#059669',
      fontWeight: '600',
      marginLeft: 4,
    },
    memberInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    memberIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inactiveMemberIcon: {
      backgroundColor: theme.background,
    },
    memberDetails: {
      flex: 1,
      marginLeft: getSpacing.sm,
    },
    memberName: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      fontWeight: '500',
    },
    memberRole: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: 2,
    },
    inactiveMemberName: {
      color: theme.text.tertiary,
    },
    memberStatus: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
      marginTop: 2,
      fontStyle: 'italic',
    },
    memberActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    roleDisplay: {
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
    },
    roleText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      fontWeight: '500',
    },
    adminRoleText: {
      color: theme.primary,
      fontWeight: '600',
    },
    roleDropdownContainer: {
      marginTop: 2,
    },
    roleDropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
    },
    adminRoleDropdown: {
      // No additional styling needed
    },
    roleDropdownText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      fontWeight: '500',
      marginRight: 4,
    },
    adminRoleDropdownText: {
      color: theme.primary,
      fontWeight: '600',
    },
    removeButton: {
      padding: getSpacing.xs,
      borderRadius: getBorderRadius.xs,
      backgroundColor: theme.error?.background || '#FEF2F2',
    },
    reinstateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
      backgroundColor: theme.success?.background || '#ECFDF5',
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.success?.border || '#D1FAE5',
    },
    reinstateButtonText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.success?.text || '#059669',
      fontWeight: '600',
      marginLeft: getSpacing.xs,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: getSpacing.md,
      marginHorizontal: getSpacing.lg,
    },
    inactiveSectionHeader: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
      fontWeight: '600',
      marginBottom: getSpacing.sm,
      marginHorizontal: getSpacing.lg,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: getSpacing.md,
      marginTop: getSpacing.lg,
      paddingTop: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    cancelButton: {
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.lg,
      borderRadius: getBorderRadius.sm,
      backgroundColor: theme.button?.secondary || theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cancelButtonText: {
      fontSize: getTypography.button.fontSize,
      color: theme.button?.secondaryText || theme.text.secondary,
      fontWeight: '600',
    },
    updateButton: {
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.lg,
      borderRadius: getBorderRadius.sm,
      backgroundColor: theme.primary,
    },
    updateButtonDisabled: {
      backgroundColor: theme.text.tertiary,
    },
    updateButtonText: {
      fontSize: getTypography.button.fontSize,
      color: theme.text.inverse,
      fontWeight: '600',
    },
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        disabled={loading}
      >
        <View style={styles.headerContent}>
          <Ionicons name="people-outline" size={18} color={theme.text.secondary} />
          <Text style={styles.headerText}>
            {activeMembers.length} Member{activeMembers.length !== 1 ? 's' : ''}
            {inactiveMembers.length > 0 && ` (+${inactiveMembers.length} inactive)`}
          </Text>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.text.secondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Active Members */}
          {activeMembers.map((member) => (
            <View key={member.userId} style={styles.memberRow}>
              <View style={styles.memberInfo}>
                <View style={styles.memberIcon}>
                  <Ionicons name="person" size={16} color={theme.text.secondary} />
                </View>
                <View style={styles.memberDetails}>
                  <Text style={styles.memberName}>{member.username}</Text>
                  {isAdmin && member.userId !== currentUserId && !member.groupCreator ? (
                    <RoleDropdown member={member} />
                  ) : (
                    <Text style={[styles.memberRole, member.role === 'admin' && styles.adminRoleText]}>
                      {member.groupCreator ? 'Creator' : 
                       member.role === 'admin' ? 'Admin' : 
                       member.role === 'child' ? 'Child' : 'Member'}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.memberActions}>
                {isAdmin && member.userId !== currentUserId && !member.groupCreator && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveMember(member)}
                    disabled={loading}
                  >
                    <Ionicons 
                      name="trash-outline" 
                      size={16} 
                      color={theme.error?.text || '#EF4444'} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {/* Inactive/Removed Members */}
          {inactiveMembers.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.inactiveSectionHeader}>
                Inactive Members
              </Text>
              {inactiveMembers.map((member) => (
                <View key={member.userId} style={[styles.memberRow, styles.inactiveMemberRow]}>
                  <View style={styles.memberInfo}>
                    <View style={[styles.memberIcon, styles.inactiveMemberIcon]}>
                      <Ionicons name="person" size={16} color={theme.text.tertiary} />
                    </View>
                    <View style={styles.memberDetails}>
                      <Text style={[styles.memberName, styles.inactiveMemberName]}>
                        {member.username}
                      </Text>
                      <Text style={styles.memberStatus}>
                        {member.removedBy ? `Removed by ${member.removedBy.username}` : 'Left group'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.memberActions}>
                    {isAdmin && (
                      <TouchableOpacity
                        style={styles.reinstateButton}
                        onPress={() => handleReinstateMember(member)}
                        disabled={loading}
                      >
                        <Ionicons 
                          name="person-add-outline" 
                          size={16} 
                          color={theme.success?.text || '#059669'} 
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
};

export default ExpandableMembersSection;