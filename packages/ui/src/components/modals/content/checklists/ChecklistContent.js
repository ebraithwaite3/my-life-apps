import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import { calculateChecklistProgress } from '@my-apps/utils';
import ChecklistItemRow from '../../../checklists/ChecklistItemRow';
import ProgressBar from '../../../general/ProgressBar';
import MultipleChoiceSelectionModal from '../../composed/modals/MultipleChoiceSelectionModals';
import FillInSelectionModal from '../../composed/modals/FillInSelectionModal';
import MoveItemsModal from '../../composed/modals/MoveItemsModal';
import { generateUUID } from '@my-apps/utils';

const ChecklistContent = ({ checklist, onItemToggle, onMoveItems, pinnedChecklists = [] }) => {
  console.log('🔍 ChecklistContent received pinnedChecklists:', pinnedChecklists);

  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
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

  useEffect(() => {
    if (checklist?.items) {
      const reordered = reorderItems(checklist.items);
      setItems(reordered);
    }
  }, [checklist]);

  const reorderItems = (itemsToReorder) => {
    const incomplete = itemsToReorder.filter(i => !i.completed);
    const completed = itemsToReorder.filter(i => i.completed);
    return [...incomplete, ...completed];
  };

  // NEW: Check if item is moveable
  const isItemMoveable = (item) => {
    // Cannot move yesNo, multiChoice, or items with special requirements
    if (item.itemType === 'yesNo') return false;
    if (item.yesNoConfig) return false;
    if (item.requiredForScreenTime) return false;
    if (item.requiresParentApproval) return false;
    return true;
  };

  // NEW: Handle selection toggle
  const toggleSelection = (itemId, isParent = false, parentId = null) => {
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      
      if (isParent) {
        // Toggling a parent - toggle all its sub-items
        const item = items.find(i => i.id === itemId);
        if (item?.subItems) {
          const allSelected = item.subItems.every(sub => newSelection.has(sub.id));
          
          if (allSelected) {
            // Uncheck parent and all subs
            newSelection.delete(itemId);
            item.subItems.forEach(sub => newSelection.delete(sub.id));
          } else {
            // Check parent and all subs
            newSelection.add(itemId);
            item.subItems.forEach(sub => newSelection.add(sub.id));
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
          const parent = items.find(i => i.id === parentId);
          if (parent?.subItems) {
            const allSelected = parent.subItems.every(sub => 
              newSelection.has(sub.id) || sub.id === itemId
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

  // NEW: Handle move items
  const handleMoveItems = (destination) => {
    console.log('🚀 Moving items to:', destination);
    
    // Build list of items to move
    const itemsToMove = [];
    const itemIdsToRemove = new Set();
    
    items.forEach(item => {
      if (selectedItems.has(item.id)) {
        // Parent is selected - move entire group
        if (item.subItems && item.subItems.length > 0) {
          itemIdsToRemove.add(item.id);
          item.subItems.forEach(sub => itemIdsToRemove.add(sub.id));
          
          // Check if this is the ONLY selection (single group)
          const onlyThisGroup = selectedItems.size === 1 + item.subItems.length;
          
          if (onlyThisGroup) {
            // Flatten: add sub-items as individual items
            item.subItems.forEach(sub => {
              itemsToMove.push({
                ...sub,
                parentId: null, // Remove parent relationship
              });
            });
          } else {
            // Keep as group
            itemsToMove.push(item);
          }
        } else {
          // Regular item
          itemIdsToRemove.add(item.id);
          itemsToMove.push(item);
        }
      } else if (item.subItems && item.subItems.length > 0) {
        // Check if some sub-items are selected
        const selectedSubs = item.subItems.filter(sub => selectedItems.has(sub.id));
        
        if (selectedSubs.length > 0) {
          const allSubsSelected = selectedSubs.length === item.subItems.length;
          
          if (allSubsSelected) {
            // All subs selected - move parent too
            itemIdsToRemove.add(item.id);
            item.subItems.forEach(sub => itemIdsToRemove.add(sub.id));
            itemsToMove.push(item);
          } else {
            // Partial selection - move as group with only selected subs
            selectedSubs.forEach(sub => itemIdsToRemove.add(sub.id));
            itemsToMove.push({
              ...item,
              id: generateUUID(), // New ID for the partial group
              subItems: selectedSubs,
            });
          }
        }
      }
    });
    
    console.log('📦 Items to move:', itemsToMove);
    console.log('🗑️ Items to remove from source:', Array.from(itemIdsToRemove));
    
    // Call parent handler
    if (onMoveItems) {
      onMoveItems(itemsToMove, itemIdsToRemove, destination);
    }
    
    // Exit selection mode
    setSelectionMode(false);
    setSelectedItems(new Set());
    setShowMoveModal(false);
  };

  const toggleItem = (itemId) => {
    let updatedItems = items.map(item => {
      if (item.subItems && item.subItems.length > 0) {
        const subItemIndex = item.subItems.findIndex(sub => sub.id === itemId);
        if (subItemIndex !== -1) {
          const updatedSubItems = item.subItems.map(sub =>
            sub.id === itemId ? { ...sub, completed: !sub.completed } : sub
          );

          const allComplete = updatedSubItems.every(sub => sub.completed);

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
    const item = items.find(i => i.id === itemId);
    
    if (answer === 'yes' && item?.yesNoConfig?.type === 'multiChoice') {
      setMultiChoiceItem(item);
      setShowMultiChoiceModal(true);
      return;
    }

    if (answer === 'yes' && item?.yesNoConfig?.type === 'fillIn') {
      setFillInItem(item);
      setShowFillInModal(true);
      return;
    }

    const updatedItems = items.map(item => {
      if (item.id !== itemId) return item;

      const updatedItem = {
        ...item,
        yesNoConfig: {
          ...item.yesNoConfig,
          answered: true,
          answer: answer,
        },
      };

      if (answer === 'no') {
        updatedItem.completed = true;
      }

      return updatedItem;
    });

    setItems(updatedItems);

    if (answer === 'no') {
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

    const subItems = selectedOptions.map(option => ({
      id: generateUUID(),
      name: option,
      itemType: 'checkbox',
      completed: false,
      parentId: multiChoiceItem.id,
    }));

    const updatedItems = items.map(item => {
      if (item.id === multiChoiceItem.id) {
        return {
          ...item,
          yesNoConfig: {
            ...item.yesNoConfig,
            answered: true,
            answer: 'yes',
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

    const subItems = typedItems.map(itemText => ({
      id: generateUUID(),
      name: itemText,
      itemType: 'checkbox',
      completed: false,
      parentId: fillInItem.id,
    }));

    const updatedItems = items.map(item => {
      if (item.id === fillInItem.id) {
        return {
          ...item,
          yesNoConfig: {
            ...item.yesNoConfig,
            answered: true,
            answer: 'yes',
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
    const updatedItems = items.map(item => {
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

  const { completed: completedCount, total: totalCount } = calculateChecklistProgress(items);

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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      backgroundColor: theme.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.primary,
    },
    moveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      backgroundColor: selectionMode ? theme.primary : theme.primary + '20',
      borderRadius: getBorderRadius.md,
    },
    moveButtonText: {
      fontSize: getTypography.body.fontSize,
      color: selectionMode ? '#fff' : theme.primary,
      marginLeft: getSpacing.xs,
      fontWeight: '600',
    },
    confirmMoveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      backgroundColor: theme.primary,
      borderRadius: getBorderRadius.md,
      margin: getSpacing.md,
    },
    confirmMoveButtonText: {
      fontSize: getTypography.body.fontSize,
      color: '#fff',
      fontWeight: '600',
      marginLeft: getSpacing.xs,
    },
    scrollContent: { 
      padding: getSpacing.md,
      paddingTop: getSpacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: getSpacing.xl * 2,
    },
    emptyStateText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.md,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header with Move Items button */}
      {items.length > 0 && (
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.moveButton}
            onPress={() => {
              if (selectionMode) {
                // Cancel selection
                setSelectionMode(false);
                setSelectedItems(new Set());
              } else {
                // Enter selection mode
                setSelectionMode(true);
              }
            }}
          >
            <Ionicons
              name={selectionMode ? 'close' : 'move-outline'}
              size={20}
              color={selectionMode ? '#fff' : theme.primary}
            />
            <Text style={styles.moveButtonText}>
              {selectionMode ? 'Cancel' : 'Move Items'}
            </Text>
          </TouchableOpacity>
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
            {items.map(item => (
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
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Confirm Move Button */}
      {selectionMode && selectedItems.size > 0 && (
        <TouchableOpacity
          style={styles.confirmMoveButton}
          onPress={() => setShowMoveModal(true)}
        >
          <Ionicons name="arrow-forward" size={20} color="#fff" />
          <Text style={styles.confirmMoveButtonText}>
            Move {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'}
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
        onConfirm={handleMoveItems}
        onCancel={() => setShowMoveModal(false)}
      />
    </View>
  );
};

export default ChecklistContent;