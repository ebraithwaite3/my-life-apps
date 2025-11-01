import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const VisibilitySelector = ({
  visibilityOption,
  onVisibilityChange,
  selectedMembers = [],
  selectedTaskType,
  taskData = {},
  onMembersChange,
  groupMembers = [],
  currentUserId,
  sectionTitle = "Visible To"
}) => {
  const { theme, getSpacing, getTypography } = useTheme();

  // Memoize assigned members for transport tasks
  const assignedTransportMembers = useMemo(() => {
    if (selectedTaskType !== 'Transport' || !taskData) {
      return [];
    }
    const assignedIds = new Set();
    if (taskData.dropOff?.assignedToId) {
      assignedIds.add(taskData.dropOff.assignedToId);
    }
    if (taskData.pickUp?.assignedToId) {
      assignedIds.add(taskData.pickUp.assignedToId);
    }
    return Array.from(assignedIds);
  }, [selectedTaskType, taskData]);

  const handleMemberToggle = useCallback((memberId) => {
    // Prevent unchecking the creator or an assigned transport member
    if (memberId === currentUserId || assignedTransportMembers.includes(memberId)) {
      return;
    }

    const isSelected = selectedMembers.includes(memberId);
    let newSelectedMembers;

    if (isSelected) {
      newSelectedMembers = selectedMembers.filter(id => id !== memberId);
    } else {
      newSelectedMembers = [...selectedMembers, memberId];
    }

    onMembersChange(newSelectedMembers);
  }, [selectedMembers, onMembersChange, currentUserId, assignedTransportMembers]);

  const renderMemberCheckbox = useCallback((member) => {
    const isSelected = selectedMembers.includes(member.userId);
    const isCreator = member.userId === currentUserId;
    const isAssigned = assignedTransportMembers.includes(member.userId);
    const isDisabled = isCreator || (isAssigned && visibilityOption === 'custom');

    return (
      <TouchableOpacity
        key={member.userId}
        style={[
          styles.memberOption,
          isDisabled && styles.memberOptionDisabled
        ]}
        onPress={() => handleMemberToggle(member.userId)}
        disabled={isDisabled}
      >
        <View style={[
          styles.checkbox,
          isSelected && styles.checkboxSelected
        ]}>
          {isSelected && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
        </View>
        <View style={styles.memberInfo}>
          <Text style={[
            styles.memberName,
            isDisabled && styles.memberNameDisabled
          ]}>
            {member.username || member.name || 'Unknown User'}
            {isCreator && ' (You)'}
            {isAssigned && !isCreator && ' (Assigned)'}
          </Text>
          <Text style={styles.memberRole}>
            {member.role === 'admin' ? 'Admin' : 'Member'}
          </Text>
        </View>
        {isDisabled && (
          <Ionicons name="lock-closed" size={16} color={theme.text.tertiary} />
        )}
      </TouchableOpacity>
    );
  }, [selectedMembers, assignedTransportMembers, handleMemberToggle, currentUserId, visibilityOption, styles, theme]);

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
    visibilityContainer: {
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: getSpacing.sm,
    },
    visibilityOption: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.sm,
      borderRadius: 6,
      marginBottom: getSpacing.xs,
    },
    visibilityOptionSelected: {
      backgroundColor: `${theme.primary}10`,
    },
    visibilityRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.border,
      marginRight: getSpacing.sm,
      marginTop: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    visibilityRadioSelected: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.primary,
    },
    visibilityInfo: {
      flex: 1,
    },
    visibilityTitle: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '500',
      color: theme.text.primary,
    },
    visibilityDescription: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: 2,
    },
    customMembersContainer: {
      marginTop: getSpacing.md,
      backgroundColor: theme.surface,
      borderRadius: 8,
      padding: getSpacing.md,
      maxHeight: 200,
    },
    memberOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.xs,
      borderRadius: 6,
    },
    memberOptionDisabled: {
      opacity: 0.6,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.border,
      marginRight: getSpacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '500',
      color: theme.text.primary,
    },
    memberNameDisabled: {
      color: theme.text.secondary,
    },
    memberRole: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: 1,
    },
  });

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      <View style={styles.visibilityContainer}>
        {/* All Group Members Option */}
        <TouchableOpacity
          style={[
            styles.visibilityOption,
            visibilityOption === 'all' && styles.visibilityOptionSelected
          ]}
          onPress={() => onVisibilityChange('all')}
        >
          <View style={styles.visibilityRadio}>
            {visibilityOption === 'all' && <View style={styles.visibilityRadioSelected} />}
          </View>
          <View style={styles.visibilityInfo}>
            <Text style={styles.visibilityTitle}>All Group Members</Text>
            <Text style={styles.visibilityDescription}>Everyone in the group can see and respond</Text>
          </View>
        </TouchableOpacity>

        {/* Custom Selection Option */}
        <TouchableOpacity
          style={[
            styles.visibilityOption,
            visibilityOption === 'custom' && styles.visibilityOptionSelected
          ]}
          onPress={() => onVisibilityChange('custom')}
        >
          <View style={styles.visibilityRadio}>
            {visibilityOption === 'custom' && <View style={styles.visibilityRadioSelected} />}
          </View>
          <View style={styles.visibilityInfo}>
            <Text style={styles.visibilityTitle}>Custom</Text>
            <Text style={styles.visibilityDescription}>Select who can view this assignment</Text>
          </View>
        </TouchableOpacity>

        {/* Custom Members Selection */}
        {visibilityOption === 'custom' && groupMembers.length > 0 && (
          <ScrollView style={styles.customMembersContainer} showsVerticalScrollIndicator={false}>
            {groupMembers.map(renderMemberCheckbox)}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default VisibilitySelector;