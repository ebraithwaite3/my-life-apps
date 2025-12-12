// components/calendar/ActivityRow.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { Ionicons } from '@expo/vector-icons';

const ActivityRow = ({ activities, appName, event, onActivityPress, onActivityDelete }) => {
  console.log("Rendering ActivityRow with activities:", activities);
  const { theme, getSpacing, getBorderRadius } = useTheme();

  const handlePress = (activity) => {
    console.log("Activity pressed:", activity);
    
    // For checklist activities, call the onActivityPress handler
    if (activity.activityType === 'checklist' && onActivityPress) {
      console.log("Opening checklist:", activity.name);
      onActivityPress(event, activity);
      return;
    }
    
    // For other activity types
    if (activity.activityType === appName) {
      console.log("Internal Activity pressed:", activity, "Navigating to internal screen.");
    } else {
      console.log("External Activity pressed:", activity, "Opening external link.");
    }
  };

  const handleLongPress = (activity) => {
    console.log("Activity long pressed:", activity);
    if (onActivityDelete) {
      onActivityDelete(event, activity);
    }
  };

  // Map activity types to icons
  const getActivityIcon = (activityType) => {
    const iconMap = {
      workout: 'barbell',
      checklist: 'list',
      golf: 'golf',
    };
    return iconMap[activityType] || 'ellipse';
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.xs,
      paddingLeft: getSpacing.md,
      gap: getSpacing.lg,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.border || '#E0E0E0',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
    },
  });

  return (
    <View style={styles.container}>
      {activities.map((activity, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.iconContainer}
          onPress={() => handlePress(activity)}
          onLongPress={() => handleLongPress(activity)}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          <Ionicons
            name={getActivityIcon(activity.activityType)}
            size={28}
            color={theme.primary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default ActivityRow;