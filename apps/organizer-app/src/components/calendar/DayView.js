// DayView.js
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { formatEventTime, formatEventDateTime } from '@my-apps/utils';
import { useDeleteFromGoogleCalendar, useDeleteInternalEvent, useDeleteIcalEvent, useUpdateExternalActivities, useUpdateInternalActivities } from '@my-apps/hooks';
import { EventCard } from '../cards/EventCard';

export const DayView = ({ date, events, userCalendars }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  console.log("Rendering DayView for date:", date, "with events:", events, "User Calendars:", userCalendars);

  const editableCalendarIds = useMemo(() => {
    return userCalendars
      .filter(calendar => calendar.calendarType === 'google')
      .map(calendar => calendar.calendarId);
  }, [userCalendars]);

  // Filter out events that have a deleted: true flag
  const filteredEvents = useMemo(() => {
    return events.filter(event => !event.deleted);
  }, [events]);
  console.log("Filtered Events (not deleted):", filteredEvents);

  // Deleted Events Count
  const deletedEventsCount = useMemo(() => {
    return events.length - filteredEvents.length;
  }, [events, filteredEvents]);
  console.log("Deleted Events Count:", deletedEventsCount);

  console.log("Editable Calendar IDs:", editableCalendarIds);

  const deleteFromGoogleCalendar = useDeleteFromGoogleCalendar();
  const deleteInternalEvent = useDeleteInternalEvent();
  const deleteIcalEvent = useDeleteIcalEvent();
  const updateExternalActivities = useUpdateExternalActivities();
  const updateInternalActivities = useUpdateInternalActivities();

  // Fake activity data for testing
  const sampleActivities = [
    {
      activityId: 'activity1',
      title: 'Sample Activity 1',
      description: 'This is a sample activity.',
      timestamp: new Date().toISOString(),
    },
    {
      activityId: 'activity2',
      title: 'Sample Activity 2',
      description: 'This is another sample activity.',
      timestamp: new Date().toISOString(),
    },
  ];

  const handleDeleteEvent = async (event) => {
    console.log("handleDeleteEvent called for event:", event);
    
    // Find the calendar to check its type
    const calendar = userCalendars.find(cal => cal.calendarId === event.calendarId);
    
    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete the event: "${event.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            console.log("Deleting event:", event);
  
            try {
              // Handle internal calendar events
              if (event.calendarId === 'internal') {
                const result = await deleteInternalEvent(event.eventId, event.startTime);
                if (result.success) {
                  console.log("Event successfully deleted:", event.eventId);
                  Alert.alert("Success", `Event "${event.title}" deleted successfully.`);
                } else {
                  console.error("Error deleting event:", result.error);
                  Alert.alert("Error", `Error deleting event: ${result.error}`);
                }
                return;
              }
              
              // Handle iCal calendar events
              if (calendar?.calendarType === 'ical') {
                const result = await deleteIcalEvent(event.eventId, event.calendarId, event.startTime);
                if (result.success) {
                  console.log("iCal event successfully marked as deleted:", event.eventId);
                  Alert.alert("Success", `Event "${event.title}" marked as deleted successfully.`);
                } else {
                  console.error("Error deleting iCal event:", result.error);
                  Alert.alert("Error", `Error deleting event: ${result.error}`);
                }
                return;
              }
              
              // Handle Google Calendar events
              const result = await deleteFromGoogleCalendar(event.eventId, event.calendarId);
              if (result.success) {
                console.log("Event successfully deleted:", event.eventId);
                Alert.alert("Success", `Event "${event.title}" deleted successfully.`);
              } else {
                console.error("Error deleting event:", result.error);
                Alert.alert("Error", `Error deleting event: ${result.error}`);
              }
            } catch (error) {
              console.error("Unexpected error deleting event:", error);
              Alert.alert("Error", `Unexpected error deleting event: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  // Handle Add Activity - overwrites activities with sample data
  const handleAddActivity = async (event) => {
    console.log("Add Activity clicked for event:", event);
    
    try {
      let result;
      if (event.calendarId === 'internal') {
        console.log("Updating internal event activities with sample data");
        result = await updateInternalActivities(event.eventId, event.startTime, sampleActivities);
      } else {
        console.log("Updating external event activities with sample data");
        result = await updateExternalActivities(event.eventId, event.calendarId, event.startTime, sampleActivities);
      }
      
      if (result.success) {
        console.log("Activities successfully updated for event:", event.eventId);
        Alert.alert("Success", `Activities added to "${event.title}"`);
      } else {
        console.error("Error updating activities:", result.error);
        Alert.alert("Error", `Error adding activities: ${result.error}`);
      }
    } catch (error) {
      console.error("Unexpected error updating activities:", error);
      Alert.alert("Error", `Unexpected error: ${error.message}`);
    }
  };
  
  
  return (
    <ScrollView style={styles.container}>
      {filteredEvents && filteredEvents.map((event, index) => (
        <EventCard
          key={index}
          event={event}
          onDelete={handleDeleteEvent}
          onAddActivity={handleAddActivity}
        />
      ))}   
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});