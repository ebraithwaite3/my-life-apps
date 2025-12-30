import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@my-apps/contexts';

const ProgressBar = ({ 
  completed, 
  total, 
  showCount = false,
  height = 8,
  style 
}) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const progressPercentage = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = completed === total && total > 0;
  
  // Green color for complete, primary color otherwise
  const fillColor = isComplete ? '#10B981' : theme.primary; // Tailwind green-500

  const styles = StyleSheet.create({
    container: {
      flexDirection: showCount ? 'row' : 'column',
      alignItems: 'center',
    },
    countText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginRight: getSpacing.sm,
    },
    progressBarBackground: {
      flex: showCount ? 1 : undefined,
      width: showCount ? undefined : '100%',
      height: height,
      backgroundColor: `${theme.text.tertiary}20`,
      borderRadius: height / 2,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: fillColor,
      borderRadius: height / 2,
    },
  });

  return (
    <View style={[styles.container, style]}>
      {showCount && (
        <Text style={styles.countText}>
          {completed}/{total}
        </Text>
      )}
      <View style={styles.progressBarBackground}>
        <View 
          style={[
            styles.progressBarFill, 
            { width: `${progressPercentage}%` }
          ]} 
        />
      </View>
    </View>
  );
};

export default ProgressBar;