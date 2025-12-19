// components/calendar/ActivityRow.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { Ionicons } from '@expo/vector-icons';

const ActivityRow = ({ activities, appName, event, onActivityPress, onActivityDelete }) => {
  // console.log("Rendering ActivityRow with activities:", activities);
  const { theme, getSpacing, getBorderRadius } = useTheme();

  const handlePress = (activity) => {
    if (activity.activityType === 'checklist' && onActivityPress) {
      onActivityPress(event, activity);
      return;
    }
    
    if (activity.activityType === appName) {
      console.log("Internal Activity pressed:", activity);
    } else {
      console.log("External Activity pressed:", activity);
    }
  };

  const handleLongPress = (activity) => {
    if (onActivityDelete) {
      onActivityDelete(event, activity);
    }
  };

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
    // Base style for the container
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
    },
  });

  return (
    <View style={styles.container}>
      {activities.map((activity, index) => {
        
        // 1. Determine if this specific activity is a completed checklist
        const isChecklistComplete = 
            activity.activityType === 'checklist' && 
            activity.items && 
            activity.items.length > 0 && 
            activity.items.every(item => item.completed === true);

        // 2. Determine colors based on completion status
        // Use a standard green or theme.success if you have it
        const activeColor = isChecklistComplete ? '#4CAF50' : theme.primary;
        const activeBorderColor = isChecklistComplete ? '#4CAF50' : (theme.border || '#E0E0E0');

        return (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.iconContainer, 
              // 3. Apply the dynamic border color
              { borderColor: activeBorderColor } 
            ]}
            onPress={() => handlePress(activity)}
            onLongPress={() => handleLongPress(activity)}
            delayLongPress={500}
            activeOpacity={0.7}
          >
            <Ionicons
              name={getActivityIcon(activity.activityType)}
              size={28}
              // 4. Apply the dynamic icon color
              color={activeColor}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default ActivityRow;