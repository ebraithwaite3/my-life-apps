import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Alert, Keyboard, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
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
  SortModal,
  CustomOrderModal,
} from "@my-apps/ui";
import { Ionicons } from "@expo/vector-icons";
import { useDeleteNotification, useChecklistTemplates, usePinnedChecklists, useNotificationHandlers, useNotifications } from "@my-apps/hooks";
import PinnedChecklistCard from "../components/cards/PinnedChecklistCard";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRoute, useNavigation } from "@react-navigation/native";
import { showSuccessToast, showErrorToast } from "@my-apps/utils";
import { usePinnedSort } from "../hooks/usePinnedSort";
import { usePinnedOperations } from "../hooks/usePinnedOperations";
import { usePinnedChecklistModal } from "../hooks/usePinnedChecklistModal";
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { isSpellingList, isGroceryList } from '../utils/pinnedChecklistUtils';
import SpellingTestModal from '../components/spelling/SpellingTestModal';
import VocabTestModal from '../components/vocab/VocabTestModal';
import GroceryListModal from '../components/grocery/GroceryListModal';

const PinnedScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { db } = useAuth();
  const { user, groups, addingToEvent } = useData();
  const { allPinned, checklistsLoading } = useChecklistData();
  const route = useRoute();
  const navigation = useNavigation();
  const deleteNotification = useDeleteNotification();
  const { allTemplates, saveTemplate, promptForContext } = useChecklistTemplates();
  const { createPinnedChecklist, updatePinnedChecklist } = usePinnedChecklists();
  const { scheduleGroupReminder } = useNotifications();
  const editContentRef = useRef(null);
  const tabBarHeight = useBottomTabBarHeight();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showSpellingModal, setShowSpellingModal] = useState(false);
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [showGroceryModal, setShowGroceryModal] = useState(false);
  const [pendingListType, setPendingListType] = useState(null); // 'checklist' | 'vocab' | null
  const [checklistContext, setChecklistContext] = useState(null);

  // vocabEnabled gates vocab list CREATION only (viewing is open to all)
  const vocabEnabled = user?.preferences?.vocabEnabled === true;

  // Track initial state for change detection
  const [initialChecklist, setInitialChecklist] = useState(null);
  const [initialEditReminder, setInitialEditReminder] = useState(null);
  const [initialViewReminder, setInitialViewReminder] = useState(null);
  const [hasEditChanges, setHasEditChanges] = useState(false);
  const [hasViewEditChanges, setHasViewEditChanges] = useState(false);

  console.log('📍 PINNED SCREEN RENDER - showChecklistModal:', showChecklistModal);
  console.log('📍 PINNED SCREEN RENDER - showEditModal:', showEditModal);

  // Deep link handler — notification tap with checklistId opens that checklist
  useEffect(() => {
    const { checklistId, checklistSearchTerm } = route.params || {};
    if (checklistsLoading || !allPinned.length) return;

    if (checklistId) {
      const target = allPinned.find((c) => c.id === checklistId);
      if (target) {
        console.log("📬 Deep link — opening checklist:", target.name);
        handleViewChecklist(target);
      } else {
        Alert.alert('Not Found', 'That checklist no longer exists or has been removed.');
      }
      navigation.setParams({ checklistId: undefined });
    }

    if (checklistSearchTerm) {
      const term = checklistSearchTerm.toLowerCase();
      const matches = allPinned.filter((c) => c.name.toLowerCase().includes(term));
      const sorted = matches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (sorted.length > 0) {
        console.log("🔍 Smart link — opening:", sorted[0].name);
        handleViewChecklist(sorted[0]);
      } else {
        Alert.alert('Not Found', `"${checklistSearchTerm}" was not found in any of your pinned lists.`);
      }
      navigation.setParams({ checklistSearchTerm: undefined });
    }
  }, [route.params, checklistsLoading, allPinned]);

  // Custom hooks
  const {
    currentSort,
    showSortModal,
    setShowSortModal,
    showCustomOrderModal,
    hasSortBeenChanged,
    sortOptions,
    sortedPinned,
    handleSortChange,
    handleSaveCustomOrder,
    handleCloseSortModal,
    handleCloseCustomOrderModal,
  } = usePinnedSort(allPinned, db, user, user?.pinnedOrder ?? []);
  console.log("SHOW SORT MODAL:", showSortModal);

  const {
    handleSaveChecklist: saveChecklistOperation,
    handleUnpinChecklist,
    handleMoveChecklist,
    getAvailableMoveTargets,
    handleMoveItems: moveItemsOperation,
  } = usePinnedOperations(
    db,
    user,
    groups,
    deleteNotification,
    updatePinnedChecklist,
    createPinnedChecklist
  );

  const {
    checklistMode,
    setChecklistMode,
    selectedChecklist,
    setSelectedChecklist,
    updatedItems,
    setUpdatedItems,
    setIsDirtyComplete,
    workingChecklist,
    setWorkingChecklist,
    progress,
    closeChecklistModal: closeModal,
    getCancelText,
    handleUpdateFromCompleteMode,
    getActionDisabled,
  } = usePinnedChecklistModal((checklist) => saveChecklistOperation(checklist, checklistContext));

  // Notification handlers for Edit/Create modal
  const {
    reminder: editReminder,
    loading: editReminderLoading,
    updateReminder: updateEditReminder,
    deleteReminder: deleteEditReminder,
  } = useNotificationHandlers(
    showEditModal && selectedChecklist?.id ? selectedChecklist.id : null,
    "checklist",
    null
  );

  // Notification handlers for View/Complete modal (edit mode)
  const {
    reminder: viewReminder,
    loading: viewReminderLoading,
    updateReminder: updateViewReminder,
    deleteReminder: deleteViewReminder,
  } = useNotificationHandlers(
    showChecklistModal && selectedChecklist?.id ? selectedChecklist.id : null,
    "checklist",
    null
  );

  // Initialize snapshots when Edit/Create modal opens
