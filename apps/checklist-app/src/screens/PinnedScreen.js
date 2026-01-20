import React, { useState, useRef } from "react";
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
import { useDeleteNotification, useChecklistTemplates, usePinnedChecklists } from "@my-apps/hooks";
import PinnedChecklistCard from "../components/cards/PinnedChecklistCard";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { showSuccessToast } from "@my-apps/utils";
import { usePinnedSort } from "../hooks/usePinnedSort";
import { usePinnedOperations } from "../hooks/usePinnedOperations";
import { usePinnedChecklistModal } from "../hooks/usePinnedChecklistModal";

const PinnedScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { db } = useAuth();
  const { user, groups } = useData();
  const { allPinned, checklistsLoading } = useChecklistData();
  const deleteNotification = useDeleteNotification();
  const { allTemplates, saveTemplate, promptForContext } = useChecklistTemplates();
  const { createPinnedChecklist, updatePinnedChecklist } = usePinnedChecklists();
  const editContentRef = useRef(null);
  const tabBarHeight = useBottomTabBarHeight();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistContext, setChecklistContext] = useState(null);

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
  } = usePinnedSort(allPinned, db, user);

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

  // Wrapper to pass checklistContext to save operation
  const handleSaveChecklist = async (checklist, onClose) => {
    await saveChecklistOperation(checklist, checklistContext, onClose);
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

  const handleCreateChecklist = () => {
    if (!groups || groups.length === 0) {
      setChecklistContext({ type: "personal" });
      setSelectedChecklist(null);
      setShowEditModal(true);
    } else {
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
    setShowEditModal(false);
    setSelectedChecklist(null);
    setChecklistContext(null);
  };

  const closeChecklistModal = () => {
    closeModal(() => {
      setShowChecklistModal(false);
      setChecklistContext(null);
    });
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
          ...(user?.admin ? [{
            icon: "swap-vertical",
            action: () => setShowSortModal(true),
          }] : []),
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

      {/* Sort Selection Modal */}
      <SortModal
        visible={showSortModal}
        onClose={handleCloseSortModal}
        options={sortOptions}
        currentSort={currentSort}
        onSelectSort={handleSortChange}
        headerRightContent={
          <TouchableOpacity onPress={handleCloseSortModal}>
            <Ionicons 
              name={hasSortBeenChanged ? "checkmark" : "close"} 
              size={24} 
              color={hasSortBeenChanged ? theme.success : theme.text.secondary} 
            />
          </TouchableOpacity>
        }
      />

      {/* Custom Order Modal */}
      <CustomOrderModal
        visible={showCustomOrderModal}
        items={sortedPinned}
        onSave={handleSaveCustomOrder}
        onClose={() => handleCloseSortModal()}
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
                    // Preserve the order field from the original checklist
                    const checklistToSave = {
                      ...checklist,
                      order: workingChecklist?.order, // Preserve existing order
                    };
                    await handleSaveChecklist(checklistToSave);
                    Keyboard.dismiss();
                    setTimeout(() => {
                      showSuccessToast("Checklist saved", "", 2000, "top");
                    }, 100);
                    setWorkingChecklist(checklistToSave);
                    setUpdatedItems(checklistToSave.items);
                    setIsDirtyComplete(false);
                    if (shouldSaveAsTemplate) {
                      promptForContext(async (context) => {
                        const success = await saveTemplate(checklistToSave, context);
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