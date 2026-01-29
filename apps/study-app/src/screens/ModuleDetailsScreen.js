import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";

import { useTheme } from "@my-apps/contexts";
import { useStudy } from "../components/contexts/StudyContext";
import { ModalWrapper, ModalHeader, PageHeader } from "@my-apps/ui";

import SummaryModalContent from "../components/modals/SummaryModalContent";
import QuizModalContent from "../components/modals/QuizModalContent";

const ModuleDetailsScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { moduleId, title } = route.params;

  const {
    activeModuleId,
    activeModuleMeta,
    summaryBlocks,
    questionBanks,
    moduleContentLoading,
    moduleContentError,
    loadModule,

    // quiz lifecycle
    quizSession,
    resetQuiz,
    finishQuiz,
  } = useStudy();

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);

  useEffect(() => {
    // Load module content if needed (your loadModule already has a guard)
    loadModule(moduleId);
  }, [moduleId]);

  const headerTitle = activeModuleMeta?.title || title || "Module";

  const totalQuestions = useMemo(() => {
    return (
      (questionBanks?.[1]?.length ?? 0) +
      (questionBanks?.[2]?.length ?? 0) +
      (questionBanks?.[3]?.length ?? 0)
    );
  }, [questionBanks]);

  const canOpen =
    !!activeModuleId && !moduleContentLoading && !moduleContentError;

  const openSummary = () => setShowSummaryModal(true);

  /**
   * ✅ IMPORTANT:
   * Do NOT startQuiz() here.
   * QuizModalContent will:
   *  - read user studyPreferences
   *  - allow optional customization
   *  - call startQuiz exactly once
   */
  const openQuiz = () => {
    if (!canOpen) return;

    // If there is an unfinished quiz session for this module, just open and resume it.
    if (quizSession?.moduleId === moduleId && !quizSession.completedAtMs) {
      setShowQuizModal(true);
      return;
    }

    // Otherwise open the modal — it will show "Start Quiz" and use preferences.
    setShowQuizModal(true);
  };

  // ✅ Guarded close (keep / lose / finish & save)
  const requestCloseQuiz = () => {
    const isActive =
      !!quizSession &&
      quizSession.moduleId === moduleId &&
      !quizSession.completedAtMs &&
      Object.keys(quizSession.answers || {}).length > 0;

    if (!isActive) {
      setShowQuizModal(false);
      return;
    }

    Alert.alert(
      "Leave quiz?",
      "You have an unfinished quiz. What would you like to do?",
      [
        { text: "Keep Studying", style: "cancel" },
        {
          text: "Lose Progress",
          style: "destructive",
          onPress: () => {
            resetQuiz();
            setShowQuizModal(false);
          },
        },
        {
          text: "Finish & Save",
          onPress: async () => {
            await finishQuiz();
            setShowQuizModal(false);
          },
        },
      ]
    );
  };

  const statsText = moduleContentLoading
    ? "Loading…"
    : moduleContentError
    ? "Error loading module"
    : `${summaryBlocks?.length ?? 0} summary blocks • ${totalQuestions} questions`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <PageHeader
        navigation={navigation}
        showBackButton={true}
        backButtonText=""
        title={headerTitle}
        subtext={statsText}
      />

      <View style={styles.body}>
        {moduleContentLoading && (
          <View style={styles.centerRow}>
            <ActivityIndicator />
            <Text style={[styles.muted, { color: theme.text.secondary }]}>
              {" "}
              Loading module…
            </Text>
          </View>
        )}

        {!!moduleContentError && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={{ color: theme.error, fontWeight: "800" }}>
              {moduleContentError}
            </Text>
          </View>
        )}

        {!moduleContentLoading && !moduleContentError && (
          <>
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
                Choose an activity
              </Text>

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={openSummary}
                  disabled={!canOpen}
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: canOpen
                        ? theme.button.primary
                        : theme.button.disabled,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.btnText,
                      { color: theme.button.primaryText },
                    ]}
                  >
                    Summary
                  </Text>
                </Pressable>

                <Pressable
                  onPress={openQuiz}
                  disabled={!canOpen}
                  style={[
                    styles.secondaryBtn,
                    {
                      backgroundColor: canOpen ? "#111827" : theme.button.disabled,
                    },
                  ]}
                >
                  <Text style={[styles.btnText, { color: "#FFFFFF" }]}>Quiz</Text>
                </Pressable>
              </View>
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
                Quick stats
              </Text>
              <Text style={[styles.stat, { color: theme.text.secondary }]}>
                Summary blocks: {summaryBlocks?.length ?? 0}
              </Text>
              <Text style={[styles.stat, { color: theme.text.secondary }]}>
                Level 1: {questionBanks?.[1]?.length ?? 0}
              </Text>
              <Text style={[styles.stat, { color: theme.text.secondary }]}>
                Level 2: {questionBanks?.[2]?.length ?? 0}
              </Text>
              <Text style={[styles.stat, { color: theme.text.secondary }]}>
                Level 3: {questionBanks?.[3]?.length ?? 0}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* SUMMARY MODAL */}
      <ModalWrapper
        visible={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: theme.modal.overlay }]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", height: "90%" }}
          >
            <View
              style={[
                styles.modalContainer,
                { backgroundColor: theme.surface },
              ]}
            >
              <ModalHeader
                title={headerTitle}
                subtitle="Summary"
                onCancel={() => setShowSummaryModal(false)}
                cancelText="Close"
                showDone={false}
              />
              <SummaryModalContent />
            </View>
          </KeyboardAvoidingView>
        </View>
      </ModalWrapper>

      {/* QUIZ MODAL */}
      <ModalWrapper visible={showQuizModal} onClose={requestCloseQuiz}>
        <View
          style={[styles.modalOverlay, { backgroundColor: theme.modal.overlay }]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", height: "90%" }}
          >
            <View
              style={[
                styles.modalContainer,
                { backgroundColor: theme.surface },
              ]}
            >
              <ModalHeader
                title={headerTitle}
                subtitle="Quiz"
                onCancel={requestCloseQuiz}
                cancelText="Close"
                showDone={false}
              />
              <QuizModalContent moduleId={moduleId} onRequestClose={requestCloseQuiz} />
            </View>
          </KeyboardAvoidingView>
        </View>
      </ModalWrapper>
    </View>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, padding: 16, gap: 12 },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { fontSize: 14 },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "900" },

  actionsRow: { flexDirection: "row", gap: 10 },
  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText: { fontWeight: "900" },

  stat: { fontSize: 13 },

  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    borderRadius: 14,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
});

export default ModuleDetailsScreen;
