import React, {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
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
import ReminderSelector from "../../../forms/ReminderSelector";
import TimePickerModal from "../../composed/modals/TimePickerModal";
import FilterChips from "../../../general/FilterChips";
import ChecklistEditingRow from "../../../checklists/ChecklistEditingRow";
import ChecklistItemConfigModal from "../../composed/modals/ChecklistItemConfigModal";
import { useAutoScrollOnFocus } from "@my-apps/hooks";
import { canSaveAsTemplate, getChecklistStats } from "@my-apps/utils";
import { useChecklistState } from "@my-apps/hooks";
import { DateTime } from "luxon";

const EditChecklistContent = forwardRef(
  (
    {
      checklist = null,
      onSave,
      prefilledTitle = "",
      addReminder = false,
      eventStartTime = null,
      isUserAdmin = false,
      isTemplate = false,
      templates = [],
    },
    ref
  ) => {
    const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
    console.log("📝 EditChecklistContent - checklist:", checklist);

    const [checklistName, setChecklistName] = useState(prefilledTitle);
    const [items, setItems] = useState([]);
    const [errors, setErrors] = useState([]);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [reminderMinutes, setReminderMinutes] = useState(null);
    const [reminderTime, setReminderTime] = useState(null);
    const [showReminderPicker, setShowReminderPicker] = useState(false);
    const [notifyAdminOnCompletion, setNotifyAdminOnCompletion] = useState(false);
    const [focusedItemId, setFocusedItemId] = useState(null); // NEW: Track focused item

    // Config modal state
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [selectedItemForConfig, setSelectedItemForConfig] = useState(null);

    // Template defaults
    const [defaultNotifyAdmin, setDefaultNotifyAdmin] = useState(false);
    const [defaultReminderTime, setDefaultReminderTime] = useState(null);

    // Save as Template toggle state
    const [saveAsTemplateEnabled, setSaveAsTemplateEnabled] = useState(false);

    const uuidv4 = () => Crypto.randomUUID();
    console.log("ITEMS:", items);

    const isEditing = checklist !== null;
    const hasEventTime = eventStartTime != null;

    // Build current checklist state for tracking
    const currentChecklist = {
      name: checklistName,
      items: items,
      notifyAdmin: notifyAdminOnCompletion,
    };

    // Track completion status changes
    const { wasJustCompleted } = useChecklistState(currentChecklist);

    // Check if already a template by ID match
    const isAlreadyTemplate =
      checklist?.id && templates.some((t) => t.id === checklist.id);

    const { scrollViewRef, registerInput, scrollToInput, focusInput } =
      useAutoScrollOnFocus({ offset: 80 });

    /* ---------------- Helper: Flatten items for rendering ---------------- */
    const flattenItemsForRendering = useCallback(() => {
      const flattened = [];
      items.forEach((item) => {
        flattened.push({ ...item, isSubItem: false });
        
        if (item.subItems && item.subItems.length > 0) {
          item.subItems.forEach((subItem) => {
            flattened.push({ ...subItem, isSubItem: true, parentId: item.id });
          });
        }
      });
      return flattened;
    }, [items]);

    /* ---------------- Keyboard visibility ---------------- */
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

    /* ---------------- Completion celebration ---------------- */
    useEffect(() => {
      if (wasJustCompleted) {
        console.log("🎉 Checklist just completed!");
        const stats = getChecklistStats(currentChecklist.items);
        console.log("📊 Checklist stats:", stats);
      }
    }, [wasJustCompleted]);

    /* ---------------- Init form data ---------------- */
    useEffect(() => {
      if (isEditing && checklist) {
        setChecklistName(checklist.name || prefilledTitle);
        setReminderMinutes(checklist.reminderMinutes ?? null);
        setReminderTime(checklist.reminderTime ?? null);
        setNotifyAdminOnCompletion(checklist.notifyAdmin ?? false);

        setDefaultNotifyAdmin(checklist.defaultNotifyAdmin ?? false);
        setDefaultReminderTime(checklist.defaultReminderTime ?? null);

        setItems(
          checklist.items?.map((item, index) => ({
            id: item.id || String(Date.now() + index),
            name: item.name || "",
            completed: isTemplate ? false : item.completed ?? false,
            itemType: item.itemType || "checkbox",
            requiredForScreenTime: item.requiredForScreenTime ?? false,
            requiresParentApproval: item.requiresParentApproval ?? false,
            yesNoConfig: item.yesNoConfig || null,
            subItems: item.subItems || [],
            parentId: item.parentId || null,
          })) || [
            {
              id: uuidv4(),
              name: "",
              completed: false,
              itemType: "checkbox",
              subItems: [],
            },
          ]
        );
      } else {
        setChecklistName(prefilledTitle);
        setReminderMinutes(null);
        setReminderTime(null);
        setNotifyAdminOnCompletion(false);
        setDefaultNotifyAdmin(false);
        setDefaultReminderTime(null);
        setItems([
          {
            id: uuidv4(),
            name: "",
            completed: false,
            itemType: "checkbox",
            subItems: [],
          },
        ]);
      }

      setErrors([]);
      setSaveAsTemplateEnabled(false);
    }, [checklist, isEditing, isTemplate, prefilledTitle]);

    /* ---------------- Item handlers ---------------- */

    const updateItem = useCallback((id, name, isSubItem = false, parentId = null) => {
      if (isSubItem && parentId) {
        setItems((prev) =>
          prev.map((item) => {
            if (item.id === parentId) {
              return {
                ...item,
                subItems: item.subItems.map((sub) =>
                  sub.id === id ? { ...sub, name } : sub
                ),
              };
            }
            return item;
          })
        );
      } else {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, name } : item))
        );
      }
    }, []);

    // NEW: Add item at a specific position (defaults to end)
    const addItemAtPosition = useCallback((afterItemId = null) => {
      const id = uuidv4();
      const newItem = { 
        id, 
        name: "", 
        completed: false, 
        itemType: "checkbox", 
        subItems: [] 
      };

      setItems((prev) => {
        if (afterItemId === null) {
          // Add at end
          return [...prev, newItem];
        }
        
        const index = prev.findIndex((item) => item.id === afterItemId);
        if (index === -1) {
          return [...prev, newItem];
        }
        
        // Add after the specified item
        const newItems = [...prev];
        newItems.splice(index + 1, 0, newItem);
        return newItems;
      });

      setTimeout(() => {
        focusInput(id);
      }, 100);

      return id;
    }, [focusInput]);

    const addItem = useCallback(() => {
      addItemAtPosition(null); // Add at end by default
    }, [addItemAtPosition]);

    const removeItem = useCallback(
      (id, isSubItem = false, parentId = null) => {
        if (isSubItem && parentId) {
          setItems((prev) =>
            prev.map((item) => {
              if (item.id === parentId) {
                const updatedSubItems = item.subItems.filter((sub) => sub.id !== id);
                return { ...item, subItems: updatedSubItems };
              }
              return item;
            })
          );
        } else {
          if (items.length <= 1) {
            updateItem(id, "");
            return;
          }
          setItems((prev) => prev.filter((item) => item.id !== id));
        }
      },
      [items.length, updateItem]
    );

    const handleBlur = useCallback(
      (id, isSubItem = false, parentId = null) => {
        // Clear focused item
        setFocusedItemId(null);
        
        const flattened = flattenItemsForRendering();
        const item = flattened.find((i) => i.id === id);
        
        if (item && !item.name.trim()) {
          if (isSubItem) {
            return;
          } else if (items.length > 1) {
            removeItem(id);
          }
        }
      },
      [items, flattenItemsForRendering, removeItem]
    );

    const addSubItem = useCallback((parentId) => {
      const subItemId = uuidv4();
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === parentId) {
            return {
              ...item,
              subItems: [
                ...(item.subItems || []),
                {
                  id: subItemId,
                  name: "",
                  itemType: "checkbox",
                  parentId: parentId,
                },
              ],
            };
          }
          return item;
        })
      );

      setTimeout(() => {
        focusInput(subItemId);
      }, 100);
    }, [focusInput]);

    const handleSubmitEditing = useCallback(
      (currentId, isSubItem = false, parentId = null) => {
        const flattened = flattenItemsForRendering();
        const index = flattened.findIndex((i) => i.id === currentId);
        const item = flattened[index];

        if (isSubItem) {
          // Sub-item logic
          if (!item.name.trim()) {
            // Empty sub-item + next = Exit to parent level, add new parent BELOW current parent
            removeItem(currentId, true, parentId);
            
            // Add new item AFTER the parent
            addItemAtPosition(parentId);
          } else {
            // Non-empty sub-item + next = Add another sub-item
            addSubItem(parentId);
          }
        } else {
          // Parent item logic
          const next = flattened[index + 1];
          
          if (!item.name.trim()) {
            // Empty parent item - move to next or add new
            if (next) {
              focusInput(next.id);
            } else {
              addItemAtPosition(currentId);
            }
            return;
          }

          // Non-empty parent item
          if (next) {
            focusInput(next.id);
          } else {
            // At the end - add new item BELOW current
            addItemAtPosition(currentId);
          }
        }
      },
      [items, flattenItemsForRendering, addItemAtPosition, addSubItem, removeItem, focusInput]
    );

    const handleFocus = useCallback((id) => {
      setFocusedItemId(id);
      scrollToInput(id);
    }, [scrollToInput]);

    /* ---------------- Config Modal Handlers ---------------- */

    const handleToggleConfig = useCallback((itemId) => {
      const item = items.find((i) => i.id === itemId);
      setSelectedItemForConfig(item);
      setShowConfigModal(true);
    }, [items]);

    const handleSaveConfig = useCallback((updatedItem) => {
      setItems((prev) =>
        prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );
      setShowConfigModal(false);
      setSelectedItemForConfig(null);
    }, []);

    const handleCancelConfig = useCallback(() => {
      setShowConfigModal(false);
      setSelectedItemForConfig(null);
    }, []);

    /* ---------------- Validation & Save ---------------- */

    const validateForm = () => {
      const errs = [];
    
      if (!checklistName.trim()) {
        errs.push("Checklist name is required.");
      }
    
      if (items.filter((i) => i.name.trim()).length === 0) {
        errs.push("At least one checklist item is required.");
      }
    
      setErrors(errs);
      
      // Show alert if there are errors
      if (errs.length > 0) {
        Alert.alert(
          "Cannot Save",
          errs.join("\n"),
          [{ text: "OK" }]
        );
      }
      
      return errs.length === 0;
    };

    const handleSave = useCallback(() => {
      
      if (!validateForm()) {
        console.log("❌ Validation failed");
        return;
      }
    
      if (saveAsTemplateEnabled) {
        const validation = canSaveAsTemplate(currentChecklist);
        if (!validation.valid) {
          Alert.alert(
            "Cannot Save as Template",
            validation.errors.join("\n") +
              "\n\nPlease fix these issues before saving with 'Save as Template' enabled."
          );
          console.log("❌ Template validation failed");
          return;
        }
      }
    
      try {
        const validItems = items
          .filter((i) => i.name.trim())
          .map((item) => {
            const baseItem = {
              id: item.id,
              name: item.name.trim(),
              completed: isTemplate ? undefined : item.completed ?? false,
            };
    
            // Check if this item has sub-items
            const hasSubItems = item.subItems && item.subItems.length > 0 && 
                                item.subItems.some(sub => sub.name.trim());
    
    
            // Set itemType to 'group' if it has sub-items
            if (hasSubItems) {
              baseItem.itemType = 'group';
            } else if (item.itemType && item.itemType !== "checkbox") {
              baseItem.itemType = item.itemType;
            }
    
            if (item.requiredForScreenTime) {
              baseItem.requiredForScreenTime = true;
            }
            if (item.requiresParentApproval) {
              baseItem.requiresParentApproval = true;
            }
            if (item.yesNoConfig) {
              baseItem.yesNoConfig = item.yesNoConfig;
            }
            
            // Properly structure sub-items with full data
            if (hasSubItems) {
              baseItem.subItems = item.subItems
                .filter(sub => sub.name.trim())
                .map(sub => ({
                  id: sub.id,
                  name: sub.name.trim(),
                  itemType: 'checkbox',
                  parentId: item.id,
                  completed: isTemplate ? undefined : sub.completed ?? false,
                }));
              
              console.log(`🔍 Mapped sub-items for "${item.name}":`, baseItem.subItems);
            }
    
            return baseItem;
          });
    
    
        const newChecklist = {
          id: isEditing ? checklist.id : uuidv4(),
          name: checklistName.trim(),
          items: validItems,
          createdAt: isEditing ? checklist.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
    
        if (isTemplate) {
          if (defaultNotifyAdmin) {
            newChecklist.defaultNotifyAdmin = true;
          }
          if (defaultReminderTime) {
            newChecklist.defaultReminderTime = defaultReminderTime;
          }
        } else {
          if (notifyAdminOnCompletion) {
            newChecklist.notifyAdmin = true;
          }
    
          if (hasEventTime && addReminder) {
            if (reminderMinutes !== null) {
              const eventTime = DateTime.fromISO(eventStartTime.toISOString());
              const reminderTimeObj = DateTime.fromISO(reminderMinutes);
              const minutesBefore = Math.round(eventTime.diff(reminderTimeObj, 'minutes').minutes);
              
              newChecklist.reminderMinutes = minutesBefore;
            }
          } else if (!hasEventTime && reminderTime) {
            newChecklist.reminderTime = reminderTime;
          }
        }
        
        onSave?.(newChecklist, saveAsTemplateEnabled);
        
        console.log("✅ onSave completed");
      } catch (error) {
        console.error("❌ Error in handleSave:", error);
        Alert.alert("Error", "Failed to save checklist: " + error.message);
      }
    }, [
      checklistName,
      items,
      reminderMinutes,
      reminderTime,
      notifyAdminOnCompletion,
      defaultNotifyAdmin,
      defaultReminderTime,
      isEditing,
      isTemplate,
      hasEventTime,
      addReminder,
      checklist,
      onSave,
      saveAsTemplateEnabled,
      currentChecklist,
      eventStartTime,
    ]);

    useImperativeHandle(ref, () => ({ 
      save: handleSave,
      getCurrentState: () => ({
        name: checklistName,
        items: items,
        reminderMinutes: reminderMinutes,
        reminderTime: reminderTime,
        notifyAdmin: notifyAdminOnCompletion,
        defaultNotifyAdmin: defaultNotifyAdmin,
        defaultReminderTime: defaultReminderTime,
      })
    }));

    /* ---------------- Build filter chips ---------------- */
    const buildFilters = () => {
      const filters = [];

      if (isUserAdmin) {
        filters.push({
          label: isTemplate ? "Default: Notify Admin" : "Notify Me",
          active: isTemplate ? defaultNotifyAdmin : notifyAdminOnCompletion,
          onPress: () =>
            isTemplate
              ? setDefaultNotifyAdmin(!defaultNotifyAdmin)
              : setNotifyAdminOnCompletion(!notifyAdminOnCompletion),
        });
      }

      if (!isTemplate && !isAlreadyTemplate) {
        filters.push({
          label: "Save as Template",
          icon: "bookmark-outline",
          active: saveAsTemplateEnabled,
          onPress: () => setSaveAsTemplateEnabled(!saveAsTemplateEnabled),
        });
      }

      return filters.length > 0 ? filters : undefined;
    };

    const filterChips = buildFilters();

    /* ---------------- Format time display for templates ---------------- */
    const formatTemplateTime = (timeString) => {
      if (!timeString) return "Not set";
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    /* ---------------- Styles ---------------- */

    const styles = StyleSheet.create({
      container: { flex: 1 },
      scrollContainer: { padding: getSpacing.lg },

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

      addButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: getSpacing.md,
        backgroundColor: theme.primary + "15",
        borderRadius: getBorderRadius.sm,
      },

      addButtonText: {
        fontSize: getTypography.body.fontSize,
        color: theme.primary,
        marginLeft: getSpacing.xs,
        fontWeight: "600",
      },

      doneButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: getSpacing.md,
        backgroundColor: theme.primary + "15",
        borderRadius: getBorderRadius.sm,
      },

      doneButtonText: {
        fontSize: getTypography.body.fontSize,
        color: theme.primary,
        fontWeight: "600",
      },

      buttonRow: {
        flexDirection: "row",
        marginTop: getSpacing.sm,
      },

      templateTimeRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: theme.background,
        borderRadius: getBorderRadius.sm,
        padding: getSpacing.md,
        marginTop: getSpacing.md,
        borderWidth: 1,
        borderColor: theme.border,
      },

      templateTimeText: {
        fontSize: getTypography.body.fontSize,
        color: theme.text.primary,
      },

      templateHint: {
        fontSize: getTypography.caption.fontSize,
        color: theme.text.tertiary,
        fontStyle: "italic",
        marginTop: getSpacing.xs,
      },

      addSubItemButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: getSpacing.sm,
        paddingLeft: 24,
        marginBottom: getSpacing.sm,
      },

      addSubItemText: {
        fontSize: getTypography.caption.fontSize,
        color: theme.text.secondary,
        marginLeft: getSpacing.xs,
      },
    });

    /* ---------------- Render ---------------- */

