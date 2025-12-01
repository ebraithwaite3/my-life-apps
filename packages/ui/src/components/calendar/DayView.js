// packages/shared/components/calendar/DayView.js
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useTheme } from "@my-apps/contexts";
import EventCard from "./EventCard";

const DayView = ({
  appName,
  date,
  events,
  userCalendars,
  onDeleteEvent,
  onAddActivity,
  onEditEvent,
}) => {
  const { getSpacing } = useTheme();
  console.log("Rendering DayView for date:", date, "with events:", events);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: getSpacing.lg,
      marginTop: getSpacing.md,
    },
  });

  return (
    <ScrollView style={styles.container}>
      {events &&
        events.map((event, index) => (
          <EventCard
            key={index}
            appName={appName}
            event={event}
            onDelete={onDeleteEvent}
            onAddActivity={onAddActivity}
            onEdit={onEditEvent}
            userCalendars={userCalendars}
          />
        ))}
    </ScrollView>
  );
};

export default DayView;
