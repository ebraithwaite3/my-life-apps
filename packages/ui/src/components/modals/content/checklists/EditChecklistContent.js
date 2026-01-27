import React, {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import ReminderSelector from "../../../forms/ReminderSelector";
import FilterChips from "../../../general/FilterChips";
import ChecklistEditingRow from "../../../checklists/ChecklistEditingRow";
import ChecklistItemConfigModal from "../../composed/modals/ChecklistItemConfigModal";
import { useAutoScrollOnFocus } from "@my-apps/hooks";
import { getChecklistStats } from "@my-apps/utils";
import { useChecklistState } from "@my-apps/hooks";
import { KeyboardActionBar } from "../../../keyboard";
import { useChecklistItems } from "@my-apps/hooks";
import { useChecklistFormState } from "@my-apps/hooks";
import { useChecklistSave } from "@my-apps/hooks";
import CustomReminderModal from "../../composed/modals/CustomReminderModal";

// ✅ Smart item comparison - ignores structure differences, only compares what matters
const areItemsEqual = (items1, items2) => {
  if (items1?.length !== items2?.length) return false;
  return items1.every((item1, index) => {
    const item2 = items2[index];
    if (!item2) return false;

    // Check core properties only (ignores itemType, requiredForScreenTime, etc.)
    const coreChanged =
      item1.id !== item2.id ||
      item1.name !== item2.name ||
      !!item1.completed !== !!item2.completed;

    if (coreChanged) return false;

    // Deep check sub-items
    const sub1 = item1.subItems || [];
    const sub2 = item2.subItems || [];
    if (sub1.length !== sub2.length) return false;
    if (sub1.length > 0) return areItemsEqual(sub1, sub2);

    return true;
  });
};

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
      reminder = null,
      reminderLoading = false,
      updateReminder,
      deleteReminder,
      onChangesDetected,
      initialChecklist,
      initialReminder,
    },
    ref
  ) => {
    const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [errors, setErrors] = useState([]);

    const isInitialMount = useRef(true);

    const isEditing = checklist !== null;
    const hasEventTime = eventStartTime != null;

    const isAlreadyTemplate =
      checklist?.id && templates.some((t) => t.id === checklist.id);

    const formState = useChecklistFormState(
      checklist,
      prefilledTitle,
      isTemplate,
      isEditing
    );
    const itemsHook = useChecklistItems(
      formState.getInitialItems(),
      isTemplate
    );

    // ✅ Simple access to current reminder display
    const currentReminderDisplay = hasEventTime
      ? formState.reminderMinutes
      : formState.reminderTime;
    console.log("Current Reminder Display: ", currentReminderDisplay);
    console.log("Initial Reminder: ", initialReminder);
    console.log(
      "Has Event Time: ",
      hasEventTime,
      "Form State Reminder Minutes: ",
      formState.reminderMinutes,
      "Form State Reminder Time: ",
      formState.reminderTime
    );

    const { handleSave } = useChecklistSave({
      checklistName: formState.checklistName,
      items: itemsHook.items,
      reminderMinutes: formState.reminderMinutes,
      reminderTime: formState.reminderTime,
      notifyAdminOnCompletion: formState.notifyAdminOnCompletion,
      defaultNotifyAdmin: formState.defaultNotifyAdmin,
      defaultReminderTime: formState.defaultReminderTime,
      defaultIsRecurring: formState.defaultIsRecurring, // ✅ ADD
      defaultRecurringConfig: formState.defaultRecurringConfig, // ✅ ADD
      isEditing,
      isTemplate,
      hasEventTime,
      checklist,
      onSave,
      saveAsTemplateEnabled: formState.saveAsTemplateEnabled,
      eventStartTime,
    });

    const { scrollViewRef, registerInput, scrollToInput, focusInput } =
      useAutoScrollOnFocus({ offset: 100 });

    const currentChecklist = {
      name: formState.checklistName,
      items: itemsHook.items,
      notifyAdmin: formState.notifyAdminOnCompletion,
    };

    const { wasJustCompleted } = useChecklistState(currentChecklist);

    // ✅ Initialize form state from Firestore reminder ONCE when checklist loads
    useEffect(() => {
      if (reminder && checklist?.id) {
        if (hasEventTime) {
          formState.setReminderMinutes(reminder);
        } else {
          formState.setReminderTime(reminder);
        }
      }
    }, [checklist?.id]); // Only run when checklist changes

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

    useEffect(() => {
      if (wasJustCompleted) {
        console.log("🎉 Checklist just completed!");
        const stats = getChecklistStats(currentChecklist.items);
        console.log("📊 Checklist stats:", stats);
      }
    }, [wasJustCompleted]);

    useEffect(() => {
      if (!itemsHook.pendingScrollId) return;

      const timeout = setTimeout(() => {
        scrollToInput(itemsHook.pendingScrollId);
        itemsHook.setPendingScrollId(null);
      }, 250);

      return () => clearTimeout(timeout);
    }, [itemsHook.items, itemsHook.pendingScrollId, scrollToInput]);

    // ✅ Change detection with smart comparison
    useEffect(() => {
      // Skip the very first run to avoid false positives during initialization
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      if (!onChangesDetected || !initialChecklist) return;

      const currentState = {
        name: formState.checklistName,
        items: itemsHook.items,
        reminderMinutes: formState.reminderMinutes,
        reminderTime: formState.reminderTime,
        notifyAdmin: formState.notifyAdminOnCompletion,
      };

      const nameChanged = currentState.name !== initialChecklist.name;

      // ✅ Use smart deep compare instead of JSON.stringify
      const itemsChanged = !areItemsEqual(
        currentState.items,
        initialChecklist.items
      );

      const currentReminderValue = hasEventTime
        ? currentState.reminderMinutes
        : currentState.reminderTime;
      const reminderChanged =
        JSON.stringify(currentReminderValue) !==
        JSON.stringify(initialReminder);

      console.log("🔍 CHANGE DETECTION:", {
        currentReminderValue,
        initialReminder,
        reminderChanged,
        currentJSON: JSON.stringify(currentReminderValue),
        initialJSON: JSON.stringify(initialReminder),
      });

      const notifyChanged =
        (currentState.notifyAdmin || false) !==
        (initialChecklist.notifyAdmin || false);

      const hasChanges =
        nameChanged || itemsChanged || reminderChanged || notifyChanged;

      onChangesDetected(hasChanges);
    }, [
      formState.checklistName,
      itemsHook.items,
      formState.reminderMinutes,
      formState.reminderTime,
      formState.notifyAdminOnCompletion,
      initialChecklist,
      initialReminder,
      hasEventTime,
    ]);

    const handleToggleConfig = useCallback(
      (itemId) => {
        const item = itemsHook.items.find((i) => i.id === itemId);
        formState.setSelectedItemForConfig(item);
        formState.setShowConfigModal(true);
      },
      [itemsHook.items]
    );

    const handleSaveConfig = useCallback(
      (updatedItem) => {
        itemsHook.updateItemConfig(updatedItem);
        formState.setShowConfigModal(false);
        formState.setSelectedItemForConfig(null);
      },
      [itemsHook.updateItemConfig]
    );

    const handleCancelConfig = useCallback(() => {
      formState.setShowConfigModal(false);
      formState.setSelectedItemForConfig(null);
    }, []);

    useImperativeHandle(ref, () => ({
      save: handleSave,
      getCurrentState: () => ({
        name: formState.checklistName,
        items: itemsHook.items,
        reminderMinutes: formState.reminderMinutes,
        reminderTime: formState.reminderTime,
        notifyAdmin: formState.notifyAdminOnCompletion,
        defaultNotifyAdmin: formState.defaultNotifyAdmin,
        defaultReminderTime: formState.defaultReminderTime,
        defaultIsRecurring: formState.defaultIsRecurring, // ✅ ADD
        defaultRecurringConfig: formState.defaultRecurringConfig, // ✅ ADD
      }),
    }));

    const buildFilters = () => {
      const filters = [];

      if (isUserAdmin) {
        filters.push({
          label: isTemplate ? "Default: Notify Admin" : "Notify Me",
          active: isTemplate
            ? formState.defaultNotifyAdmin
            : formState.notifyAdminOnCompletion,
          onPress: () =>
            isTemplate
              ? formState.setDefaultNotifyAdmin(!formState.defaultNotifyAdmin)
              : formState.setNotifyAdminOnCompletion(
                  !formState.notifyAdminOnCompletion
                ),
        });
      }

      if (!isTemplate && !isAlreadyTemplate) {
        filters.push({
          label: "Save as Template",
          icon: "bookmark-outline",
          active: formState.saveAsTemplateEnabled,
          onPress: () =>
            formState.setSaveAsTemplateEnabled(
              !formState.saveAsTemplateEnabled
            ),
        });
      }

      return filters.length > 0 ? filters : undefined;
    };

    const filterChips = buildFilters();

    const focusedItemInfo = itemsHook.getFocusedItemInfo();
    const canAddSubItem =
      focusedItemInfo &&
      !focusedItemInfo.isSubItem &&
      focusedItemInfo.item.name.trim();

    const styles = StyleSheet.create({
      container: {
        flex: 1,
        margin: 0,
        padding: 0,
      },
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
    });

    return (
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContainer,
            keyboardVisible && { paddingBottom: 55 },
          ]}
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
            value={formState.checklistName}
            onChangeText={formState.setChecklistName}
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

          {!keyboardVisible &&
            itemsHook.items.some((item) => item.name.trim()) && (
              <TouchableOpacity
                onPress={() => itemsHook.addItem(focusInput)}
                style={[styles.addButton, { marginBottom: getSpacing.md }]}
              >
                <Ionicons name="add" size={20} color={theme.primary} />
                <Text style={styles.addButtonText}>Add Item</Text>
              </TouchableOpacity>
            )}

          {itemsHook.items.map((item, parentIndex) => (
            <View key={item.id}>
              <ChecklistEditingRow
                item={item}
                index={parentIndex}
                theme={theme}
                getSpacing={getSpacing}
                getTypography={getTypography}
                getBorderRadius={getBorderRadius}
                isUserAdmin={isUserAdmin}
                onUpdateItem={(id, name) =>
                  itemsHook.updateItem(id, name, false)
                }
                onRemoveItem={(id) => itemsHook.removeItem(id, false)}
                onToggleConfig={handleToggleConfig}
                onFocus={(id) => itemsHook.handleFocus(id, scrollToInput)}
                onBlur={(id) => itemsHook.handleBlur(id, false)}
                onSubmitEditing={(id) =>
                  itemsHook.handleSubmitEditing(id, false, null, focusInput)
                }
                registerInput={registerInput}
              />

              {item.subItems &&
                item.subItems.map((subItem, subIndex) => (
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
                    onUpdateItem={(id, name) =>
                      itemsHook.updateItem(id, name, true, item.id)
                    }
                    onRemoveItem={(id) =>
                      itemsHook.removeItem(id, true, item.id)
                    }
                    onToggleConfig={() => {}}
                    onFocus={(id) => itemsHook.handleFocus(id, scrollToInput)}
                    onBlur={(id) => itemsHook.handleBlur(id, true, item.id)}
                    onSubmitEditing={(id) =>
                      itemsHook.handleSubmitEditing(
                        id,
                        true,
                        item.id,
                        focusInput
                      )
                    }
                    registerInput={registerInput}
                  />
                ))}
            </View>
          ))}

          {isTemplate && addReminder && (
            <View style={{ marginTop: getSpacing.lg }}>
              <Text style={styles.sectionHeader}>Default Reminder Time</Text>
              <TouchableOpacity
                style={styles.templateTimeRow}
                onPress={() => formState.setShowReminderPicker(true)}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={theme.text.secondary}
                    style={{ marginRight: getSpacing.sm }}
                  />
                  <Text style={styles.templateTimeText}>
                    {formState.defaultReminderTime
                      ? formState.formatTemplateTime(
                          formState.defaultReminderTime
                        ) + (formState.defaultIsRecurring ? " (Recurring)" : "")
                      : "Set default time"}
                  </Text>
                </View>
                {formState.defaultReminderTime && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      formState.setDefaultReminderTime(null);
                      formState.setDefaultIsRecurring(false);
                      formState.setDefaultRecurringConfig(null);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={theme.error}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              <Text style={styles.templateHint}>
                Default time for reminders when applying this template
              </Text>
            </View>
          )}
          {addReminder && !isTemplate && (
            <>
              {reminderLoading ? (
                <View style={{ padding: getSpacing.lg, alignItems: "center" }}>
                  <Text style={{ color: theme.text.tertiary }}>
                    Loading reminder...
                  </Text>
                </View>
              ) : (
                <ReminderSelector
                  reminder={currentReminderDisplay}
                  onReminderChange={(value) => {
                    if (hasEventTime) {
                      formState.setReminderMinutes(value);
                    } else {
                      formState.setReminderTime(value);
                    }
                  }}
                  eventStartDate={eventStartTime || new Date()}
                  isAllDay={!hasEventTime}
                />
              )}
            </>
          )}
        </ScrollView>

        <KeyboardActionBar
          visible={keyboardVisible}
          onWillDismiss={() => setKeyboardVisible(false)}
          leftButton={
            canAddSubItem
              ? {
                  text: "Sub-item",
                  icon: "add-circle-outline",
                  onPress: () =>
                    itemsHook.addSubItem(itemsHook.focusedItemId, focusInput),
                }
              : undefined
          }
        />

        {addReminder && isTemplate && (
          <CustomReminderModal
            visible={formState.showReminderPicker}
            onClose={() => formState.setShowReminderPicker(false)}
            hideDate={true}
            reminder={
              formState.defaultReminderTime
                ? {
                    scheduledFor: (() => {
                      const [hours, minutes] =
                        formState.defaultReminderTime.split(":");
                      const date = new Date();
                      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                      return date.toISOString();
                    })(),
                    isRecurring: formState.defaultIsRecurring,
                    recurringConfig: formState.defaultRecurringConfig,
                  }
                : null
            }
            eventStartDate={new Date()}
            onConfirm={(reminderData) => {
              // Extract HH:mm from the ISO timestamp
              const date = new Date(reminderData.scheduledFor);
              const hours = date.getHours().toString().padStart(2, "0");
              const minutes = date.getMinutes().toString().padStart(2, "0");
              const timeString = `${hours}:${minutes}`;

              formState.setDefaultReminderTime(timeString);
              formState.setDefaultIsRecurring(
                reminderData.isRecurring || false
              );

              // ✅ SANITIZE: Only store config, not runtime state
              if (reminderData.isRecurring && reminderData.recurringConfig) {
                formState.setDefaultRecurringConfig({
                  intervalSeconds: reminderData.recurringConfig.intervalSeconds,
                  totalOccurrences:
                    reminderData.recurringConfig.totalOccurrences,
                  completedCancelsRecurring:
                    reminderData.recurringConfig.completedCancelsRecurring,
                  // ❌ DON'T store: currentOccurrence, nextScheduledFor, lastSentAt
                });
              } else {
                formState.setDefaultRecurringConfig(null);
              }

              formState.setShowReminderPicker(false);
            }}
          />
        )}

        <ChecklistItemConfigModal
          visible={formState.showConfigModal}
          item={formState.selectedItemForConfig}
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
