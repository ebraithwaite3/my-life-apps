import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { useTheme, useData } from "@my-apps/contexts";
import { showSuccessToast } from "@my-apps/utils";
import { useIngredients } from "@my-apps/hooks";
import {
  ModalWrapper,
  ModalHeader,
  PillSelectionButton,
  ChecklistContent,
} from "@my-apps/ui";
import AddMealsContent from "./AddMealsContent";
import GroceryItemsContent from "./GroceryItemsContent";
import { STORES } from "./groceryConstants";

/**
 * Modal for "Grocery List" checklists.
 * Tabs: List | Meals | Items
 * Mirrors the usePinnedChecklistModal pattern used by the regular checklist modal.
 *
 * Props:
 *   visible         {boolean}
 *   checklist       {object}
 *   onClose         {function}
 *   onSaveChecklist {function(updatedChecklist)} - Index-based replace, no duplicates
 */
const GroceryListModal = ({
  visible,
  checklist,
  onClose,
  onSaveChecklist,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { user } = useData();
  const isAdmin = user?.admin === true;
  const {
    ingredients,
    ingredientsByCategory,
    loading: ingredientsLoading,
    addIngredient,
    updateIngredient,
  } = useIngredients();

  const [tabMode, setTabMode] = useState("list");
  const [selectedStore, setSelectedStore] = useState(null);
  const [workingChecklist, setWorkingChecklist] = useState(null);
  const [initialChecklist, setInitialChecklist] = useState(null);
  const [updatedItems, setUpdatedItems] = useState([]);
  const [isDirtyList, setIsDirtyList] = useState(false);

  // Init / reset when modal opens
  useEffect(() => {
    if (visible && checklist) {
      setWorkingChecklist(checklist);
      setInitialChecklist(JSON.parse(JSON.stringify(checklist)));
      setUpdatedItems(checklist.items || []);
      setTabMode("list");
      setIsDirtyList(false);
    }
  }, [visible, checklist?.id]);

  // Track unsaved toggle changes in List tab (mirrors isDirtyComplete)
  useEffect(() => {
    if (!initialChecklist) return;
    const hasChanges =
      JSON.stringify(updatedItems) !==
      JSON.stringify(initialChecklist.items || []);
    setIsDirtyList(hasChanges);
  }, [updatedItems, initialChecklist]);

  const hasPendingChanges = isDirtyList;

  const handleClose = () => {
    if (hasPendingChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to close?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setIsDirtyList(false);
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  // List tab: item toggled — local state only (same as regular modal's onItemToggle)
  const handleItemToggle = (newItems) => {
    setUpdatedItems(newItems);
    setWorkingChecklist((prev) => ({ ...prev, items: newItems }));
  };

  // List tab: explicit Update button (mirrors handleUpdateFromCompleteMode)
  const handleSaveList = async () => {
    const updated = {
      ...workingChecklist,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };
    await onSaveChecklist(updated);
    setWorkingChecklist(updated);
    setInitialChecklist(JSON.parse(JSON.stringify(updated)));
    setIsDirtyList(false);
    setTimeout(() => showSuccessToast("Checklist saved", "", 2000, "top"), 100);
  };

  // List tab: sort/clear save (called by ChecklistContent internally)
  const handleSaveListFromContent = async (updatedChecklist) => {
    await onSaveChecklist(updatedChecklist);
    setWorkingChecklist(updatedChecklist);
    setUpdatedItems(updatedChecklist.items || []);
    setInitialChecklist(JSON.parse(JSON.stringify(updatedChecklist)));
    setIsDirtyList(false);
  };

  // Meals/Items tabs: update local state only — Update button handles the write
  const handleUpdateList = (updatedChecklist) => {
    setWorkingChecklist(updatedChecklist);
    setUpdatedItems(updatedChecklist.items || []);
  };

  // Build set of item IDs (both parents and sub-items) that are unavailable at the selected store
  const warningItemIds = useMemo(() => {
    if (!selectedStore || !ingredients.length) return new Set();
    const ingredientMapById = new Map(ingredients.map((i) => [i.id, i]));
    const ids = new Set();

    for (const item of updatedItems) {
      let parentWarning = false;

      if (item.subItems?.length) {
        for (const sub of item.subItems) {
          if (sub.ingredientId) {
            const ing = ingredientMapById.get(sub.ingredientId);
            if (ing?.unavailableAt?.includes(selectedStore)) {
              ids.add(sub.id);
              parentWarning = true;
            }
          }
        }
      } else if (item.ingredientId) {
        const ing = ingredientMapById.get(item.ingredientId);
        if (ing?.unavailableAt?.includes(selectedStore)) {
          ids.add(item.id);
        }
      }

      if (parentWarning) ids.add(item.id);
    }
    return ids;
  }, [selectedStore, updatedItems, ingredients]);

  const getDoneHandler = () => handleSaveList;
  const getDoneDisabled = () => !isDirtyList;

  const styles = StyleSheet.create({
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
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
    pillRow: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      backgroundColor: theme.surface,
    },
    content: {
      flex: 1,
    },
    storeRow: {
      paddingHorizontal: getSpacing.lg,
      paddingBottom: getSpacing.sm,
      backgroundColor: theme.surface,
    },
    storePill: {
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.xs,
      borderRadius: getBorderRadius.full,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: getSpacing.sm,
      backgroundColor: theme.surface,
    },
    storePillSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '15',
    },
    storePillText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      fontWeight: '500',
    },
    storePillTextSelected: {
      color: theme.primary,
      fontWeight: '700',
    },
  });

  if (!workingChecklist) return null;

  return (
    <ModalWrapper visible={visible} onClose={handleClose}>
      <View style={styles.overlay} pointerEvents="box-none">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%", height: "90%" }}
        >
          <View style={styles.container}>
            <ModalHeader
              title={workingChecklist.name || "Grocery List"}
              onCancel={handleClose}
              cancelText={hasPendingChanges ? "Cancel" : "Close"}
              onDone={getDoneHandler()}
              doneText="Update"
              doneDisabled={getDoneDisabled()}
            />

            <View style={styles.pillRow}>
              <PillSelectionButton
                options={[
                  { label: "List", value: "list" },
                  { label: "Meals", value: "meals" },
                  { label: "Items", value: "items" },
                ]}
                selectedValue={tabMode}
                onSelect={setTabMode}
              />
            </View>

            {/* Store filter — only visible on List tab for admins */}
            {tabMode === "list" && isAdmin && (
              <View style={styles.storeRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {STORES.map((store) => {
                    const selected = selectedStore === store;
                    return (
                      <TouchableOpacity
                        key={store}
                        style={[styles.storePill, selected && styles.storePillSelected]}
                        onPress={() => setSelectedStore(selected ? null : store)}
                      >
                        <Text style={[styles.storePillText, selected && styles.storePillTextSelected]}>
                          {store}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.content}>
              {tabMode === "list" && (
                <ChecklistContent
                  checklist={{ ...workingChecklist, items: updatedItems }}
                  onItemToggle={handleItemToggle}
                  onSaveChecklist={handleSaveListFromContent}
                  onCloseParentModal={handleClose}
                  warningItemIds={warningItemIds}
                />
              )}
              {tabMode === "meals" && (
                <AddMealsContent
                  list={{ ...workingChecklist, items: updatedItems }}
                  onUpdateList={handleUpdateList}
                />
              )}
              {tabMode === "items" && (
                <GroceryItemsContent
                  list={{ ...workingChecklist, items: updatedItems }}
                  onUpdateList={handleUpdateList}
                  ingredients={ingredients}
                  ingredientsByCategory={ingredientsByCategory}
                  ingredientsLoading={ingredientsLoading}
                  addIngredient={addIngredient}
                  updateIngredient={updateIngredient}
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModalWrapper>
  );
};

export default GroceryListModal;
