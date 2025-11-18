// components/EventCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { formatEventTime } from '@my-apps/utils';

export const EventCard = ({ event, onDelete, onAddActivity }) => {
  const { theme, getSpacing, getTypography } = useTheme();

  return (
    <View style={[styles.card, { 
      backgroundColor: theme.surface,
      marginHorizontal: getSpacing.md,
      marginVertical: getSpacing.sm,
      padding: getSpacing.md,
    }]}>
      <Text style={[getTypography.body, styles.title, { color: theme.text.primary }]}>
        {event.title}
      </Text>
      
      <Text style={[getTypography.caption, styles.time, { color: theme.text.secondary, marginTop: getSpacing.xs }]}>
        {formatEventTime(event.startTime)}
      </Text>

      <View style={[styles.actionsContainer, { marginTop: getSpacing.sm, gap: getSpacing.xs }]}>
        <Text 
          style={[getTypography.caption, { color: theme.success }]}
          onPress={() => onDelete(event)} 
        >
          🗑️ Delete Event
        </Text>
        
        <Text 
          style={[getTypography.caption, { color: theme.primary }]}
          onPress={() => onAddActivity(event)}
        >
          ＋ Add Activity
        </Text>
        
        <Text style={[getTypography.caption, styles.activityCount, { color: theme.text.secondary, marginTop: getSpacing.xs }]}>
          📋 Activities: {event.activities ? event.activities.length : 0}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontWeight: '600',
  },
  time: {
    // Additional time styles if needed
  },
  actionsContainer: {
    // Additional container styles if needed
  },
  activityCount: {
    // Additional activity count styles if needed
  },
});