import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import useHouseholdTasks from "../../hooks/useHouseholdTasks";
import HouseholdTaskEditorModal from "./HouseholdTaskEditorModal";
import { CustomOrderModal, PageHeader } from "@my-apps/ui";

/**
 * Full-page household tasks library management view.
 * Rendered inside PreferencesScreen via currentView === 'householdTasks'.
 *
 * Props:
 *   onClose {function} - Navigate back to preferences
 */
const HouseholdTasksManagementView = ({ onClose }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { tasks, categories, reorderCategories } = useHouseholdTasks();

  const [showEditor, setShowEditor] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showReorderCategories, setShowReorderCategories] = useState(false);

  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = tasks.filter((t) => t.category === cat);
    return acc;
  }, {});
  const uncategorized = tasks.filter(
    (t) => !t.category || !categories.includes(t.category)
  );

  const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.background },
    scrollContent: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
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
    taskCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getSpacing.sm,
      gap: getSpacing.md,
    },
    taskIcon: {
      width: 32,
      height: 32,
      borderRadius: getBorderRadius.md,
      backgroundColor: theme.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    taskName: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
    },
    separator: {
      height: 1,
      backgroundColor: theme.border,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: getSpacing.xl * 2,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: "center",
      marginTop: getSpacing.md,
    },
  });

  const renderTaskRow = (task) => (
    <View key={task.id}>
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => {
          setSelectedTask(task);
          setShowEditor(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.taskIcon}>
          <Ionicons name="checkmark-circle-outline" size={18} color={theme.primary} />
        </View>
        <Text style={styles.taskName}>{task.name}</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.text.secondary} />
      </TouchableOpacity>
      <View style={styles.separator} />
    </View>
  );

  return (
    <View style={styles.flex}>
      <PageHeader
        title="Task Library"
        showBackButton
        onBackPress={onClose}
        icons={[
          ...(categories.length > 1 ? [{ icon: "reorder-three-outline", action: () => setShowReorderCategories(true) }] : []),
          { icon: "add", action: () => { setSelectedTask(null); setShowEditor(true); } },
        ]}
      />

      {tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="library-outline" size={48} color={theme.text.secondary} />
          <Text style={styles.emptyText}>
            No tasks yet.{"\n"}Tap Add Task to build your library.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {categories.map((cat) =>
            grouped[cat]?.length > 0 ? (
              <View key={cat}>
                <Text style={styles.categoryHeader}>{cat}</Text>
                {grouped[cat].map(renderTaskRow)}
              </View>
            ) : null
          )}
          {uncategorized.length > 0 && (
            <View>
              {categories.length > 0 && (
                <Text style={styles.categoryHeader}>Uncategorized</Text>
              )}
              {uncategorized.map(renderTaskRow)}
            </View>
          )}
        </ScrollView>
      )}

      <HouseholdTaskEditorModal
        visible={showEditor}
        task={selectedTask}
        onClose={() => {
          setShowEditor(false);
          setSelectedTask(null);
        }}
      />

      <CustomOrderModal
        visible={showReorderCategories}
        title="Reorder Categories"
        items={categories.map((cat) => ({ name: cat }))}
        keyExtractor={(item) => item.name}
        getItemName={(item) => item.name}
        onSave={(orderedItems) => {
          reorderCategories(orderedItems.map((item) => item.name));
          setShowReorderCategories(false);
        }}
        onClose={() => setShowReorderCategories(false)}
      />
    </View>
  );
};

export default HouseholdTasksManagementView;
