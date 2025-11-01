import React, { useState, useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useData } from "../../../../contexts/DataContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import TransportResponses from "./TransportResponses";
import TransportHeader from "./TransportHeader";
import NotesComponent from "../../../NotesComponent";

const TransportCard = ({
  assignment,
  groupId,
  onAssignmentUpdate,
  isEventPast,
  thisGroup,
  amIAdminOfThisGroup,
  eventDate = null, // Optional prop for event date
  onDeleteAssignment, // Delete function passed from parent
  isDeleting = false, // Delete loading state passed from parent
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user } = useData();
  console.log("Event Date:", eventDate);
  
  // Local state to track assignment updates
  const [currentAssignment, setCurrentAssignment] = useState(assignment);
  const [expandCard, setExpandCard] = useState(false);

  const onNotesUpdate = async (updatedNotes) => {
    console.log("Notes updated, updating local assignment...");
    
    try {
      // Update the task in the database
      await updateTask(
        currentAssignment.isPersonalTask ? user.userId : groupId,
        currentAssignment.taskId,
        { notes: updatedNotes },
        user?.userId
      );
      
      // Update the local assignment with new notes
      const updatedAssignment = {
        ...currentAssignment,
        notes: updatedNotes
      };
      
      setCurrentAssignment(updatedAssignment);
      
      // Notify parent component if callback provided
      if (onAssignmentUpdate) {
        onAssignmentUpdate(updatedAssignment);
      }
      
      console.log("✅ Transport notes updated successfully");
    } catch (error) {
      console.error("❌ Error updating transport notes:", error);
      // Could show error message to user here
    }
  };

  const handleAssignmentPress = () => {
    setExpandCard(!expandCard);
  };

  // Update local state when prop changes
  useEffect(() => {
    setCurrentAssignment(assignment);
    console.log("Updated assignment");
  }, [assignment]);

  console.log("TransportCard props:", {
    assignment: currentAssignment,
    groupId,
  });

  // Callback to handle assignment updates from child components
  const handleAssignmentUpdate = (updatedAssignment) => {
    setCurrentAssignment(updatedAssignment);
    // Also notify parent component if callback provided
    if (onAssignmentUpdate) {
      onAssignmentUpdate(updatedAssignment);
    }
  };

  const notes = useMemo(() => {
    return currentAssignment?.notes || [];
  }, [currentAssignment]);
  console.log("Notes:", notes);

  const usersWhoCanRespond = useMemo(() => {
    if (!thisGroup || !thisGroup.members || !currentAssignment) return [];

    if (currentAssignment.isPersonalTask) {
      return [user];
    }

    // Handle both 'all' (string) and ['all'] (array containing 'all')
    // Also handle the new 'visibilityOption' field
    const visibleTo = currentAssignment.visibleTo || currentAssignment.visibilityOption;
    
    if (
      visibleTo === "all" ||
      (Array.isArray(visibleTo) && visibleTo.includes("all"))
    ) {
      return thisGroup.members;
    } else if (Array.isArray(visibleTo)) {
      return thisGroup.members.filter((member) =>
        visibleTo.includes(member.userId)
      );
    } else if (Array.isArray(currentAssignment.selectedMembers)) {
      // Use selectedMembers if available
      return thisGroup.members.filter((member) =>
        currentAssignment.selectedMembers.includes(member.userId)
      );
    }
    return [];
  }, [thisGroup, currentAssignment]);

  // Updated to handle the new data structure
  const transportData = useMemo(() => {
    return currentAssignment?.transportData || currentAssignment || {};
  }, [currentAssignment]);
  console.log("Transport Data:", transportData);

  const dropOffInfo = useMemo(() => {
    // Handle both old (transportData.dropOff) and new (dropOff) structure
    const dropOff = transportData?.dropOff || currentAssignment?.dropOff || {};
    
    // Convert new structure to expected format
    if (dropOff.assignedTo || dropOff.status) {
      return {
        assignedTo: dropOff.assignedTo,
        assignedToId: dropOff.assignedToId,
        status: dropOff.status,
        reason: dropOff.reason || null
      };
    }
    
    return dropOff;
  }, [transportData, currentAssignment]);

  const pickUpInfo = useMemo(() => {
    // Handle both old (transportData.pickUp) and new (pickUp) structure
    const pickUp = transportData?.pickUp || currentAssignment?.pickUp || {};
    
    // Convert new structure to expected format
    if (pickUp.assignedTo || pickUp.status) {
      return {
        assignedTo: pickUp.assignedTo,
        assignedToId: pickUp.assignedToId,
        status: pickUp.status
      };
    }
    
    return pickUp;
  }, [transportData, currentAssignment]);

  console.log("Drop Off Info:", dropOffInfo);
  console.log("Pick Up Info:", pickUpInfo);

  // Check if user can claim drop off or pick up
  const canClaimDropOff = useMemo(() => {
    // Can't claim if status is 'handled' or if someone else is assigned
    if (dropOffInfo.status === 'handled') return false;
    return !dropOffInfo.assignedTo || dropOffInfo.assignedTo === null;
  }, [dropOffInfo]);

  const canClaimPickUp = useMemo(() => {
    // Can't claim if status is 'handled' or if someone else is assigned
    if (pickUpInfo.status === 'handled') return false;
    return !pickUpInfo.assignedTo || pickUpInfo.assignedTo === null;
  }, [pickUpInfo]);

  // Check if current user has claimed either (but not if status is 'handled')
  const userClaimedDropOff = useMemo(() => {
    if (dropOffInfo.status === 'handled') return false;
    return dropOffInfo.assignedToId === user?.userId;
  }, [dropOffInfo, user]);

  const userClaimedPickUp = useMemo(() => {
    if (pickUpInfo.status === 'handled') return false;
    return pickUpInfo.assignedToId === user?.userId;
  }, [pickUpInfo, user]);

  console.log("Can claim drop off:", canClaimDropOff);
  console.log("Can claim pick up:", canClaimPickUp);
  console.log("User claimed drop off:", userClaimedDropOff);
  console.log("User claimed pick up:", userClaimedPickUp);

  // Get status summary for header
  const getTransportStatus = () => {
    const dropOffHandled = dropOffInfo.assignedTo ? true : false;
    const pickUpHandled = pickUpInfo.assignedTo ? true : false;
    
    if (dropOffHandled && pickUpHandled) {
      return "Both handled";
    } else if (dropOffHandled) {
      return "Drop off handled";
    } else if (pickUpHandled) {
      return "Pick up handled";
    } else {
      return "Transportation needed";
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      padding: getSpacing.md,
      borderRadius: 8,
      marginTop: getSpacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: expandCard ? 80 : getSpacing.md,
    },
    title: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: getTypography.h4.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    description: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.sm,
      lineHeight: 20,
    },
    eventInfo: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
      marginBottom: getSpacing.md,
    },
    deleteButton: {
      padding: getSpacing.sm,
      backgroundColor: isDeleting ? '#9ca3af' : '#ef4444',
      color: theme.text.inverse,
      textAlign: "center",
      marginTop: getSpacing.md,
      marginBottom: getSpacing.sm,
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      borderRadius: 6,
      opacity: isDeleting ? 0.6 : 1,
    },
  });

  return (
    <View style={styles.container}>
      <TransportHeader
        assignment={currentAssignment}
        group={thisGroup}
        handleAssignmentPress={() => handleAssignmentPress()}
        dropOffInfo={dropOffInfo}
        pickUpInfo={pickUpInfo}
        transportStatus={getTransportStatus()}
        userClaimedDropOff={userClaimedDropOff}
        userClaimedPickUp={userClaimedPickUp}
        expandCard={expandCard}
        notes={notes}
      />
        
      {expandCard && (
        <>
        {/* Notes Component */}
        <NotesComponent
            notes={notes}
            isEventPast={isEventPast}
            assignmentId={currentAssignment.taskId || currentAssignment.assignmentId}
            docId={currentAssignment.isPersonalTask ? user.userId : groupId}
            onNotesUpdate={onNotesUpdate}
        />
        <TransportResponses
          assignment={currentAssignment}
          groupId={groupId}
          onAssignmentUpdate={handleAssignmentUpdate}
          isEventPast={isEventPast}
          thisGroup={thisGroup}
          amIAdminOfThisGroup={amIAdminOfThisGroup}
          dropOffInfo={dropOffInfo}
          pickUpInfo={pickUpInfo}
          canClaimDropOff={canClaimDropOff}
          canClaimPickUp={canClaimPickUp}
          userClaimedDropOff={userClaimedDropOff}
          userClaimedPickUp={userClaimedPickUp}
          usersWhoCanRespond={usersWhoCanRespond}
        />
        </>
      )}
      {/* Delete Assignment button - uses passed function */}
      {amIAdminOfThisGroup && !isEventPast && expandCard && (
        <Text
          style={styles.deleteButton}
          onPress={onDeleteAssignment}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete Assignment"}
        </Text>
      )}
    </View>
  );
};

export default TransportCard;