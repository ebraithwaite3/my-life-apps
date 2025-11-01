import React, { useState, useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useData } from "../../../../contexts/DataContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import ChecklistResponses from "./ChecklistResponses";
import ChecklistHeader from "./ChecklistHeader";
import NotesComponent from "../../../NotesComponent";

const ChecklistCard = ({
  assignment,
  groupId,
  onAssignmentUpdate,
  isEventPast,
  thisGroup,
  amIAdminOfThisGroup,
  eventDate = null,
  onDeleteAssignment,
  isDeleting = false,
  parentScrollRef // <-- Add this prop
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user } = useData();
  
  const [currentAssignment, setCurrentAssignment] = useState(assignment);
  const [expandCard, setExpandCard] = useState(false);

  const onNotesUpdate = async (updatedNotes) => {
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
      
      if (onAssignmentUpdate) {
        onAssignmentUpdate(updatedAssignment);
      }
      
      console.log("✅ Checklist notes updated successfully");
    } catch (error) {
      console.error("❌ Error updating checklist notes:", error);
      // Could show error message to user here
    }
  };

  const handleAssignmentPress = () => {
    setExpandCard(!expandCard);
  };

  useEffect(() => {
    setCurrentAssignment(assignment);
  }, [assignment]);

  const handleAssignmentUpdate = (updatedAssignment) => {
    setCurrentAssignment(updatedAssignment);
    if (onAssignmentUpdate) {
      onAssignmentUpdate(updatedAssignment);
    }
  };

  const notes = useMemo(() => {
    return currentAssignment?.notes || [];
  }, [currentAssignment]);

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
  const listData = useMemo(() => {
    return currentAssignment?.listData || currentAssignment?.checklistData || {};
  }, [currentAssignment]);

  const listItems = useMemo(() => {
    return listData?.items || [];
  }, [listData]);

  const completedCount = useMemo(() => {
    return listItems.filter(item => item.completed === true).length;
  }, [listItems]);

  const totalCount = useMemo(() => {
    return listItems.length;
  }, [listItems]);

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
      <ChecklistHeader
        assignment={currentAssignment}
        group={thisGroup}
        handleAssignmentPress={() => handleAssignmentPress()}
        listItems={listItems}
        completedCount={completedCount}
        totalCount={totalCount}
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
          <ChecklistResponses
            assignment={currentAssignment}
            groupId={groupId}
            docId={currentAssignment.isPersonalTask ? user.userId : groupId}
            onAssignmentUpdate={handleAssignmentUpdate}
            isEventPast={isEventPast}
            thisGroup={thisGroup}
            amIAdminOfThisGroup={amIAdminOfThisGroup}
            listItems={listItems}
            completedCount={completedCount}
            totalCount={totalCount}
            usersWhoCanRespond={usersWhoCanRespond}
            parentScrollRef={parentScrollRef} // <-- Pass the prop here
          />
        </>
      )}
      
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

export default ChecklistCard;