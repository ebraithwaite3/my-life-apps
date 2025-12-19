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
import DoneButton from "../../../buttons/DoneButton";
import ReminderSelector from "../../../forms/ReminderSelector";
import TimePickerModal from "../../composed/modals/TimePickerModal";
import FilterChips from "../../../general/FilterChips";
import { useAutoScrollOnFocus } from "@my-apps/hooks";
import { canSaveAsTemplate, getChecklistStats } from "@my-apps/utils";
import { useChecklistState } from "@my-apps/hooks";

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
    const [notifyAdminOnCompletion, setNotifyAdminOnCompletion] =
      useState(false);

    // Template defaults
    const [defaultNotifyAdmin, setDefaultNotifyAdmin] = useState(false);
    const [defaultReminderTime, setDefaultReminderTime] = useState(null);

    // Save as Template toggle state
    const [saveAsTemplateEnabled, setSaveAsTemplateEnabled] = useState(false);

    const uuidv4 = () => Crypto.randomUUID();

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
        const stats = getChecklistStats(currentChecklist);
        console.log("📊 Checklist stats:", stats);
        // TODO: Add celebration animation, toast, confetti, etc.
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
            requiredForScreenTime: item.requiredForScreenTime ?? false,
          })) || [
            {
              id: uuidv4(),
              name: "",
              completed: false,
              requiredForScreenTime: false,
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
            requiredForScreenTime: false,
          },
        ]);
      }

      setErrors([]);
      setSaveAsTemplateEnabled(false); // Reset toggle on new checklist
    }, [checklist, isEditing, isTemplate, prefilledTitle]);

    /* ---------------- Item handlers ---------------- */

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
      const id = uuidv4();
      setItems((prev) => [
        { id, name: "", completed: false, requiredForScreenTime: false },
        ...prev,
      ]);

      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        focusInput(id);
      }, 100);
    }, [focusInput]);

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
        const index = items.findIndex((i) => i.id === currentId);
        const item = items[index];

        if (!item.name.trim()) {
          const next = items[index + 1];
          if (next) {
            focusInput(next.id);
          } else {
            addItem();
          }
          return;
        }

        if (index === 0) {
          addItem();
        } else {
          const next = items[index + 1];
          if (next) {
            focusInput(next.id);
          } else {
            addItem();
          }
        }
      },
      [items, addItem, focusInput]
    );

    const handleEllipsisPress = useCallback(
      (itemId) => {
        toggleScreenTimeRequirement(itemId);
      },
      [toggleScreenTimeRequirement]
    );

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
      return errs.length === 0;
    };

    const handleSave = useCallback(() => {
      // Regular validation (name + items)
      if (!validateForm()) return;

      // Additional validation ONLY if "Save as Template" is enabled
      if (saveAsTemplateEnabled) {
        const validation = canSaveAsTemplate(currentChecklist);
        if (!validation.valid) {
          Alert.alert(
            "Cannot Save as Template",
            validation.errors.join("\n") +
              "\n\nPlease fix these issues before saving with 'Save as Template' enabled."
          );
          return;
        }
      }

      const validItems = items
        .filter((i) => i.name.trim())
        .map((item) => ({
          id: item.id,
          name: item.name.trim(),
          completed: isTemplate ? undefined : item.completed ?? false,
          ...(item.requiredForScreenTime && {
            requiredForScreenTime: true,
          }),
        }));

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
            newChecklist.reminderMinutes = reminderMinutes;
          }
        } else if (!hasEventTime && reminderTime) {
          newChecklist.reminderTime = reminderTime;
        }
      }

      console.log("✅ EditChecklistContent - newChecklist:", newChecklist);

      // Pass the toggle state to parent
      onSave?.(newChecklist, saveAsTemplateEnabled);
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
    ]);

    useImperativeHandle(ref, () => ({ save: handleSave }));

    /* ---------------- Build filter chips ---------------- */
    const buildFilters = () => {
      const filters = [];

      // Admin notification filter (always show if admin)
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

      // Save as Template - ALWAYS clickable, just a toggle
      // Validation happens when user hits Create/Update
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

    /* ---------------- Add button visibility ---------------- */
    const hasEmptyInput = items.some((item) => !item.name.trim());
    const showAddButton = !hasEmptyInput;

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
        width: 30,
        fontSize: getTypography.body.fontSize,
        color: theme.text.secondary,
      },

      itemInput: {
        flex: 1,
        fontSize: getTypography.body.fontSize,
        color: theme.text.primary,
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

    /* ---------------- Render ---------------- */

    return (
      <View style={styles.container}>
        {keyboardVisible && (
          <DoneButton
            onPress={Keyboard.dismiss}
            theme={theme}
            getSpacing={getSpacing}
            getTypography={getTypography}
          />
        )}

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

            {/* Filter Chips - Admin notification + Save as Template */}
            <FilterChips
              filters={filterChips}
              marginTop={-20}
              chipMarginBottom={4}
            />

            <Text style={styles.sectionHeader}>Items</Text>

            {items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemNumber}>{index + 1}.</Text>

                <TextInput
                  ref={(r) => registerInput(item.id, r)}
                  style={styles.itemInput}
                  placeholder="Enter checklist item..."
                  placeholderTextColor={theme.text.tertiary}
                  value={item.name}
                  onChangeText={(t) => updateItem(item.id, t)}
                  onFocus={() => {
                    scrollToInput(item.id);
                    if (index === items.length - 1) {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 150);
                    }
                  }}
                  onBlur={() => handleBlur(item.id)}
                  onSubmitEditing={() => handleSubmitEditing(item.id)}
                  returnKeyType="next"
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
                          item.requiredForScreenTime &&
                            styles.screenTimeIconActive,
                        ]}
                      >
                        <Ionicons
                          name={
                            item.requiredForScreenTime
                              ? "phone-portrait"
                              : "phone-portrait-outline"
                          }
                          size={20}
                          color={
                            item.requiredForScreenTime
                              ? theme.primary
                              : theme.text.secondary
                          }
                        />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            ))}

            {showAddButton && (
              <TouchableOpacity onPress={addItem} style={styles.addButton}>
                <Ionicons name="add" size={20} color={theme.primary} />
                <Text style={styles.addButtonText}>Add Item</Text>
              </TouchableOpacity>
            )}

            {/* TEMPLATE MODE: Default Reminder Time */}
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

            {/* REGULAR MODE: Event Reminder */}
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

          {/* Template Time Picker - Direct time selection */}
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
      </View>
    );
  }
);

EditChecklistContent.displayName = "EditChecklistContent";
export default EditChecklistContent;