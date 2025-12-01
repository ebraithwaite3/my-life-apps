// components/calendar/ActivityRow.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { Ionicons } from '@expo/vector-icons';

const ActivityRow = ({ activities, appName  }) => {
  console.log("Rendering ActivityRow with activities:", activities);
  const { theme, getSpacing, getBorderRadius } = useTheme();

  const handlePress = (activity) => {
    console.log("Activity pressed:", activity);
    // Implement navigation or action based on activity type
    if (activity.activityType === appName) {
        console.log("Internal Activity pressed:", activity, "Navigating to internal screen.");
    } else {
        console.log("External Activity pressed:", activity, "Opening external link.");
    }
  }

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