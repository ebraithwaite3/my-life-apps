// hooks/useCalendarActions.js
import { useCallback } from 'react';
import { DateTime } from 'luxon';
import { runTransaction, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { 
  addCalendarToUser, 
  removeCalendarFromUser, 
  validateCalendarData,
  validateUniqueCalendar,
  syncCalendarById 
} from '../services/calendarService';
import { updateDocument, getDocument, createDocument } from '../services/firestoreService';
import { addMessageToUser } from '../services/messageService';


export const useCalendarActions = () => {
  const { user: authUser, db } = useAuth();
  const { user } = useData();

  const addCalendar = useCallback(async (calendarData) => {
    try {
      console.log("Adding calendar:", calendarData.name);
      
      if (!authUser?.uid) {
        throw new Error("User not authenticated");
      }
      if (typeof authUser.uid !== 'string') {
        throw new Error(`Invalid user ID: expected string, got ${typeof authUser.uid}`);
      }
      
      // Validate data
      validateCalendarData(calendarData);
      await validateUniqueCalendar(authUser.uid, calendarData.calendarAddress);
      
      // Add calendar
      const calendarRef = await addCalendarToUser(authUser.uid, calendarData);
      
      // Update user document
      const updatedCalendars = [...(user.calendars || []), calendarRef];
      await updateDocument('users', authUser.uid, { calendars: updatedCalendars });
      
      // Auto-sync
      try {
        console.log("🔄 Starting auto-sync for:", calendarRef.calendarId);
        const syncResult = await syncCalendarById(calendarRef.calendarId);
        console.log("✅ Auto-sync completed:", syncResult);
        
      } catch (syncError) {
        console.warn("⚠️ Calendar added but sync failed:", syncError);
      }
      
      return calendarRef;
    } catch (error) {
      console.error("❌ Error adding calendar:", error);
      throw error;
    }
  }, [authUser, user?.calendars]);

  const removeCalendar = useCallback(async (calendarId) => {
    try {
      console.log("🗑️ Removing calendar:", calendarId);
      await removeCalendarFromUser(authUser.uid, calendarId);
      console.log("✅ Calendar removed");
      
      // Refresh will happen automatically via subscription
    } catch (error) {
      console.error("❌ Error removing calendar:", error);
      throw error;
    }
  }, [authUser?.uid]);

  const syncCalendar = useCallback(async (calendarId) => {
    try {
      console.log("🔄 Syncing calendar:", calendarId);
      const result = await syncCalendarById(calendarId);
      console.log("✅ Calendar synced:", result);
      
      return result;
    } catch (error) {
      console.error("❌ Error syncing calendar:", error);
      throw error;
    }
  }, []);

  // Will SOFT delete a calendar by removing it from the user's list
  // Will also remove the users id from the subscribingUsers array in the calendar document
  // Then will check in the calendar doc if there are any subscribingUsers left
  // If there are NONE left, then it will change isActive to false and add a deactivatedAt timestamp
  const deactivateCalendar = useCallback(async (calendarId) => {
    try {
      console.log("🗑️ Deactivating calendar:", calendarId);
  
      await runTransaction(db, async (transaction) => {
        // READS FIRST - Get both documents before any writes
        const calendarRef = doc(db, 'calendars', calendarId);
        const userRef = doc(db, 'users', authUser.uid);
        
        const [calendarDoc, userDoc] = await Promise.all([
          transaction.get(calendarRef),
          transaction.get(userRef)
        ]);
        
        if (!calendarDoc.exists()) {
          throw new Error("Calendar not found");
        }
  
        const calendarData = calendarDoc.data();
        
        // Remove user from subscribingUsers array
        const updatedSubscribingUsers = (calendarData.subscribingUsers || [])
          .filter(uid => uid !== authUser.uid);
        
        const calendarUpdates = { 
          subscribingUsers: updatedSubscribingUsers,
          updatedAt: DateTime.now().toISO()
        };
  
        // If no subscribing users left, deactivate calendar
        if (updatedSubscribingUsers.length === 0) {
          calendarUpdates.isActive = false;
          calendarUpdates.deactivatedAt = DateTime.now().toISO();
          console.log("📅 No subscribers left - marking calendar as inactive");
        }
  
        // WRITES SECOND - Update calendar document
        transaction.update(calendarRef, calendarUpdates);
        
        // Update user document (remove calendar from user's list)
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const updatedCalendars = (userData.calendars || [])
            .filter(cal => cal.calendarId !== calendarId);
          
          transaction.update(userRef, { 
            calendars: updatedCalendars,
            updatedAt: DateTime.now().toISO()
          });
        }
      });
  
      console.log("✅ Calendar deactivated successfully");
      
    } catch (error) {
      console.error("❌ Error deactivating calendar:", error);
      throw error;
    }
  }, [authUser?.uid, db]);

  const addEventToCalendar = useCallback(async (calendarId, eventData, groupsWithSelectedCalendar, groups) => {
    if (!authUser?.uid) {
      throw new Error("User not authenticated");
    }
    
    if (!calendarId || typeof calendarId !== 'string') {
      throw new Error("Invalid calendar ID");
    }
  
    if (!eventData || typeof eventData !== 'object') {
      throw new Error("Invalid event data");
    }
  
    try {
      console.log("Attempting to fetch calendar with ID:", calendarId);
      
      const calendarData = await getDocument('calendars', calendarId);
      
      console.log("Calendar document result:", calendarData);
      
      if (!calendarData) {
        throw new Error("Calendar not found");
      }
      
      if (!calendarData.subscribingUsers.includes(authUser.uid)) {
        throw new Error("User does not have permission to add events to this calendar");
      }
      
      // Generate event ID in same format as imported events
      const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create the event matching your existing structure
      const eventToAdd = {
        calendarId,
        title: eventData.title,
        description: eventData.description || '',
        location: eventData.location || '',
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        isAllDay: eventData.isAllDay || false,
        source: eventData.source || 'user_created'
      };
      
      // Add to events map
      const currentEvents = calendarData.events || {};
      const updatedEvents = {
        ...currentEvents,
        [eventId]: eventToAdd
      };
      
      // Update the calendar document
      await updateDocument('calendars', calendarId, {
        events: updatedEvents,
        updatedAt: new Date().toISOString()
      });
      
      console.log("Event added successfully:", eventId);
  
      // Send notifications to group members who have newEvents enabled
      if (groupsWithSelectedCalendar && groupsWithSelectedCalendar.length > 0 && groups) {
        try {
          const notificationPromises = [];
          
          for (const groupId of groupsWithSelectedCalendar) {
            // Find the group data
            const group = groups.find(g => g.groupId === groupId);
            if (!group) continue;
            
            // Filter members who should receive notifications
            const recipients = (group.members || [])
              .filter(member => 
                member.userId !== authUser.uid && // Don't notify the creator
                member.notifyFor?.newEvents !== false // Check newEvents preference
              );
            
            // Send message to each recipient
            for (const member of recipients) {
              const eventDate = DateTime.fromISO(eventData.startTime).toFormat('MMM d');
              const messageText = `${user.username || user.email} added a new event "${eventData.title}" on ${eventDate} to the ${group.name} calendar.`;
              
              const sendingUserInfo = {
                userId: user.userId,
                username: user.username,
                groupName: group.name,
                screenForNavigation: {
                  screen: 'Calendar',
                  params: { 
                    screen: 'DayScreen',
                    params: {
                      date: DateTime.fromISO(eventData.startTime).toISODate(),
                      highlightEvent: eventId 
                    }
                  }
                }
              };
              
              notificationPromises.push(
                addMessageToUser(member.userId, sendingUserInfo, messageText)
              );
            }
          }
          
          await Promise.all(notificationPromises);
          console.log(`Event notification sent to group members across ${groupsWithSelectedCalendar.length} groups`);
          
        } catch (error) {
          console.error('Error sending event notifications:', error);
          // Don't throw here - event was created successfully, notification failure shouldn't break the flow
        }
      }
      
      return {
        success: true,
        eventId,
        event: eventToAdd
      };
      
    } catch (error) {
      console.error("Error adding event to calendar:", error);
      throw error;
    }
  }, [authUser?.uid]);


  const deleteEventFromCalendar = useCallback(async (calendarId, eventId, tasksToCleanup, groups, usersToNotifyAboutDeletedEvent) => {
    if (!authUser?.uid) {
      throw new Error("User not authenticated");
    }
    
    if (!calendarId || typeof calendarId !== 'string') {
      throw new Error("Invalid calendar ID");
    }
  
    if (!eventId || typeof eventId !== 'string') {
      throw new Error("Invalid event ID");
    }
    console.log("Delete event: Calendar ID:", calendarId, "Event ID:", eventId, "TaskInfo:", tasksToCleanup, "Users to Notify about Deleted Event:", usersToNotifyAboutDeletedEvent);
  
    try {
      console.log("Attempting to delete event:", eventId, "from calendar:", calendarId);
      
      const calendarData = await getDocument('calendars', calendarId);
      
      if (!calendarData) {
        throw new Error("Calendar not found");
      }
      
      if (!calendarData.subscribingUsers.includes(authUser.uid)) {
        throw new Error("User does not have permission to delete events from this calendar");
      }

      const currentEvents = calendarData.events || {};
      const eventToDelete = currentEvents[eventId];
      
      if (!eventToDelete) {
        throw new Error("Event not found");
      }

      // Remove event from calendar
      const { [eventId]: deletedEvent, ...updatedEvents } = currentEvents;
      
      await updateDocument('calendars', calendarId, {
        events: updatedEvents,
        updatedAt: new Date().toISOString()
      });
      
      console.log("Event deleted successfully:", eventId);

      // Clean up associated tasks and send task deletion notifications
      if (tasksToCleanup && Array.isArray(tasksToCleanup)) {
        try {
          const taskCleanupPromises = tasksToCleanup.map(async (docInfo) => {
            const { docId, tasksToDelete } = docInfo;
            
            // Get the task document
            const taskDoc = await getDocument('tasks', docId);
            if (!taskDoc || !taskDoc.tasks) return;

            // Extract task IDs to remove
            const taskIdsToRemove = tasksToDelete.map(task => task.taskId);
            
            // Filter out the tasks to delete
            const updatedTasks = taskDoc.tasks.filter(task => !taskIdsToRemove.includes(task.taskId));
            
            // Update the document
            await updateDocument('tasks', docId, {
              tasks: updatedTasks,
              updatedDate: DateTime.now().toISO()
            });
            
            console.log(`Cleaned up ${taskIdsToRemove.length} task(s) from document ${docId}`);

            // Send task deletion notifications
            for (const taskInfo of tasksToDelete) {
              const { membrersToNotify, taskType, title, eventName } = taskInfo;
              
              if (membrersToNotify && membrersToNotify.length > 0) {
                const taskNotificationPromises = membrersToNotify.map(userId => {
                  const messageText = `${user?.username || 'Someone'} has deleted the ${taskType} task "${title}" from ${eventName}.`;
                  
                  const sendingUserInfo = {
                    userId: user?.userId,
                    username: user?.username,
                    groupName: taskInfo.groupName,
                    screenForNavigation: {
                      screen: 'Calendar',
                      params: { 
                        screen: 'CalendarHome'
                      }
                    }
                  };
                  
                  return addMessageToUser(userId, sendingUserInfo, messageText);
                });
                
                await Promise.all(taskNotificationPromises);
                console.log(`Task deletion notifications sent for task: ${title}`);
              }
            }
          });

          await Promise.all(taskCleanupPromises);
          console.log("Task cleanup and notifications completed");
          
        } catch (error) {
          console.error('Error cleaning up tasks:', error);
          // Don't throw here - event was deleted successfully
        }
      }

      // Send event deletion notifications
      if (usersToNotifyAboutDeletedEvent && usersToNotifyAboutDeletedEvent.length > 0) {
        try {
          const eventDate = DateTime.fromISO(eventToDelete.startTime).toFormat('MMM d');
          const calendarName = calendarData.name || 'Unknown Calendar';
          const messageText = `${user?.username || 'Someone'} deleted the event "${eventToDelete.title}" from ${eventDate} in the ${calendarName} calendar.`;
          
          const eventNotificationPromises = usersToNotifyAboutDeletedEvent.map(userId => {
            const sendingUserInfo = {
              userId: user?.userId,
              username: user?.username,
              groupName: null, // Event notifications don't have a specific group
              screenForNavigation: {
                screen: 'Calendar',
                params: { 
                  screen: 'CalendarHome'
                }
              }
            };
            
            return addMessageToUser(userId, sendingUserInfo, messageText);
          });
          
          await Promise.all(eventNotificationPromises);
          console.log(`Event deletion notification sent to ${usersToNotifyAboutDeletedEvent.length} user(s)`);
          
        } catch (error) {
          console.error('Error sending event deletion notifications:', error);
        }
      }
      
      return {
        success: true,
        deletedEvent: eventToDelete
      };
      
    } catch (error) {
      console.error("Error deleting event from calendar:", error);
      throw error;
    }
  }, [authUser?.uid, user?.userId, user?.username]);


  const updateEventInCalendar = useCallback(async (calendarId, eventData, groupsWithSelectedCalendar, groups) => {
    if (!authUser?.uid) {
      throw new Error("User not authenticated");
    }
    
    if (!calendarId || typeof calendarId !== 'string') {
      throw new Error("Invalid calendar ID");
    }
  
    if (!eventData || typeof eventData !== 'object') {
      throw new Error("Invalid event data");
    }

    if (!eventData.eventId) {
      throw new Error("Event ID is required for updates");
    }
  
    try {
      console.log("Attempting to update event in calendar:", calendarId, "Event ID:", eventData.eventId);
      
      const calendarData = await getDocument('calendars', calendarId);
      
      if (!calendarData) {
        throw new Error("Calendar not found");
      }
      
      if (!calendarData.subscribingUsers.includes(authUser.uid)) {
        throw new Error("User does not have permission to update events in this calendar");
      }
      
      const currentEvents = calendarData.events || {};
      
      // Check if event exists
      if (!currentEvents[eventData.eventId]) {
        throw new Error("Event not found");
      }
      
      // Create the updated event data
      const updatedEvent = {
        ...currentEvents[eventData.eventId], // Keep existing data
        title: eventData.title,
        description: eventData.description || '',
        location: eventData.location || '',
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        isAllDay: eventData.isAllDay || false,
        updatedAt: new Date().toISOString() // Add timestamp for when it was updated
      };
      
      // Update the events map
      const updatedEvents = {
        ...currentEvents,
        [eventData.eventId]: updatedEvent
      };
      
      // Update the calendar document
      await updateDocument('calendars', calendarId, {
        events: updatedEvents,
        updatedAt: new Date().toISOString()
      });
      
      console.log("Event updated successfully:", eventData.eventId);
      console.log("Groups with selected calendar:", groupsWithSelectedCalendar);
  
      // Send notifications to group members who have updatedEvents enabled
      if (groupsWithSelectedCalendar && groupsWithSelectedCalendar.length > 0 && groups) {
        try {
          console.log("Sending update notifications to groups:", groupsWithSelectedCalendar);
          const notificationPromises = [];
          
          for (const groupId of groupsWithSelectedCalendar) {
            // Find the group data
            const group = groups.find(g => g.groupId === groupId);
            if (!group) continue;
            
            // Filter members who should receive notifications
            const recipients = (group.members || [])
              .filter(member => 
                member.userId !== authUser.uid && // Don't notify the editor
                member.notifyFor?.updatedEvents === true // Check updatedEvents preference
              );
            
            // Send message to each recipient
            for (const member of recipients) {
              const eventDate = DateTime.fromISO(eventData.startTime).toFormat('MMM d');
              const messageText = `${user.username || user.email} updated the event "${eventData.title}" on ${eventDate} in the ${group.name} calendar.`;
              
              const sendingUserInfo = {
                userId: user.userId,
                username: user.username,
                groupName: group.name,
                screenForNavigation: {
                  screen: 'Calendar',
                  params: { 
                    screen: 'EventDetails',
                    params: {
                      eventId: eventData.eventId,
                      calendarId: calendarId
                    }
                  }
                }
              };
              
              notificationPromises.push(
                addMessageToUser(member.userId, sendingUserInfo, messageText)
              );
            }
          }
          
          await Promise.all(notificationPromises);
          console.log(`Event update notification sent to group members across ${groupsWithSelectedCalendar.length} groups`);
          
        } catch (error) {
          console.error('Error sending event update notifications:', error);
          // Don't throw here - event was updated successfully, notification failure shouldn't break the flow
        }
      }
      
      return {
        success: true,
        eventId: eventData.eventId,
        event: updatedEvent
      };
      
    } catch (error) {
      console.error("Error updating event in calendar:", error);
      throw error;
    }
  }, [authUser?.uid, user?.userId, user?.username, user?.email]);

  // Add user to Public Calendar
  // Must add the calendar to the user's calendars array && users id to the calendar's subscribingUsers array
  // If the calendar is NOT found, return an error
  const addUserToPublicCalendar = useCallback(async (calendarId) => {
    if (!authUser?.uid) {
      throw new Error("User not authenticated");
    }
    
    if (!calendarId || typeof calendarId !== 'string') {
      throw new Error("Invalid calendar ID");
    }

    try {
      console.log("Attempting to add user to public calendar:", calendarId);
      
      const calendarData = await getDocument('calendars', calendarId);
      console.log("Fetched calendar data:", calendarData, calendarData?.type);
      
      if (!calendarData) {
        throw new Error("Calendar not found");
      }
      
      if (calendarData.type !== 'public') {
        throw new Error("Calendar is not public");
      }
      if (calendarData.subscribingUsers.includes(authUser.uid)) {
        throw new Error("User is already subscribed to this calendar");
      }

      // Add calendar to user's calendars array
      const userData = await getDocument('users', authUser.uid);
      if (!userData) {
        throw new Error("User document not found");
      }

      const updatedUserCalendars = [...(userData.calendars || []), {
        calendarId: calendarData.calendarId,
        name: calendarData.name,
        color: calendarData.color,
        permissions: 'read',
        isOwner: false
      }];

      // Update user document
      await updateDocument('users', authUser.uid, {
        calendars: updatedUserCalendars,
        updatedAt: new Date().toISOString()
      });

      // Add user to calendar's subscribingUsers array
      const updatedSubscribingUsers = [...(calendarData.subscribingUsers || []), authUser.uid];

      await updateDocument('calendars', calendarId, {
        subscribingUsers: updatedSubscribingUsers,
        updatedAt: new Date().toISOString()
      });

      console.log("User successfully added to public calendar:", calendarId);
      
      return {
        success: true,
        calendarId
      };
      
    } catch (error) {
      console.error("Error adding user to public calendar:", error);
      throw error;
    }
  }, [authUser?.uid]);

  return {
    addCalendar,
    removeCalendar,
    syncCalendar,
    deactivateCalendar,
    addEventToCalendar,
    deleteEventFromCalendar,
    updateEventInCalendar,
    addUserToPublicCalendar
  };
};