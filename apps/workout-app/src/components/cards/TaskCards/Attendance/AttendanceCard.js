import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useData } from "../../../../contexts/DataContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import NotesComponent from "../../../NotesComponent";
import AttendanceHeader from "./AttendanceHeader";
import AttendanceResponses from "./AttendanceResponses";

const AttendanceCard = ({
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
  console.log("Current Assignment State:", currentAssignment);

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
      
      console.log("✅ Assignment notes updated successfully");
    } catch (error) {
      console.error("❌ Error updating assignment notes:", error);
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

  console.log("AttendanceCard props:", {
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

  const responses = useMemo(() => {
    return currentAssignment?.attendanceData?.responses || [];
  }, [currentAssignment]);
  console.log("All Responses:", responses);

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

  const allowingPlusOnes = useMemo(() => {
    return currentAssignment?.attendanceData?.settings?.allowPlusOnes || false;
  }, [currentAssignment]);
  console.log("Allowing Plus Ones:", allowingPlusOnes);

  const plusOnes = useMemo(() => {
    if (!currentAssignment || !currentAssignment.attendanceData) return [];
    return currentAssignment.attendanceData.responses
      .filter((response) => !response.userId)
      .map((response, index) => ({
        // Use guestId if available, otherwise fall back to index-based key
        id: response.guestId || `plus-one-${index}`,
        username: response.username,
        response: response.response,
        guestId: response.guestId,
      }));
  }, [currentAssignment]);
  console.log("Plus Ones:", plusOnes);

  const myResponse = useMemo(() => {
    if (!currentAssignment || !currentAssignment.attendanceData) return null;
    return currentAssignment.attendanceData.responses.find(
      (response) => response.userId === user?.userId
    )?.response;
  }, [currentAssignment, user]);
  console.log("My Response:", myResponse);

  function getUsersResponse(userId) {
    // Check if assignment, attendanceData, and responses exist
    if (
      !currentAssignment ||
      !currentAssignment.attendanceData ||
      !Array.isArray(currentAssignment.attendanceData.responses)
    ) {
      console.log("getUsersResponse: Invalid assignment or responses", {
        currentAssignment,
        userId,
      });
      return null;
    }

    // Find the response for the given userId
    const responseObj = currentAssignment.attendanceData.responses.find(
      (response) => response && response.userId === userId
    );

    // Return the response value or null if not found or invalid
    return responseObj && responseObj.response !== undefined
      ? responseObj.response
      : null;
  }

  const getMyResponse = () => {
    if (!currentAssignment.attendanceData?.responses) return null;
    return currentAssignment.attendanceData.responses.find(
      (response) => response.userId === user?.userId
    );
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
      <AttendanceHeader
        assignment={currentAssignment}
        group={thisGroup}
        handleAssignmentPress={() => handleAssignmentPress()}
        responses={responses}
        totalUsers={usersWhoCanRespond.length + plusOnes.length}
        myResponse={myResponse}
        isExpanded={expandCard}
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
        <AttendanceResponses
          assignment={currentAssignment}
          groupId={groupId}
          onAssignmentUpdate={handleAssignmentUpdate}
          isEventPast={isEventPast}
          thisGroup={thisGroup}
          amIAdminOfThisGroup={amIAdminOfThisGroup}
          getUsersResponse={getUsersResponse}
          getMyResponse={getMyResponse}
          responses={responses}
          usersWhoCanRespond={usersWhoCanRespond}
          allowingPlusOnes={allowingPlusOnes}
          plusOnes={plusOnes}
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

export default AttendanceCard;