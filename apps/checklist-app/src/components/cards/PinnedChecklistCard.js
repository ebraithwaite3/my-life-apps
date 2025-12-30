import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { ModalDropdown } from "@my-apps/ui";
import { ProgressBar } from "@my-apps/ui";
import { calculateChecklistProgress } from "@my-apps/utils";

const PinnedChecklistCard = ({ 
  checklist, 
  onPress, 
  onUnpin,
  onMove,
  onEditReminder,
  availableMoveTargets = [] // Array of { type: 'personal' | 'group', groupId?, groupName? }
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const ellipsisRef = useRef(null);

  const handleEllipsisPress = () => {
    if (ellipsisRef.current) {
      ellipsisRef.current.measureInWindow((x, y, width, height) => {
        setAnchorPosition({ x, y, width, height });
        setShowDropdown(true);
      });
    }
  };

  const handleUnpin = () => {
    setShowDropdown(false);
    Alert.alert(
      "Delete Checklist",
      `Are you sure you want to delete "${checklist.name}"? This cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onUnpin(checklist)
        }
      ]
    );
  };

  const handleMove = (target) => {
    setShowDropdown(false);
    const targetName = target.type === 'personal' ? 'Personal' : target.groupName;
    Alert.alert(
      "Move Checklist",
      `Move "${checklist.name}" to ${targetName}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Move",
          onPress: () => onMove(checklist, target)
        }
      ]
    );
  };

  const handleEditReminder = () => {
    setShowDropdown(false);
    if (onEditReminder) {
      onEditReminder(checklist);
    }
  };

  // Build dropdown options
  const dropdownOptions = [
    {
      label: checklist.reminderTime ? 'Edit Reminder' : 'Add Reminder',
      action: handleEditReminder
    },
    ...availableMoveTargets.map(target => ({
      label: target.type === 'personal' ? 'Move to Personal' : `Move to ${target.groupName}`,
      action: () => handleMove(target)
    })),
    {
      label: 'Delete Checklist',
      action: handleUnpin
    }
  ];

  // Calculate progress using shared utility (handles nested items)
  const { completed, total } = calculateChecklistProgress(checklist.items || []);

  const styles = StyleSheet.create({
    checklistCard: {
      backgroundColor: theme.surface,
      padding: getSpacing.lg,
      borderRadius: getBorderRadius.md,
      marginBottom: getSpacing.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    checklistHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: getSpacing.sm,
    },
    checklistHeaderLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
    },
    checklistName: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      flex: 1,
    },
    badge: {
      paddingHorizontal: getSpacing.sm,
      paddingVertical: getSpacing.xs,
      borderRadius: getBorderRadius.sm,
    },
    groupBadge: {
      backgroundColor: theme.primary + "20",
    },
    personalBadge: {
      backgroundColor: theme.text.secondary + "20",
    },
    badgeText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
    },
    groupBadgeText: {
      color: theme.primary,
    },
    personalBadgeText: {
      color: theme.text.secondary,
    },
    ellipsisButton: {
      padding: getSpacing.xs,
    },
    reminderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
      marginTop: getSpacing.sm,
    },
    reminderText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
    },
  });

  return (
    <>
      <TouchableOpacity 
        style={styles.checklistCard}
        onPress={() => onPress(checklist)}
      >
        <View style={styles.checklistHeader}>
          <View style={styles.checklistHeaderLeft}>
            <Text style={styles.checklistName} numberOfLines={1}>
              {checklist.name}
            </Text>
            {checklist.isGroupChecklist ? (
              <View style={[styles.badge, styles.groupBadge]}>
                <Text style={[styles.badgeText, styles.groupBadgeText]}>
                  {checklist.groupName}
                </Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.personalBadge]}>
                <Text style={[styles.badgeText, styles.personalBadgeText]}>
                  Personal
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            ref={ellipsisRef}
            onPress={handleEllipsisPress}
            style={styles.ellipsisButton}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color={theme.text.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Progress Bar - Now uses nested-aware calculation */}
        <ProgressBar
          completed={completed}
          total={total}
          showCount={true}
          height={6}
          style={{ marginBottom: getSpacing.sm }}
        />

        {/* Reminder Display */}
        {checklist.reminderTime && (
          <View style={styles.reminderRow}>
            <Ionicons
              name="notifications-outline"
              size={16}
              color={theme.text.secondary}
            />
            <Text style={styles.reminderText}>
              Reminder: {new Date(checklist.reminderTime).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <ModalDropdown
        visible={showDropdown}
        options={dropdownOptions}
        onClose={() => setShowDropdown(false)}
        onSelect={(option) => option.action()}
        anchorPosition={anchorPosition}
      />
    </>
  );
};

export default PinnedChecklistCard;