import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@my-apps/contexts";

/**
 * Displays the current spelling word.
 * Only renders in Parent mode — Solo mode handles its own word display
 * as part of the submission result flow.
 *
 * Props:
 *   word  {string}           - The word to display
 *   mode  {"solo"|"parent"}  - Current spelling mode
 */
const SpellingWordDisplay = ({ word, mode }) => {
  const { theme, getSpacing, getTypography } = useTheme();

  if (mode !== "parent" || !word) return null;

  const styles = StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: getSpacing.xl,
    },
    word: {
      fontSize: 40,
      fontWeight: "700",
      color: theme.text.primary,
      textAlign: "center",
      letterSpacing: 1,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.word}>{word}</Text>
    </View>
  );
};

export default SpellingWordDisplay;
