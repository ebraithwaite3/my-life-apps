import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { ModalDropdown } from "@my-apps/ui";

const TemplateCard = ({ 
  template, 
  onPress, 
  onDelete, 
  onMove,
  availableMoveTargets = []
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

  // Format time display (convert HH:mm to 12-hour format)
  const formatTimeDisplay = (timeString) => {
    if (!timeString) return null;
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const hasDefaults = template.defaultReminderTime || template.defaultNotifyAdmin;

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
    metadataItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
    },
    itemCount: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
    },
    metadataText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
    },
    screenTimeIndicator: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: getSpacing.xs,
    },
    screenTimeText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
      marginLeft: getSpacing.xs,
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

        {/* Metadata Row: Items count, reminder time, notify admin */}
        <View style={styles.metadataRow}>
          {/* Item count */}
          <Text style={styles.itemCount}>
            {template.items?.length || 0} item{template.items?.length !== 1 ? 's' : ''}
          </Text>

          {/* Default reminder time */}
          {template.defaultReminderTime && (
            <View style={styles.metadataItem}>
              <Ionicons name="time-outline" size={16} color={theme.text.secondary} />
              <Text style={styles.metadataText}>
                {formatTimeDisplay(template.defaultReminderTime)}
              </Text>
            </View>
          )}

          {/* Default notify admin */}
          {template.defaultNotifyAdmin && (
            <View style={styles.metadataItem}>
              <Ionicons name="notifications-outline" size={16} color={theme.text.secondary} />
              <Text style={styles.metadataText}>
                Admin
              </Text>
            </View>
          )}
        </View>

        {/* Screen time indicator (separate row if exists) */}
        {template.items?.some(i => i.requiredForScreenTime) && (
          <View style={styles.screenTimeIndicator}>
            <Ionicons name="phone-portrait" size={14} color={theme.primary} />
            <Text style={styles.screenTimeText}>Has screen time requirements</Text>
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

export default TemplateCard;