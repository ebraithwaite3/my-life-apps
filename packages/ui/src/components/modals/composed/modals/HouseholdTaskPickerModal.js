import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useData } from "@my-apps/contexts";

const SORT_OPTIONS = [
  { id: "category", label: "By Category" },
  { id: "alpha", label: "A–Z" },
  { id: "date", label: "Date Added" },
];

/**
 * Admin-only picker modal for adding household tasks to a checklist.
 *
 * Props:
 *   visible    {boolean}
 *   tasks      {Array}    - householdTasks from user doc
 *   categories {Array}    - householdTaskCategories from user doc
 *   onClose    {function}
 *   onConfirm  {function(selectedTasks: Array)} - called with array of selected task objects
 */
const HouseholdTaskPickerModal = ({ visible, onClose, onConfirm }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { user } = useData();
  const tasks = user?.householdTasks || [];
  const categories = user?.householdTaskCategories || [];
  const [sort, setSort] = useState("category");
  const [selected, setSelected] = useState([]);

  const toggleTask = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const orderedSelected = tasks.filter((t) => selected.includes(t.id));
    onConfirm(orderedSelected);
    setSelected([]);
    onClose();
  };

  const handleClose = () => {
    setSelected([]);
    onClose();
  };

  const sortedTasks = useMemo(() => {
    if (sort === "alpha") {
      return [...tasks].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sort === "date") {
      return [...tasks].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    }
    return tasks;
  }, [tasks, sort]);

  const grouped = useMemo(() => {
    if (sort !== "category") return null;
    const groups = {};
    categories.forEach((cat) => {
      const catTasks = sortedTasks.filter((t) => t.category === cat);
      if (catTasks.length > 0) groups[cat] = catTasks;
    });
    const uncategorized = sortedTasks.filter(
      (t) => !t.category || !categories.includes(t.category)
    );
    if (uncategorized.length > 0) groups["__uncategorized__"] = uncategorized;
    return groups;
  }, [sort, sortedTasks, categories]);

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: theme.background,
      borderTopLeftRadius: getBorderRadius.xl || 24,
      borderTopRightRadius: getBorderRadius.xl || 24,
      maxHeight: "80%",
      flex: 1,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
      marginTop: getSpacing.sm,
      marginBottom: getSpacing.xs,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      flex: 1,
      fontSize: getTypography.h2?.fontSize || 18,
      fontWeight: "700",
      color: theme.text.primary,
    },
    closeButton: {
      padding: getSpacing.xs,
    },
    sortRow: {
      flexDirection: "row",
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.sm,
      gap: getSpacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sortChip: {
      paddingVertical: 4,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.full,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    sortChipActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + "15",
    },
    sortChipText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    sortChipTextActive: {
      color: theme.primary,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: getSpacing.lg,
      paddingBottom: getSpacing.xl,
    },
    categoryHeader: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "700",
      color: theme.text.secondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: getSpacing.lg,
      marginBottom: getSpacing.xs,
    },
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getSpacing.sm,
      gap: getSpacing.md,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: getBorderRadius.sm || 6,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    taskName: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      fontWeight: "500",
    },
    separator: {
      height: 1,
      backgroundColor: theme.border,
    },
    footer: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    confirmButton: {
      backgroundColor: theme.primary,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.md,
      alignItems: "center",
    },
    confirmButtonDisabled: {
      opacity: 0.4,
    },
    confirmButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: "center",
      paddingVertical: getSpacing.xl,
    },
  });

  const renderTaskRow = (task) => {
    const isSelected = selected.includes(task.id);
    return (
      <View key={task.id}>
        <TouchableOpacity
          style={styles.taskRow}
          onPress={() => toggleTask(task.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.taskName}>{task.name}</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sheet}
          onPress={() => {}}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Library</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={22} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.sortRow}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.sortChip, sort === opt.id && styles.sortChipActive]}
                onPress={() => setSort(opt.id)}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    sort === opt.id && styles.sortChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {tasks.length === 0 ? (
              <Text style={styles.emptyText}>No tasks in library yet.</Text>
            ) : sort === "category" && grouped ? (
              Object.entries(grouped).map(([cat, catTasks]) => (
                <View key={cat}>
                  <Text style={styles.categoryHeader}>
                    {cat === "__uncategorized__" ? "Uncategorized" : cat}
                  </Text>
                  {catTasks.map(renderTaskRow)}
                </View>
              ))
            ) : (
              sortedTasks.map(renderTaskRow)
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                selected.length === 0 && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={selected.length === 0}
            >
              <Text style={styles.confirmButtonText}>
                {selected.length === 0
                  ? "Select tasks to add"
                  : `Add ${selected.length} task${selected.length !== 1 ? "s" : ""}`}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default HouseholdTaskPickerModal;
