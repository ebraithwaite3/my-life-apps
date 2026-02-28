import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { useSpellingSession } from "./useSpellingSession";
import { useSpellingSpeech } from "./useSpellingSpeech";
import SpellingModeSelector from "./SpellingModeSelector";
import SpellingListModeSelector from "./SpellingListModeSelector";
import SpellingWordDisplay from "./SpellingWordDisplay";
import SpellingTestControls from "./SpellingTestControls";
import SpellingSessionSummary from "./SpellingSessionSummary";

/**
 * Practice tab content.
 *
 * Solo mode:  text input → auto-grade on submit → show result → Next
 * Parent mode: word always visible → Right / Wrong / Skip buttons
 *
 * Props:
 *   list        {object}   - Full checklist (name, items, totalSessions, ...)
 *   onSaveStats {function} - Called with updated list when session ends
 */
const SpellingListContent = ({ list, onSaveStats }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const [spellingMode, setSpellingMode] = useState("solo");
  const [listMode, setListMode] = useState("add-missed");
  const [statsSaved, setStatsSaved] = useState(false);

  // Solo-mode text input state
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null); // { isCorrect, submitted, correct }
  const inputRef = useRef(null);

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
  } = useSpellingSession({ items, listMode });

  const { speak, isSpeaking } = useSpellingSpeech();

  // Clear input & result whenever the word advances
  useEffect(() => {
    setAnswer("");
    setResult(null);
    // Re-focus input in Solo mode after advancing
    if (spellingMode === "solo") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex]);

  // Clear result when switching to Parent mode (no input needed)
  useEffect(() => {
    setAnswer("");
    setResult(null);
  }, [spellingMode]);

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
      answer.trim().toLowerCase() === currentWord.name.toLowerCase();
    setResult({ isCorrect, submitted: answer.trim(), correct: currentWord.name });
  };

  const handleNext = () => {
    if (!result) return;
    if (result.isCorrect) {
      handleRight();
    } else {
      handleWrong();
    }
    // answer/result reset happens in the currentIndex useEffect
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
      marginBottom: getSpacing.lg,
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
    // Solo input
    inputContainer: {
      marginBottom: getSpacing.md,
    },
    textInput: {
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.md,
      fontSize: 22,
      fontWeight: "600",
      color: theme.text.primary,
      textAlign: "center",
    },
    checkButton: {
      marginTop: getSpacing.sm,
      paddingVertical: getSpacing.md,
      borderRadius: getBorderRadius.lg,
      backgroundColor: theme.primary,
      alignItems: "center",
    },
    checkButtonDisabled: {
      backgroundColor: theme.border,
    },
    checkButtonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    // Result card — uses theme surface + colored border so it works in light & dark
    resultCard: {
      borderRadius: getBorderRadius.lg,
      borderWidth: 2,
      padding: getSpacing.lg,
      marginBottom: getSpacing.lg,
      alignItems: "center",
      gap: getSpacing.sm,
      backgroundColor: theme.surface,
    },
    correctCard: {
      borderColor: theme.success,
    },
    incorrectCard: {
      borderColor: theme.error,
    },
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
    // Empty state
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
        <Ionicons name="list-outline" size={48} color={theme.text.tertiary} />
        <Text style={styles.emptyText}>
          No words in this list yet.{"\n"}Add words using the Edit tab.
        </Text>
      </View>
    );
  }

  if (sessionComplete) {
    return (
      <SpellingSessionSummary
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
      onPress={() => speak(currentWord?.name)}
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
        <SpellingModeSelector mode={spellingMode} onSelect={setSpellingMode} />
        <Text style={styles.progressText}>
          {currentIndex + 1} / {queueLength}
        </Text>
      </View>
      <View style={styles.listModeSelectorRow}>
        <SpellingListModeSelector mode={listMode} onSelect={setListMode} />
      </View>
    </>
  );

  // ── PARENT MODE ──────────────────────────────────────────────────────────
  if (spellingMode === "parent") {
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {modeSelectorsJSX}
        <SpellingWordDisplay word={currentWord?.name} mode="parent" />
        {speakButtonJSX}
        <SpellingTestControls
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
              <Text style={styles.typedLabel}>You spelled:</Text>
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={120}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {modeSelectorsJSX}

        {/* Spacer so the input sits mid-screen */}
        <View style={{ height: getSpacing.xl }} />

        {speakButtonJSX}

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={answer}
            onChangeText={setAnswer}
            placeholder="Type the spelling..."
            placeholderTextColor={theme.text.tertiary}
            autoCorrect={false}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            enablesReturnKeyAutomatically
          />
          <TouchableOpacity
            style={[
              styles.checkButton,
              !answer.trim() && styles.checkButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!answer.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.checkButtonText}>Check</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SpellingListContent;
