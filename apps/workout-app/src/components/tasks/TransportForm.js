import React, { useEffect, useMemo, memo, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useData } from '../../contexts/DataContext';

const TransportForm = ({ taskData, setTaskData, selectedGroup, setErrors }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { groups, user } = useData();

  // State to track if assignment dropdowns are open
  const [isDropOffAssignmentOpen, setIsDropOffAssignmentOpen] = useState(false);
  const [isPickUpAssignmentOpen, setIsPickUpAssignmentOpen] = useState(false);

  // Convenience access
  const { dropOff = {}, pickUp = {} } = taskData || {};

  // Memoize assignable members
  const assignableMembers = useMemo(() => {
    return groups?.find(group => group.groupId === selectedGroup.groupId)?.members || [];
  }, [groups, selectedGroup]);

  // Use useCallback to memoize the update function
  const updateTransportField = useCallback((section, key, value, assignedToId = null, assignedToUsername = null) => {
    setTaskData(prev => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [key]: value,
        ...(assignedToId !== null && { assignedToId }),
        ...(assignedToUsername !== null && { assignedTo: assignedToUsername })
      }
    }));
  }, [setTaskData]);

  // Function to handle user assignment
  const handleUserAssignment = useCallback((type, member) => {
    updateTransportField(
      type,
      'status',
      'assigned',
      member.userId,
      member.displayName || member.username
    );
  }, [updateTransportField]);

  // Function to handle assignment status selection
  const handleAssignmentStatusSelect = useCallback((type) => {
    // Explicitly set the new state to 'assigned' and clear any previous assignments
    setTaskData(prev => ({
        ...prev,
        [type]: {
            ...prev?.[type],
            status: 'assigned',
            assignedToId: null,
            assignedTo: null,
        }
    }));
    
    // Open the appropriate assignment dropdown
    if (type === 'dropOff') {
      setIsDropOffAssignmentOpen(true);
      setIsPickUpAssignmentOpen(false);
    } else {
      setIsPickUpAssignmentOpen(true);
      setIsDropOffAssignmentOpen(false);
    }
  }, [setTaskData]);

  // Function to handle non-assignment status selection
  const handleStatusSelect = useCallback((type, status) => {
    if (status === 'handled') {
      // Always clear assignments and set default reason when selecting 'handled'
      setTaskData(prev => ({
        ...prev,
        [type]: {
          status: 'handled',
          assignedToId: null,
          assignedTo: null,
          reason: 'Handled'
        }
      }));
    } else if (status === 'available') {
      // Clear assignments for available status
      setTaskData(prev => ({
        ...prev,
        [type]: {
          status: 'available',
          assignedToId: null,
          assignedTo: null
        }
      }));
    } else {
      // For other statuses, use updateTransportField but ensure we clear assignments
      setTaskData(prev => ({
        ...prev,
        [type]: {
          ...prev?.[type],
          status: status,
          assignedToId: null,
          assignedTo: null
        }
      }));
    }
    
    // Close assignment dropdowns when selecting other statuses
    if (type === 'dropOff') {
      setIsDropOffAssignmentOpen(false);
    } else {
      setIsPickUpAssignmentOpen(false);
    }
  }, [setTaskData]);

  // Set initial state for dropOff and pickUp if they don't exist
  useEffect(() => {
    setTaskData(prev => {
      const newDropOff = prev.dropOff || { status: 'available', assignedTo: null, assignedToId: null };
      const newPickUp = prev.pickUp || { status: 'available', assignedTo: null, assignedToId: null };
      return {
        ...prev,
        dropOff: newDropOff,
        pickUp: newPickUp
      };
    });
  }, [setTaskData]);

  // Update assignment dropdown states based on current status
  useEffect(() => {
    setIsDropOffAssignmentOpen(dropOff.status === 'assigned');
    setIsPickUpAssignmentOpen(pickUp.status === 'assigned');
  }, [dropOff.status, pickUp.status]);

  // Use useEffect to manage and set validation errors
  useEffect(() => {
    const errors = [];
    if (dropOff.status === 'assigned' && (!dropOff.assignedToId || !dropOff.assignedTo)) {
      errors.push('Drop Off not assigned to anyone');
    }

    if (pickUp.status === 'assigned' && (!pickUp.assignedToId || !pickUp.assignedTo)) {
      errors.push('Pick Up not assigned to anyone');
    }

    setErrors(errors);

  }, [dropOff, pickUp, setErrors]);

  const renderTransportOption = useCallback((type, status, reason, assignedTo, assignedToId) => {
    const isAssignmentOpen = type === 'dropOff' ? isDropOffAssignmentOpen : isPickUpAssignmentOpen;
    
    return (
      <View style={{
        backgroundColor: theme.background,
        borderRadius: 8,
        padding: getSpacing.md,
        marginBottom: getSpacing.md,
      }}>
        <Text style={{
          fontSize: getTypography.h4.fontSize,
          fontWeight: getTypography.h4.fontWeight,
          color: theme.text.primary,
          marginBottom: getSpacing.md,
        }}>
          {type === 'dropOff' ? '🚗 DROP OFF' : '🚗 PICK UP'}
        </Text>

        <View style={{ gap: getSpacing.sm }}>
          {/* Available */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: getSpacing.sm }}
            onPress={() => handleStatusSelect(type, 'available')}
          >
            <View style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: status === 'available' ? theme.primary : theme.border,
              marginRight: getSpacing.sm,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {status === 'available' && (
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

          {/* Claimed */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: getSpacing.sm }}
            onPress={() => {
              setTaskData(prev => ({
                ...prev,
                [type]: {
                  status: 'claimed',
                  assignedToId: user?.userId,
                  assignedTo: user?.displayName || user?.username
                }
              }));
            }}
          >
            <View style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: status === 'claimed' ? theme.primary : theme.border,
              marginRight: getSpacing.sm,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {status === 'claimed' && (
                <View style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: theme.primary
                }} />
              )}
            </View>
            <Text style={{ fontSize: getTypography.body.fontSize, color: theme.text.primary }}>
              I'll handle {type === 'dropOff' ? 'drop off' : 'pick up'}
            </Text>
          </TouchableOpacity>

          {/* Assigned */}
          {assignableMembers?.length > 1 && (
            <View>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: getSpacing.sm }}
                onPress={() => handleAssignmentStatusSelect(type)}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: status === 'assigned' ? theme.primary : theme.border,
                  marginRight: getSpacing.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {status === 'assigned' && (
                    <View style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: theme.primary
                    }} />
                  )}
                </View>
                <Text style={{ fontSize: getTypography.body.fontSize, color: theme.text.primary }}>
                  Assign to group member
                </Text>
              </TouchableOpacity>

              {/* Assignment dropdown - shows when assignment is open */}
              {isAssignmentOpen && (
                <View style={{ marginLeft: 32, marginTop: getSpacing.sm }}>
                  <Text style={{
                    fontSize: getTypography.bodySmall.fontSize,
                    color: theme.text.secondary,
                    marginBottom: getSpacing.xs,
                  }}>
                    Assign to:
                  </Text>
                  <View style={{ gap: getSpacing.xs }}>
                    {assignableMembers?.filter(member => member.userId !== user?.userId).map(member => (
                      <TouchableOpacity
                        key={member.userId}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: getSpacing.xs }}
                        onPress={() => handleUserAssignment(type, member)}
                      >
                        <View style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          borderWidth: 2,
                          borderColor: assignedToId === member.userId ? theme.primary : theme.border,
                          marginRight: getSpacing.sm,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {assignedToId === member.userId && (
                            <View style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: theme.primary
                            }} />
                          )}
                        </View>
                        <Text style={{
                          fontSize: getTypography.bodySmall.fontSize,
                          color: theme.text.primary,
                        }}>
                          {member.displayName || member.username}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Show assigned user if someone is selected and it's not the current user */}
          {assignedTo && assignedToId && assignedToId !== user?.userId && (
            <View style={{
              marginTop: getSpacing.sm,
              padding: getSpacing.sm,
              backgroundColor: theme.surface,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: theme.primary,
            }}>
              <Text style={{
                fontSize: getTypography.bodySmall.fontSize,
                color: theme.primary,
                fontWeight: '500',
              }}>
                Assigned to: {assignedTo}
              </Text>
            </View>
          )}

          {/* Handled */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: getSpacing.sm }}
            onPress={() => handleStatusSelect(type, 'handled')}
          >
            <View style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: status === 'handled' ? theme.primary : theme.border,
              marginRight: getSpacing.sm,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {status === 'handled' && (
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

          {status === 'handled' && (
            <TextInput
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 6,
                padding: getSpacing.sm,
                marginTop: getSpacing.sm,
                marginLeft: 32,
                fontSize: getTypography.body.fontSize,
                color: theme.text.primary,
              }}
              placeholder="How is it handled? (e.g., School bus, Walking, Carpool)"
              placeholderTextColor={theme.text.tertiary}
              value={reason}
              onChangeText={(text) => updateTransportField(type, 'reason', text)}
              maxLength={50}
            />
          )}
        </View>
      </View>
    );
  }, [theme, getSpacing, getTypography, updateTransportField, handleUserAssignment, handleAssignmentStatusSelect, handleStatusSelect, assignableMembers, user, isDropOffAssignmentOpen, isPickUpAssignmentOpen]);

  return (
    <View style={{ marginBottom: getSpacing.lg }}>
      <Text style={{
        fontSize: getTypography.h4.fontSize,
        fontWeight: getTypography.h4.fontWeight,
        color: theme.text.primary,
        marginBottom: getSpacing.md,
      }}>
        Customize Each Step
      </Text>

      {renderTransportOption('dropOff', dropOff.status, dropOff.reason, dropOff.assignedTo, dropOff.assignedToId)}
      {renderTransportOption('pickUp', pickUp.status, pickUp.reason, pickUp.assignedTo, pickUp.assignedToId)}
    </View>
  );
};

export default memo(TransportForm);