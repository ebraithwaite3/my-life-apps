import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";

import { useStudy } from "../../components/contexts/StudyContext";
import { useTheme } from "@my-apps/contexts";
import { SelectModal } from "@my-apps/ui";
import { useUserSettings } from "../../components/contexts/UserSettingsContext";

const QuizModalContent = ({ moduleId, onRequestClose }) => {
  const { theme, getSpacing } = useTheme();
  const { studyPreferences } = useUserSettings();

  const {
    activeModuleMeta,
    quizSession,
    startQuiz,
    answerQuestion,
    finishQuiz,
    resetQuiz,
  } = useStudy();

  const [index, setIndex] = useState(0);

  // ---------- preferences ----------
  const prefCounts = studyPreferences?.quiz?.counts || { 1: 5, 2: 5, 3: 5 };

  const [showCustomize, setShowCustomize] = useState(false);
  const [countsDraft, setCountsDraft] = useState(prefCounts);

  useEffect(() => {
    setCountsDraft(prefCounts);
  }, [prefCounts?.[1], prefCounts?.[2], prefCounts?.[3]]);

  const countOptions = [
    { label: "0", value: 0 },
    { label: "5", value: 5 },
    { label: "10", value: 10 },
    { label: "15", value: 15 },
    { label: "20", value: 20 },
    { label: "25", value: 25 },
  ];

  const totalPlanned =
    (countsDraft?.[1] ?? 0) + (countsDraft?.[2] ?? 0) + (countsDraft?.[3] ?? 0);

  const setCount = (level, value) => {
    setCountsDraft((prev) => ({
      ...(prev || {}),
      [level]: Number(value) || 0,
    }));
  };

  // ---------- session for this module ----------
  const sessionForThisModule =
    quizSession && quizSession.moduleId === moduleId ? quizSession : null;

  const isTaking =
    !!sessionForThisModule && !sessionForThisModule.completedAtMs;
  const isReview = !!sessionForThisModule?.completedAtMs;

  const questions = sessionForThisModule?.questions || [];
  const answers = sessionForThisModule?.answers || {};
  const current = questions[index];

  // Keep index safe when questions change
  useEffect(() => {
    if (!questions.length) return;
    setIndex((i) => Math.min(i, questions.length - 1));
  }, [questions.length]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const computeScore = useMemo(() => {
    if (!isReview) return null;
    const total = questions.length;
    const correct = Object.values(answers).filter((a) => a.isCorrect).length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { score, correct, total };
  }, [isReview, questions.length, answers]);

  // ---------- actions ----------
  const handleStart = () => {
    const counts = {
      1: countsDraft?.[1] ?? 5,
      2: countsDraft?.[2] ?? 5,
      3: countsDraft?.[3] ?? 5,
    };

    const levels = [1, 2, 3].filter((lvl) => (counts[lvl] ?? 0) > 0);

    startQuiz({
      counts,
      levels,
      shuffleQuestions: true,
      shuffleChoices: true,
      // wife mode: no rationales during quiz
      showRationalesMode: "never",
    });

    setIndex(0);
  };

  const handleSelect = (choiceId) => {
    if (!current) return;
    answerQuestion(current.id, choiceId);
  };

  const handlePrev = () => setIndex((i) => Math.max(0, i - 1));
  const handleNext = () =>
    setIndex((i) => Math.min(questions.length - 1, i + 1));

  const handleFinish = async () => {
    const result = await finishQuiz();
    if (result) {
      Alert.alert(
        "Quiz Saved ✅",
        `Score: ${result.score}% (${result.correct}/${result.total})`
      );
    }
    setIndex(0); // review starts at top
  };

  const handleClose = () => {
    // If already completed, just close
    if (isReview) {
      onRequestClose?.();
      return;
    }

    const hasProgress = isTaking && Object.keys(answers).length > 0;

    if (!hasProgress) {
      onRequestClose?.();
      return;
    }

    Alert.alert(
      "Leave Quiz?",
      "You have progress in this quiz. What would you like to do?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Lose Progress",
          style: "destructive",
          onPress: () => {
            resetQuiz();
            onRequestClose?.();
          },
        },
        {
          text: "Save & Exit",
          onPress: async () => {
            await finishQuiz();
            onRequestClose?.();
          },
        },
      ]
    );
  };

  // =========================
  // 1) INTRO (no session yet)
  // =========================
  if (!sessionForThisModule) {
    return (
      <View
        style={[
          styles.root,
          {
            padding: getSpacing?.md ?? 16,
            backgroundColor: theme.background || "#fff",
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.text?.primary }]}>
          {activeModuleMeta?.title || "Quiz"}
        </Text>

        <Text style={{ color: theme.text?.secondary, marginBottom: 12 }}>
          Default quiz: {prefCounts?.[1] ?? 5} L1 • {prefCounts?.[2] ?? 5} L2 •{" "}
          {prefCounts?.[3] ?? 5} L3
        </Text>

        <Pressable
          onPress={() => setShowCustomize((v) => !v)}
          style={[styles.secondaryBtn, { borderColor: theme.border }]}
        >
          <Text style={{ color: theme.text?.primary, fontWeight: "800" }}>
            {showCustomize ? "Hide Customize" : "Customize (optional)"}
          </Text>
        </Pressable>

        {showCustomize && (
          <View
            style={[
              styles.customizeCard,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}
          >
            <Text style={{ color: theme.text?.secondary, marginBottom: 10 }}>
              This only applies to this quiz session.
            </Text>

            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text?.secondary }]}>
                  Level 1
                </Text>
                <SelectModal
                  title="Level 1 Count"
                  value={countsDraft?.[1] ?? 5}
                  options={countOptions}
                  getLabel={(o) => o.label}
                  getValue={(o) => o.value}
                  onSelect={(v) => setCount(1, v)}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text?.secondary }]}>
                  Level 2
                </Text>
                <SelectModal
                  title="Level 2 Count"
                  value={countsDraft?.[2] ?? 5}
                  options={countOptions}
                  getLabel={(o) => o.label}
                  getValue={(o) => o.value}
                  onSelect={(v) => setCount(2, v)}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.text?.secondary }]}>
                  Level 3
                </Text>
                <SelectModal
                  title="Level 3 Count"
                  value={countsDraft?.[3] ?? 5}
                  options={countOptions}
                  getLabel={(o) => o.label}
                  getValue={(o) => o.value}
                  onSelect={(v) => setCount(3, v)}
                />
              </View>
            </View>

            <Text style={{ color: theme.text?.secondary, marginTop: 10 }}>
              Total: {totalPlanned} questions
            </Text>
          </View>
        )}

        <Pressable
          style={[
            styles.primaryBtn,
            {
              backgroundColor: theme.primary,
              opacity: totalPlanned > 0 ? 1 : 0.5,
            },
          ]}
          onPress={handleStart}
          disabled={totalPlanned <= 0}
        >
          <Text style={styles.primaryBtnText}>Start Quiz</Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryBtn, { borderColor: theme.border }]}
          onPress={handleClose}
        >
          <Text style={{ color: theme.text?.primary }}>Close</Text>
        </Pressable>
      </View>
    );
  }

  // =========================
  // 2) REVIEW (completed quiz)
  // =========================
  if (isReview) {
    return (
      <View
        style={[styles.root, { backgroundColor: theme.background || "#fff" }]}
      >
        <View
          style={[
            styles.topBar,
            {
              borderColor: theme.border,
              paddingHorizontal: getSpacing?.md ?? 16,
            },
          ]}
        >
          <Text style={{ color: theme.text?.primary, fontWeight: "900" }}>
            Review
          </Text>

          <Pressable
            onPress={() => {
              resetQuiz();
              onRequestClose?.();
            }}
          >
            <Text style={{ color: theme.error, fontWeight: "900" }}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: getSpacing?.md ?? 16, gap: 12 }}
        >
          <View
            style={[
              styles.reviewCard,
              { borderColor: theme.border, backgroundColor: theme.surface },
            ]}
          >
            <Text
              style={{
                color: theme.text?.primary,
                fontWeight: "900",
                fontSize: 16,
              }}
            >
              {activeModuleMeta?.title || "Quiz"}
            </Text>

            {computeScore && (
              <Text style={{ color: theme.text?.secondary, marginTop: 6 }}>
                Score: {computeScore.score}% ({computeScore.correct}/
                {computeScore.total})
              </Text>
            )}

            <Text style={{ color: theme.text?.secondary, marginTop: 6 }}>
              Review all questions below. Rationales only show here (not during
              the quiz).
            </Text>
          </View>

          {questions.map((q, idx) => {
            const a = answers[q.id];
            const selectedId = a?.selectedChoiceId;
            const correctId = q.correctChoiceId;

            const selectedChoice = q.choices?.find((c) => c.id === selectedId);
            const correctChoice = q.choices?.find((c) => c.id === correctId);

            const gotItRight = a?.isCorrect === true;

            return (
              <View
                key={q.id}
                style={[
                  styles.reviewCard,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}
              >
                <Text
                  style={{
                    color: theme.text?.secondary,
                    fontSize: 12,
                    fontWeight: "900",
                  }}
                >
                  Level {q.level} • Q{idx + 1}
                </Text>

                <Text
                  style={{
                    color: theme.text?.primary,
                    fontWeight: "900",
                    marginTop: 6,
                  }}
                >
                  {q.prompt}
                </Text>

                <View style={{ marginTop: 10, gap: 6 }}>
                  <Text
                    style={{ color: theme.text?.secondary, fontWeight: "900" }}
                  >
                    Your answer:
                  </Text>
                  <Text
                    style={{
                      color: gotItRight ? theme.primary : theme.error,
                      fontWeight: "900",
                    }}
                  >
                    {gotItRight ? "✅ " : "❌ "}
                    {selectedChoice?.text || "No answer"}
                  </Text>

                  {!gotItRight && !!selectedChoice?.rationale && (
                    <View style={{ marginTop: 8 }}>
                      <Text
                        style={{
                          color: theme.text?.secondary,
                          fontSize: 12,
                          lineHeight: 16,
                        }}
                      >
                        {"Why your answer was wrong: "}
                        {selectedChoice.rationale}
                      </Text>
                    </View>
                  )}

                  <Text
                    style={{
                      color: theme.text?.secondary,
                      fontWeight: "900",
                      marginTop: 8,
                    }}
                  >
                    Correct answer:
                  </Text>
                  <Text
                    style={{ color: theme.text?.primary, fontWeight: "900" }}
                  >
                    ✅ {correctChoice?.text || "Unknown"}
                  </Text>

                  {!!correctChoice?.rationale && (
                    <View style={{ marginTop: 8 }}>
                      <Text
                        style={{
                          color: theme.text?.secondary,
                          fontSize: 12,
                          lineHeight: 16,
                        }}
                      >
                        {correctChoice.rationale}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // =========================
  // 3) TAKING QUIZ
  // =========================
  if (!current) {
    return (
      <View style={[styles.root, { padding: getSpacing?.md ?? 16 }]}>
        <Text style={{ color: theme.text?.secondary }}>
          No questions in this session.
        </Text>
        <Pressable
          style={[styles.secondaryBtn, { borderColor: theme.border }]}
          onPress={handleClose}
        >
          <Text style={{ color: theme.text?.primary }}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const currentAnswer = answers?.[current.id];
  const isLast = index === questions.length - 1;

  return (
    <View
      style={[styles.root, { backgroundColor: theme.background || "#fff" }]}
    >
      <View
        style={[
          styles.topBar,
          {
            borderColor: theme.border,
            paddingHorizontal: getSpacing?.md ?? 16,
          },
        ]}
      >
        <Text style={{ color: theme.text?.primary, fontWeight: "900" }}>
          {answeredCount}/{questions.length} answered
        </Text>
        <Pressable onPress={handleClose}>
          <Text style={{ color: theme.error, fontWeight: "900" }}>Close</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: getSpacing?.md ?? 16 }}>
        <Text style={[styles.qMeta, { color: theme.text?.secondary }]}>
          Level {current.level} • Question {index + 1} of {questions.length}
        </Text>

        <Text style={[styles.prompt, { color: theme.text?.primary }]}>
          {current.prompt}
        </Text>

        <View style={{ marginTop: 12 }}>
          {current.choices.map((c) => {
            const selected = currentAnswer?.selectedChoiceId === c.id;

            const bg = selected
              ? theme.card || "#f4f9ff"
              : theme.surface || "#fff";
            const border = selected
              ? theme.primary || "#2196F3"
              : theme.border || "#eee";

            return (
              <Pressable
                key={c.id}
                onPress={() => handleSelect(c.id)}
                style={[
                  styles.choice,
                  { backgroundColor: bg, borderColor: border },
                ]}
              >
                <Text
                  style={{
                    color: theme.text?.primary,
                    fontWeight: selected ? "900" : "700",
                  }}
                >
                  {c.text}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.navRow}>
          <Pressable
            onPress={handlePrev}
            disabled={index === 0}
            style={[
              styles.navBtn,
              { borderColor: theme.border, opacity: index === 0 ? 0.5 : 1 },
            ]}
          >
            <Text style={{ color: theme.text?.primary, fontWeight: "900" }}>
              Prev
            </Text>
          </Pressable>

          {!isLast ? (
            <Pressable
              onPress={handleNext}
              style={[styles.navBtn, { borderColor: theme.border }]}
            >
              <Text style={{ color: theme.text?.primary, fontWeight: "900" }}>
                Next
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleFinish}
              style={[styles.finishBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.finishText}>Finish & Save</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: { fontSize: 16, fontWeight: "900", marginBottom: 6 },

  customizeCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },

  reviewCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },

  row: { flexDirection: "row", gap: 10 },
  field: { flex: 1, gap: 6 },
  label: { fontSize: 13, fontWeight: "900" },

  qMeta: { fontSize: 12, marginBottom: 8 },
  prompt: { fontSize: 16, fontWeight: "900", lineHeight: 22 },

  choice: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  navRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    alignItems: "center",
  },
  navBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },

  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 14,
    marginBottom: 10,
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },

  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 10,
  },

  finishBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  finishText: { color: "#fff", fontWeight: "900" },
});

export default QuizModalContent;
