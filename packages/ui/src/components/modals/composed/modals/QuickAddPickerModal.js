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

const SOURCE_QUICK_ADDS = "__quick_adds__";

/**
 * Admin-only picker for the calendar screen.
 * Sources: "Quick Adds" (household task library) + one entry per pinned checklist.
 * Multi-select persists as the user switches between sources.
 *
 * Props:
 *   visible           {boolean}
 *   onClose           {function}
 *   pinnedChecklists  {Array}
 *   onConfirm         {function(Array<{ item, sourceChecklistId?, sourceItemId? }>)}
 */
const QuickAddPickerModal = ({ visible, onClose, onConfirm, pinnedChecklists = [] }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { user } = useData();
  const householdTasks = user?.householdTasks || [];
  const categories = user?.householdTaskCategories || [];

  const [selectedSource, setSelectedSource] = useState(SOURCE_QUICK_ADDS);
  // Map<"sourceId::itemId", { item, sourceChecklistId?, sourceItemId? }>
  const [selections, setSelections] = useState(new Map());

  const sources = useMemo(() => [
    { id: SOURCE_QUICK_ADDS, label: "Quick Adds" },
    ...pinnedChecklists.map((c) => ({ id: c.id, label: c.name })),
  ], [pinnedChecklists]);

  const currentItems = useMemo(() => {
    if (selectedSource === SOURCE_QUICK_ADDS) return householdTasks;
    const checklist = pinnedChecklists.find((c) => c.id === selectedSource);
    if (!checklist) return [];
    return (checklist.items || []).filter((item) => !item.completed);
  }, [selectedSource, householdTasks, pinnedChecklists]);

  const groupedQuickAdds = useMemo(() => {
    if (selectedSource !== SOURCE_QUICK_ADDS) return null;
    const groups = {};
    categories.forEach((cat) => {
      const catTasks = householdTasks.filter((t) => t.category === cat);
      if (catTasks.length > 0) groups[cat] = catTasks;
    });
    const uncategorized = householdTasks.filter(
      (t) => !t.category || !categories.includes(t.category)
    );
    if (uncategorized.length > 0) groups["__uncategorized__"] = uncategorized;
    return groups;
  }, [selectedSource, householdTasks, categories]);

  const getKey = (sourceId, itemId) => `${sourceId}::${itemId}`;

  // Toggle a flat item (household task or pinned item without sub-items)
  const toggleItem = (item) => {
    const key = getKey(selectedSource, item.id);
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        const entry = { item };
        if (selectedSource !== SOURCE_QUICK_ADDS) {
          entry.sourceChecklistId = selectedSource;
          entry.sourceItemId = item.id;
        }
        next.set(key, entry);
      }
      return next;
    });
  };

  // Toggle a group header — selects the parent + all non-completed sub-items as one entry.
  // Deselects any individually selected sub-items of this parent first.
  const toggleGroup = (parent) => {
    const parentKey = getKey(selectedSource, parent.id);
    const nonCompletedSubs = (parent.subItems || []).filter((s) => !s.completed);
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.has(parentKey)) {
        next.delete(parentKey);
      } else {
        // Remove any individually selected sub-items for this parent
        nonCompletedSubs.forEach((sub) => next.delete(getKey(selectedSource, sub.id)));
        next.set(parentKey, {
          item: { ...parent, subItems: nonCompletedSubs },
          sourceChecklistId: selectedSource !== SOURCE_QUICK_ADDS ? selectedSource : undefined,
          sourceItemId: selectedSource !== SOURCE_QUICK_ADDS ? parent.id : undefined,
        });
      }
      return next;
    });
  };

  // Toggle an individual sub-item. Deselects the parent group if it was selected.
  const toggleSubItem = (sub, parent) => {
    const subKey = getKey(selectedSource, sub.id);
    const parentKey = getKey(selectedSource, parent.id);
    setSelections((prev) => {
      const next = new Map(prev);
      next.delete(parentKey); // deselect the whole-group entry if present
      if (next.has(subKey)) {
        next.delete(subKey);
      } else {
        next.set(subKey, {
          item: sub,
          sourceChecklistId: selectedSource !== SOURCE_QUICK_ADDS ? selectedSource : undefined,
          sourceItemId: selectedSource !== SOURCE_QUICK_ADDS ? sub.id : undefined,
        });
      }
      return next;
    });
  };

  const isSelected = (item) => selections.has(getKey(selectedSource, item.id));
  const isGroupSelected = (parent) => selections.has(getKey(selectedSource, parent.id));
  const isSubSelected = (sub) => selections.has(getKey(selectedSource, sub.id));
  const totalSelected = selections.size;

  const handleConfirm = () => {
    onConfirm(Array.from(selections.values()));
    setSelections(new Map());
    setSelectedSource(SOURCE_QUICK_ADDS);
    onClose();
  };

  const handleClose = () => {
    setSelections(new Map());
    setSelectedSource(SOURCE_QUICK_ADDS);
    onClose();
  };

  const styles = useMemo(() => StyleSheet.create({
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
    closeButton: { padding: getSpacing.xs },
    sourceRow: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sourceScrollContent: {
      flexDirection: "row",
      gap: getSpacing.xs,
    },
    sourceChip: {
      paddingVertical: 4,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.full,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    sourceChipActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + "15",
    },
    sourceChipText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    sourceChipTextActive: { color: theme.primary },
    scroll: { flex: 1 },
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
    separator: { height: 1, backgroundColor: theme.border },
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
    confirmButtonDisabled: { opacity: 0.4 },
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
    groupRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getSpacing.sm,
      gap: getSpacing.md,
      backgroundColor: theme.surface,
      marginTop: getSpacing.xs,
      borderRadius: 6,
      paddingHorizontal: getSpacing.xs,
    },
    groupName: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      fontWeight: "700",
    },
    groupHint: {
      fontSize: getTypography.bodySmall?.fontSize || 12,
      color: theme.text.tertiary,
      fontStyle: "italic",
    },
    subItemRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getSpacing.sm,
      gap: getSpacing.md,
      paddingLeft: getSpacing.xl,
    },
    subItemDisabled: {
      opacity: 0.45,
    },
  }), [theme, getSpacing, getTypography, getBorderRadius]);

  const renderItemRow = (item) => {
    const nonCompletedSubs = (item.subItems || []).filter((s) => !s.completed);
    const hasSubItems = nonCompletedSubs.length > 0;

    if (hasSubItems) {
      const groupSel = isGroupSelected(item);
      return (
        <View key={item.id}>
          {/* Group header — tap to add the whole group */}
          <TouchableOpacity style={styles.groupRow} onPress={() => toggleGroup(item)} activeOpacity={0.7}>
            <View style={[styles.checkbox, groupSel && styles.checkboxSelected]}>
              {groupSel && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.groupHint}>+ all</Text>
          </TouchableOpacity>
          {/* Individual sub-items */}
          {nonCompletedSubs.map((sub) => {
            const subSel = isSubSelected(sub);
            const disabledBecauseGroupSelected = groupSel;
            return (
              <TouchableOpacity
                key={sub.id}
                style={[styles.subItemRow, disabledBecauseGroupSelected && styles.subItemDisabled]}
                onPress={() => !disabledBecauseGroupSelected && toggleSubItem(sub, item)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, (subSel || disabledBecauseGroupSelected) && styles.checkboxSelected]}>
                  {(subSel || disabledBecauseGroupSelected) && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.taskName}>{sub.name}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={styles.separator} />
        </View>
      );
    }

    const sel = isSelected(item);
    return (
      <View key={item.id}>
        <TouchableOpacity style={styles.taskRow} onPress={() => toggleItem(item)} activeOpacity={0.7}>
          <View style={[styles.checkbox, sel && styles.checkboxSelected]}>
            {sel && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
          <Text style={styles.taskName}>{item.name}</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Quick Add</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={22} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.sourceRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sourceScrollContent}
            >
              {sources.map((source) => (
                <TouchableOpacity
                  key={source.id}
                  style={[styles.sourceChip, selectedSource === source.id && styles.sourceChipActive]}
                  onPress={() => setSelectedSource(source.id)}
                >
                  <Text style={[styles.sourceChipText, selectedSource === source.id && styles.sourceChipTextActive]}>
                    {source.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {currentItems.length === 0 ? (
              <Text style={styles.emptyText}>
                {selectedSource === SOURCE_QUICK_ADDS ? "No tasks in library yet." : "No incomplete items."}
              </Text>
            ) : selectedSource === SOURCE_QUICK_ADDS && groupedQuickAdds ? (
              Object.entries(groupedQuickAdds).map(([cat, catTasks]) => (
                <View key={cat}>
                  <Text style={styles.categoryHeader}>
                    {cat === "__uncategorized__" ? "Uncategorized" : cat}
                  </Text>
                  {catTasks.map(renderItemRow)}
                </View>
              ))
            ) : (
              currentItems.map(renderItemRow)
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmButton, totalSelected === 0 && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={totalSelected === 0}
            >
              <Text style={styles.confirmButtonText}>
                {totalSelected === 0
                  ? "Select items to add"
                  : `Add ${totalSelected} item${totalSelected !== 1 ? "s" : ""}`}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default QuickAddPickerModal;
