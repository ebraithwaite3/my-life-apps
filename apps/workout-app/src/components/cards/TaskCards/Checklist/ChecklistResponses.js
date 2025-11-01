import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, Keyboard, Alert } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "../../../../contexts/ThemeContext";
import { useTaskActions } from "../../../../hooks/useTaskActions";
import { useData } from "../../../../contexts/DataContext";

const ChecklistResponses = ({
  assignment,
  groupId,
  onAssignmentUpdate,
  isEventPast,
  thisGroup,
  amIAdminOfThisGroup,
  listItems,
  totalCount,
  usersWhoCanRespond,
  parentScrollRef // We need to receive the ref here
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { updateTask } = useTaskActions();
  const { user } = useData();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [items, setItems] = useState([...listItems]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [idCounter, setIdCounter] = useState(listItems.length + 1);
  const itemRefs = useRef({});
  const [focusedItemId, setFocusedItemId] = useState(null);

  const handleToggleComplete = (itemId) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
    setHasUnsavedChanges(true);
  };

  const switchToViewMode = () => {
    Keyboard.dismiss();
    setFocusedItemId(null);
    setIsEditMode(false);
  };
  
  const switchToEditMode = () => {
    setIsEditMode(true);
  };
  
  // 1. NEW: CONSOLIDATED SCROLL FUNCTION
  const handleScrollToItem = (itemId) => {
    // Keep focus logic separate but call scroll after a brief delay
    setTimeout(() => {
      const itemRef = itemRefs.current[itemId];
      if (itemRef && parentScrollRef?.current) {
        itemRef.measureLayout(
          parentScrollRef.current,
          (x, y, width, height) => {
            // 2. INCREASED OFFSET TO AVOID SCROLLING TOO LOW
            // 180 is a good starting point to clear the keyboard and header
            const scrollY = y - 180; 
            parentScrollRef.current.scrollTo({
              y: scrollY > 0 ? scrollY : 0,
              animated: true,
            });
          },
          () => {
            console.log("Failed to measure layout for scroll.");
          }
        );
      }
    }, 100);
  };

  // UPDATED: handleItemPress only handles view/edit mode logic
  const handleItemPress = (itemId) => {
    if (!isEditMode) {
      handleToggleComplete(itemId);
      return;
    }
  
    // In edit mode, pressing the row simply focuses the input, 
    // and the onFocus event on TextInput will handle scrolling.
    setFocusedItemId(itemId);
    itemRefs.current[itemId]?.focus();
  };

  const updateEditedItem = (itemId, newText) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, text: newText } : item
    ));
    setHasUnsavedChanges(true);
  };

  const completedCount = items.filter(item => item.completed).length;

  // UPDATED: addNewItem uses the new consolidated scroll function
  const addNewItem = () => {
    const newItem = {
      id: Date.now().toString(),
      text: '',
      completed: false,
      createdBy: user?.userId || 'currentUserId',
      createdAt: new Date().toISOString()
    };
    setItems(prev => [...prev, newItem]);
    setHasUnsavedChanges(true);
    setIdCounter(prev => prev + 1);

    setFocusedItemId(newItem.id);
    
    // Defer the focus and scroll to the end of the event loop
    setTimeout(() => {
        itemRefs.current[newItem.id]?.focus();
        handleScrollToItem(newItem.id);
    }, 150);
  };

  const deleteItem = (itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      console.log('Saving checklist changes to database...');
      
      // Handle both old (listData) and new (checklistData) structure
      const dataKey = assignment.listData ? 'listData' : 'checklistData';
      const updates = {
        [dataKey]: {
          ...(assignment.listData || assignment.checklistData),
          items: items
        }
      };

      // Save to database using updateTask
      await updateTask(
        assignment.isPersonalTask ? user.userId : groupId,
        assignment.taskId,
        updates,
        user?.userId
      );

      const updatedAssignment = {
        ...assignment,
        ...updates
      };
      
      if (onAssignmentUpdate) {
        onAssignmentUpdate(updatedAssignment);
      }
      
      setHasUnsavedChanges(false);
      setFocusedItemId(null);
      Keyboard.dismiss();
      
      console.log('✅ Successfully saved checklist changes');
    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert('Error', 'Failed to save checklist changes. Please try again.');
    }
  };

  const handleCancelChanges = () => {
    setItems([...listItems]);
    setHasUnsavedChanges(false);
    setFocusedItemId(null);
    Keyboard.dismiss();
  };

  return (
    <View style={{
      backgroundColor: theme.background,
      borderRadius: 8,
      padding: getSpacing.md,
      marginTop: getSpacing.md,
    }}>
      
      {/* Mode Toggle - Segmented Control Style */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: getSpacing.md,
      }}>
        <Text style={{
          fontSize: getTypography.h4.fontSize,
          fontWeight: getTypography.h4.fontWeight,
          color: theme.text.primary,
        }}>
          Items ({completedCount}/{totalCount})
        </Text>
        
        {/* Segmented Control */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: theme.surface,
          borderRadius: 6,
          padding: 2,
          borderWidth: 1,
          borderColor: theme.border,
        }}>
          <TouchableOpacity
            onPress={switchToViewMode}
            style={{
              paddingHorizontal: getSpacing.sm,
              paddingVertical: getSpacing.xs,
              backgroundColor: !isEditMode ? theme.primary : 'transparent',
              borderRadius: 4,
              minWidth: 50,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: !isEditMode ? theme.text.inverse : theme.text.secondary,
              fontSize: getTypography.bodySmall.fontSize,
              fontWeight: '600',
            }}>
              View
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={switchToEditMode}
            style={{
              paddingHorizontal: getSpacing.sm,
              paddingVertical: getSpacing.xs,
              backgroundColor: isEditMode ? theme.primary : 'transparent',
              borderRadius: 4,
              minWidth: 50,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: isEditMode ? theme.text.inverse : theme.text.secondary,
              fontSize: getTypography.bodySmall.fontSize,
              fontWeight: '600',
            }}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Checklist Items - No longer a ScrollView */}
      <View> 
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleItemPress(item.id)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: getSpacing.sm,
              borderBottomWidth: index === items.length - 1 ? 0 : 1,
              borderBottomColor: theme.border,
            }}
          >
            {/* Checkbox - only show in view mode */}
            {!isEditMode && (
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: item.completed ? theme.primary : theme.border,
                  backgroundColor: item.completed ? theme.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: getSpacing.sm,
                }}
              >
                {item.completed && (
                  <Ionicons name="checkmark" size={16} color={theme.text.inverse} />
                )}
              </View>
            )}

            {/* Spacer in edit mode to maintain alignment */}
            {isEditMode && (
              <View style={{
                width: 24,
                height: 24,
                marginRight: getSpacing.sm,
              }} />
            )}

            {/* Item Content */}
            {isEditMode ? (
              <TextInput
                ref={el => itemRefs.current[item.id] = el}
                style={{
                  flex: 1,
                  fontSize: getTypography.body.fontSize,
                  color: theme.text.primary,
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: item.id === focusedItemId ? theme.primary : theme.border,
                  borderRadius: 4,
                  padding: getSpacing.xs,
                  marginRight: getSpacing.sm,
                }}
                value={item.text}
                onChangeText={(text) => updateEditedItem(item.id, text)}
                placeholder="Enter item text..."
                placeholderTextColor={theme.text.tertiary}
                // 3. USE onFocus TO HANDLE SCROLL
                onFocus={() => {
                  setFocusedItemId(item.id);
                  handleScrollToItem(item.id);
                }}
                onBlur={() => setFocusedItemId(null)}
              />
            ) : (
              <Text style={{
                flex: 1,
                fontSize: getTypography.body.fontSize,
                color: item.completed ? theme.text.secondary : theme.text.primary,
                textDecorationLine: item.completed ? 'line-through' : 'none',
              }}>
                {item.text || 'Enter item text...'}
              </Text>
            )}

            {/* Edit Mode Actions */}
            {isEditMode && (
              <TouchableOpacity
                onPress={() => deleteItem(item.id)}
                style={{ padding: getSpacing.xs }}
              >
                <Ionicons name="trash-outline" size={18} color={theme.error} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}

        {/* Add Item Button (Edit Mode Only) */}
        {isEditMode && (
          <TouchableOpacity
            onPress={addNewItem}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: getSpacing.md,
              marginTop: getSpacing.sm,
              backgroundColor: theme.primary + '15',
              borderRadius: 6,
            }}
          >
            <Ionicons name="add" size={20} color={theme.primary} />
            <Text style={{
              fontSize: getTypography.body.fontSize,
              color: theme.primary,
              marginLeft: getSpacing.xs,
              fontWeight: '600',
            }}>
              Add Item
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Save/Cancel Buttons */}
      {hasUnsavedChanges && (
        <View style={{
          flexDirection: 'row',
          gap: getSpacing.md,
          marginTop: getSpacing.md,
          paddingTop: getSpacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}>
          <TouchableOpacity
            onPress={handleCancelChanges}
            style={{
              flex: 1,
              paddingVertical: getSpacing.sm,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 6,
              backgroundColor: theme.surface,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: theme.text.secondary,
              fontSize: getTypography.body.fontSize,
              fontWeight: '600',
            }}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSaveChanges}
            style={{
              flex: 1,
              paddingVertical: getSpacing.sm,
              borderRadius: 6,
              backgroundColor: theme.primary,
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: theme.text.inverse,
              fontSize: getTypography.body.fontSize,
              fontWeight: '600',
            }}>
              Save Changes
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ChecklistResponses;