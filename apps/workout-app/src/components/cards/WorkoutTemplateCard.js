import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { useWorkoutData } from "../../contexts/WorkoutDataContext";
import { getCategoriesFromTemplate } from "../../utils/exerciseUtils";
import { ModalDropdown } from "@my-apps/ui";
import { formatLastUsed } from "@my-apps/utils";

const WorkoutTemplateCard = ({ 
  template, 
  onPress, 
  onDelete, 
  onMove,
  availableMoveTargets = []
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { allExercises } = useWorkoutData();
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

  const handleDelete = () => {
    setShowDropdown(false);
    Alert.alert(
      "Delete Template",
      `Are you sure you want to delete "${template.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(template)
        }
      ]
    );
  };

  const handleMove = (target) => {
    setShowDropdown(false);
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

  // Build dropdown options
  const dropdownOptions = [
    ...availableMoveTargets.map(target => ({
      label: target.type === 'personal' ? 'Move to Personal' : `Move to ${target.groupName}`,
      action: () => handleMove(target)
    })),
    {
      label: 'Delete Template',
      action: handleDelete
    }
  ];

  // Get exercise categories using util function
  const exerciseCategories = React.useMemo(() => {
    return getCategoriesFromTemplate(template.exercises || [], allExercises);
  }, [template.exercises, allExercises]);

  // Get total exercises count
  const exerciseCount = template.exercises?.length || 0;

  const styles = StyleSheet.create({
    templateCard: {
      backgroundColor: theme.surface,
      padding: getSpacing.lg,
      borderRadius: getBorderRadius.md,
      marginBottom: getSpacing.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    templateHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: getSpacing.sm,
    },
    templateHeaderLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
    },
    templateName: {
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
    metadataRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: getSpacing.md,
    },
    exerciseCount: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      fontWeight: "500",
    },
    categoriesContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
      flexWrap: "wrap",
      marginTop: getSpacing.xs,
    },
    categoryBadge: {
      backgroundColor: theme.primarySoft || theme.primary + "15",
      paddingHorizontal: getSpacing.sm,
      paddingVertical: 2,
      borderRadius: getBorderRadius.sm,
    },
    categoryText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
      textTransform: "capitalize",
    },
    lastUsedText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
      marginTop: getSpacing.xs,
    },
  });

  return (
    <>
      <TouchableOpacity 
        style={styles.templateCard}
        onPress={() => onPress(template)}
      >
        <View style={styles.templateHeader}>
          <View style={styles.templateHeaderLeft}>
            <Text style={styles.templateName} numberOfLines={1}>
              {template.name}
            </Text>
            {template.isGroupTemplate ? (
              <View style={[styles.badge, styles.groupBadge]}>
                <Text style={[styles.badgeText, styles.groupBadgeText]}>
                  {template.groupName}
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

        {/* Exercise count */}
        <View style={styles.metadataRow}>
          <Ionicons name="barbell-outline" size={16} color={theme.text.secondary} />
          <Text style={styles.exerciseCount}>
            {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Exercise categories */}
        {exerciseCategories.length > 0 && (
          <View style={styles.categoriesContainer}>
            {exerciseCategories.slice(0, 4).map((category, index) => (
              <View key={index} style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
            ))}
            {exerciseCategories.length > 4 && (
              <Text style={styles.categoryText}>+{exerciseCategories.length - 4} more</Text>
            )}
          </View>
        )}

        {/* Last used */}
        {template.lastUsed && (
          <Text style={styles.lastUsedText}>
            Last used: {formatLastUsed(template.lastUsed)}
          </Text>
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

export default WorkoutTemplateCard;