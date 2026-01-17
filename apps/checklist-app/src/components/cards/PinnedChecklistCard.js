import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { ModalDropdown } from "@my-apps/ui";
import { ProgressBar } from "@my-apps/ui";
import { calculateChecklistProgress } from "@my-apps/utils";
import { Swipeable } from "react-native-gesture-handler";

const PinnedChecklistCard = ({ 
  checklist, 
  onPress, 
  onUnpin,
  onMove,
  onEditReminder,
  availableMoveTargets = []
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const moveButtonRef = useRef(null);
  const swipeableRef = useRef(null);

  const handleMovePress = () => {
    if (availableMoveTargets.length === 0) return;
    
    if (moveButtonRef.current) {
      moveButtonRef.current.measureInWindow((x, y, width, height) => {
        setAnchorPosition({ x, y, width, height });
        setShowMoveModal(true);
      });
    }
  };

  const handleUnpin = () => {
    Alert.alert(
      "Delete Checklist",
      `Are you sure you want to delete "${checklist.name}"? This cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => swipeableRef.current?.close()
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            swipeableRef.current?.close();
            onUnpin(checklist);
          }
        }
      ]
    );
  };

  const handleMove = (target) => {
    setShowMoveModal(false);
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

  // Build move options for dropdown
  const moveOptions = availableMoveTargets.map(target => ({
    label: target.type === 'personal' ? 'Move to Personal' : `Move to ${target.groupName}`,
    action: () => handleMove(target)
  }));

  // Calculate progress using shared utility
  const { completed, total } = calculateChecklistProgress(checklist.items || []);

  // Format reminder time
  const formatReminderTime = (timeString) => {
    if (!timeString) return null;
    return new Date(timeString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Render swipe actions (delete button)
  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleUnpin}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const styles = StyleSheet.create({
    swipeableContainer: {
      marginBottom: getSpacing.sm,
    },
    checklistCard: {
      backgroundColor: theme.surface,
      padding: getSpacing.md, // Reduced from lg
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardContent: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: getSpacing.sm,
    },
    leftContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: getSpacing.sm,
    },
    iconBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    groupIconBadge: {
      backgroundColor: theme.primary + "20",
    },
    personalIconBadge: {
      backgroundColor: theme.text.secondary + "20",
    },
    nameAndInfo: {
      flex: 1,
    },
    checklistName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      lineHeight: getTypography.body.fontSize * 1.4,
    },
    groupNameText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
      fontWeight: '600',
      marginTop: 2,
    },
    moveButton: {
      padding: getSpacing.xs,
      marginLeft: getSpacing.xs,
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
    deleteButton: {
      backgroundColor: theme.error,
      justifyContent: "center",
      alignItems: "center",
      width: 80,
      height: "100%",
      borderTopRightRadius: getBorderRadius.md,
      borderBottomRightRadius: getBorderRadius.md,
    },
    deleteButtonText: {
      color: "#fff",
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      marginTop: 4,
    },
  });

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        containerStyle={styles.swipeableContainer}
      >
        <TouchableOpacity 
          style={styles.checklistCard}
          onPress={() => onPress(checklist)}
          activeOpacity={0.7}
        >
          {/* Header: Icon + Name + Move Button */}
          <View style={styles.cardContent}>
            <View style={styles.leftContent}>
              {/* Small icon badge - just visual, not clickable */}
              <View
                style={[
                  styles.iconBadge,
                  checklist.isGroupChecklist ? styles.groupIconBadge : styles.personalIconBadge
                ]}
              >
                <Ionicons
                  name={checklist.isGroupChecklist ? "people" : "person"}
                  size={12}
                  color={checklist.isGroupChecklist ? theme.primary : theme.text.secondary}
                />
              </View>

              {/* Name and group name */}
              <View style={styles.nameAndInfo}>
                <Text style={styles.checklistName} numberOfLines={1}>
                  {checklist.name}
                </Text>
                {checklist.isGroupChecklist && (
                  <Text style={styles.groupNameText}>
                    {checklist.groupName}
                  </Text>
                )}
              </View>
            </View>

            {/* Right: Move button */}
            {availableMoveTargets.length > 0 && (
              <TouchableOpacity
                ref={moveButtonRef}
                onPress={handleMovePress}
                style={styles.moveButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="arrow-forward-circle-outline"
                  size={20}
                  color={theme.text.secondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Progress Bar */}
          <ProgressBar
            completed={completed}
            total={total}
            showCount={true}
            height={6}
            style={{ marginBottom: checklist.reminderTime ? getSpacing.sm : 0 }}
          />

          {/* Reminder Display */}
          {checklist.reminderTime && (
            <View style={styles.reminderRow}>
              <Ionicons
                name="notifications-outline"
                size={14}
                color={theme.text.secondary}
              />
              <Text style={styles.reminderText}>
                {formatReminderTime(checklist.reminderTime)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Swipeable>

      {/* Move modal */}
      <ModalDropdown
        visible={showMoveModal}
        options={moveOptions}
        onClose={() => setShowMoveModal(false)}
        onSelect={(option) => option.action()}
        anchorPosition={anchorPosition}
      />
    </>
  );
};

export default PinnedChecklistCard;