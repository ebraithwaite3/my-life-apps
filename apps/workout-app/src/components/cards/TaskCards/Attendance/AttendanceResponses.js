import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useData } from "../../../../contexts/DataContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useTaskActions } from "../../../../hooks";
// import { editAssignment } from "../../../../services/assignmentsService";

const AttendanceResponses = ({
    assignment,
    groupId,
    onAssignmentUpdate,
    isEventPast,
    thisGroup,
    amIAdminOfThisGroup,
    getUsersResponse,
    getMyResponse,
    responses = [],
    usersWhoCanRespond = [],
    allowingPlusOnes = false,
    plusOnes = [],
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user, userGroups } = useData();
    const { updateTask } = useTaskActions();
  const [isUpdating, setIsUpdating] = useState(false);
  const [localAssignment, setLocalAssignment] = useState(assignment);
  console.log("Users Who Can Respond:", usersWhoCanRespond);

  // New state for guest inputs
  const [guestInputs, setGuestInputs] = useState([]);
  const [nextGuestId, setNextGuestId] = useState(1);

  // Update local state when assignment prop changes
  React.useEffect(() => {
    setLocalAssignment(assignment);
  }, [assignment]);

  // Use localAssignment for all calculations
  const currentAssignment = localAssignment;

  console.log("This Group:", thisGroup, "This Assignment:", currentAssignment);
  console.log("Am I Admin of This Group:", amIAdminOfThisGroup);

  console.log(
    "Users Who Can Respond:",
    usersWhoCanRespond,
    "Assignment VisibleTo:",
    currentAssignment?.visibleTo,
    "Group Members:",
    thisGroup?.members
  );

  // Guest input handlers
  const addGuestInput = () => {
    const newGuest = {
      id: nextGuestId,
      name: ''
    };
    setGuestInputs(prev => [...prev, newGuest]);
    setNextGuestId(prev => prev + 1);
  };

  const removeGuestInput = (guestId) => {
    setGuestInputs(prev => prev.filter(guest => guest.id !== guestId));
  };

  const updateGuestName = (guestId, name) => {
    setGuestInputs(prev => 
      prev.map(guest => 
        guest.id === guestId ? { ...guest, name } : guest
      )
    );
  };

  const saveGuests = async () => {
    if (isUpdating) return;
    
    // Filter guests with non-empty names
    const guestsToSave = guestInputs.filter(guest => guest.name.trim() !== '');
    
    if (guestsToSave.length === 0) {
      // Just clear inputs if no names were entered
      setGuestInputs([]);
      return;
    }
    
    setIsUpdating(true);
    
    try {
      console.log('Saving guests:', guestsToSave);
      
      // Get current responses array
      const currentResponses = currentAssignment.attendanceData?.responses || [];
      
      // Create new guest responses with unique guestId
      const newGuestResponses = guestsToSave.map((guest, index) => ({
        username: guest.name.trim(),
        response: 'yes',
        // Add a unique identifier for plus ones
        guestId: `guest-${Date.now()}-${index}`,
        createdAt: new Date().toISOString()
      }));
      
      // Add new guest responses to existing responses
      const updatedResponses = [...currentResponses, ...newGuestResponses];
      
      // Prepare the assignment update
      const assignmentUpdates = {
        attendanceData: {
          ...currentAssignment.attendanceData,
          responses: updatedResponses
        }
      };
      
      // Update local state immediately for instant UI feedback
      const updatedAssignment = {
        ...currentAssignment,
        ...assignmentUpdates
      };
      setLocalAssignment(updatedAssignment);
      
      // Also notify parent component if callback provided
      if (onAssignmentUpdate) {
        onAssignmentUpdate(updatedAssignment);
      }
      
      // TODO: Update the assignment in the database when you implement the service
      console.log('Would save to database:', {
        docId: currentAssignment.isPersonalTask ? user.userId : groupId,
        taskId: currentAssignment.taskId || currentAssignment.assignmentId,
        updates: assignmentUpdates
      });
      
      console.log('✅ Successfully saved guests (locally for now)');
      
      // Clear guest inputs after successful save
      setGuestInputs([]);
      
    } catch (error) {
      console.error('Error saving guests:', error);
      
      // Revert local state on error
      setLocalAssignment(assignment);
      if (onAssignmentUpdate) {
        onAssignmentUpdate(assignment);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const cancelGuestInputs = () => {
    setGuestInputs([]);
  };

  const handleResponseToggle = async (responseType, userId = null) => {
    if (isUpdating) return; // Prevent multiple simultaneous updates
    
    const targetUserId = userId || user?.userId;
    
    if (!targetUserId || !currentAssignment?.taskId) {
      console.error('Missing required data for response update');
      return;
    }

    setIsUpdating(true);
    
    try {
      console.log(`Updating response to: ${responseType} for user: ${targetUserId}`);
      
      // Get current responses array
      const currentResponses = currentAssignment.attendanceData?.responses || [];
      
      // Find existing response index for this user
      const existingResponseIndex = currentResponses.findIndex(
        response => response.userId === targetUserId
      );
      
      // Create updated responses array
      const updatedResponses = [...currentResponses];
      
      if (existingResponseIndex >= 0) {
        // Update existing response
        updatedResponses[existingResponseIndex] = {
          ...updatedResponses[existingResponseIndex],
          response: responseType,
          updatedAt: new Date().toISOString()
        };
      } else {
        // Add new response - get user info for the response
        const targetUser = usersWhoCanRespond.find(member => member.userId === targetUserId);
        if (targetUser) {
          updatedResponses.push({
            userId: targetUserId,
            username: targetUser.username || targetUser.name || 'Unknown',
            response: responseType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      // Prepare the assignment update
      const updates = {
        attendanceData: {
          ...currentAssignment.attendanceData,
          responses: updatedResponses
        }
      };
      
      // Save to database using updateTask
      await updateTask(
        currentAssignment.isPersonalTask ? user.userId : groupId,
        currentAssignment.taskId,
        updates,
        user?.userId
      );
      
      // Update local state immediately for instant UI feedback
      const updatedAssignment = {
        ...currentAssignment,
        ...updates
      };
      setLocalAssignment(updatedAssignment);
      
      // Also notify parent component if callback provided
      if (onAssignmentUpdate) {
        onAssignmentUpdate(updatedAssignment);
      }
      
      console.log(`✅ Successfully updated response for user: ${targetUserId}`);
      
    } catch (error) {
      console.error('Error updating assignment response:', error);
      
      // Revert local state on error
      setLocalAssignment(assignment);
      if (onAssignmentUpdate) {
        onAssignmentUpdate(assignment);
      }
      
      // You might want to show an error message to the user here
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (username, userId, isPlusOne = false) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    try {
      console.log(`Deleting response for ${username}`);
      
      // Get current responses array
      const currentResponses = currentAssignment.attendanceData?.responses || [];
      
      // Filter out the response to delete
      const updatedResponses = currentResponses.filter(response => {
        if (isPlusOne) {
          // For plus ones, try to match by guestId first, then fall back to username
          const plusOneToDelete = plusOnes.find(p => p.username === username);
          if (response.guestId && plusOneToDelete?.guestId) {
            return response.guestId !== plusOneToDelete.guestId;
          }
          // Fallback to username matching for older records without guestId
          return !(response.username === username && !response.userId);
        } else {
          // For regular users, match by userId
          return response.userId !== userId;
        }
      });
      
      // Prepare the assignment update
      const updates = {
        attendanceData: {
          ...currentAssignment.attendanceData,
          responses: updatedResponses
        }
      };
      
      // Save to database using updateTask
      await updateTask(
        currentAssignment.isPersonalTask ? user.userId : groupId,
        currentAssignment.taskId,
        updates,
        user?.userId
      );
      
      // Update local state immediately for instant UI feedback
      const updatedAssignment = {
        ...currentAssignment,
        ...updates
      };
      setLocalAssignment(updatedAssignment);
      
      // Also notify parent component if callback provided
      if (onAssignmentUpdate) {
        onAssignmentUpdate(updatedAssignment);
      }
      
      console.log(`✅ Successfully deleted response for: ${username}`);
      
    } catch (error) {
      console.error('Error deleting user response:', error);
      
      // Revert local state on error
      setLocalAssignment(assignment);
      if (onAssignmentUpdate) {
        onAssignmentUpdate(assignment);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const getResponseColor = (responseType) => {
    switch (responseType) {
      case "yes":
        return "#22c55e"; // Green
      case "no":
        return "#ef4444"; // Red
      case "maybe":
        return "#f97316"; // Orange
      default:
        return theme.primary;
    }
  };

  const renderResponseButton = (responseType, label, userId = null) => {
    const targetUserId = userId || user?.userId;
    const targetResponse = userId ? getUsersResponse(userId) : getMyResponse()?.response;
    const isSelected = targetResponse === responseType;
    const responseColor = getResponseColor(responseType);

    return (
      <TouchableOpacity
        key={responseType}
        onPress={() => handleResponseToggle(responseType, userId)}
        disabled={isUpdating}
        style={[
          styles.responseButton,
          isSelected && {
            backgroundColor: responseColor,
            borderColor: responseColor,
          },
          isUpdating && styles.disabledButton,
        ]}
      >
        <Text
          style={[
            styles.responseButtonText,
            isSelected && styles.selectedResponseButtonText,
            isUpdating && styles.disabledButtonText,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderResponseStatus = (responseType) => {
    if (!responseType) {
      return <Text style={styles.noResponseText}>🤷‍♂️</Text>;
    }

    const responseColor = getResponseColor(responseType);
    const label = responseType.charAt(0).toUpperCase() + responseType.slice(1);

    return (
      <View
        style={[
          styles.responseButton,
          {
            backgroundColor: responseColor,
            borderColor: responseColor,
          },
        ]}
      >
        <Text style={[styles.responseButtonText, styles.selectedResponseButtonText]}>
          {label}
        </Text>
      </View>
    );
  };

  const renderUserResponse = (member, userResponse, isPlusOne = false) => {
    const isMe = member.userId === user?.userId;
    const allowMaybe = currentAssignment.attendanceData?.settings?.allowMaybeResponse;
    const username = isMe ? "Me" : (member.username || member.name || "Unknown Member");

    return (
      <View key={member.userId || member.id} style={styles.responseRow}>
        <Text style={styles.responseName}>
          {username}
        </Text>

        <View style={styles.responseRight}>
          {(isMe || (amIAdminOfThisGroup && !isPlusOne)) && !isEventPast ? (
            // Show interactive buttons for current user if event hasn't started
            <View style={styles.responseButtons}>
              {renderResponseButton("yes", "Yes", member.userId)}
              {allowMaybe && renderResponseButton("maybe", "Maybe", member.userId)}
              {renderResponseButton("no", "No", member.userId)}
            </View>
          ) : (
            // Show styled response status for others
            renderResponseStatus(userResponse)
          )}

          {/* Show delete button for admins (but only for the Plus Ones) */}
          {amIAdminOfThisGroup && !isMe && isPlusOne && (
            <TouchableOpacity
              style={[styles.deleteButton, isUpdating && styles.disabledButton]}
              onPress={() => handleDeleteUser(username, member.userId, isPlusOne)}
              disabled={isUpdating}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          )}

        </View>
      </View>
    );
  };

  const renderGuestInput = (guest) => {
    return (
      <View key={guest.id} style={styles.guestInputRow}>
        <TextInput
          style={styles.guestInput}
          placeholder="Guest name"
          value={guest.name}
          onChangeText={(text) => updateGuestName(guest.id, text)}
          placeholderTextColor={theme.text.secondary}
        />
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => removeGuestInput(guest.id)}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 8,
      padding: getSpacing.md,
      marginTop: getSpacing.md,
    },
    title: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: getTypography.h4.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
    },
    responseRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    responseName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "500",
      color: theme.text.primary,
      flex: 1,
    },
    responseRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
    },
    deleteButton: {
      padding: getSpacing.xs,
    },
    deleteIcon: {
      fontSize: 16,
    },
    responseButtons: {
      flexDirection: "row",
      gap: getSpacing.xs,
    },
    responseButton: {
      paddingHorizontal: getSpacing.sm,
      paddingVertical: getSpacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 6,
      backgroundColor: theme.background,
    },
    responseButtonText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      fontWeight: "500",
    },
    selectedResponseButtonText: {
      color: theme.text.inverse,
    },
    noResponseText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
    },
    disabledButton: {
      opacity: 0.6,
    },
    disabledButtonText: {
      opacity: 0.6,
    },
    guestInputRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: getSpacing.sm,
    },
    guestInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 6,
      paddingHorizontal: getSpacing.sm,
      paddingVertical: getSpacing.xs,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.background,
    },
    actionButtons: {
      flexDirection: "row",
      gap: getSpacing.sm,
      marginTop: getSpacing.md,
    },
    saveButton: {
      backgroundColor: "#22c55e",
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      borderRadius: 6,
      flex: 1,
    },
    cancelButton: {
      backgroundColor: "#6b7280",
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      borderRadius: 6,
      flex: 1,
    },
    actionButtonText: {
      color: "#ffffff",
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      textAlign: "center",
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.select({ ios: 64, android: 0 })} // tweak if you have a header
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: getSpacing.lg }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true} // iOS 15+
      >
        <View style={styles.container}>
          <Text style={styles.title}>Responses</Text>

          {/* Map through all users who can respond */}
          {usersWhoCanRespond?.map((member) => {
            const userResponse = getUsersResponse(member.userId);
            return renderUserResponse(member, userResponse);
          })}

          {/* Show plus ones */}
          {plusOnes?.map((plusOne) => {
            return renderUserResponse(
              { id: plusOne.id, name: plusOne.username },
              plusOne.response,
              true // isPlusOne = true
            );
          })}

          {/* Render guest input fields */}
          {guestInputs.map(renderGuestInput)}

          {/* Action buttons - show if there are any guest inputs */}
          {guestInputs.length > 0 && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.saveButton, isUpdating && styles.disabledButton]}
                onPress={saveGuests}
                disabled={isUpdating}
              >
                <Text style={styles.actionButtonText}>
                  {isUpdating ? "Saving..." : "Save Guests"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelButton, isUpdating && styles.disabledButton]}
                onPress={cancelGuestInputs}
                disabled={isUpdating}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Add Guest button - only show if event hasn't started and plus ones are allowed */}
          {!isEventPast && allowingPlusOnes && (
            <TouchableOpacity
              style={[styles.responseButton, { backgroundColor: theme.primary, marginTop: getSpacing.md }]}
              onPress={addGuestInput}
            >
              <Text style={[styles.responseButtonText, styles.selectedResponseButtonText]}>
                + Add Guest
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AttendanceResponses;