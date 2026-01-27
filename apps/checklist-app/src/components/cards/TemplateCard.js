import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { ModalDropdown } from "@my-apps/ui";
import { Swipeable } from "react-native-gesture-handler";

const TemplateCard = ({
  template,
  onPress,
  onDelete,
  onMove,
  availableMoveTargets = [],
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
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

  const handleDelete = () => {
    Alert.alert(
      "Delete Template",
      `Are you sure you want to delete "${template.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            swipeableRef.current?.close();
            onDelete(template);
          },
        },
      ]
    );
  };

  const handleMove = (target) => {
    setShowMoveModal(false);
    const targetName =
      target.type === "personal" ? "Personal" : target.groupName;
    Alert.alert("Move Template", `Move "${template.name}" to ${targetName}?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Move",
        onPress: () => onMove(template, target),
      },
    ]);
  };

  // Build move options for dropdown
  const moveOptions = availableMoveTargets.map((target) => ({
    label:
      target.type === "personal"
        ? "Move to Personal"
        : `Move to ${target.groupName}`,
    action: () => handleMove(target),
  }));

  // Format time display (convert HH:mm to 12-hour format)
  const formatTimeDisplay = (timeString) => {
    if (!timeString) return null;

    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Render the 3-icon transfer visualization
  const renderTransferIcons = () => {
    const isGroup = template.isGroupTemplate;

    // Icon configuration - show what transformation will happen
    const sourceIcon = isGroup ? "people" : "person";
    const targetIcon = isGroup ? "person" : "people";
    const arrowIcon = "arrow-forward";

    return (
      <View style={styles.transferContainer}>
        <Ionicons name={sourceIcon} size={14} color={theme.text.secondary} />
        <Ionicons
          name={arrowIcon}
          size={12}
          color={theme.text.secondary}
          style={{ marginHorizontal: 2 }}
        />
        <Ionicons name={targetIcon} size={16} color={theme.primary} />
      </View>
    );
  };

  const hasScreenTime = template.items?.some((i) => i.requiredForScreenTime);
  const showThirdLine = hasScreenTime || template.isGroupTemplate;

  // Render swipe actions (delete button)
  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
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
    templateCard: {
      backgroundColor: theme.surface,
      padding: getSpacing.md,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardContent: {
      flexDirection: "row",
      alignItems: "flex-start",
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
    nameAndMetadata: {
      flex: 1,
    },
    templateName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      lineHeight: getTypography.body.fontSize * 1.4,
      marginBottom: getSpacing.xs,
    },
    metadataRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: getSpacing.sm,
    },
    metadataItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
    },
    metadataText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
    },
    thirdLineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
      marginTop: getSpacing.xs,
    },
    screenTimeItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
    },
    screenTimeText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
    },
    groupNameText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
      fontWeight: "600",
    },
    moveButton: {
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.full,
      borderWidth: 1,
      borderColor: theme.border,
      marginLeft: getSpacing.sm,
      alignSelf: "center",
    },
    transferContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
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
          style={styles.templateCard}
          onPress={() => onPress(template)}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            {/* Left: Icon + Name + Metadata */}
            <View style={styles.leftContent}>
              {/* Small icon badge - just visual, not clickable */}
              <View
                style={[
                  styles.iconBadge,
                  template.isGroupTemplate
                    ? styles.groupIconBadge
                    : styles.personalIconBadge,
                ]}
              >
                <Ionicons
                  name={template.isGroupTemplate ? "people" : "person"}
                  size={12}
                  color={
                    template.isGroupTemplate
                      ? theme.primary
                      : theme.text.secondary
                  }
                />
              </View>

              {/* Name and metadata */}
              <View style={styles.nameAndMetadata}>
                {/* Line 1: Template name - truncate to 1 line */}
                <Text style={styles.templateName} numberOfLines={1}>
                  {template.name}
                </Text>

                {/* Line 2: Metadata Row */}
                <View style={styles.metadataRow}>
                  {/* Item count */}
                  <Text style={styles.metadataText}>
                    {template.items?.length || 0} item
                    {template.items?.length !== 1 ? "s" : ""}
                  </Text>

                  {/* Default reminder time */}
                  {template.defaultReminderTime && (
                    <View style={styles.metadataItem}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={theme.text.secondary}
                      />
                      <Text style={styles.metadataText}>
                        {formatTimeDisplay(template.defaultReminderTime)}
                        {/* ✅ ADD RECURRING INDICATOR */}
                        {template.defaultIsRecurring && " (Recurring)"}
                      </Text>
                    </View>
                  )}

                  {/* Default notify admin */}
                  {template.defaultNotifyAdmin && (
                    <View style={styles.metadataItem}>
                      <Ionicons
                        name="notifications-outline"
                        size={14}
                        color={theme.text.secondary}
                      />
                      <Text style={styles.metadataText}>Admin</Text>
                    </View>
                  )}
                </View>

                {/* Line 3: Screen time + Group name (only if either exists) */}
                {showThirdLine && (
                  <View style={styles.thirdLineRow}>
                    {/* Screen time indicator */}
                    {hasScreenTime && (
                      <View style={styles.screenTimeItem}>
                        <Ionicons
                          name="phone-portrait"
                          size={12}
                          color={theme.primary}
                        />
                        <Text style={styles.screenTimeText}>Screen time</Text>
                      </View>
                    )}

                    {/* Group name */}
                    {template.isGroupTemplate && (
                      <Text style={styles.groupNameText}>
                        {template.groupName}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Right: 3-Icon Move Button */}
            {availableMoveTargets.length > 0 && (
              <TouchableOpacity
                ref={moveButtonRef}
                onPress={handleMovePress}
                style={styles.moveButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {renderTransferIcons()}
              </TouchableOpacity>
            )}
          </View>
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

export default TemplateCard;
