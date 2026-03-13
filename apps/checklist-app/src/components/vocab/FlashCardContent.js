import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { useVocabSession } from "./useVocabSession";
import FlashCard from "./FlashCard";
import FlashCardControls from "./FlashCardControls";
import FlashCardOptions from "./FlashCardOptions";

/**
 * Flash Cards tab — passive review mode. No stats written.
 *
 * Props:
 *   list {object} - Full vocab checklist
 */
const FlashCardContent = ({ list }) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const [shuffleOn, setShuffleOn] = useState(false);
  const [reverseOn, setReverseOn] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const items = list?.items || [];

  const {
    currentWord,
    queueLength,
    currentIndex,
    goBack,
    goForward,
  } = useVocabSession({ items, listMode: "once", shuffled: shuffleOn });

  // Reset flip state when moving to a new card
  useEffect(() => {
    setFlipped(false);
  }, [currentIndex]);

  const handleShuffleToggle = () => {
    setShuffleOn((prev) => !prev);
    setFlipped(false);
  };

  const handleReverseToggle = () => {
    setReverseOn((prev) => !prev);
    setFlipped(false);
  };

  const handleFlip = () => {
    setFlipped((prev) => !prev);
  };

  const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: {
      flex: 1,
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: getSpacing.md,
    },
    counter: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: getSpacing.xl,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: "center",
      marginTop: getSpacing.md,
    },
  });

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="card-outline" size={48} color={theme.text.tertiary} />
        <Text style={styles.emptyText}>
          No words yet.{"\n"}Add words using the Edit tab.
        </Text>
      </View>
    );
  }

  // Determine front/back text based on reverseOn
  const frontText = reverseOn ? currentWord?.definition : currentWord?.word;
  const backText = reverseOn ? currentWord?.word : currentWord?.definition;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <FlashCardOptions
          shuffleOn={shuffleOn}
          reverseOn={reverseOn}
          onShuffleToggle={handleShuffleToggle}
          onReverseToggle={handleReverseToggle}
        />
        <Text style={styles.counter}>
          {currentIndex + 1} / {queueLength}
        </Text>
      </View>

      <FlashCard
        wordId={currentWord?.id}
        front={frontText || ""}
        back={backText || ""}
        flipped={flipped}
        onFlip={handleFlip}
      />

      <FlashCardControls
        onBack={goBack}
        onForward={goForward}
        onFlip={handleFlip}
        canGoBack={currentIndex > 0}
        canGoForward={currentIndex < queueLength - 1}
      />
    </View>
  );
};

export default FlashCardContent;
