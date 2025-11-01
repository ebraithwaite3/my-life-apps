import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { updateDocument } from "../../../services/firestoreService";
import * as Crypto from "expo-crypto";
import ShareChecklist from "./ShareChecklist";
import EditChecklist from "./EditChecklist";
import AcceptChecklist from "./AcceptChecklist";

const ChecklistCard = ({ checklist, user, groups, onChecklistUpdate }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const uuidv4 = () => Crypto.randomUUID();
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  console.log("Starting ChecklistCard render:", checklist);

  // Early return if checklist is not provided
  if (!checklist) {
    return null;
  }
  console.log("Checklist details:", checklist.accepted);

  // Get all group members from ALL groups, removing duplicates & removing ME
  const allGroupMembers = useMemo(() => {
    if (!groups || groups.length === 0 || !user) return [];

    const membersSet = new Set();
    groups.forEach((group) => {
      if (group.members && Array.isArray(group.members)) {
        group.members.forEach((member) => {
          if (member.userId !== user.userId) {
            // Exclude current user
            membersSet.add(JSON.stringify(member)); // Use JSON stringification to handle object uniqueness
          }
        });
      }
    });

    return Array.from(membersSet).map((memberStr) => JSON.parse(memberStr));
  }, [groups, user]);

  const onEdit = () => {
    setIsEditModalVisible(true);
  };

  const onDelete = () => {
    console.log("Delete checklist:", checklist.id);
    Alert.alert(
      "Delete Checklist",
      `Are you sure you want to delete the checklist "${checklist.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedChecklists = (user.savedChecklists || []).filter(
                (cl) => cl.id !== checklist.id
              );

              await updateDocument("users", user.userId, {
                savedChecklists: updatedChecklists,
              });

              if (onChecklistUpdate) onChecklistUpdate();
              Alert.alert("Deleted", "Checklist deleted successfully.");
            } catch (error) {
              console.error("Error deleting checklist:", error);
              Alert.alert(
                "Error",
                "Failed to delete checklist. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const onCopy = async () => {
    try {
      const { sharedBy, accepted, ...checklistWithoutSharedProps } = checklist;
      const copiedChecklist = {
        ...checklistWithoutSharedProps,
        id: uuidv4(),
        name: "Copy of " + checklist.name,
        createdAt: new Date().toISOString(),
      };

      const updatedChecklists = [
        ...(user.savedChecklists || []),
        copiedChecklist,
      ];

      await updateDocument("users", user.userId, {
        savedChecklists: updatedChecklists,
      });

      if (onChecklistUpdate) onChecklistUpdate();
      Alert.alert("Success", "Checklist copied successfully!");
    } catch (error) {
      console.error("Error copying checklist:", error);
      Alert.alert("Error", "Failed to copy checklist. Please try again.");
    }
  };

  const onShare = () => {
    setIsShareModalVisible(true);
  };

  const closeShareModal = () => {
    setIsShareModalVisible(false);
  };

  const closeEditModal = () => {
    setIsEditModalVisible(false);
  };

  const handleChecklistSave = () => {
    if (onChecklistUpdate) onChecklistUpdate();
    setIsEditModalVisible(false);
  };

  // If this is a shared checklist that hasn't been accepted, show AcceptChecklist instead
  if (checklist.accepted === false) {
    return (
      <AcceptChecklist
        checklist={checklist}
        user={user}
        onChecklistUpdate={onChecklistUpdate}
      />
    );
  }

  const styles = StyleSheet.create({
    checklistCard: {
      backgroundColor: theme.surface || theme.background,
      borderRadius: 16,
      padding: getSpacing.lg,
      marginBottom: getSpacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    checklistName: {
      ...getTypography.h4,
      color: theme.text.primary,
      fontWeight: "bold",
      marginBottom: getSpacing.xs,
    },
    checklistCount: {
      ...getTypography.caption,
      color: theme.text.secondary,
      marginBottom: getSpacing.md,
    },
    sharedBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.primary + "15",
      paddingHorizontal: getSpacing.sm,
      paddingVertical: getSpacing.xs,
      borderRadius: 12,
      marginBottom: getSpacing.sm,
      alignSelf: "flex-start",
    },
    sharedBadgeText: {
      ...getTypography.caption,
      color: theme.primary,
      fontWeight: "600",
      marginLeft: getSpacing.xs,
      fontSize: 11,
    },
    checklistActions: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingTop: getSpacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    actionButton: {
      alignItems: "center",
      padding: getSpacing.sm,
      borderRadius: 8,
      minWidth: 60,
    },
    actionButtonText: {
      ...getTypography.caption,
      color: theme.text.secondary,
      marginTop: getSpacing.xs,
      fontSize: 11,
    },
  });

  return (
    <>
      <View style={styles.checklistCard}>
        {/* Show badge if this is a shared checklist that's been accepted */}
        {checklist.sharedBy && checklist.accepted === true && (
          <View style={styles.sharedBadge}>
            <Ionicons name="share-outline" size={12} color={theme.primary} />
            <Text style={styles.sharedBadgeText}>
              Shared by {checklist.sharedBy.username}
            </Text>
          </View>
        )}

        <Text style={styles.checklistName}>{checklist.name}</Text>
        <Text style={styles.checklistCount}>
          {checklist.items?.length || 0} items
        </Text>
        <View style={styles.checklistActions}>
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Ionicons
              name="pencil-outline"
              size={20}
              color={theme.text.primary}
            />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
            <Ionicons
              name="trash-outline"
              size={20}
              color={theme.error || "#ef4444"}
            />
            <Text
              style={[
                styles.actionButtonText,
                { color: theme.error || "#ef4444" },
              ]}
            >
              Delete
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onCopy}>
            <Ionicons
              name="copy-outline"
              size={20}
              color={theme.text.primary}
            />
            <Text style={styles.actionButtonText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <Ionicons
              name="share-outline"
              size={20}
              color={theme.text.primary}
            />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Share Modal */}
      <ShareChecklist
        isVisible={isShareModalVisible}
        onClose={closeShareModal}
        checklist={checklist}
        allGroupMembers={allGroupMembers}
        user={user}
      />

      {/* Edit Modal */}
      <EditChecklist
        isVisible={isEditModalVisible}
        onClose={closeEditModal}
        checklist={checklist}
        user={user}
        onSave={handleChecklistSave}
      />
    </>
  );
};

export default ChecklistCard;
