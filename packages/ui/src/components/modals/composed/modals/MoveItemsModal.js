import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useData } from "@my-apps/contexts";
import { ModalWrapper } from "../../base";
import ModalHeader from "../../../headers/ModalHeader";
import { useNavigation } from "@react-navigation/native";

const MoveItemsModal = ({
  visible,
  pinnedChecklists = [],
  itemsToMove = [],
  selectedChecklist,
  context = 'pinned', // 'pinned' or 'event'
  eventId = null,
  selectedCalendarIdForMoving = null,
  setSelectedCalendarIdForMoving,
  groupId = null,
  eventStartTime = null,
  eventActivities = [],
  onConfirm,
  onCancel,
}) => {
  console.log("🔍 MoveItemsModal received pinnedChecklists:", pinnedChecklists);
  console.log("🔍 MoveItemsModal visible:", visible);
  console.log("Selected Checklist:", selectedChecklist);

  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { setAddingToEvent } = useData();
  const navigation = useNavigation();

  const [showNewPinned, setShowNewPinned] = useState(false);
  const [newPinnedName, setNewPinnedName] = useState("");

  const handleSelectPinned = (pinnedChecklist) => {
    onConfirm({ type: "pinned", checklist: pinnedChecklist });
  };

  const handleCreateNewPinned = () => {
    if (!newPinnedName.trim()) return;

    onConfirm({
      type: "new-pinned",
      name: newPinnedName.trim(),
    });

    setNewPinnedName("");
    setShowNewPinned(false);
  };

  const handleSelectEvent = () => {
    console.log("🚀 Initiating add to event mode");
    console.log("📦 Items being moved:", itemsToMove);
    console.log("🔍 Item IDs:", itemsToMove.map(item => item.id)); // ✅ ADD THIS
  
  const itemIds = itemsToMove.map(item => item.id);
  console.log("🎯 itemIds Set size:", itemIds.size); // ✅ ADD THIS
  console.log("🎯 itemIds Set contents:", Array.from(itemIds)); // ✅ ADD THIS
    
    // ✅ Dynamic sourceInfo based on context
    const sourceInfo = context === 'event' ? {
      type: 'event',
      eventId: eventId,
      startTime: eventStartTime,
      checklistId: selectedChecklist?.id,
      itemIdsToRemove: itemIds,
      calendarId: selectedCalendarIdForMoving,
      allItems: selectedChecklist?.items || [],
      allActivities: eventActivities,
      ... groupId ? { groupId: groupId } : {}
    } : {
      type: 'pinned',
      checklistId: selectedChecklist?.id,
      itemIdsToRemove: itemIds,
      ...(selectedChecklist?.isGroupChecklist && {
        groupId: selectedChecklist.groupId
      })
    };

    setAddingToEvent({
      isActive: true,
      itemsToMove: itemsToMove,
      returnPath: context === 'event' ? 'Calendar' : 'Pinned',  // ✅ Dynamic return
      sourceInfo: sourceInfo,
    });

    
    onCancel();
    
    // Navigate
    setTimeout(() => {
      navigation.navigate('Calendar');
    }, 100);
  };

  const styles = StyleSheet.create({
    scrollContent: {
      padding: getSpacing.lg,
    },
    section: {
      marginBottom: getSpacing.xl,
    },
    sectionTitle: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      marginBottom: getSpacing.md,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    optionButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: getSpacing.md,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      marginBottom: getSpacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    optionIcon: {
      width: 40,
      height: 40,
      borderRadius: getBorderRadius.md,
      backgroundColor: theme.primary + "20",
      alignItems: "center",
      justifyContent: "center",
      marginRight: getSpacing.md,
    },
    optionText: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      fontWeight: "500",
    },
    newPinnedContainer: {
      padding: getSpacing.md,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    input: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.sm,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
    },
    buttonRow: {
      flexDirection: "row",
      gap: getSpacing.sm,
    },
    button: {
      flex: 1,
      paddingVertical: getSpacing.md,
      borderRadius: getBorderRadius.sm,
      alignItems: "center",
    },
    primaryButton: {
      backgroundColor: theme.primary,
    },
    secondaryButton: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    buttonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
    },
    primaryButtonText: {
      color: "#fff",
    },
    secondaryButtonText: {
      color: theme.text.primary,
    },
    emptyState: {
      padding: getSpacing.xl,
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: "center",
      marginTop: getSpacing.sm,
    },
  });

  return (
    <ModalWrapper visible={visible} onClose={onCancel}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
        pointerEvents="box-none"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%", height: "90%" }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <ModalHeader title="Move Items To..." onCancel={onCancel} />

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Events Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Events</Text>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleSelectEvent}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons name="calendar" size={24} color={theme.primary} />
                  </View>
                  <Text style={styles.optionText}>Add to Event</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.text.tertiary}
                  />
                </TouchableOpacity>
              </View>
              {/* Pinned Checklists Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pinned Checklists</Text>

                {/* New Pinned Checklist */}
                {showNewPinned ? (
                  <View style={styles.newPinnedContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter checklist name..."
                      placeholderTextColor={theme.text.tertiary}
                      value={newPinnedName}
                      onChangeText={setNewPinnedName}
                      autoFocus
                    />
                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={() => {
                          setShowNewPinned(false);
                          setNewPinnedName("");
                        }}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            styles.secondaryButtonText,
                          ]}
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={handleCreateNewPinned}
                        disabled={!newPinnedName.trim()}
                      >
                        <Text
                          style={[styles.buttonText, styles.primaryButtonText]}
                        >
                          Create
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => setShowNewPinned(true)}
                  >
                    <View style={styles.optionIcon}>
                      <Ionicons name="add" size={24} color={theme.primary} />
                    </View>
                    <Text style={styles.optionText}>New Pinned Checklist</Text>
                  </TouchableOpacity>
                )}

                {/* Existing Pinned Checklists */}
                {pinnedChecklists.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="bookmark-outline"
                      size={48}
                      color={theme.text.tertiary}
                    />
                    <Text style={styles.emptyStateText}>
                      No pinned checklists yet
                    </Text>
                  </View>
                ) : (
                  pinnedChecklists.map((pinned) => (
                    <TouchableOpacity
                      key={pinned.id}
                      style={styles.optionButton}
                      onPress={() => handleSelectPinned(pinned)}
                    >
                      <View style={styles.optionIcon}>
                        <Ionicons
                          name="bookmark"
                          size={24}
                          color={theme.primary}
                        />
                      </View>
                      <Text style={styles.optionText}>{pinned.name}</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={theme.text.tertiary}
                      />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModalWrapper>
  );
};

export default MoveItemsModal;
