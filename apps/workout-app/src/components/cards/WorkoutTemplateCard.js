import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { useWorkoutData } from "../../contexts/WorkoutDataContext";
import { getCategoriesFromTemplate } from "../../utils/exerciseUtils";
import { ModalDropdown } from "@my-apps/ui";
import { formatLastUsed } from "@my-apps/utils";
import { Swipeable } from "react-native-gesture-handler";

const WorkoutTemplateCard = ({ 
  template, 
  onPress, 
  onDelete, 
  onMove,
  availableMoveTargets = []
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { allExercises } = useWorkoutData();
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

  const handleDelete = () => {
    Alert.alert(
      "Delete Template",
      `Are you sure you want to delete "${template.name}"?`,
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
            onDelete(template);
          }
        }
      ]
    );
  };

  const handleMove = (target) => {
    setShowMoveModal(false);
    const targetName = target.type === 'personal' ? 'Personal' : target.groupName;
    Alert.alert(
      "Move Template",
      `Move "${template.name}" to ${targetName}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Move",
          onPress: () => onMove(template, target)
        }
      ]
    );
  };

  // Build move options for dropdown
  const moveOptions = availableMoveTargets.map(target => ({
    label: target.type === 'personal' ? 'Move to Personal' : `Move to ${target.groupName}`,
    action: () => handleMove(target)
  }));

  // Get exercise categories using util function
  const exerciseCategories = React.useMemo(() => {
    return getCategoriesFromTemplate(template.exercises || [], allExercises);
  }, [template.exercises, allExercises]);

  // Get total exercises count
  const exerciseCount = template.exercises?.length || 0;

  // Show third line if we have last used or group name
  const showThirdLine = template.lastUsed || template.isGroupTemplate;

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
          onPress={handleDelete}
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
    templateCard: {
      backgroundColor: theme.surface,
      padding: getSpacing.md, // Reduced from lg
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
    categoriesText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
      textTransform: "capitalize",
    },
    thirdLineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
      marginTop: getSpacing.xs,
      flexWrap: "wrap",
    },
    lastUsedText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
    },
    groupNameText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
      fontWeight: '600',
    },
    moveButton: {
      padding: getSpacing.xs,
      marginLeft: getSpacing.xs,
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
                  template.isGroupTemplate ? styles.groupIconBadge : styles.personalIconBadge
                ]}
              >
                <Ionicons
                  name={template.isGroupTemplate ? "people" : "person"}
                  size={12}
                  color={template.isGroupTemplate ? theme.primary : theme.text.secondary}
                />
              </View>

              {/* Name and metadata */}
              <View style={styles.nameAndMetadata}>
                {/* Line 1: Template name - truncate to 1 line */}
                <Text style={styles.templateName} numberOfLines={1}>
                  {template.name}
                </Text>

                {/* Line 2: Exercise count + Categories */}
                <View style={styles.metadataRow}>
                  {/* Exercise count */}
                  <View style={styles.metadataItem}>
                    <Ionicons name="barbell-outline" size={14} color={theme.text.secondary} />
                    <Text style={styles.metadataText}>
                      {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  {/* Categories - show first 2-3 inline */}
                  {exerciseCategories.length > 0 && (
                    <Text style={styles.categoriesText}>
                      {exerciseCategories.slice(0, 3).join(', ')}
                      {exerciseCategories.length > 3 && ` +${exerciseCategories.length - 3}`}
                    </Text>
                  )}
                </View>

                {/* Line 3: Last used + Group name (only if either exists) */}
                {showThirdLine && (
                  <View style={styles.thirdLineRow}>
                    {/* Last used */}
                    {template.lastUsed && (
                      <Text style={styles.lastUsedText}>
                        Last used: {formatLastUsed(template.lastUsed)}
                      </Text>
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

export default WorkoutTemplateCard;