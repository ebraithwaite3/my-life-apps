import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { PopUpModalWrapper } from '../../base';
import ModalHeader from '../../../headers/ModalHeader';

const AssignmentModal = ({
  visible,
  groups = [],
  currentUserId,
  taskName,
  onConfirm,
  onCancel,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    if (visible) setSelected(new Set());
  }, [visible]);

  // All members including current user (self-assign adds to the open checklist)
  const allMembers = (groups || []).flatMap(g => g.members || []);
  const members = allMembers.reduce((acc, m) => {
    if (!acc.find(x => x.userId === m.userId)) acc.push(m);
    return acc;
  }, []).sort((a, b) => {
    // Current user first
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return 0;
  });

  const toggle = (userId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const styles = StyleSheet.create({
    content: {
      padding: getSpacing.lg,
    },
    member: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.md,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      marginBottom: getSpacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    memberSelected: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}10`,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: getSpacing.md,
    },
    avatarText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: getTypography.body.fontSize,
    },
    memberName: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    checkIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.text.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkIconSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
      paddingVertical: getSpacing.xl,
    },
  });

  return (
    <PopUpModalWrapper visible={visible} onClose={onCancel} maxHeight="80%">
      <View style={{ height: '100%' }}>
        <ModalHeader
          title={`Assign: ${taskName || 'Task'}`}
          onCancel={onCancel}
          cancelText="Cancel"
          onDone={() => onConfirm(Array.from(selected))}
          doneText="Assign"
          doneDisabled={selected.size === 0}
        />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {members.length === 0 ? (
            <Text style={styles.emptyText}>No family members found.</Text>
          ) : (
            members.map(member => {
              const isSelected = selected.has(member.userId);
              const baseName = member.name || member.username || member.displayName || member.email || member.userId || '?';
              const displayName = member.userId === currentUserId ? `${baseName} (You)` : baseName;
              const initial = displayName[0].toUpperCase();
              return (
                <TouchableOpacity
                  key={member.userId}
                  style={[styles.member, isSelected && styles.memberSelected]}
                  onPress={() => toggle(member.userId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                  <Text style={styles.memberName}>{displayName || member.userId}</Text>
                  <View style={[styles.checkIcon, isSelected && styles.checkIconSelected]}>
                    {isSelected && <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </PopUpModalWrapper>
  );
};

export default AssignmentModal;
