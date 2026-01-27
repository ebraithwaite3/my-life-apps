import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { calculateChecklistProgress } from "@my-apps/utils";
import ChecklistItemRow from "../../../checklists/ChecklistItemRow";
import ProgressBar from "../../../general/ProgressBar";
import MultipleChoiceSelectionModal from "../../composed/modals/MultipleChoiceSelectionModals";
import FillInSelectionModal from "../../composed/modals/FillInSelectionModal";
import MoveItemsModal from "../../composed/modals/MoveItemsModal";
import { generateUUID } from "@my-apps/utils";
import { CustomOrderModal } from "../../../sorting";
import { useData } from "@my-apps/contexts";

const ChecklistContent = ({
  checklist,
  onItemToggle,
  onMoveItems,
  pinnedChecklists = [],
  onCloseParentModal,
  context = "pinned",
  eventId = null,
  selectedCalendarIdForMoving = null,
  setSelectedCalendarIdForMoving,
  groupId = null,
  eventStartTime = null,
  eventActivities = [],
}) => {
  console.log(
    "🔍 ChecklistContent checklist:", checklist);

  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { isUserAdmin } = useData();
  const [items, setItems] = useState([]);
  const reorderTimeoutRef = useRef(null);

  // Multiple choice modal state
  const [showMultiChoiceModal, setShowMultiChoiceModal] = useState(false);
  const [multiChoiceItem, setMultiChoiceItem] = useState(null);

  // Fill in modal state
  const [showFillInModal, setShowFillInModal] = useState(false);
  const [fillInItem, setFillInItem] = useState(null);

  // NEW: Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  // NEW: Move items modal state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [itemsBeingMoved, setItemsBeingMoved] = useState([]);

  // Sort Modal State
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortingItems, setSortingItems] = useState([]);
  const [sortingParent, setSortingParent] = useState(null);
  const [sortModalStack, setSortModalStack] = useState([]);

  useEffect(() => {
    if (checklist?.items) {
      const reordered = reorderItems(checklist.items);
      setItems(reordered);
    }
  }, [checklist]);

  const reorderItems = (itemsToReorder) => {
    const incomplete = itemsToReorder.filter((i) => !i.completed);
    const completed = itemsToReorder.filter((i) => i.completed);
    return [...incomplete, ...completed];
  };

  // NEW: Check if item is moveable
  const isItemMoveable = (item) => {
    // Cannot move yesNo, multiChoice, or items with special requirements
    if (item.itemType === "yesNo") return false;
    if (item.yesNoConfig) return false;
    if (item.requiredForScreenTime) return false;
    if (item.requiresParentApproval) return false;
    return true;
  };

  // NEW: Handle selection toggle
  const toggleSelection = (itemId, isParent = false, parentId = null) => {
    setSelectedItems((prev) => {
      const newSelection = new Set(prev);

      if (isParent) {
        // Toggling a parent - toggle all its sub-items
        const item = items.find((i) => i.id === itemId);
        if (item?.subItems) {
          const allSelected = item.subItems.every((sub) =>
            newSelection.has(sub.id)
          );

          if (allSelected) {
            // Uncheck parent and all subs
            newSelection.delete(itemId);
            item.subItems.forEach((sub) => newSelection.delete(sub.id));
          } else {
            // Check parent and all subs
            newSelection.add(itemId);
            item.subItems.forEach((sub) => newSelection.add(sub.id));
          }
        } else {
          // Regular item
          if (newSelection.has(itemId)) {
            newSelection.delete(itemId);
          } else {
            newSelection.add(itemId);
          }
        }
      } else if (parentId) {
        // Toggling a sub-item
        if (newSelection.has(itemId)) {
          newSelection.delete(itemId);
          // Uncheck parent if it was checked
          newSelection.delete(parentId);
        } else {
          newSelection.add(itemId);

          // Check if all siblings are now selected
          const parent = items.find((i) => i.id === parentId);
          if (parent?.subItems) {
            const allSelected = parent.subItems.every(
              (sub) => newSelection.has(sub.id) || sub.id === itemId
            );

            if (allSelected) {
              newSelection.add(parentId);
            }
          }
        }
      } else {
        // Regular item
        if (newSelection.has(itemId)) {
          newSelection.delete(itemId);
        } else {
          newSelection.add(itemId);
        }
      }

      return newSelection;
    });
  };

  const handleMoveItems = (destination) => {
    console.log("🚀 Moving items to:", destination);

    const itemsToMove = [];
    const itemIdsToRemove = new Set();

    items.forEach((item) => {
      if (selectedItems.has(item.id)) {
        // Parent is selected - move entire group
        if (item.subItems && item.subItems.length > 0) {
          itemIdsToRemove.add(item.id);
          item.subItems.forEach((sub) => itemIdsToRemove.add(sub.id));

          // ALWAYS keep as group - never flatten
          itemsToMove.push(item);
        } else {
          // Regular item
          itemIdsToRemove.add(item.id);
          itemsToMove.push(item);
        }
      } else if (item.subItems && item.subItems.length > 0) {
        const selectedSubs = item.subItems.filter((sub) =>
          selectedItems.has(sub.id)
        );

        if (selectedSubs.length > 0) {
          const allSubsSelected = selectedSubs.length === item.subItems.length;

          if (allSubsSelected) {
            // All subs selected - move parent too as complete group
            itemIdsToRemove.add(item.id);
            item.subItems.forEach((sub) => itemIdsToRemove.add(sub.id));
            itemsToMove.push(item);
          } else {
            // Partial selection - move as NEW group with only selected subs
            selectedSubs.forEach((sub) => itemIdsToRemove.add(sub.id));
            itemsToMove.push({
              ...item,
              id: generateUUID(),
              subItems: selectedSubs,
            });
          }
        }
      }
    });

    if (onMoveItems) {
      onMoveItems(itemsToMove, itemIdsToRemove, destination);
    }

    setSelectionMode(false);
    setSelectedItems(new Set());
    setShowMoveModal(false);
  };

  // Count individual items (sub-items count individually)
  const getLogicalItemCount = () => {
    let count = 0;

    items.forEach((item) => {
      if (selectedItems.has(item.id)) {
        if (item.subItems && item.subItems.length > 0) {
          // Parent selected - count all sub-items
          count += item.subItems.length;
        } else {
          // Regular item
          count++;
        }
      } else if (item.subItems && item.subItems.length > 0) {
        // Check individual sub-items
        item.subItems.forEach((sub) => {
          if (selectedItems.has(sub.id)) {
            count++;
          }
        });
      }
    });

    return count;
  };

  const toggleItem = (itemId) => {
    let updatedItems = items.map((item) => {
      if (item.subItems && item.subItems.length > 0) {
        const subItemIndex = item.subItems.findIndex(
          (sub) => sub.id === itemId
        );
        if (subItemIndex !== -1) {
          const updatedSubItems = item.subItems.map((sub) =>
            sub.id === itemId ? { ...sub, completed: !sub.completed } : sub
          );

          const allComplete = updatedSubItems.every((sub) => sub.completed);

          return {
            ...item,
            subItems: updatedSubItems,
            completed: allComplete,
          };
        }
      }

      if (item.id === itemId) {
        return { ...item, completed: !item.completed };
      }

      return item;
    });

    setItems(updatedItems);

    if (reorderTimeoutRef.current) {
      clearTimeout(reorderTimeoutRef.current);
    }

    reorderTimeoutRef.current = setTimeout(() => {
      const reordered = reorderItems(updatedItems);

      setItems(reordered);

      if (onItemToggle) {
        onItemToggle(reordered);
      }
    }, 500);
  };

  const handleYesNoAnswer = (itemId, answer) => {
    const item = items.find((i) => i.id === itemId);

    if (answer === "yes" && item?.yesNoConfig?.type === "multiChoice") {
      setMultiChoiceItem(item);
      setShowMultiChoiceModal(true);
      return;
    }

    if (answer === "yes" && item?.yesNoConfig?.type === "fillIn") {
      setFillInItem(item);
      setShowFillInModal(true);
      return;
    }

    const updatedItems = items.map((item) => {
      if (item.id !== itemId) return item;

      const updatedItem = {
        ...item,
        yesNoConfig: {
          ...item.yesNoConfig,
          answered: true,
          answer: answer,
        },
      };

      if (answer === "no") {
        updatedItem.completed = true;
      }

      return updatedItem;
    });

    setItems(updatedItems);

    if (answer === "no") {
      if (reorderTimeoutRef.current) {
        clearTimeout(reorderTimeoutRef.current);
      }

      reorderTimeoutRef.current = setTimeout(() => {
        const reordered = reorderItems(updatedItems);
        setItems(reordered);

        if (onItemToggle) {
          onItemToggle(reordered);
        }
      }, 500);
    } else {
      if (onItemToggle) {
        onItemToggle(updatedItems);
      }
    }
  };

  const handleMultiChoiceConfirm = (selectedOptions) => {
    if (!multiChoiceItem) return;

    const subItems = selectedOptions.map((option) => ({
      id: generateUUID(),
      name: option,
      itemType: "checkbox",
      completed: false,
      parentId: multiChoiceItem.id,
    }));

    const updatedItems = items.map((item) => {
      if (item.id === multiChoiceItem.id) {
        return {
          ...item,
          yesNoConfig: {
            ...item.yesNoConfig,
            answered: true,
            answer: "yes",
          },
          subItems: subItems,
          completed: false,
        };
      }
      return item;
    });

    setItems(updatedItems);
    setShowMultiChoiceModal(false);
    setMultiChoiceItem(null);

    if (onItemToggle) {
      onItemToggle(updatedItems);
    }
  };

  const handleFillInConfirm = (typedItems) => {
    if (!fillInItem) return;

    const subItems = typedItems.map((itemText) => ({
      id: generateUUID(),
      name: itemText,
      itemType: "checkbox",
      completed: false,
      parentId: fillInItem.id,
    }));

    const updatedItems = items.map((item) => {
      if (item.id === fillInItem.id) {
        return {
          ...item,
          yesNoConfig: {
            ...item.yesNoConfig,
            answered: true,
            answer: "yes",
          },
          subItems: subItems,
          completed: false,
        };
      }
      return item;
    });

    setItems(updatedItems);
    setShowFillInModal(false);
    setFillInItem(null);

    if (onItemToggle) {
      onItemToggle(updatedItems);
    }
  };

  const handleResetYesNo = (itemId) => {
    const updatedItems = items.map((item) => {
      if (item.id !== itemId) return item;

      return {
        ...item,
        completed: false,
        yesNoConfig: {
          ...item.yesNoConfig,
          answered: false,
          answer: null,
        },
        subItems: [],
      };
    });

    setItems(updatedItems);

    if (reorderTimeoutRef.current) {
      clearTimeout(reorderTimeoutRef.current);
    }

    reorderTimeoutRef.current = setTimeout(() => {
      const reordered = reorderItems(updatedItems);
      setItems(reordered);

      if (onItemToggle) {
        onItemToggle(reordered);
      }
    }, 500);
  };

  const { completed: completedCount, total: totalCount } =
    calculateChecklistProgress(items);

  // Update handleSort
  const handleSort = () => {
    const incompleteItems = items.filter((item) => !item.completed);
    setSortingItems(incompleteItems);
    setSortingParent(null);
    setSortModalStack([]); // Clear stack when opening fresh
    setShowSortModal(true);
  };

  // Update handleDrillDown
  const handleDrillDown = (parentItem) => {
    setSortModalStack((prev) => [
      ...prev,
      { items: sortingItems, parent: sortingParent },
    ]); // Push current state
    setSortingItems(parentItem.subItems);
    setSortingParent(parentItem);
  };

  // Update handleSaveSort
  const handleSaveSort = (reorderedItems) => {
    if (sortingParent) {
      // We were sorting sub-items - update the parent's subItems
      const updatedItems = items.map((item) => {
        if (item.id === sortingParent.id) {
          return {
            ...item,
            subItems: reorderedItems,
          };
        }
        return item;
      });

      setItems(updatedItems);
      if (onItemToggle) {
        onItemToggle(updatedItems); // Immediate update!
      }

      // Go back to parent level if there's a stack
      if (sortModalStack.length > 0) {
        const previous = sortModalStack[sortModalStack.length - 1];
        setSortingItems(previous.items);
        setSortingParent(previous.parent);
        setSortModalStack((prev) => prev.slice(0, -1)); // Pop stack
        // Modal stays open!
      } else {
        // No stack - close modal
        setShowSortModal(false);
        setSortingParent(null);
      }
    } else {
      // We were sorting top-level items - merge with completed items at bottom
      const completedItems = items.filter((item) => item.completed);
      const mergedItems = [...reorderedItems, ...completedItems];

      setItems(mergedItems);
      if (onItemToggle) {
        onItemToggle(mergedItems); // Immediate update!
      }

      // Close modal
      setShowSortModal(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    progressBarContainer: {
      paddingHorizontal: getSpacing.md,
      paddingTop: getSpacing.md,
      paddingBottom: getSpacing.sm,
      backgroundColor: theme.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.primary,
    },
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      backgroundColor: theme.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.primary,
    },
    moveButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      backgroundColor: selectionMode ? theme.primary : theme.primary + "20",
      borderRadius: getBorderRadius.md,
    },
    moveButtonText: {
      fontSize: getTypography.body.fontSize,
      color: selectionMode ? "#fff" : theme.primary,
      marginLeft: getSpacing.xs,
      fontWeight: "600",
    },
    confirmMoveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      backgroundColor: theme.primary,
      borderRadius: getBorderRadius.md,
      margin: getSpacing.md,
    },
    confirmMoveButtonText: {
      fontSize: getTypography.body.fontSize,
      color: "#fff",
      fontWeight: "600",
      marginLeft: getSpacing.xs,
    },
    scrollContent: {
      padding: getSpacing.md,
      paddingTop: getSpacing.sm,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: getSpacing.xl * 2,
    },
    emptyStateText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.md,
    },
    sortButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      backgroundColor: theme.primary + "20",
      borderRadius: getBorderRadius.md,
    },
    sortButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.primary,
      marginLeft: getSpacing.xs,
      fontWeight: "600",
    },
  });

  return (
    <View style={styles.container}>
      {/* Header with Sort and Move Items buttons */}
      {items.length > 0 && (
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.sortButton} onPress={handleSort}>
            <Ionicons name="swap-vertical" size={20} color={theme.primary} />
            <Text style={styles.sortButtonText}>Sort</Text>
          </TouchableOpacity>

          {/* Only show Move Items if user is admin */}
          {isUserAdmin && (
            <TouchableOpacity
              style={styles.moveButton}
              onPress={() => {
                if (selectionMode) {
                  setSelectionMode(false);
                  setSelectedItems(new Set());
                } else {
                  setSelectionMode(true);
                }
              }}
            >
              <Ionicons
                name={selectionMode ? "close" : "move-outline"}
                size={20}
                color={selectionMode ? "#fff" : theme.primary}
              />
              <Text style={styles.moveButtonText}>
                {selectionMode ? "Cancel" : "Move Items"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Sticky Progress Bar */}
      {items.length > 0 && !selectionMode && (
        <View style={styles.progressBarContainer}>
          <ProgressBar
            completed={completedCount}
            total={totalCount}
            showCount={false}
          />
        </View>
      )}

      {/* Scrollable Checklist Items */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="checkbox-outline"
              size={64}
              color={theme.text.tertiary}
            />
            <Text style={styles.emptyStateText}>
              No items in this checklist
            </Text>
          </View>
        ) : (
          <>
            {items.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onToggle={toggleItem}
                onYesNoAnswer={handleYesNoAnswer}
                onResetYesNo={handleResetYesNo}
                selectionMode={selectionMode}
                isSelected={selectedItems.has(item.id)}
                onSelect={toggleSelection}
                isMoveable={isItemMoveable(item)}
                selectedItems={selectedItems}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Confirm Move Button */}
      {selectionMode && selectedItems.size > 0 && (
  <TouchableOpacity
    style={styles.confirmMoveButton}
    onPress={() => {
      // Calculate items to move
      const itemsToMove = [];
      
      items.forEach((item) => {
        if (selectedItems.has(item.id)) {
          if (item.subItems && item.subItems.length > 0) {
            itemsToMove.push(item);
          } else {
            itemsToMove.push(item);
          }
        } else if (item.subItems && item.subItems.length > 0) {
          const selectedSubs = item.subItems.filter((sub) =>
            selectedItems.has(sub.id)
          );

          if (selectedSubs.length > 0) {
            const allSubsSelected = selectedSubs.length === item.subItems.length;

            if (allSubsSelected) {
              itemsToMove.push(item);
            } else {
              itemsToMove.push({
                ...item,
                id: generateUUID(),
                subItems: selectedSubs,
              });
            }
          }
        }
      });
      
      setItemsBeingMoved(itemsToMove);
      setShowMoveModal(true);
    }}
  >
    <Ionicons name="arrow-forward" size={20} color="#fff" />
    <Text style={styles.confirmMoveButtonText}>
      Move {getLogicalItemCount()}{" "}
      {getLogicalItemCount() === 1 ? "item" : "items"}
    </Text>
  </TouchableOpacity>
)}

      {/* Multiple Choice Selection Modal */}
      <MultipleChoiceSelectionModal
        visible={showMultiChoiceModal}
        options={multiChoiceItem?.yesNoConfig?.options || []}
        itemName={multiChoiceItem?.name || "Item"}
        onConfirm={handleMultiChoiceConfirm}
        onCancel={() => {
          setShowMultiChoiceModal(false);
          setMultiChoiceItem(null);
        }}
      />

      {/* Fill In Selection Modal */}
      <FillInSelectionModal
        visible={showFillInModal}
        itemName={fillInItem?.name || "Item"}
        onConfirm={handleFillInConfirm}
        onCancel={() => {
          setShowFillInModal(false);
          setFillInItem(null);
        }}
      />

      {/* Move Items Modal */}
      <MoveItemsModal
        visible={showMoveModal}
        pinnedChecklists={pinnedChecklists}
        itemsToMove={itemsBeingMoved}
        selectedChecklist={checklist}
        context={context}
        eventId={eventId}
        selectedCalendarIdForMoving={selectedCalendarIdForMoving}
        setSelectedCalendarIdForMoving={setSelectedCalendarIdForMoving}
        groupId={groupId}
        eventStartTime={eventStartTime}
        eventActivities={eventActivities}
        onConfirm={handleMoveItems}
        onCancel={() => {
          setShowMoveModal(false);
          if (onCloseParentModal) {  // ✅ Close parent too
            onCloseParentModal();
          }
        }}
      />

      {/* Sort Modal */}
      <CustomOrderModal
        visible={showSortModal}
        items={sortingItems}
        onSave={handleSaveSort}
        onClose={() => {
          setShowSortModal(false);
          setSortingParent(null);
        }}
        keyExtractor={(item) => item.id}
        getItemName={(item) => item.name}
        title={sortingParent ? sortingParent.name : "Sort Items"}
        showChevrons={!sortingParent} // Only show chevrons on main level
        onDrillDown={handleDrillDown}
        hiddenCount={
          !sortingParent ? items.filter((i) => i.completed).length : 0
        }
      />
    </View>
  );
};

export default ChecklistContent;
