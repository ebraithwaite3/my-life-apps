import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { KeyboardActionBar } from "@my-apps/ui";
import { useVocabSession } from "./useVocabSession";
import { useVocabSpeech } from "./useVocabSpeech";
import VocabModeSelector from "./VocabModeSelector";
import VocabListModeSelector from "./VocabListModeSelector";
import VocabDefinitionDisplay from "./VocabDefinitionDisplay";
import VocabQuizInput from "./VocabQuizInput";
import VocabTestControls from "./VocabTestControls";
import VocabSessionSummary from "./VocabSessionSummary";

/**
 * Quiz tab content for vocab lists.
 *
 * Solo mode:  definition shown → user types the word → auto-graded → Next
 * Parent mode: definition shown → parent taps Right / Wrong / Skip
 */
const VocabQuizContent = ({ list, onSaveStats }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const [vocabMode, setVocabMode] = useState("solo");
  const [listMode, setListMode] = useState("add-missed");
  const [statsSaved, setStatsSaved] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const items = list?.items || [];

  const {
    currentWord,
    queueLength,
    currentIndex,
    handleRight,
    handleWrong,
    handleSkip,
    sessionComplete,
    sessionResults,
    restartSession,
  } = useVocabSession({ items, listMode });

  const { speak, isSpeaking } = useVocabSpeech();

  // Keyboard listeners — only relevant for Solo mode input
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Clear input & result whenever the word advances
  useEffect(() => {
    setAnswer("");
    setResult(null);
    if (vocabMode === "solo") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex]);

  // Clear result when switching to Parent mode
  useEffect(() => {
    setAnswer("");
    setResult(null);
  }, [vocabMode]);

  // Persist stats once when session ends
  useEffect(() => {
    if (sessionComplete && !statsSaved) {
      setStatsSaved(true);
      const updatedItems = sessionResults.getUpdatedItemsWithStats();
      onSaveStats({
        ...list,
        items: updatedItems,
        totalSessions: (list.totalSessions || 0) + 1,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [sessionComplete]);

  const handleSubmit = () => {
    if (!answer.trim() || !currentWord) return;
    const isCorrect =
      answer.trim().toLowerCase() === currentWord.word.toLowerCase();
    setResult({ isCorrect, submitted: answer.trim(), correct: currentWord.word });
  };

  const handleNext = () => {
    if (!result) return;
    if (result.isCorrect) {
      handleRight();
    } else {
      handleWrong();
    }
  };

  const handlePracticeAgain = () => {
    setStatsSaved(false);
    setAnswer("");
    setResult(null);
    restartSession();
  };

  const styles = StyleSheet.create({
    flex: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: getSpacing.lg,
      paddingBottom: getSpacing.xl,
    },
    modeSelectorRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: getSpacing.md,
    },
    progressText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      fontWeight: "600",
    },
    listModeSelectorRow: {
      alignItems: "center",
      paddingVertical: getSpacing.sm,
    },
    speakButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      gap: getSpacing.xs,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.full,
      borderWidth: 1.5,
      borderColor: theme.border,
      marginBottom: getSpacing.md,
    },
    speakButtonActive: {
      borderColor: theme.primary,
      backgroundColor: "#EFF6FF",
    },
    speakText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    speakTextActive: { color: theme.primary },
    resultCard: {
      borderRadius: getBorderRadius.lg,
      borderWidth: 2,
      padding: getSpacing.lg,
      marginBottom: getSpacing.lg,
      alignItems: "center",
      gap: getSpacing.sm,
      backgroundColor: theme.surface,
    },
    correctCard: { borderColor: theme.success },
    incorrectCard: { borderColor: theme.error },
    resultLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    correctLabel: { color: theme.success },
    incorrectLabel: { color: theme.error },
    correctWord: {
      fontSize: 36,
      fontWeight: "700",
      color: theme.text.primary,
      textAlign: "center",
    },
    incorrectWord: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.error,
      textDecorationLine: "line-through",
      textAlign: "center",
    },
    typedLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
    },
    nextButton: {
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.xl,
      borderRadius: getBorderRadius.lg,
      backgroundColor: theme.primary,
      alignItems: "center",
    },
    nextButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: "#FFFFFF",
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
        <Ionicons name="book-outline" size={48} color={theme.text.tertiary} />
        <Text style={styles.emptyText}>
          No words in this list yet.{"\n"}Add words using the Edit tab.
        </Text>
      </View>
    );
  }

  if (sessionComplete) {
    return (
      <VocabSessionSummary
        sessionResults={sessionResults}
        totalSessions={(list.totalSessions || 0) + 1}
        onPracticeAgain={handlePracticeAgain}
        updatedItems={sessionResults.getUpdatedItemsWithStats()}
      />
    );
  }

  const speakButtonJSX = (
    <TouchableOpacity
      style={[styles.speakButton, isSpeaking && styles.speakButtonActive]}
      onPress={() => speak(currentWord?.definition)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isSpeaking ? "volume-high" : "volume-medium-outline"}
        size={18}
        color={isSpeaking ? theme.primary : theme.text.secondary}
      />
      <Text style={[styles.speakText, isSpeaking && styles.speakTextActive]}>
        {isSpeaking ? "Speaking..." : "Speak"}
      </Text>
    </TouchableOpacity>
  );

  const modeSelectorsJSX = (
    <>
      <View style={styles.modeSelectorRow}>
        <VocabModeSelector mode={vocabMode} onSelect={setVocabMode} />
        <Text style={styles.progressText}>
          {currentIndex + 1} / {queueLength}
        </Text>
      </View>
      <View style={styles.listModeSelectorRow}>
        <VocabListModeSelector mode={listMode} onSelect={setListMode} />
      </View>
    </>
  );

  // ── PARENT MODE ──────────────────────────────────────────────────────────
  if (vocabMode === "parent") {
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {modeSelectorsJSX}
        <VocabDefinitionDisplay definition={currentWord?.definition} />
        {speakButtonJSX}
        <VocabTestControls
          mode="parent"
          onRight={handleRight}
          onWrong={handleWrong}
          onSkip={handleSkip}
        />
      </ScrollView>
    );
  }

  // ── SOLO MODE — RESULT SCREEN ─────────────────────────────────────────────
  if (result) {
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {modeSelectorsJSX}
        <VocabDefinitionDisplay definition={currentWord?.definition} />

        <View
          style={[
            styles.resultCard,
            result.isCorrect ? styles.correctCard : styles.incorrectCard,
          ]}
        >
          <Text
            style={[
              styles.resultLabel,
              result.isCorrect ? styles.correctLabel : styles.incorrectLabel,
            ]}
          >
            {result.isCorrect ? "✓ Correct!" : "✗ Not quite"}
          </Text>

          <Text style={styles.correctWord}>{result.correct}</Text>

          {!result.isCorrect && (
            <>
              <Text style={styles.typedLabel}>You typed:</Text>
              <Text style={styles.incorrectWord}>{result.submitted}</Text>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>Next Word →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── SOLO MODE — INPUT SCREEN ──────────────────────────────────────────────
  return (
    <View style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {modeSelectorsJSX}
        <VocabDefinitionDisplay definition={currentWord?.definition} />
        {speakButtonJSX}
        <VocabQuizInput
          ref={inputRef}
          value={answer}
          onChangeText={setAnswer}
          onSubmit={handleSubmit}
          disabled={!answer.trim()}
        />
        {/* Spacer — increase height to push input further above keyboard */}
        <View style={{ height: 0 }} />
      </ScrollView>

      <KeyboardActionBar
        visible={keyboardVisible}
        onWillDismiss={() => setKeyboardVisible(false)}
        leftButton={
          answer.trim()
            ? { text: "Check", icon: "checkmark-done-outline", onPress: handleSubmit }
            : undefined
        }
      />
    </View>
  );
};

export default VocabQuizContent;
