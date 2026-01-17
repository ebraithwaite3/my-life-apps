import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Alert, Keyboard, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useTheme,
  useData,
  useAuth,
  useChecklistData,
} from "@my-apps/contexts";
import {
  PageHeader,
  EditChecklistContent,
  ModalWrapper,
  PillSelectionButton,
  ChecklistContent,
  ModalHeader,
} from "@my-apps/ui";
import { Ionicons } from "@expo/vector-icons";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { scheduleNotification } from "@my-apps/services";
import { useDeleteNotification, useChecklistTemplates, usePinnedChecklists } from "@my-apps/hooks";
import PinnedChecklistCard from "../components/cards/PinnedChecklistCard";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { calculateChecklistProgress, showSuccessToast, generateUUID } from "@my-apps/utils";

const PinnedScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { db } = useAuth();
  const { user, groups } = useData();
  const { allPinned, checklistsLoading } = useChecklistData();
  const deleteNotification = useDeleteNotification();
  const { allTemplates, saveTemplate, promptForContext } =
    useChecklistTemplates();
    const { createPinnedChecklist, updatePinnedChecklist } =
    usePinnedChecklists();
  const editContentRef = useRef(null); // Ref for EditChecklistContent
  const tabBarHeight = useBottomTabBarHeight();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistMode, setChecklistMode] = useState("complete"); // 'complete' or 'edit'
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [updatedItems, setUpdatedItems] = useState([]); // Track item changes in complete mode
  const [isDirtyComplete, setIsDirtyComplete] = useState(false); // Track if changes made in complete mode
  const [checklistContext, setChecklistContext] = useState(null); // { type: 'personal' | 'group', groupId?: string, groupName?: string }

  // Unified working state for the checklist
  const [workingChecklist, setWorkingChecklist] = useState(null);
  // Track initial state for comparison
  const [initialChecklist, setInitialChecklist] = useState(null);

  // Initialize working checklist when modal opens
  useEffect(() => {
    if (showChecklistModal && selectedChecklist) {
      setWorkingChecklist(selectedChecklist);
      setUpdatedItems(selectedChecklist.items || []);
      setInitialChecklist(JSON.parse(JSON.stringify(selectedChecklist))); // ADD THIS
      setIsDirtyComplete(false);
    }
  }, [showChecklistModal, selectedChecklist]);

  // Detect changes in complete mode - COMPARE AGAINST initialChecklist
  useEffect(() => {
    if (checklistMode !== "complete" || !initialChecklist) return; // CHANGED: use initialChecklist

    const originalItems = initialChecklist.items || []; // CHANGED: use initialChecklist

    // Deep compare using JSON.stringify to catch sub-item changes
    const hasChanges =
      JSON.stringify(updatedItems) !== JSON.stringify(originalItems);
    console.log("🔍 Dirty check:", {
      checklistMode,
      hasChanges,
    });

    setIsDirtyComplete(hasChanges);
  }, [updatedItems, initialChecklist, checklistMode]); // CHANGED: depend on initialChecklist

  const closeChecklistModal = () => {
    // Check for unsaved changes before closing
    if (isDirtyComplete && selectedChecklist) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to close?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setShowChecklistModal(false);
              setSelectedChecklist(null);
              setChecklistContext(null);
              setChecklistMode("complete");
              setUpdatedItems([]);
              setIsDirtyComplete(false);
              setWorkingChecklist(null);
            },
          },
        ]
      );
    } else {
      setShowChecklistModal(false);
      setSelectedChecklist(null);
      setChecklistContext(null);
      setChecklistMode("complete");
      setUpdatedItems([]);
      setIsDirtyComplete(false);
      setWorkingChecklist(null);
    }
  };

  // Get cancel button text based on dirty state
  const getCancelText = () => {
    return isDirtyComplete ? "Cancel" : "Close";
  };

  const handleCreateChecklist = () => {
    // Check if user has groups
    if (!groups || groups.length === 0) {
      // No groups - create personal checklist directly
      setChecklistContext({ type: "personal" });
      setSelectedChecklist(null);
      setShowEditModal(true);
    } else {
      // Has groups - show alert to choose
      const options = [
        {
          text: "Personal Checklist",
          onPress: () => {
            setChecklistContext({ type: "personal" });
            setSelectedChecklist(null);
            setShowEditModal(true);
          },
        },
        ...groups.map((group) => ({
          text: `${group.name || group.groupId} Checklist`,
          onPress: () => {
            setChecklistContext({
              type: "group",
              groupId: group.groupId || group.id,
              groupName: group.name || group.groupId,
            });
            setSelectedChecklist(null);
            setShowEditModal(true);
          },
        })),
        {
          text: "Cancel",
          style: "cancel",
        },
      ];

      Alert.alert(
        "Create Pinned Checklist",
        "Where would you like to create this checklist?",
        options
      );
    }
  };

  const handleViewChecklist = (checklist) => {
    // Open the ChecklistContent modal (Complete/Edit view)
    if (checklist.isGroupChecklist) {
      setChecklistContext({
        type: "group",
        groupId: checklist.groupId,
        groupName: checklist.groupName,
      });
    } else {
      setChecklistContext({ type: "personal" });
    }
    setSelectedChecklist(checklist);
    setUpdatedItems(checklist.items || []); // Initialize with current items
    setIsDirtyComplete(false); // Reset dirty state
    setChecklistMode("complete"); // Always start in complete mode
    setShowChecklistModal(true);
  };

  const handleUpdateFromCompleteMode = async () => {
    // Save just the completion state changes
    const updatedChecklist = {
      ...selectedChecklist,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };
    await handleSaveChecklist(updatedChecklist);
    
    // Dismiss keyboard and show toast
    Keyboard.dismiss();
    setTimeout(() => {
      showSuccessToast("Checklist saved", "", 2000, "top");
    }, 100);
    
    // Reset dirty state so button shows "Close"
    setIsDirtyComplete(false);
    
    // Don't close - stay in the checklist!
  };

  const handleEditReminder = (checklist) => {
    // Open edit modal directly for editing
    if (checklist.isGroupChecklist) {
      setChecklistContext({
        type: "group",
        groupId: checklist.groupId,
        groupName: checklist.groupName,
      });
    } else {
      setChecklistContext({ type: "personal" });
    }
    setSelectedChecklist(checklist);
    setShowEditModal(true);
  };

  const handleSaveChecklist = async (checklist, onClose) => {
    try {
      console.log(
        "Saving pinned checklist:",
        checklist,
        "Context:",
        checklistContext
      );

      const docId =
        checklistContext?.type === "personal"
          ? user.userId
          : checklistContext.groupId;

      const docRef = doc(db, "pinnedChecklists", docId);

      // Get current document
      const docSnap = await getDoc(docRef);

      // Check if we're updating an existing checklist (to cancel old notification)
      let oldChecklist = null;
      if (docSnap.exists()) {
        const currentPinned = docSnap.data().pinned || [];
        oldChecklist = currentPinned.find((c) => c.id === checklist.id);
      }

      // Cancel old notification if it existed
      if (oldChecklist?.reminderTime) {
        const notificationId = `pinned-checklist-${checklist.id}`;
        await deleteNotification(notificationId);
        console.log(
          `🔕 Canceled old notification for checklist ${checklist.id}`
        );
      }

      // Save checklist to Firestore
      if (docSnap.exists()) {
        // Document exists - update it
        const currentPinned = docSnap.data().pinned || [];

        // Check if we're updating or creating
        const existingIndex = currentPinned.findIndex(
          (c) => c.id === checklist.id
        );

        let updatedPinned;
        if (existingIndex !== -1) {
          // Update existing checklist
          updatedPinned = [...currentPinned];
          updatedPinned[existingIndex] = checklist;
        } else {
          // Add new checklist
          updatedPinned = [...currentPinned, checklist];
        }

        await updateDoc(docRef, {
          pinned: updatedPinned,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Document doesn't exist - create it
        await setDoc(docRef, {
          [checklistContext?.type === "personal" ? "userId" : "groupId"]: docId,
          ...(checklistContext?.type === "group" && {
            groupName: checklistContext.groupName,
          }),
          pinned: [checklist],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Schedule new notification if reminderTime exists and is in the future
      if (checklist.reminderTime) {
        const reminderDate = new Date(checklist.reminderTime);

        if (reminderDate > new Date()) {
          const itemCount = checklist.items?.length || 0;
          const notificationId = `pinned-checklist-${checklist.id}`;

          await scheduleNotification(
            user.userId,
            `Checklist Reminder: ${checklist.name}`,
            `${itemCount} item${itemCount !== 1 ? "s" : ""} to complete`,
            notificationId,
            reminderDate,
            {
              screen: "Pinned",
              checklistId: checklist.id,
              app: "checklist-app",
            }
          );

          console.log(
            `🔔 Scheduled notification for ${reminderDate.toLocaleString()}`
          );
        } else {
          console.log("⏰ Reminder time is in the past, skipping notification");
        }
      }

      // Close the appropriate modal via callback
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error saving pinned checklist:", error);
      Alert.alert("Error", "Failed to save checklist. Please try again.");
    }
  };

  const handleUnpinChecklist = async (checklist) => {
    try {
      const docId = checklist.isGroupChecklist
        ? checklist.groupId
        : checklist.userId || user.userId;

      const docRef = doc(db, "pinnedChecklists", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const currentPinned = docSnap.data().pinned || [];
        const updatedPinned = currentPinned.filter(
          (c) => c.id !== checklist.id
        );

        await updateDoc(docRef, {
          pinned: updatedPinned,
          updatedAt: new Date().toISOString(),
        });

        // Cancel notification if it exists
        if (checklist.reminderTime) {
          const notificationId = `pinned-checklist-${checklist.id}`;
          await deleteNotification(notificationId);
          console.log(
            `🔕 Canceled notification for deleted checklist ${checklist.id}`
          );
        }
      }
    } catch (error) {
      console.error("Error unpinning checklist:", error);
      Alert.alert("Error", "Failed to unpin checklist. Please try again.");
    }
  };

  const handleMoveChecklist = async (checklist, target) => {
    try {
      // Remove from source
      const sourceDocId = checklist.isGroupChecklist
        ? checklist.groupId
        : checklist.userId || user.userId;

      const sourceDocRef = doc(db, "pinnedChecklists", sourceDocId);
      const sourceDocSnap = await getDoc(sourceDocRef);

      if (sourceDocSnap.exists()) {
        const currentPinned = sourceDocSnap.data().pinned || [];
        const updatedPinned = currentPinned.filter(
          (c) => c.id !== checklist.id
        );

        await updateDoc(sourceDocRef, {
          pinned: updatedPinned,
          updatedAt: new Date().toISOString(),
        });
      }

      // Add to target (strip out source metadata but preserve reminderTime)
      const cleanChecklist = {
        id: checklist.id,
        name: checklist.name,
        items: checklist.items,
        createdAt: checklist.createdAt,
        updatedAt: new Date().toISOString(),
      };

      // Preserve reminderTime if it exists
      if (checklist.reminderTime) {
        cleanChecklist.reminderTime = checklist.reminderTime;
      }

      const targetDocId =
        target.type === "personal" ? user.userId : target.groupId;
      const targetDocRef = doc(db, "pinnedChecklists", targetDocId);
      const targetDocSnap = await getDoc(targetDocRef);

      if (targetDocSnap.exists()) {
        // Document exists - add to it
        const currentPinned = targetDocSnap.data().pinned || [];
        const updatedPinned = [...currentPinned, cleanChecklist];

        await updateDoc(targetDocRef, {
          pinned: updatedPinned,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Document doesn't exist - create it
        await setDoc(targetDocRef, {
          [target.type === "personal" ? "userId" : "groupId"]: targetDocId,
          ...(target.type === "group" && { groupName: target.groupName }),
          pinned: [cleanChecklist],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Note: Notification stays the same since it's tied to checklistId and userId
      // No need to reschedule - it will still work after move
      console.log(`✅ Moved checklist ${checklist.id}, notification preserved`);
    } catch (error) {
      console.error("Error moving checklist:", error);
      Alert.alert("Error", "Failed to move checklist. Please try again.");
    }
  };

  // Calculate available move targets for a checklist
  const getAvailableMoveTargets = (checklist) => {
    const targets = [];

    if (checklist.isGroupChecklist) {
      // Group checklist can move to personal
      targets.push({ type: "personal" });

      // And to other groups (not its current group)
      groups.forEach((group) => {
        const groupId = group.groupId || group.id;
        if (groupId !== checklist.groupId) {
          targets.push({
            type: "group",
            groupId: groupId,
            groupName: group.name || groupId,
          });
        }
      });
    } else {
      // Personal checklist can move to any group
      groups.forEach((group) => {
        targets.push({
          type: "group",
          groupId: group.groupId || group.id,
          groupName: group.name || group.groupId || group.id,
        });
      });
    }

    return targets;
  };

  const handleMoveItems = async (itemsToMove, itemIdsToRemove, destination) => {
    console.log('📦 Moving items from pinned checklist:', itemsToMove);
    console.log('📍 Destination:', destination);
    
    try {
      if (destination.type === 'new-pinned') {
        // Create new pinned checklist with moved items
        const newPinned = {
          id: generateUUID(),
          name: destination.name,
          items: itemsToMove.map(item => ({
            ...item,
            id: generateUUID(),
            completed: false,
            ...(item.subItems && {
              subItems: item.subItems.map(sub => ({
                ...sub,
                id: generateUUID(),
                completed: false,
              })),
            }),
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPinned: true,
        };
        
        const result = await createPinnedChecklist(newPinned);
        
        if (result.success) {
          showSuccessToast(`Moved to "${destination.name}"`, "", 2000, "top");
        }
      } else if (destination.type === 'pinned') {
        // Add to existing pinned checklist
        const targetPinned = destination.checklist;
        const updatedTargetItems = [...(targetPinned.items || [])];
        
        itemsToMove.forEach(movedItem => {
          if (movedItem.subItems && movedItem.subItems.length > 0) {
            updatedTargetItems.push({
              ...movedItem,
              id: generateUUID(),
              subItems: movedItem.subItems.map(sub => ({
                ...sub,
                id: generateUUID(),
                completed: false,
              })),
            });
          } else {
            updatedTargetItems.push({
              ...movedItem,
              id: generateUUID(),
              completed: false,
            });
          }
        });
        
        const updatedPinned = {
          ...targetPinned,
          items: updatedTargetItems,
          updatedAt: new Date().toISOString(),
        };
        
        const result = await updatePinnedChecklist(updatedPinned);
        
        if (result.success) {
          showSuccessToast(`Moved to "${targetPinned.name}"`, "", 2000, "top");
        }
      }
      
      // IMPORTANT: Remove items from SOURCE checklist
      // Use the current items from the modal state
      const remainingItems = updatedItems.filter(item => {
        if (itemIdsToRemove.has(item.id)) return false;
        
        if (item.subItems && item.subItems.length > 0) {
          const remainingSubs = item.subItems.filter(sub => !itemIdsToRemove.has(sub.id));
          if (remainingSubs.length === 0) return false;
          item.subItems = remainingSubs;
        }
        
        return true;
      });
      
      // Update source checklist - PRESERVE ALL METADATA
      const updatedSourceChecklist = {
        ...selectedChecklist, // This has all the metadata (id, groupId, isGroupChecklist, etc.)
        items: remainingItems,
        updatedAt: new Date().toISOString(),
      };
      
      console.log('📝 Updating source checklist:', updatedSourceChecklist);
      
      const result = await updatePinnedChecklist(updatedSourceChecklist);
      
      if (result.success) {
        // Update local state to reflect changes
        setUpdatedItems(remainingItems);
        setWorkingChecklist(updatedSourceChecklist);
        setSelectedChecklist(updatedSourceChecklist);
      } else {
        throw new Error(result.error || 'Failed to update source checklist');
      }
      
    } catch (error) {
      console.error('❌ Error moving items:', error);
      Alert.alert('Error', 'Failed to move items. Please try again.');
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedChecklist(null);
    setChecklistContext(null);
  };

  const renderChecklist = ({ item }) => (
    <PinnedChecklistCard
      checklist={item}
      onPress={handleViewChecklist}
      onUnpin={handleUnpinChecklist}
      onMove={handleMoveChecklist}
      onEditReminder={handleEditReminder}
      availableMoveTargets={getAvailableMoveTargets(item)}
    />
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      padding: getSpacing.lg,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: getSpacing.xl,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: "center",
      marginTop: getSpacing.md,
    },
  });

  // Determine action disabled state
  const getActionDisabled = () => {
    if (checklistMode === "edit") {
      // For edit mode, assume always enabled (EditChecklistContent handles internal validation)
      // If you want to track dirty state here, you'd need to expose it from EditChecklistContent
      return false;
    }
    // For complete mode, disable if no changes
    return !isDirtyComplete;
  };

  // Calculate progress directly (no memo needed - it's fast)
  const progress =
    checklistMode === "complete" && updatedItems.length > 0
      ? calculateChecklistProgress(updatedItems)
      : { completed: 0, total: 0 };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <PageHeader
        title="Pinned Checklists"
        subtext="Always visible"
        icons={[
          {
            icon: "add",
            action: handleCreateChecklist,
          },
        ]}
      />
      <View style={styles.content}>
        {checklistsLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : allPinned.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="pin-outline"
              size={64}
              color={theme.text.tertiary}
            />
            <Text style={styles.emptyText}>
              No pinned checklists yet.{"\n"}
              Create a checklist to keep it always visible.
            </Text>
          </View>
        ) : (
          <FlatList
            data={allPinned}
            renderItem={renderChecklist}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: tabBarHeight,
            }}
          />
        )}
      </View>

      {/* Edit/Create Checklist Modal */}
      <ModalWrapper visible={showEditModal} onClose={handleCloseModal}>
  <View style={{
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  }}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ width: "100%", height: "90%" }}
    >
      <View style={{
        backgroundColor: theme.surface,
        borderRadius: 12,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}>
        <ModalHeader
          title={selectedChecklist ? "Edit Checklist" : "New Checklist"}
          onCancel={handleCloseModal}
          onDone={() => editContentRef.current?.save()}
          doneText={selectedChecklist ? "Update" : "Create"}
        />

        <EditChecklistContent
          ref={editContentRef}
          checklist={selectedChecklist}
          onSave={(checklist, shouldSaveAsTemplate) => {
            handleSaveChecklist(checklist, handleCloseModal);
            if (shouldSaveAsTemplate) {
              promptForContext(async (context) => {
                const success = await saveTemplate(checklist, context);
                if (success) {
                  Alert.alert("Success", `Template "${checklist.name}" saved successfully`);
                }
              });
            }
          }}
          isUserAdmin={user?.admin === true}
          addReminder={true}
          eventStartTime={null}
          templates={allTemplates}
        />
      </View>
    </KeyboardAvoidingView>
  </View>
</ModalWrapper>

      {/* View/Complete Checklist Modal */}
      <ModalWrapper visible={showChecklistModal} onClose={closeChecklistModal}>
  <View style={{
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  }}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ width: "100%", height: "90%" }}
    >
      <View style={{
        backgroundColor: theme.surface,
        borderRadius: 12,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}>
        <ModalHeader
          title={selectedChecklist?.name || "Checklist"}
          subtitle={checklistMode === "complete" ? `${progress.completed}/${progress.total} Complete` : undefined}
          onCancel={closeChecklistModal}
          cancelText={getCancelText()}
          onDone={checklistMode === "complete" ? handleUpdateFromCompleteMode : () => editContentRef.current?.save()}
          doneText="Update"
          doneDisabled={getActionDisabled()}
        />

        <View style={{
          paddingHorizontal: getSpacing.lg,
          paddingVertical: getSpacing.md,
          backgroundColor: theme.surface,
        }}>
          <PillSelectionButton
            options={[
              { label: "Complete", value: "complete" },
              { label: "Edit", value: "edit" },
            ]}
            selectedValue={checklistMode}
            onSelect={(value) => {
              // ... your existing logic
              setChecklistMode(value);
            }}
          />
        </View>

        {checklistMode === "complete" ? (
          <ChecklistContent
            checklist={{ ...workingChecklist, items: updatedItems }}
            onItemToggle={(newItems) => {
              setUpdatedItems(newItems);
              setWorkingChecklist(prev => ({ ...prev, items: newItems }));
            }}
            onMoveItems={handleMoveItems}
            pinnedChecklists={allPinned}
            onUpdatePinnedChecklist={updatePinnedChecklist}
            onCreatePinnedChecklist={createPinnedChecklist}
          />
        ) : (
          <EditChecklistContent
            ref={editContentRef}
            checklist={workingChecklist}
            onSave={async (checklist, shouldSaveAsTemplate) => {
              await handleSaveChecklist(checklist);
              Keyboard.dismiss();
              setTimeout(() => {
                showSuccessToast("Checklist saved", "", 2000, "top");
              }, 100);
              setWorkingChecklist(checklist);
              setUpdatedItems(checklist.items);
              setIsDirtyComplete(false);
              if (shouldSaveAsTemplate) {
                promptForContext(async (context) => {
                  const success = await saveTemplate(checklist, context);
                  if (success) {
                    Alert.alert("Success", `Template "${checklist.name}" saved successfully`);
                  }
                });
              }
            }}
            isUserAdmin={user?.admin === true}
            addReminder={true}
            eventStartTime={null}
            templates={allTemplates}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  </View>
</ModalWrapper>
    </SafeAreaView>
  );
};

export default PinnedScreen;