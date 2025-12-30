import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import { calculateChecklistProgress } from '@my-apps/utils';
import ChecklistItemRow from '../../../checklists/ChecklistItemRow';
import ProgressBar from '../../../general/ProgressBar';
import MultipleChoiceSelectionModal from '../../composed/modals/MultipleChoiceSelectionModals';
import FillInSelectionModal from '../../composed/modals/FillInSelectionModal';
import { generateUUID } from '@my-apps/utils';

const ChecklistContent = ({ checklist, onItemToggle }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const [items, setItems] = useState([]);
  const reorderTimeoutRef = useRef(null);
  
  // Multiple choice modal state
  const [showMultiChoiceModal, setShowMultiChoiceModal] = useState(false);
  const [multiChoiceItem, setMultiChoiceItem] = useState(null);
  
  // Fill in modal state
  const [showFillInModal, setShowFillInModal] = useState(false);
  const [fillInItem, setFillInItem] = useState(null);

  useEffect(() => {
    if (checklist?.items) {
      // Reorder on load so completed items are always at bottom
      const reordered = reorderItems(checklist.items);
      setItems(reordered);
    }
  }, [checklist]);

  const reorderItems = (itemsToReorder) => {
    // Only reorder top-level items (sub-items stay with their parents)
    const incomplete = itemsToReorder.filter(i => !i.completed);
    const completed = itemsToReorder.filter(i => i.completed);
    return [...incomplete, ...completed];
  };

  const toggleItem = (itemId) => {
    // Find if this is a sub-item or parent
    let updatedItems = items.map(item => {
      // Check if toggling a sub-item (from group OR multiChoice)
      if (item.subItems && item.subItems.length > 0) {
        const subItemIndex = item.subItems.findIndex(sub => sub.id === itemId);
        if (subItemIndex !== -1) {
          // Toggling a sub-item
          const updatedSubItems = item.subItems.map(sub =>
            sub.id === itemId ? { ...sub, completed: !sub.completed } : sub
          );

          // Check if all sub-items are now complete
          const allComplete = updatedSubItems.every(sub => sub.completed);

          return {
            ...item,
            subItems: updatedSubItems,
            // Auto-complete parent if all subs complete, auto-uncomplete if not all complete
            completed: allComplete,
          };
        }
      }

      // Toggling a parent item (only for non-group, non-multiChoice items)
      if (item.id === itemId) {
        return { ...item, completed: !item.completed };
      }

      return item;
    });

    setItems(updatedItems);

    if (reorderTimeoutRef.current) {
      clearTimeout(reorderTimeoutRef.current);
    }

    // Delayed reorder
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
    
    // If answering "yes" on multiChoice, open modal
    if (answer === 'yes' && item?.yesNoConfig?.type === 'multiChoice') {
      setMultiChoiceItem(item);
      setShowMultiChoiceModal(true);
      return;
    }

    // If answering "yes" on fillIn, open modal
    if (answer === 'yes' && item?.yesNoConfig?.type === 'fillIn') {
      setFillInItem(item);
      setShowFillInModal(true);
      return;
    }

    const updatedItems = items.map(item => {
      if (item.id !== itemId) return item;

      // Update yesNoConfig with answer
      const updatedItem = {
        ...item,
        yesNoConfig: {
          ...item.yesNoConfig,
          answered: true,
          answer: answer,
        },
      };

      // If answered "no", mark as completed
      if (answer === 'no') {
        updatedItem.completed = true;
      }

      return updatedItem;
    });

    setItems(updatedItems);

    // Trigger reorder after delay (if answered "no", it's now completed)
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
      // If answered "yes" (simple type), just save without reordering (not completed yet)
      if (onItemToggle) {
        onItemToggle(updatedItems);
      }
    }
  };

  const handleMultiChoiceConfirm = (selectedOptions) => {
    if (!multiChoiceItem) return;

    // Create sub-items from selected options
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
          completed: false, // Not complete until all subs done
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

    // Create sub-items from typed items
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
          completed: false, // Not complete until all subs done
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

      // Reset yesNoConfig, completed status, and clear subItems
      return {
        ...item,
        completed: false,
        yesNoConfig: {
          ...item.yesNoConfig,
          answered: false,
          answer: null,
        },
        subItems: [], // Clear sub-items for multiChoice reset
      };
    });

    setItems(updatedItems);

    // Trigger reorder (item no longer completed, moves to top)
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

  // Use shared utility for progress calculation
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
      {/* Sticky Progress Bar */}
      {items.length > 0 && (
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
            {/* Checklist Items */}
            {items.map(item => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onToggle={toggleItem}
                onYesNoAnswer={handleYesNoAnswer}
                onResetYesNo={handleResetYesNo}
              />
            ))}
          </>
        )}
      </ScrollView>

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
    </View>
  );
};

export default ChecklistContent;