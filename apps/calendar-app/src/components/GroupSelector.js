import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const GroupSelector = ({ 
  userGroups, 
  selectedGroup, 
  onGroupSelect,
  sectionTitle = "Group"
}) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const styles = StyleSheet.create({
    section: {
      marginBottom: getSpacing.lg,
    },
    sectionTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: getTypography.h4.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
    },
    groupScrollView: {
      marginBottom: getSpacing.sm,
    },
    groupOption: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      marginRight: getSpacing.sm,
      minWidth: 100,
      alignItems: 'center',
    },
    groupOptionSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    groupOptionText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      fontWeight: '500',
    },
    groupOptionTextSelected: {
      color: theme.text.inverse,
    },
    singleGroupContainer: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: getSpacing.md,
    },
    singleGroupText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    noGroupsContainer: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: getSpacing.md,
      borderStyle: 'dashed',
    },
    noGroupsText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.tertiary,
      fontStyle: 'italic',
      textAlign: 'center',
    },
  });

  // Handle different states
  if (!userGroups || userGroups.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        <View style={styles.noGroupsContainer}>
          <Text style={styles.noGroupsText}>No groups available</Text>
        </View>
      </View>
    );
  }

  if (userGroups.length === 1) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        <View style={styles.singleGroupContainer}>
          <Text style={styles.singleGroupText}>
            {userGroups[0].groupName}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.groupScrollView}
      >
        {userGroups.map((group) => (
          <TouchableOpacity
            key={group.groupId}
            style={[
              styles.groupOption,
              selectedGroup?.groupId === group.groupId && styles.groupOptionSelected
            ]}
            onPress={() => onGroupSelect(group)}
          >
            <Text style={[
              styles.groupOptionText,
              selectedGroup?.groupId === group.groupId && styles.groupOptionTextSelected
            ]}>
              {group.groupName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default GroupSelector;