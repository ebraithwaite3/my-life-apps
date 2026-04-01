import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { ModalWrapper, ModalHeader } from "@my-apps/ui";
import useHouseholdTasks from "../../hooks/useHouseholdTasks";

/**
 * Admin-only modal for creating or editing a household task.
 *
 * Props:
 *   visible  {boolean}
 *   task     {object|null}  - null = create mode
 *   onClose  {function}
 */
const HouseholdTaskEditorModal = ({ visible, task, onClose }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { categories, saveTask, deleteTask, saveCategory } = useHouseholdTasks();

  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(task?.name || "");
      setSelectedCategory(task?.category || null);
      setNewCategoryInput("");
      setShowNewCategoryInput(false);
    }
  }, [visible, task?.id]);

  const handleAddNewCategory = async () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    await saveCategory(trimmed);
    setSelectedCategory(trimmed);
    setNewCategoryInput("");
    setShowNewCategoryInput(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter a task name.");
      return;
    }
    try {
      await saveTask({
        id: task?.id,
        name: name.trim(),
        category: selectedCategory || null,
        createdAt: task?.createdAt,
      });
      onClose();
    } catch (e) {
      console.error("Failed to save task:", e);
      Alert.alert("Save Failed", "Could not save the task.");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Task",
      `Delete "${name}" from the library? This won't affect existing checklists.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteTask(task.id);
            onClose();
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    overlay: {
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      width: "100%",
      flex: 1,
      overflow: "hidden",
    },
    scrollContent: {
      paddingHorizontal: getSpacing.lg,
      paddingBottom: getSpacing.xl,
    },
    sectionHeader: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "700",
      color: theme.text.secondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: getSpacing.lg,
      marginBottom: getSpacing.xs,
    },
    nameInput: {
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      backgroundColor: theme.surface,
      marginTop: getSpacing.md,
    },
    categoriesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: getSpacing.xs,
      marginTop: getSpacing.sm,
    },
    categoryChip: {
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.full,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    categoryChipSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + "15",
    },
    categoryChipText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    categoryChipTextSelected: {
      color: theme.primary,
    },
    newCategoryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.sm,
      marginTop: getSpacing.sm,
    },
    newCategoryInput: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.md,
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.surface,
    },
    addCategoryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
      marginTop: getSpacing.sm,
    },
    addCategoryText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.primary,
    },
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: getSpacing.xs,
      marginTop: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderRadius: getBorderRadius.md,
      borderWidth: 1.5,
      borderColor: theme.error,
    },
    deleteButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.error,
    },
  });

  return (
    <ModalWrapper visible={visible} onClose={onClose}>
      <View style={styles.overlay} pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%", height: "80%" }}
        >
          <View style={styles.container}>
            <ModalHeader
              title={task?.id ? "Edit Task" : "New Task"}
              onCancel={onClose}
              cancelText="Cancel"
              onDone={handleSave}
              doneText={task?.id ? "Update" : "Create"}
            />

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sectionHeader}>Task Name</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Vacuum living room"
                placeholderTextColor={theme.text.tertiary}
                autoCapitalize="sentences"
                autoCorrect={false}
              />

              <Text style={styles.sectionHeader}>Category</Text>
              <View style={styles.categoriesRow}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat && styles.categoryChipSelected,
                    ]}
                    onPress={() =>
                      setSelectedCategory(selectedCategory === cat ? null : cat)
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === cat && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {showNewCategoryInput ? (
                <View style={styles.newCategoryRow}>
                  <TextInput
                    style={styles.newCategoryInput}
                    value={newCategoryInput}
                    onChangeText={setNewCategoryInput}
                    placeholder="Category name"
                    placeholderTextColor={theme.text.tertiary}
                    autoCapitalize="words"
                    autoFocus
                    onSubmitEditing={handleAddNewCategory}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={handleAddNewCategory}>
                    <Ionicons name="checkmark-circle" size={28} color={theme.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setShowNewCategoryInput(false);
                      setNewCategoryInput("");
                    }}
                  >
                    <Ionicons name="close-circle" size={28} color={theme.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addCategoryButton}
                  onPress={() => setShowNewCategoryInput(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                  <Text style={styles.addCategoryText}>New Category</Text>
                </TouchableOpacity>
              )}

              {task?.id && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.error} />
                  <Text style={styles.deleteButtonText}>Delete Task</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModalWrapper>
  );
};

export default HouseholdTaskEditorModal;