useEffect(() => {
  if (showEditModal) {
    if (selectedChecklist) {
      // Editing existing checklist
      setInitialChecklist(JSON.parse(JSON.stringify(selectedChecklist)));
      setInitialEditReminder(editReminder);
    } else {
      // ✅ Creating new checklist - set empty baseline
      setInitialChecklist({ name: '', items: [] });
      setInitialEditReminder(null);
    }
    setHasEditChanges(false);
  }
}, [showEditModal, selectedChecklist?.id]);

// ✅ Put this back in PinnedScreen
useEffect(() => {
  console.log('🚨 ADDING TO EVENT CHANGED:', addingToEvent.isActive);
  if (addingToEvent.isActive) {
    console.log('🚨 FORCE CLOSING ALL MODALS');
    setShowChecklistModal(false);
    setShowEditModal(false);
    setShowSpellingModal(false);
    setShowVocabModal(false);
    setShowGroceryModal(false);
    setSelectedChecklist(null);
    console.log('🚨 MODALS STATE SET TO FALSE');
  }
}, [addingToEvent.isActive]);

  // Initialize snapshots when View/Complete modal opens in edit mode
  useEffect(() => {
    if (showChecklistModal && selectedChecklist && checklistMode === 'edit') {
      setInitialChecklist(JSON.parse(JSON.stringify(selectedChecklist)));
      setInitialViewReminder(viewReminder);
      setHasViewEditChanges(false);
    }
  }, [showChecklistModal, selectedChecklist?.id, checklistMode]);

  const cleanObjectForFirestore = (obj) => {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      // Only include defined values (null is OK, undefined is not)
      if (value !== undefined) {
        if (Array.isArray(value)) {
          cleaned[key] = value;
        } else if (value && typeof value === 'object' && !(value instanceof Date)) {
          cleaned[key] = cleanObjectForFirestore(value);
        } else {
          cleaned[key] = value;
        }
      }
    });
    return cleaned;
  };

  // Wrapper to pass checklistContext to save operation
  const handleSaveChecklist = async (checklist, onClose) => {
    // ✅ Clean the checklist before saving
    const cleanedChecklist = cleanObjectForFirestore(checklist);
    await saveChecklistOperation(cleanedChecklist, checklistContext, onClose);
  };

  // Wrapper to pass additional state to move items
  const handleMoveItems = async (itemsToMove, itemIdsToRemove, destination) => {
    await moveItemsOperation(
      itemsToMove,
      itemIdsToRemove,
      destination,
      selectedChecklist,
      updatedItems,
      setUpdatedItems,
      setWorkingChecklist,
      setSelectedChecklist
    );
  };

  // Opens context (group/personal) selection and then the appropriate create flow
  const openCreateFlow = (listType) => {
    if (!groups || groups.length === 0) {
      setChecklistContext({ type: "personal" });
      setSelectedChecklist(null);
      if (listType === "vocab") {
        setShowVocabModal(true);
      } else {
        setShowEditModal(true);
      }
    } else {
      const options = [
        {
          text: "Personal",
          onPress: () => {
            setChecklistContext({ type: "personal" });
            setSelectedChecklist(null);
            if (listType === "vocab") {
              setShowVocabModal(true);
            } else {
              setShowEditModal(true);
            }
          },
        },
        ...groups.map((group) => ({
          text: group.name || group.groupId,
          onPress: () => {
            setChecklistContext({
              type: "group",
              groupId: group.groupId || group.id,
              groupName: group.name || group.groupId,
            });
            setSelectedChecklist(null);
            if (listType === "vocab") {
              setShowVocabModal(true);
            } else {
              setShowEditModal(true);
            }
          },
        })),
        { text: "Cancel", style: "cancel" },
      ];

      Alert.alert(
        listType === "vocab" ? "New Vocab List" : "Create Pinned Checklist",
        "Where would you like to create this?",
        options
      );
    }
  };

  const handleCreateChecklist = () => {
    if (vocabEnabled) {
      Alert.alert(
        "New Pinned List",
        "What type of list would you like to create?",
        [
          {
            text: "Regular Checklist",
            onPress: () => {
              setPendingListType("checklist");
              openCreateFlow("checklist");
            },
          },
          {
            text: "Vocab List",
            onPress: () => {
              setPendingListType("vocab");
              openCreateFlow("vocab");
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } else {
      openCreateFlow("checklist");
    }
  };

  const handleViewChecklist = (checklist) => {
    if (isGroceryList(checklist)) {
      setSelectedChecklist(checklist);
      setShowGroceryModal(true);
      // Backfill type field silently if missing
      if (!checklist.type) {
        updatePinnedChecklist({ ...checklist, type: 'grocery' }).catch(() => {});
      }
      return;
    }
    if (checklist.listType === "vocab") {
      setSelectedChecklist(checklist);
      setShowVocabModal(true);
      return;
    }
    if (isSpellingList(checklist.name)) {
      setSelectedChecklist(checklist);
      setShowSpellingModal(true);
      return;
    }
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
    setShowChecklistModal(true);
  };

  const handleEditReminder = (checklist) => {
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

  const handleCloseModal = () => {
    if (hasEditChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to close?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setShowEditModal(false);
              setSelectedChecklist(null);
              setChecklistContext(null);
              setHasEditChanges(false);
            },
          },
        ]
      );
    } else {
      setShowEditModal(false);
      setSelectedChecklist(null);
      setChecklistContext(null);
    }
  };

  const closeChecklistModal = () => {
    closeModal(() => {
      setShowChecklistModal(false);
      setChecklistContext(null);
      setHasViewEditChanges(false);
    });
  };

  // NEW: Wrapper that saves AND shows toast (for Clear button)
const handleSaveWithToast = async (checklist) => {
  const cleanedChecklist = cleanObjectForFirestore(checklist);
  await saveChecklistOperation(cleanedChecklist, checklistContext);
  
  Keyboard.dismiss();
  setTimeout(() => {
    showSuccessToast("Checklist saved", "", 2000, "top");
  }, 100);
  
  // Update local state
  setWorkingChecklist(checklist);
  setUpdatedItems(checklist.items);
  setSelectedChecklist(checklist);
  setIsDirtyComplete(false);
};

  const handleSaveSpellingChecklist = async (updatedChecklist) => {
    const context = updatedChecklist.isGroupChecklist
      ? { type: "group", groupId: updatedChecklist.groupId, groupName: updatedChecklist.groupName }
      : { type: "personal" };
    const cleaned = cleanObjectForFirestore(updatedChecklist);
    await saveChecklistOperation(cleaned, context);
  };

  const handleSaveVocabChecklist = async (updatedChecklist) => {
    const context = checklistContext || (
      updatedChecklist.isGroupChecklist
        ? { type: "group", groupId: updatedChecklist.groupId, groupName: updatedChecklist.groupName }
        : { type: "personal" }
    );
    const cleaned = cleanObjectForFirestore(updatedChecklist);
    await saveChecklistOperation(cleaned, context);
    setPendingListType(null);
  };

  const handleSaveGroceryChecklist = async (updatedChecklist) => {
    const context = updatedChecklist.isGroupChecklist
      ? { type: "group", groupId: updatedChecklist.groupId, groupName: updatedChecklist.groupName }
      : { type: "personal" };
    const cleaned = cleanObjectForFirestore(updatedChecklist);
    await saveChecklistOperation(cleaned, context);
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
      padding: getSpacing.sm,
      paddingTop: getSpacing.lg,
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

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <PageHeader
        title="Pinned Checklists"
        subtext="Always visible"
        icons={[
          {
            icon: "swap-vertical",
            action: () => setShowSortModal(true),
          },
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
            data={sortedPinned}
            renderItem={renderChecklist}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: tabBarHeight,
            }}
          />
        )}
      </View>

