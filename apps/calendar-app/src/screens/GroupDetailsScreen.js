// src/screens/GroupDetailsScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const GroupDetailsScreen = ({ route, navigation }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { groupId } = route.params || { groupId: 'unknown' };

  // Sample group data
  const groupData = {
    name: 'Family Calendar',
    members: ['Alice', 'Bob', 'Charlie', 'Dana'],
    description: 'Shared calendar for family events and activities',
    color: 'blue',
    createdDate: '2 weeks ago'
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: getSpacing.md,
      paddingTop: getSpacing.lg,
    },
    header: {
      marginBottom: getSpacing.lg,
    },
    title: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: getTypography.h2.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    subtitle: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.lg,
    },
    groupCard: {
      backgroundColor: theme.card,
      padding: getSpacing.md,
      borderRadius: 12,
      marginBottom: getSpacing.lg,
    },
    groupName: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    groupDescription: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    infoLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
    },
    infoValue: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      fontWeight: '500',
    },
    membersSection: {
      backgroundColor: theme.card,
      padding: getSpacing.md,
      borderRadius: 12,
      marginBottom: getSpacing.lg,
    },
    sectionTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: getTypography.h4.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    memberItem: {
      backgroundColor: theme.surface || theme.background,
      padding: getSpacing.sm,
      borderRadius: 8,
      marginBottom: getSpacing.sm,
    },
    memberName: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: getSpacing.md,
      paddingTop: getSpacing.lg,
    },
    button: {
      flex: 1,
      padding: getSpacing.md,
      borderRadius: 12,
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: theme.primary,
    },
    secondaryButton: {
      backgroundColor: theme.surface || theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    primaryButtonText: {
      fontSize: getTypography.button.fontSize,
      fontWeight: getTypography.button.fontWeight,
      color: theme.text.inverse,
    },
    secondaryButtonText: {
      fontSize: getTypography.button.fontSize,
      fontWeight: getTypography.button.fontWeight,
      color: theme.text.primary,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Group Details</Text>
          <Text style={styles.subtitle}>Group ID: {groupId}</Text>
        </View>

        <View style={styles.groupCard}>
          <Text style={styles.groupName}>{groupData.name}</Text>
          <Text style={styles.groupDescription}>{groupData.description}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>{groupData.createdDate}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Color</Text>
            <Text style={styles.infoValue}>{groupData.color}</Text>
          </View>
        </View>

        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Members ({groupData.members.length})</Text>
          {groupData.members.map((member, index) => (
            <View key={index} style={styles.memberItem}>
              <Text style={styles.memberName}>{member}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>← Back</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={() => console.log('Managing group')}
          >
            <Text style={styles.primaryButtonText}>Manage Group</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default GroupDetailsScreen;