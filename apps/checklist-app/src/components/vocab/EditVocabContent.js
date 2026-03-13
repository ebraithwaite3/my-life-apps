import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { KeyboardActionBar } from "@my-apps/ui";
import VocabItemRow from "./VocabItemRow";

const uuidv4 = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

/**
 * Edit tab content for vocab lists.
 * Shows a list name input and a list of VocabItemRow entries.
 *
 * Exposes an imperative `save()` method via ref so the parent modal header
 * can trigger a save without needing to manage state directly.
 */
const EditVocabContent = forwardRef(({ checklist, onSave, onChangesDetected }, ref) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const [name, setName] = useState(checklist?.name || "");
  const [items, setItems] = useState(checklist?.items || []);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Word input refs for focus chain: definition → next word
  const wordRefs = useRef({});

  // Expose save() imperatively so VocabTestModal header can trigger it
  useImperativeHandle(ref, () => ({
    save: () => {
      onSave({ ...checklist, name: name.trim(), items });
    },
  }));

  // Keyboard listeners
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Detect changes vs original checklist
  useEffect(() => {
    const nameChanged = name !== (checklist?.name || "");
    const itemsChanged =
      JSON.stringify(items) !== JSON.stringify(checklist?.items || []);
    onChangesDetected?.(nameChanged || itemsChanged);
  }, [name, items]);

  // Sync if checklist prop changes identity (e.g. after a save in create mode)
  useEffect(() => {
    setName(checklist?.name || "");
    setItems(checklist?.items || []);
  }, [checklist?.id]);

  const handleAddWord = () => {
    setItems((prev) => [
      ...prev,
      { id: uuidv4(), word: "", definition: "", correct: 0, incorrect: 0, skipped: 0 },
    ]);
  };

  const handleChangeItem = (updatedItem) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleDeleteItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const styles = StyleSheet.create({
    flex: { flex: 1 },
    nameContainer: {
      paddingHorizontal: getSpacing.lg,
      paddingTop: getSpacing.md,
      paddingBottom: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    nameLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
      marginBottom: getSpacing.xs,
      textTransform: "uppercase",
      letterSpacing: 0.5,
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
    },
    scrollContent: {
      paddingHorizontal: getSpacing.lg,
      paddingBottom: getSpacing.xl,
    },
    separator: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: getSpacing.xs,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: getSpacing.xs,
      paddingVertical: getSpacing.md,
      marginTop: getSpacing.sm,
    },
    addButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.primary,
    },
    emptyText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
      textAlign: "center",
      paddingVertical: getSpacing.md,
      fontStyle: "italic",
    },
  });

  return (
    <View style={styles.flex}>
      <View style={styles.nameContainer}>
        <Text style={styles.nameLabel}>List Name</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Chapter 5 Vocab"
          placeholderTextColor={theme.text.tertiary}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => {
            const firstItem = items[0];
            if (firstItem) wordRefs.current[firstItem.id]?.focus();
          }}
        />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          keyboardVisible && { paddingBottom: 55 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {items.length === 0 && (
          <Text style={styles.emptyText}>No words yet. Tap Add Word below.</Text>
        )}

        {items.map((item, index) => (
          <View key={item.id}>
            {index > 0 && <View style={styles.separator} />}
            <VocabItemRow
              item={item}
              onChange={handleChangeItem}
              onDelete={() => handleDeleteItem(item.id)}
              wordInputRef={(ref) => { wordRefs.current[item.id] = ref; }}
              onDefinitionSubmit={() => {
                const nextItem = items[index + 1];
                if (nextItem) {
                  wordRefs.current[nextItem.id]?.focus();
                } else {
                  handleAddWord();
                }
              }}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={handleAddWord} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
          <Text style={styles.addButtonText}>Add Word</Text>
        </TouchableOpacity>
      </ScrollView>

      <KeyboardActionBar
        visible={keyboardVisible}
        onWillDismiss={() => setKeyboardVisible(false)}
      />
    </View>
  );
});

export default EditVocabContent;