<SortModal
  visible={showSortModal}
  onClose={handleCloseSortModal}
  options={sortOptions}
  currentSort={currentSort}
  onSelectSort={handleSortChange}
  headerRightContent={
    <TouchableOpacity onPress={hasSortBeenChanged ? handleCommitSort : handleCloseSortModal}>
      <Ionicons 
        name={hasSortBeenChanged ? "checkmark" : "close"} 
        size={24} 
        color={hasSortBeenChanged ? theme.success : theme.text.secondary} 
      />
    </TouchableOpacity>
  }
/>

{/* Custom Order Modal - add delay before toast */}
<CustomOrderModal
  visible={showCustomOrderModal}
  items={sortedPinned}
  onSave={async (newOrder) => {
    const success = await handleSaveCustomOrder(newOrder);
    console.log('🚨 Custom order save result:', success);
  
    setTimeout(() => {
      if (success) {
        showSuccessToast("Custom order saved", "", 2000, "top");
      } else {
        showErrorToast("Failed to save custom order", "", 2000, "top");
      }
    }, 300);
  }}
  onClose={() => handleCloseCustomOrderModal()}
  keyExtractor={(item) => item.id}
  getItemName={(item) => item.name}
/>

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
        }}
          pointerEvents="box-none"
        >
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
                cancelText={hasEditChanges ? "Cancel" : "Close"}
                onDone={() => editContentRef.current?.save()}
                doneText={selectedChecklist ? "Update" : "Create"}
                doneDisabled={!hasEditChanges}
              />

              <EditChecklistContent
                ref={editContentRef}
                checklist={selectedChecklist}
                onSave={async (checklist, shouldSaveAsTemplate) => {
                  // Update reminder
                  if (editContentRef.current) {
                    const currentState = editContentRef.current.getCurrentState();
                    const reminderToSave = currentState.reminderTime;
                    
                    // ✅ Check if this is a group checklist
                    const isGroupChecklist = checklistContext?.type === "group";
                    
                    if (isGroupChecklist && checklistContext?.groupId) {
                      // ✅ GROUP CHECKLIST: Create notifications for all group members
                      if (reminderToSave) {
                        console.log('⏰ Scheduling group pinned checklist reminder');
                        
                        await scheduleGroupReminder(
                          checklistContext.groupId,
                          `Reminder: ${checklist.name}`,
                          "Checklist reminder",
                          checklist.id,
                          new Date(reminderToSave.scheduledFor),
                          {
                            screen: "Pinned",
                            eventId: checklist.id,
                            checklistId: checklist.id,
                            app: "checklist-app",
                            ...(reminderToSave.isRecurring && {
                              isRecurring: true,
                              recurringConfig: reminderToSave.recurringConfig,
                            }),
                          }
                        );
                        
                        console.log('✅ Group pinned checklist reminder scheduled');
                      } else {
                        // ✅ DELETE all group notifications for this checklist
                        console.log('🗑️ Deleting group pinned checklist reminders');
                        
                        try {
                          const notificationsRef = collection(db, 'pendingNotifications');
                          const q = query(
                            notificationsRef,
                            where('data.checklistId', '==', checklist.id)
                          );
                          
                          const snapshot = await getDocs(q);
                          const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                          await Promise.all(deletePromises);
                          
                          console.log(`✅ Deleted ${snapshot.docs.length} group notifications`);
                        } catch (error) {
                          console.error('❌ Error deleting group notifications:', error);
                        }
                      }
                    } else {
                      // ✅ PERSONAL CHECKLIST: Use normal single-user notification
                      await updateEditReminder(
                        reminderToSave,
                        checklist.name,
                        null
                      );
                    }
                    
                    // Update snapshot
                    setInitialEditReminder(reminderToSave ? JSON.parse(JSON.stringify(reminderToSave)) : null);
                  }

                  await handleSaveChecklist(checklist, () => {
                    setShowEditModal(false);
                    setSelectedChecklist(null);
                    setChecklistContext(null);
                    setHasEditChanges(false);
                  });
                
                  
                  if (shouldSaveAsTemplate) {
                    promptForContext(async (context) => {
                      const success = await saveTemplate(checklist, context);
                      if (success) {
                        showSuccessToast("Template saved successfully", "", 2000, "top");
                      }
                    });
                  }
                }}
                reminder={editReminder}
                reminderLoading={editReminderLoading}
                updateReminder={updateEditReminder}
                deleteReminder={deleteEditReminder}
                onChangesDetected={(hasChanges) => setHasEditChanges(hasChanges)}
                initialChecklist={initialChecklist}
                initialReminder={initialEditReminder}
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
        }}
          pointerEvents="box-none">
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
                subtitle={checklistMode === "complete" ? `${progress.completed}/${progress.total} Complete` : "Edit Mode"}
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
                  onSaveChecklist={handleSaveWithToast}  // NEW: Use wrapper with toast
                  onMoveItems={handleMoveItems}
                  pinnedChecklists={allPinned}
                  onUpdatePinnedChecklist={updatePinnedChecklist}
                  onCreatePinnedChecklist={createPinnedChecklist}
                  onCloseParentModal={() => setShowChecklistModal(false)}  // ✅ Add this
                  onNavigateToLinkedChecklist={({ type, id, searchTerm }) => {
                    if (type === 'byId' && !id) {
                      Alert.alert('No Checklist Linked', 'Edit this item and select a pinned checklist to link to.');
                      return;
                    }
                    setShowChecklistModal(false);
                    setTimeout(() => {
                      let target;
                      if (type === 'byId') {
                        target = allPinned.find((c) => c.id === id);
                      } else {
                        const term = searchTerm.toLowerCase();
                        const matches = allPinned.filter((c) => c.name.toLowerCase().includes(term));
                        target = matches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                      }
                      if (target) {
                        handleViewChecklist(target);
                      } else if (type === 'byId') {
                        Alert.alert('Not Found', 'That checklist no longer exists or has been removed.');
                      } else {
                        Alert.alert('Not Found', `"${searchTerm}" was not found in any of your pinned lists.`);
                      }
                    }, 300);
                  }}
                />
              ) : (
                <EditChecklistContent
                  ref={editContentRef}
                  checklist={workingChecklist}
                  onSave={async (checklist, shouldSaveAsTemplate) => {
                    // Preserve the order field from the original checklist
                    const checklistToSave = {
                      ...checklist,
                      order: workingChecklist?.order,
                    };

                    // Update reminder
                    if (editContentRef.current) {
                      const currentState = editContentRef.current.getCurrentState();
                      const reminderToSave = currentState.reminderTime;
                      
                      // ✅ Check if this is a group checklist
                      const isGroupChecklist = checklistContext?.type === "group";
                      
                      if (isGroupChecklist && checklistContext?.groupId) {
                        // ✅ GROUP CHECKLIST: Create notifications for all group members
                        if (reminderToSave) {
                          console.log('⏰ Scheduling group pinned checklist reminder');
                          
                          await scheduleGroupReminder(
                            checklistContext.groupId,
                            `Reminder: ${checklistToSave.name}`,
                            "Checklist reminder",
                            checklist.id,
                            new Date(reminderToSave.scheduledFor),
                            {
                              screen: "Pinned",
                              eventId: checklist.id,
                              checklistId: checklist.id,
                              app: "checklist-app",
                              ...(reminderToSave.isRecurring && {
                                isRecurring: true,
                                recurringConfig: reminderToSave.recurringConfig,
                              }),
                            }
                          );
                          
                          console.log('✅ Group pinned checklist reminder scheduled');
                        } else {
                          // ✅ DELETE all group notifications
                          console.log('🗑️ Deleting group pinned checklist reminders');
                          
                          try {
                            const notificationsRef = collection(db, 'pendingNotifications');
                            const q = query(
                              notificationsRef,
                              where('data.checklistId', '==', checklistToSave.id)
                            );
                            
                            const snapshot = await getDocs(q);
                            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                            await Promise.all(deletePromises);
                            
                            console.log(`✅ Deleted ${snapshot.docs.length} group notifications`);
                          } catch (error) {
                            console.error('❌ Error deleting group notifications:', error);
                          }
                        }
                      } else {
                        // ✅ PERSONAL CHECKLIST: Use normal single-user notification
                        await updateViewReminder(
                          reminderToSave,
                          checklistToSave.name,
                          null
                        );
                      }
                      
                      // Update snapshot
                      setInitialViewReminder(reminderToSave ? JSON.parse(JSON.stringify(reminderToSave)) : null);
                    }

                    await handleSaveChecklist(checklistToSave);
                    Keyboard.dismiss();
                    setTimeout(() => {
                      showSuccessToast("Checklist saved", "", 2000, "top");
                    }, 100);
                    setWorkingChecklist(checklistToSave);
                    setUpdatedItems(checklistToSave.items);
                    setInitialChecklist(JSON.parse(JSON.stringify(checklistToSave)));
                    setIsDirtyComplete(false);
                    // Sync the hook's initialChecklist so switching back to List tab
                    // doesn't show "Cancel" due to stale baseline
                    setSelectedChecklist(checklistToSave);
                    
                    if (shouldSaveAsTemplate) {
                      promptForContext(async (context) => {
                        const success = await saveTemplate(checklistToSave, context);
                        if (success) {
                          showSuccessToast("Template saved successfully", "", 2000, "top");
                        }
                      });
                    }
                  }}
                  reminder={viewReminder}
                  reminderLoading={viewReminderLoading}
                  updateReminder={updateViewReminder}
                  deleteReminder={deleteViewReminder}
                  onChangesDetected={(hasChanges) => setHasViewEditChanges(hasChanges)}
                  initialChecklist={initialChecklist}
                  initialReminder={initialViewReminder}
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

      {/* Spelling Test Modal — opens for any list with "Spelling List" in the name */}
      <SpellingTestModal
        visible={showSpellingModal}
        checklist={selectedChecklist}
        onClose={() => {
          setShowSpellingModal(false);
          setSelectedChecklist(null);
        }}
        onSaveChecklist={handleSaveSpellingChecklist}
        updatePinnedChecklist={updatePinnedChecklist}
        user={user}
        allTemplates={allTemplates}
      />

      {/* Vocab Test Modal — opens for any list with listType === 'vocab' */}
      <VocabTestModal
        visible={showVocabModal}
        checklist={selectedChecklist}
        onClose={() => {
          setShowVocabModal(false);
          setSelectedChecklist(null);
          setPendingListType(null);
        }}
        onSaveChecklist={handleSaveVocabChecklist}
        updatePinnedChecklist={updatePinnedChecklist}
        user={user}
      />

      {/* Grocery List Modal — opens for any list named "grocery list" */}
      <GroceryListModal
        visible={showGroceryModal}
        checklist={selectedChecklist}
        onClose={() => {
          setShowGroceryModal(false);
          setSelectedChecklist(null);
        }}
        onSaveChecklist={handleSaveGroceryChecklist}
      />
    </SafeAreaView>
  );
};

export default PinnedScreen;