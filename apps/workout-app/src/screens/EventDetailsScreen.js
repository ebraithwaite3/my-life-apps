import React, { useState, useMemo, useRef } from 'react'; // <-- ADDED useRef
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView, // <-- ADDED
  Platform,             // <-- ADDED
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import EventHeader from '../components/EventHeader';
import AttendanceCard from '../components/cards/TaskCards/Attendance/AttendanceCard';
import TransportCard from '../components/cards/TaskCards/Transport/TransportCard';
import ChecklistCard from '../components/cards/TaskCards/Checklist/ChecklistCard';
import { DateTime } from 'luxon';
import { Ionicons } from '@expo/vector-icons';
import { useTaskActions } from '../hooks';
import { useCalendarActions } from '../hooks';
import { gatherUsersToNotify } from '../utils/notificationUtils';
import EventCreateEditModal from '../components/modals/EventCreateEditModal';

const EventDetailsScreen = ({ route, navigation }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { user, calendars, groups, tasks, currentDate } = useData();
  const { updateTask, deleteTask } = useTaskActions();
  const { deleteEventFromCalendar } = useCalendarActions();
  const { eventId, calendarId, taskId } = route.params || { eventId: 'unknown' };
  
  const [createEditModalVisible, setCreateEditModalVisible] = useState(false);
  
  // 1. CREATE THE SCROLL REF
  const parentScrollRef = useRef(null); 

  console.log('EventDetailsScreen rendered with eventId:', eventId, 'calendarId:', calendarId, "taskId", taskId , "For Current Date:", currentDate);


  // Determine if this calendar is an internal calendar
  // Check in the user.calendars array for the calendarId that matches then look at calendarType
  const isInternalCalendar = useMemo(() => {
    if (!user || !user.calendars || !calendarId) return false;
    const cal = user.calendars.find(c => c.calendarId === calendarId || c.id === calendarId);
    return cal?.calendarType === 'internal' || false;
  }, [user, calendarId]);
  console.log("Is internal calendar:", isInternalCalendar);

  // Find the calendar that has the calendarId
  const event = useMemo(() => {
    // Check for required data
    if (!calendars || calendars.length === 0 || !calendarId || !eventId) {
      return null;
    }

    // Find the calendar by its ID
    const calendar = calendars.find(cal => cal.id === calendarId);

    // If the calendar is not found or has no events, return null
    if (!calendar || !calendar.events) {
      return null;
    }

    // Create event object and enhance with more data
    console.log("Found calendar for event:", calendar);
    const enhancedEvent = {
      ...calendar.events[eventId],
      eventId: eventId,
      calendarId: calendarId,
      calendarName: calendar.name,
      calendarColor: calendar.color,
    };
    console.log("Enhanced event data:", enhancedEvent);

    // Return the enhanced event
    return enhancedEvent;
  }, [calendars, calendarId, eventId]);

  console.log("Found event:", event);

  const editableCalendars = useMemo(() => {
      // Return calendar objects from user.calendars that are internal with write permissions
      if (!user?.calendars || user.calendars.length === 0) return [];
    
      return user.calendars.filter(
        (cal) => cal.permissions === "write" && cal.calendarType === "internal"
      );
    }, [user?.calendars]);
    console.log("Editable calendars:", editableCalendars);

  // Find which groups this event belongs to (if any)
  const eventGroups = useMemo(() => {
    if (!groups || groups.length === 0 || !calendarId) return [];
    return groups
      .filter(group => group.calendars && group.calendars.some(cal => cal.calendarId === calendarId))
      .map(group => group.groupId);
  }, [groups, calendarId]);
  console.log("Event belongs to groups:", eventGroups, "Groups data:", groups, "CalendarId:", calendarId);

  // Find tasks that match this event
  const relatedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0 || !event || !event.eventId) return [];
    
    // Flatten the nested tasks structure
    const allTasks = tasks.flatMap(taskDoc => 
      (taskDoc.tasks || []).map(task => ({
        ...task,
        documentId: taskDoc.docId, // Use docId instead of groupId
        groupName: taskDoc.name || taskDoc.groupName
      }))
    );
    
    console.log("All flattened tasks:", allTasks);
    
    return allTasks.filter(task => {
      // Check if task matches this event
      if (task.eventId !== event.eventId) return false;
      
      // Include if it's a group task for this event's groups
      if (eventGroups.length > 0 && eventGroups.includes(task.documentId)) return true;
      
      // Include if it's a personal task for the current user
      if (task.isPersonalTask && task.documentId === user?.userId) return true;
      
      return false;
    });
  }, [tasks, eventGroups, event, user?.userId]);
  console.log("Related tasks for event:", relatedTasks);

  // Get the group that these tasks belong to
  const thisGroup = useMemo(() => {
    if (!groups || groups.length === 0 || eventGroups.length === 0) return null;
    return groups.find(group => eventGroups.includes(group.groupId));
  }, [groups, eventGroups]);

  // Check if user is admin of this group, using thisGroup.members and finding my then checking my role
  const amIAdminOfThisGroup = useMemo(() => {
    if (!thisGroup || !thisGroup.members || !Array.isArray(thisGroup.members) || !user) return false;
    const me = thisGroup.members.find(member => member.userId === user.userId);
    return me?.role === 'admin' || false;
  }, [thisGroup, user]);

  // Has the event started?
  const eventTimeInfo = useMemo(() => {
    if (!event || !event.startTime) return { hasStarted: false, isAllDay: false };
    const start = DateTime.fromISO(event.startTime);
    const now = DateTime.now();
    const isAllDay = event.isAllDay || false;
    // Return if the event has started, and if its all day
    return { 
      hasStarted: now >= start, 
      isAllDay: isAllDay 
    };
  }, [event]);
  console.log("Event time info:", eventTimeInfo);

  const handleDeleteEvent = async () => {
    console.log('Delete event:', eventId);
    // TODO: Implement event deletion logic
    // Gather Information from the tasks documents to see if there are any tasks for this event
    // If there are, return an object with the docId (groupId or userId) and taskIds to delete
    // Pass along that info to the deleteEvent function in useCalendarActions
    const tasksToDelete = relatedTasks.reduce((acc, task) => {
      // Find existing document entry or create new one
      let docEntry = acc.find(doc => doc.docId === task.documentId);
      if (!docEntry) {
        docEntry = {
          docId: task.documentId,
          tasksToDelete: []
        };
        acc.push(docEntry);
      }
      
      // Add task details to the document's tasks array
      docEntry.tasksToDelete.push({
        taskId: task.taskId,
        taskType: task.taskType,
        selectedMembers: task.selectedMembers || [],
        title: task.title,
        groupName: task.groupName || "Personal",
        eventName: event?.title || event?.name || "Unknown Event",
        membrersToNotify: task.isPersonalTask ? [] : gatherUsersToNotify('deletedTasks', task.documentId, groups, user),
        calendarName: event?.calendarName || "Unknown Calendar"
      });
      
      return acc;
    }, []);

    // Gather all groupIds from the taskToDelete list
    const groupIds = tasksToDelete
      .filter(doc => doc.docId !== user?.userId) // Exclude personal tasks
      .map(doc => doc.docId);

    let usersToNotifyAboutDeletedEvent = [];
    if (groupIds.length > 0) {
      // For each groupId, gather users who want to be notified about event deletions
      groupIds.forEach(groupId => {
        const usersForGroup = gatherUsersToNotify('deletedEvents', groupId, groups, user);
        usersToNotifyAboutDeletedEvent = [...new Set([...usersToNotifyAboutDeletedEvent, ...usersForGroup])]; // Unique userIds
      });
    }
    console.log("Users to notify about deleted event:", usersToNotifyAboutDeletedEvent);
    
    console.log("Tasks to delete along with event:", tasksToDelete);
    await deleteEventFromCalendar(calendarId, eventId, tasksToDelete, groups, usersToNotifyAboutDeletedEvent);
  };

  const handleCreateTask = () => {
    console.log('Create task for event:', eventId, calendarId, eventGroups);
    // TODO: Navigate to task creation screen
    navigation.navigate('CreateTask', { eventId, calendarId });
  };

  // Handle task updates using the new updateTask function
  const handleTaskUpdate = async (updatedTask) => {
    console.log('Task updated:', updatedTask);
    try {
      await updateTask(
        updatedTask.isPersonalTask ? user.userId : updatedTask.groupId,
        updatedTask.taskId,
        updatedTask,
        user?.userId
      );
      console.log('✅ Task successfully updated in database');
    } catch (error) {
      console.error('❌ Error updating task:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleDeleteTask = async (taskId, groupId) => {
    // Show confirmation alert first
    Alert.alert(
      "Delete Assignment",
      "Are you sure you want to delete this assignment? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTask(groupId, taskId, user?.userId);
              
              console.log('✅ Task deleted successfully');
              
              // Optionally refresh your tasks list or remove from local state
              // You might want to call a function here to update your UI
              
            } catch (error) {
              console.error('❌ Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task. Please try again.');
            } 
          }
        }
      ]
    );
  };

  // Go back function that checks 1) can we go back? If so go back
  // 2) if currentDate (in 2025-09-06 format) is today, go to Today tab
  // 3) otherwise go to Calendar tab
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      const todayISO = DateTime.now().toISODate();
      if (currentDate === todayISO) {
        navigation.navigate('Today', { screen: 'TodayHome' });
      } else {
        navigation.navigate('Calendar', { screen: 'CalendarHome' });
      }
    }
  };

  // Render task card based on type
  // 3. UPDATED SIGNATURE TO ACCEPT parentScrollRef
  const renderTaskCard = (task, index, parentScrollRef) => { 
    const commonProps = {
      assignment: task,
      groupId: task.groupId,
      onAssignmentUpdate: handleTaskUpdate,
      isEventPast: false, // You can enhance this later
      thisGroup: thisGroup,
      amIAdminOfThisGroup: amIAdminOfThisGroup,
      eventDate: event?.startTime,
      onDeleteAssignment: () => handleDeleteTask(task.taskId, task.isPersonalTask ? task.userId : task.groupId),
      isDeleting: false, // You can add loading state later
      parentScrollRef: parentScrollRef, // <-- ADDED PROP PASS-DOWN
    };
    const taskKey = task.taskId || index;

    switch (task.taskType) {
      case 'Attendance':
        return <AttendanceCard key={taskKey} {...commonProps} />;
      case 'Transport':
        return <TransportCard key={taskKey} {...commonProps} />;
      case 'Checklist':
        return <ChecklistCard key={taskKey} {...commonProps} />;
      default:
        console.warn('Unknown task type:', task.taskType);
        return null;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContainer: {
      flex: 1,
    },
    content: {
      paddingHorizontal: getSpacing.md,
      paddingBottom: getSpacing.xl,
    },
    tasksSection: {
      marginTop: getSpacing.lg,
      marginBottom: getSpacing.lg,
    },
    tasksHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: getSpacing.md,
    },
    tasksTitle: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: getTypography.h2.fontWeight,
      color: theme.text.primary,
    },
    taskCount: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginLeft: getSpacing.xs,
    },
    addButton: {
      backgroundColor: theme.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    addButtonFull: {
      backgroundColor: theme.primary,
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      borderRadius: getBorderRadius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    addButtonText: {
      fontSize: getTypography.button.fontSize,
      fontWeight: getTypography.button.fontWeight,
      color: theme.text.inverse,
      marginLeft: getSpacing.sm,
    },
    emptyTasks: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      padding: getSpacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
      marginTop: getSpacing.sm,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm, // Add space between icon and text
      marginTop: getSpacing.md
    },
    backButtonText: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: getTypography.h2.fontWeight,
      color: theme.text.primary,
    },
    actionHeader: {
      flexDirection: 'row',          // Align items horizontally
      justifyContent: 'space-between', // Push children to the far ends
      alignItems: 'center',          // Vertically center items
      paddingHorizontal: getSpacing.md, // Add some padding on the sides
      paddingTop: getSpacing.lg,       // Space from the top edge
      marginBottom: getSpacing.md,     // Space below the header row
    },
    editButton: {
      padding: getSpacing.xs, // Add padding to make the touch target easier
    },
    deleteButton: {
      backgroundColor: theme.button.secondary,
      padding: getSpacing.md,
      borderRadius: getBorderRadius.lg,
      alignItems: 'center',
      marginTop: getSpacing.lg,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    deleteButtonText: {
      fontSize: getTypography.button.fontSize,
      fontWeight: getTypography.button.fontWeight,
      color: theme.button.secondaryText,
      marginLeft: getSpacing.sm,
    },
  
  });

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.text.secondary} />
          <Text style={styles.emptyText}>Event not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={theme.button.secondaryText} />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
            <ScrollView 
                // 2. ATTACH THE REF
                ref={parentScrollRef} 
                style={styles.scrollContainer} 
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.actionHeader}>
                    {/* Left Side: Back Button */}
                    <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                        <Ionicons
                            name="arrow-back"
                            size={28}
                            color={theme.text.primary}
                        />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    
                    {/* Right Side: Edit Button */}
                    {isInternalCalendar && eventTimeInfo.hasStarted === false && (
                    <TouchableOpacity 
                        style={styles.editButton} 
                        onPress={() => setCreateEditModalVisible(true)}
                    >
                        <Ionicons
                            name="create-outline" // A common icon for 'Edit'
                            size={28}
                            color={theme.text.primary}
                        />
                    </TouchableOpacity>
                    )}
                </View>
                
                <EventHeader 
                    event={event}
                    hideDetails={false}
                />
                
                <View style={styles.content}>
                    {/* Tasks Section */}
                    <View style={styles.tasksSection}>
                        {relatedTasks.length > 0 ? (
                            <>
                                {/* Header with count and add button */}
                                <View style={styles.tasksHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.tasksTitle}>Tasks</Text>
                                        <Text style={styles.taskCount}>({relatedTasks.length})</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.addButton}
                                        onPress={handleCreateTask}
                                    >
                                        <Ionicons name="add" size={24} color={theme.text.inverse} />
                                    </TouchableOpacity>
                                </View>

                                {/* Render all task cards */}
                                {/* 4. PASS THE REF DOWN */}
                                {relatedTasks.map((task, index) => renderTaskCard(task, index, parentScrollRef))}
                            </>
                        ) : (
                            <>
                                {/* No tasks - show create button */}
                                <TouchableOpacity 
                                    style={styles.addButtonFull}
                                    onPress={handleCreateTask}
                                >
                                    <Ionicons name="add" size={24} color={theme.text.inverse} />
                                    <Text style={styles.addButtonText}>Create Task</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    {/* IF internal calendar, show Delete Event button */}
                    {isInternalCalendar && (
                        <TouchableOpacity
                            style={[styles.deleteButton, { backgroundColor: theme.error, marginTop: getSpacing.md }]}
                            onPress={() => Alert.alert("Delete Event", "Are you sure you want to delete this event? This action cannot be undone.", [
                                { text: "Cancel", style: "cancel" },
                                { text: "Delete", style: "destructive", onPress: () => {
                                handleDeleteEvent();
                                // Navigate back after deletion
                                navigation.goBack();
                                } }
                            ])}
                        >
                            <Ionicons name="trash" size={20} color={theme.text.inverse} />
                            <Text style={[styles.deleteButtonText, { color: theme.text.inverse, marginLeft: getSpacing.sm }]}>Delete Event</Text>
                        </TouchableOpacity>
                    )}  
                </View>
            </ScrollView>
      <EventCreateEditModal
        isVisible={createEditModalVisible}
        onClose={() => setCreateEditModalVisible(false)}
        event={event}
        availableCalendars={editableCalendars}
        initialDate={event?.startTime ? DateTime.fromISO(event.startTime) : DateTime.now()}
        groups={groups}
      />
    </SafeAreaView>
  );
};

export default EventDetailsScreen;