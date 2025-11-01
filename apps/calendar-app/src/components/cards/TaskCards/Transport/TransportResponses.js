import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, Alert, TextInput, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useData } from "../../../../contexts/DataContext";
import { useTaskActions } from "../../../../hooks";

const TransportResponses = ({
  assignment,
  groupId,
  onAssignmentUpdate,
  isEventPast,
  thisGroup,
  amIAdminOfThisGroup,
  dropOffInfo,
  pickUpInfo,
  canClaimDropOff,
  canClaimPickUp,
  userClaimedDropOff,
  userClaimedPickUp,
  usersWhoCanRespond,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user, groups } = useData();
  const { updateTask } = useTaskActions();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Admin edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null); // 'dropOff' or 'pickUp'
  const [editStatus, setEditStatus] = useState('available');
  const [editAssignedTo, setEditAssignedTo] = useState(null);
  const [editAssignedToId, setEditAssignedToId] = useState(null);
  const [editReason, setEditReason] = useState('');

  // Get assignable members for admin edit
  const assignableMembers = useMemo(() => {
    return groups?.find(group => group.groupId === groupId)?.members || [];
  }, [groups, groupId]);

  const handleClaim = async (type) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    try {
      console.log(`Claiming ${type} for user:`, user?.userId);
      
      const updates = {
        [type]: {
          assignedTo: user?.displayName || user?.username || 'Me',
          assignedToId: user?.userId,
          status: 'claimed'
        }
      };

      await updateTask(
        assignment.isPersonalTask ? user.userId : groupId,
        assignment.taskId,
        updates,
        user?.userId
      );

      if (onAssignmentUpdate) {
        const updatedAssignment = { ...assignment, ...updates };
        onAssignmentUpdate(updatedAssignment);
      }

      console.log(`✅ Successfully claimed ${type}`);

    } catch (error) {
      console.error('Error claiming transport:', error);
      Alert.alert('Error', 'Failed to claim transport. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnclaim = async (type) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    try {
      console.log(`Unclaiming ${type} for user:`, user?.userId);
      
      const updates = {
        [type]: {
          assignedTo: null,
          assignedToId: null,
          status: 'available'
        }
      };

      await updateTask(
        assignment.isPersonalTask ? user.userId : groupId,
        assignment.taskId,
        updates,
        user?.userId
      );

      if (onAssignmentUpdate) {
        const updatedAssignment = { ...assignment, ...updates };
        onAssignmentUpdate(updatedAssignment);
      }

      console.log(`✅ Successfully unclaimed ${type}`);

    } catch (error) {
      console.error('Error unclaiming transport:', error);
      Alert.alert('Error', 'Failed to unclaim transport. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditModal = (type) => {
    const info = type === 'dropOff' ? dropOffInfo : pickUpInfo;
    setEditingType(type);
    setEditStatus(info.status || 'available');
    setEditAssignedTo(info.assignedTo || null);
    setEditAssignedToId(info.assignedToId || null);
    setEditReason(info.reason || '');
    setIsEditModalOpen(true);
  };

  const handleAdminUpdate = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    try {
      const updates = {
        [editingType]: {
          status: editStatus,
          assignedTo: editAssignedTo,
          assignedToId: editAssignedToId,
          ...(editStatus === 'handled' && { reason: editReason })
        }
      };

      await updateTask(
        assignment.isPersonalTask ? user.userId : groupId,
        assignment.taskId,
        updates,
        user?.userId
      );

      if (onAssignmentUpdate) {
        const updatedAssignment = { ...assignment, ...updates };
        onAssignmentUpdate(updatedAssignment);
      }

      setIsEditModalOpen(false);
      console.log(`✅ Successfully updated ${editingType} as admin`);

    } catch (error) {
      console.error('Error updating transport:', error);
      Alert.alert('Error', 'Failed to update transport. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusText = (info, userClaimed) => {
    if (info.status === 'handled') {
      return info.reason || 'Handled';
    }
    if (!info.assignedTo) {
      return 'Available';
    }
    if (userClaimed) {
      return 'Me';
    }
    return info.assignedTo;
  };

  const getStatusColor = (info, userClaimed) => {
    if (info.status === 'handled') {
      return theme.text.secondary || '#10b981';
    }
    if (userClaimed) {
      return theme.success || '#10b981';
    }
    if (info.assignedTo) {
      return theme.text.secondary;
    }
    return theme.text.tertiary;
  };

  const renderEditModal = () => (
    <Modal
      visible={isEditModalOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setIsEditModalOpen(false)}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: getSpacing.lg,
      }}>
        <View style={{
          backgroundColor: theme.surface,
          borderRadius: 12,
          padding: getSpacing.lg,
          maxHeight: '80%',
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: getSpacing.lg,
          }}>
            <Text style={{
              fontSize: getTypography.h3.fontSize,
              fontWeight: getTypography.h3.fontWeight,
              color: theme.text.primary,
            }}>
              Edit {editingType === 'dropOff' ? 'Drop Off' : 'Pick Up'}
            </Text>
            <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
              <Ionicons name="close" size={24} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={{ gap: getSpacing.md }}>
            {/* Available */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: getSpacing.sm }}
              onPress={() => {
                setEditStatus('available');
                setEditAssignedTo(null);
                setEditAssignedToId(null);
                setEditReason('');
              }}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: editStatus === 'available' ? theme.primary : theme.border,
                marginRight: getSpacing.sm,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {editStatus === 'available' && (
                  <View style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: theme.primary
                  }} />
                )}
              </View>
              <Text style={{ fontSize: getTypography.body.fontSize, color: theme.text.primary }}>
                Available for claiming
              </Text>
            </TouchableOpacity>

            {/* Assign to me */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: getSpacing.sm }}
              onPress={() => {
                setEditStatus('claimed');
                setEditAssignedTo(user?.displayName || user?.username);
                setEditAssignedToId(user?.userId);
                setEditReason('');
              }}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: (editStatus === 'claimed' && editAssignedToId === user?.userId) ? theme.primary : theme.border,
                marginRight: getSpacing.sm,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {(editStatus === 'claimed' && editAssignedToId === user?.userId) && (
                  <View style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: theme.primary
                  }} />
                )}
              </View>
              <Text style={{ fontSize: getTypography.body.fontSize, color: theme.text.primary }}>
                Assign to me
              </Text>
            </TouchableOpacity>

            {/* Assign to others */}
            {assignableMembers?.filter(member => member.userId !== user?.userId).map(member => (
              <TouchableOpacity
                key={member.userId}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: getSpacing.sm }}
                onPress={() => {
                  setEditStatus('assigned');
                  setEditAssignedTo(member.displayName || member.username);
                  setEditAssignedToId(member.userId);
                  setEditReason('');
                }}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: editAssignedToId === member.userId ? theme.primary : theme.border,
                  marginRight: getSpacing.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {editAssignedToId === member.userId && (
                    <View style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: theme.primary
                    }} />
                  )}
                </View>
                <Text style={{ fontSize: getTypography.body.fontSize, color: theme.text.primary }}>
                  Assign to {member.displayName || member.username}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Handled */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: getSpacing.sm }}
              onPress={() => {
                setEditStatus('handled');
                setEditAssignedTo(null);
                setEditAssignedToId(null);
                if (!editReason) setEditReason('Handled');
              }}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: editStatus === 'handled' ? theme.primary : theme.border,
                marginRight: getSpacing.sm,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {editStatus === 'handled' && (
                  <View style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: theme.primary
                  }} />
                )}
              </View>
              <Text style={{ fontSize: getTypography.body.fontSize, color: theme.text.primary }}>
                Already handled
              </Text>
            </TouchableOpacity>

            {editStatus === 'handled' && (
              <TextInput
                style={{
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 6,
                  padding: getSpacing.md,
                  marginLeft: 32,
                  fontSize: getTypography.body.fontSize,
                  color: theme.text.primary,
                }}
                placeholder="How is it handled? (e.g., School bus, Walking, Carpool)"
                placeholderTextColor={theme.text.tertiary}
                value={editReason}
                onChangeText={setEditReason}
                maxLength={50}
              />
            )}
          </View>

          <View style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: getSpacing.sm,
            marginTop: getSpacing.lg,
          }}>
            <TouchableOpacity
              style={{
                paddingHorizontal: getSpacing.lg,
                paddingVertical: getSpacing.md,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
              }}
              onPress={() => setIsEditModalOpen(false)}
            >
              <Text style={{
                color: theme.text.secondary,
                fontSize: getTypography.body.fontSize,
                fontWeight: '600',
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                paddingHorizontal: getSpacing.lg,
                paddingVertical: getSpacing.md,
                backgroundColor: theme.primary,
                borderRadius: 8,
                opacity: isUpdating ? 0.6 : 1,
              }}
              onPress={handleAdminUpdate}
              disabled={isUpdating}
            >
              <Text style={{
                color: theme.text.inverse,
                fontSize: getTypography.body.fontSize,
                fontWeight: '600',
              }}>
                {isUpdating ? 'Updating...' : 'Update'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTransportSection = (type, info, userClaimed, canClaim) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: type === 'dropOff' ? getSpacing.md : 0,
      paddingVertical: getSpacing.sm,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Text style={{
          fontSize: getTypography.body.fontSize,
          color: theme.text.primary,
          width: 80,
        }}>
          {type === 'dropOff' ? 'Drop Off:' : 'Pick Up:'}
        </Text>
        <Text style={{
          fontSize: getTypography.body.fontSize,
          color: getStatusColor(info, userClaimed),
          fontWeight: userClaimed ? '600' : 'normal',
          backgroundColor: userClaimed ? `${theme.success || '#10b981'}20` : 'transparent',
          paddingHorizontal: userClaimed ? getSpacing.xs : 0,
          paddingVertical: userClaimed ? 2 : 0,
          borderRadius: userClaimed ? 4 : 0,
        }}>
          {getStatusText(info, userClaimed)}
        </Text>
      </View>
      
      {!isEventPast && (
        <View style={{ flexDirection: 'row', gap: getSpacing.xs }}>
          {/* Admin edit button */}
          {amIAdminOfThisGroup && (
            <TouchableOpacity
              onPress={() => openEditModal(type)}
              disabled={isUpdating}
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: getSpacing.sm,
                paddingVertical: getSpacing.xs,
                borderRadius: 6,
                opacity: isUpdating ? 0.6 : 1,
              }}
            >
              <Ionicons name="pencil" size={16} color={theme.text.secondary} />
            </TouchableOpacity>
          )}

          {/* Regular user buttons */}
          {canClaim && (
            <TouchableOpacity
              onPress={() => handleClaim(type)}
              disabled={isUpdating}
              style={{
                backgroundColor: theme.primary,
                paddingHorizontal: getSpacing.sm,
                paddingVertical: getSpacing.xs,
                borderRadius: 6,
                opacity: isUpdating ? 0.6 : 1,
              }}
            >
              <Text style={{
                color: theme.text.inverse,
                fontSize: getTypography.bodySmall.fontSize,
                fontWeight: '600',
              }}>
                {isUpdating ? 'Claiming...' : 'Claim'}
              </Text>
            </TouchableOpacity>
          )}
          
          {userClaimed && (
            <TouchableOpacity
              onPress={() => handleUnclaim(type)}
              disabled={isUpdating}
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: getSpacing.sm,
                paddingVertical: getSpacing.xs,
                borderRadius: 6,
                opacity: isUpdating ? 0.6 : 1,
              }}
            >
              <Text style={{
                color: theme.text.secondary,
                fontSize: getTypography.bodySmall.fontSize,
                fontWeight: '600',
              }}>
                {isUpdating ? 'Unclaiming...' : 'Unclaim'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={{
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: getSpacing.md,
      marginTop: getSpacing.md,
    }}>
      {renderTransportSection('dropOff', dropOffInfo, userClaimedDropOff, canClaimDropOff)}
      {renderTransportSection('pickUp', pickUpInfo, userClaimedPickUp, canClaimPickUp)}
      {renderEditModal()}
    </View>
  );
};

export default TransportResponses;