// components/calendar/ActivityRow.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { Ionicons } from '@expo/vector-icons';

const ActivityRow = ({ activities, appName, event, onActivityPress, onActivityDelete, navigation }) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();

  const handlePress = (activity) => {
    // Special case: Checklists are universal and work in all apps
    if (activity.activityType === 'checklist') {
      console.log('✅ Checklist activity pressed (universal)');
      if (onActivityPress) {
        onActivityPress(activity, event);
      }
      return;
    }
  
    // Check if this is an internal activity (same as current app)
    if (activity.activityType === appName) {
      // Internal activity - handle in current app
      console.log(`✅ Internal ${appName} activity pressed`);
      if (onActivityPress) {
        onActivityPress(activity, event);
      }
    } else {
      // External activity - open via deep link
      console.log(`🔗 Opening ${activity.activityType} app via deep link`);
      
      // Build deep link URL (use "myworkout" not "myworkoutapp")
const deepLinkUrl = `myworkout://activity/${activity.id}?eventId=${event.eventId}`;
      
      Linking.openURL(deepLinkUrl).catch(err => {
        console.error('Failed to open deep link:', err);
        Alert.alert(
          'Unable to Open',
          `Please open the ${activity.activityType} app manually to view this activity.`
        );
      });
    }
  };
  


  const handleLongPress = (activity) => {
    if (onActivityDelete) {
      onActivityDelete(activity, event);
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
        // Determine if this specific activity is a completed checklist
        const isChecklistComplete = 
            activity.activityType === 'checklist' && 
            activity.items && 
            activity.items.length > 0 && 
            activity.items.every(item => item.completed === true);

        // Determine if workout is complete (all sets done)
        const isWorkoutComplete =
            activity.activityType === 'workout' &&
            activity.exercises &&
            activity.exercises.length > 0 &&
            activity.exercises.every(ex => 
              ex.sets && ex.sets.length > 0 && ex.sets.every(set => set.completed)
            );

        // Determine colors based on completion status
        const isComplete = isChecklistComplete || isWorkoutComplete;
        const activeColor = isComplete ? '#4CAF50' : theme.primary;
        const activeBorderColor = isComplete ? '#4CAF50' : (theme.border || '#E0E0E0');

        return (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.iconContainer, 
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
              color={activeColor}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default ActivityRow;