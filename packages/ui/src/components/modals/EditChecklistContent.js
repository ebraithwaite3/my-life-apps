import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import * as Crypto from "expo-crypto";
import DoneButton from "../buttons/DoneButton";
import ReminderSelector from "../forms/ReminderSelector";
import ReminderPicker from "../dropdowns/ReminderPicker";

const EditChecklistContent = forwardRef(({
  checklist = null,
  onSave,
  prefilledTitle = "",
  addReminder = false,
  eventStartTime = null,
  isUserAdmin = false,
  isTemplate = false,
}, ref) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [checklistName, setChecklistName] = useState(prefilledTitle);
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState([]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(null);
  const [reminderTime, setReminderTime] = useState(null);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [notifyAdminOnCompletion, setNotifyAdminOnCompletion] = useState(false);
  const inputRefs = useRef({});
  const scrollViewRef = useRef(null);
  const uuidv4 = () => Crypto.randomUUID();

  const isEditing = checklist !== null;
  const hasEventTime = eventStartTime != null;

  // Keyboard visibility listener
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Initialize form data
  useEffect(() => {
    if (isEditing && checklist) {
      setChecklistName(checklist.name || prefilledTitle);
      setReminderMinutes(checklist.reminderMinutes ?? null);
      setReminderTime(checklist.reminderTime ?? null);
      setNotifyAdminOnCompletion(checklist.notifyAdmin ?? false);

      setItems(
        checklist.items?.map((item, index) => ({
          id: item.id || String(Date.now() + index),
          name: item.name || "",
          completed: isTemplate ? false : (item.completed ?? false),
          requiredForScreenTime: item.requiredForScreenTime ?? false,
        })) || [{ 
          id: uuidv4(), 
          name: "", 
          completed: false, 
          requiredForScreenTime: false 
        }]
      );
    } else {
      setChecklistName(prefilledTitle);
      setReminderMinutes(null);
      setReminderTime(null);
      setNotifyAdminOnCompletion(false);
      setItems([{ 
        id: uuidv4(), 
        name: "", 
        completed: false, 
        requiredForScreenTime: false 
      }]);
    }

    setErrors([]);
  }, [checklist, isEditing, isTemplate, prefilledTitle]);

  const scrollToItemByIndex = useCallback((itemIndex) => {
    if (!scrollViewRef.current) return;

    const headerOffset = 100;
    const itemHeight = 50;
    const targetY = headerOffset + itemIndex * itemHeight;
    const scrollY = Math.max(0, targetY - 350);

    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
    }, 100);
  }, []);

  const updateItem = useCallback((id, name) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item))
    );
  }, []);

  const toggleScreenTimeRequirement = useCallback((id) => {
    setItems((prev) =>
      prev.map((item) => 
        item.id === id 
          ? { ...item, requiredForScreenTime: !item.requiredForScreenTime } 
          : item
      )
    );
  }, []);

  const addItem = useCallback(() => {
    const newId = uuidv4();
    const newItem = { id: newId, name: "", completed: false, requiredForScreenTime: false };

    setItems((prev) => [...prev, newItem]);

    setTimeout(() => {
      inputRefs.current[newId]?.focus();
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  const removeItem = useCallback(
    (id) => {
      if (items.length <= 1) {
        updateItem(id, "");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [items.length, updateItem]
  );

  const handleBlur = useCallback(
    (id) => {
      const item = items.find((i) => i.id === id);
      if (item && !item.name.trim() && items.length > 1) {
        removeItem(id);
      }
    },
    [items, removeItem]
  );

  const handleSubmitEditing = useCallback(
    (currentId) => {
      const currentIndex = items.findIndex((item) => item.id === currentId);
      const nextIndex = currentIndex + 1;

      if (nextIndex < items.length) {
        const nextId = items[nextIndex].id;
        setTimeout(() => {
          inputRefs.current[nextId]?.focus();
          scrollToItemByIndex(nextIndex);
        }, 50);
      } else {
        addItem();
      }
    },
    [items, addItem, scrollToItemByIndex]
  );

  const handleItemFocus = useCallback(
    (itemId) => {
      const itemIndex = items.findIndex((item) => item.id === itemId);
      if (itemIndex !== -1) {
        scrollToItemByIndex(itemIndex);
      }
    },
    [items, scrollToItemByIndex]
  );

  const handleEllipsisPress = useCallback((itemId) => {
    const item = items.find((i) => i.id === itemId);
    
    if (item?.requiredForScreenTime) {
      Alert.alert(
        "Screen Time Requirement",
        "This item is required for screen time",
        [
          {
            text: "Remove Requirement",
            onPress: () => toggleScreenTimeRequirement(itemId),
            style: "destructive",
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
    } else {
      Alert.alert(
        "Add Condition",
        "Select a condition for this item",
        [
          {
            text: "Require for Screen Time",
            onPress: () => toggleScreenTimeRequirement(itemId),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
    }
  }, [items, toggleScreenTimeRequirement]);

  const validateForm = () => {
    const newErrors = [];

    if (!checklistName.trim()) {
      newErrors.push("Checklist name is required.");
    }

    const validItems = items.filter((item) => item.name.trim());
    if (validItems.length === 0) {
      newErrors.push("At least one checklist item is required.");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    try {
      const validItems = items
        .filter((item) => item.name.trim())
        .map((item) => {
          const itemData = {
            id: item.id,
            name: item.name.trim(),
          };
          
          if (item.requiredForScreenTime) {
            itemData.requiredForScreenTime = true;
          }
          
          if (!isTemplate) {
            itemData.completed = item.completed ?? false;
          }
          
          return itemData;
        });

      const newChecklist = {
        id: isEditing ? checklist.id : uuidv4(),
        name: checklistName.trim(),
        items: validItems,
        createdAt: isEditing ? checklist.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!isTemplate) {
        if (hasEventTime && addReminder) {
          newChecklist.reminderMinutes = reminderMinutes;
        } else if (!hasEventTime && reminderTime) {
          newChecklist.reminderTime = reminderTime;
        }
      }

      // Add admin notification flag if enabled
      if (notifyAdminOnCompletion) {
        newChecklist.notifyAdmin = true;
      }

      if (onSave) onSave(newChecklist);
    } catch (error) {
      console.error("Error saving checklist:", error);
      Alert.alert("Error", "Failed to save checklist. Please try again.");
    }
  }, [checklistName, items, reminderMinutes, reminderTime, notifyAdminOnCompletion, isEditing, isTemplate, hasEventTime, addReminder, checklist, onSave]);

  // Expose save method to parent via ref
  useImperativeHandle(ref, () => ({
    save: handleSave
  }));

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      padding: getSpacing.lg,
    },
    sectionHeader: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    nameInput: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.sm,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginBottom: getSpacing.lg,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: getSpacing.lg,
      marginTop: -getSpacing.sm,
    },
    checkboxLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginLeft: getSpacing.sm,
    },
    itemsSection: {
      marginBottom: getSpacing.lg,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: getSpacing.sm,
      paddingVertical: getSpacing.xs,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.sm,
      paddingHorizontal: getSpacing.sm,
    },
    itemNumber: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      width: 30,
    },
    itemInput: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginRight: getSpacing.sm,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.sm,
    },
    removeButton: {
      padding: getSpacing.xs,
    },
    screenTimeIconActive: {
      backgroundColor: theme.primary + "20",
      borderRadius: getBorderRadius.xs,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: getSpacing.md,
      marginTop: getSpacing.sm,
      backgroundColor: theme.primary + "15",
      borderRadius: getBorderRadius.sm,
    },
    addButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.primary,
      marginLeft: getSpacing.xs,
      fontWeight: "600",
    },
    errorContainer: {
      marginTop: getSpacing.md,
      padding: getSpacing.md,
      backgroundColor: theme.error + "20",
      borderRadius: getBorderRadius.sm,
    },
    errorText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.error,
      marginBottom: getSpacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      {keyboardVisible && (
        <DoneButton
          onPress={() => Keyboard.dismiss()}
          theme={theme}
          getSpacing={getSpacing}
          getTypography={getTypography}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionHeader}>
            {isTemplate ? 'Template Name' : 'Checklist Name'}
          </Text>
          <TextInput
            style={styles.nameInput}
            placeholder={`Enter ${isTemplate ? 'template' : 'checklist'} name...`}
            placeholderTextColor={theme.text.tertiary}
            value={checklistName}
            onChangeText={setChecklistName}
            autoCapitalize="words"
            onFocus={() => {
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }}
          />

          {isUserAdmin && (
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setNotifyAdminOnCompletion(!notifyAdminOnCompletion)}
            >
              <Ionicons
                name={notifyAdminOnCompletion ? "checkbox" : "square-outline"}
                size={24}
                color={notifyAdminOnCompletion ? theme.primary : theme.text.secondary}
              />
              <Text style={styles.checkboxLabel}>Notify Me On Completion</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionHeader}>Items</Text>
          <View style={styles.itemsSection}>
            {items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemNumber}>{index + 1}.</Text>

                <TextInput
                  ref={(ref) => (inputRefs.current[item.id] = ref)}
                  style={styles.itemInput}
                  placeholder="Enter checklist item..."
                  placeholderTextColor={theme.text.tertiary}
                  value={item.name}
                  onChangeText={(text) => updateItem(item.id, text)}
                  onSubmitEditing={() => handleSubmitEditing(item.id)}
                  onFocus={() => handleItemFocus(item.id)}
                  returnKeyType="next"
                  onBlur={() => handleBlur(item.id)}
                  blurOnSubmit={false}
                />

                {item.name.trim() !== "" && (
                  <>
                    <TouchableOpacity
                      onPress={() => removeItem(item.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={theme.error}
                      />
                    </TouchableOpacity>

                    {isUserAdmin && (
                      <TouchableOpacity
                        onPress={() => handleEllipsisPress(item.id)}
                        style={[
                          styles.removeButton,
                          item.requiredForScreenTime && styles.screenTimeIconActive
                        ]}
                      >
                        <Ionicons
                          name={item.requiredForScreenTime ? "phone-portrait" : "phone-portrait-outline"}
                          size={20}
                          color={item.requiredForScreenTime ? theme.primary : theme.text.secondary}
                        />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            ))}

            <TouchableOpacity onPress={addItem} style={styles.addButton}>
              <Ionicons name="add" size={20} color={theme.primary} />
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {addReminder && !isTemplate && (
            <ReminderSelector
              label="Checklist Reminder"
              reminderMinutes={hasEventTime ? reminderMinutes : null}
              reminderTime={!hasEventTime ? reminderTime : null}
              eventStartTime={eventStartTime || new Date()}
              onPress={() => setShowReminderPicker(true)}
              isCustomTime={!hasEventTime}
            />
          )}

          {errors.length > 0 && (
            <View style={styles.errorContainer}>
              {errors.map((error, index) => (
                <Text key={index} style={styles.errorText}>
                  • {error}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>

        {addReminder && !isTemplate && (
          <ReminderPicker
            visible={showReminderPicker}
            selectedMinutes={hasEventTime ? reminderMinutes : null}
            selectedTime={!hasEventTime ? reminderTime : null}
            onSelect={(value) => {
              if (hasEventTime) {
                setReminderMinutes(value);
              } else {
                setReminderTime(value);
              }
            }}
            onClose={() => setShowReminderPicker(false)}
            eventStartTime={eventStartTime || new Date()}
            isAllDay={!hasEventTime}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
});

EditChecklistContent.displayName = 'EditChecklistContent';

export default EditChecklistContent;