return (
  <View style={styles.container}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      style={{ flex: 1 }}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionHeader}>
          {isTemplate ? "Template Name" : "Checklist Name"}
        </Text>

        <TextInput
          style={styles.nameInput}
          placeholder={`Enter ${
            isTemplate ? "template" : "checklist"
          } name...`}
          placeholderTextColor={theme.text.tertiary}
          value={checklistName}
          onChangeText={setChecklistName}
          autoCapitalize="words"
          onFocus={() =>
            scrollViewRef.current?.scrollTo({ y: 0, animated: true })
          }
        />

        <FilterChips
          filters={filterChips}
          marginTop={-20}
          chipMarginBottom={4}
        />

        <Text style={styles.sectionHeader}>Items</Text>

        {/* Add Item Button - MOVED TO TOP */}
        <TouchableOpacity onPress={addItem} style={[styles.addButton, { marginBottom: getSpacing.md }]}>
          <Ionicons name="add" size={20} color={theme.primary} />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>

        {items.map((item, parentIndex) => (
          <View key={item.id}>
            {/* Parent Item */}
            <ChecklistEditingRow
              item={item}
              index={parentIndex}
              theme={theme}
              getSpacing={getSpacing}
              getTypography={getTypography}
              getBorderRadius={getBorderRadius}
              isUserAdmin={isUserAdmin}
              onUpdateItem={(id, name) => updateItem(id, name, false)}
              onRemoveItem={(id) => removeItem(id, false)}
              onToggleConfig={handleToggleConfig}
              onFocus={(id) => handleFocus(id)}
              onBlur={(id) => handleBlur(id, false)}
              onSubmitEditing={(id) => handleSubmitEditing(id, false)}
              registerInput={registerInput}
            />

            {/* Add Sub-Item Button (only when THIS parent is focused and has text) */}
            {focusedItemId === item.id && item.name.trim() && (
              <TouchableOpacity
                style={styles.addSubItemButton}
                onPress={() => addSubItem(item.id)}
              >
                <Ionicons name="add-circle-outline" size={16} color={theme.text.secondary} />
                <Text style={styles.addSubItemText}>Add sub-item</Text>
              </TouchableOpacity>
            )}

            {/* Sub-Items */}
            {item.subItems && item.subItems.map((subItem, subIndex) => (
              <ChecklistEditingRow
                key={subItem.id}
                item={subItem}
                index={subIndex}
                theme={theme}
                getSpacing={getSpacing}
                getTypography={getTypography}
                getBorderRadius={getBorderRadius}
                isUserAdmin={false}
                isSubItem={true}
                onUpdateItem={(id, name) => updateItem(id, name, true, item.id)}
                onRemoveItem={(id) => removeItem(id, true, item.id)}
                onToggleConfig={() => {}}
                onFocus={(id) => handleFocus(id)}
                onBlur={(id) => handleBlur(id, true, item.id)}
                onSubmitEditing={(id) => handleSubmitEditing(id, true, item.id)}
                registerInput={registerInput}
              />
            ))}
          </View>
        ))}

        {/* Done Button - ONLY AT BOTTOM when keyboard visible */}
        {keyboardVisible && (
          <TouchableOpacity
            onPress={Keyboard.dismiss}
            style={[styles.doneButton, { marginTop: getSpacing.lg }]}
          >
            <Ionicons name="checkmark" size={20} color={theme.primary} />
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        )}

        {isTemplate && addReminder && (
          <View style={{ marginTop: getSpacing.lg }}>
            <Text style={styles.sectionHeader}>Default Reminder Time</Text>
            <TouchableOpacity
              style={styles.templateTimeRow}
              onPress={() => setShowReminderPicker(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={theme.text.secondary}
                  style={{ marginRight: getSpacing.sm }}
                />
                <Text style={styles.templateTimeText}>
                  {defaultReminderTime ? formatTemplateTime(defaultReminderTime) : "Set default time"}
                </Text>
              </View>
              {defaultReminderTime && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setDefaultReminderTime(null);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color={theme.error} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            <Text style={styles.templateHint}>
              Default time for reminders when applying this template
            </Text>
          </View>
        )}

        {addReminder && !isTemplate && (
          <ReminderSelector
            reminder={hasEventTime ? reminderMinutes : reminderTime}
            onReminderChange={(value) => {
              if (hasEventTime) {
                setReminderMinutes(value);
              } else {
                setReminderTime(value);
              }
            }}
            eventStartDate={eventStartTime || new Date()}
            isAllDay={!hasEventTime}
          />
        )}
      </ScrollView>

      {addReminder && isTemplate && (
        <TimePickerModal
          visible={showReminderPicker}
          onClose={() => setShowReminderPicker(false)}
          initialTime={defaultReminderTime}
          onConfirm={(timeString) => {
            setDefaultReminderTime(timeString);
            setShowReminderPicker(false);
          }}
        />
      )}
    </KeyboardAvoidingView>

    <ChecklistItemConfigModal
      visible={showConfigModal}
      item={selectedItemForConfig}
      onSave={handleSaveConfig}
      onCancel={handleCancelConfig}
      isUserAdmin={isUserAdmin}
    />
  </View>
);
  }
);

EditChecklistContent.displayName = "EditChecklistContent";
export default EditChecklistContent;