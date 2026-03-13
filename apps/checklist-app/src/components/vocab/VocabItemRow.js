import React, { useRef } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";

/**
 * A single vocab item row: Word input + Definition input + Delete button.
 *
 * Props:
 *   item               {object}    - { id, word, definition, ... }
 *   onChange           {function}  - Called with updated item
 *   onDelete           {function}  - Called to remove the item
 *   wordInputRef       {function}  - Callback ref for the word TextInput (for focus chain)
 *   onDefinitionSubmit {function}  - Called when return is pressed on definition
 */
const VocabItemRow = ({ item, onChange, onDelete, wordInputRef, onDefinitionSubmit }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const definitionRef = useRef(null);

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: getSpacing.sm,
      gap: getSpacing.sm,
    },
    fieldsContainer: {
      flex: 1,
      gap: getSpacing.xs,
    },
    input: {
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.surface,
    },
    definitionInput: {
      height: 56,
    },
    deleteButton: {
      marginTop: getSpacing.sm,
      padding: getSpacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.fieldsContainer}>
        <TextInput
          ref={wordInputRef}
          style={styles.input}
          value={item.word}
          onChangeText={(text) => onChange({ ...item, word: text })}
          placeholder="Word"
          placeholderTextColor={theme.text.tertiary}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => definitionRef.current?.focus()}
        />
        <TextInput
          ref={definitionRef}
          style={[styles.input, styles.definitionInput]}
          value={item.definition}
          onChangeText={(text) => onChange({ ...item, definition: text })}
          placeholder="Definition"
          placeholderTextColor={theme.text.tertiary}
          autoCorrect={false}
          autoCapitalize="sentences"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={onDefinitionSubmit}
        />
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close-circle-outline" size={22} color={theme.error} />
      </TouchableOpacity>
    </View>
  );
};

export default VocabItemRow;
