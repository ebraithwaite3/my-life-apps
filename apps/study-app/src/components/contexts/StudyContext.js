// contexts/StudyContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@my-apps/contexts";
import {
  fetchPublishedModulesForActiveTopics,
  fetchModuleContent,
  fetchStudyProgressForModules,
  recordModuleVisit,
  recordQuizResult,
} from "../../services/studyFirestore";

const StudyContext = createContext(null);
export const useStudy = () => {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error("useStudy must be used within StudyProvider");
  return ctx;
};

// ---------- helpers ----------
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function groupModulesBySection(modules) {
  const map = new Map();

  for (const m of modules) {
    const key = m.sectionId || "unknown";
    if (!map.has(key)) {
      map.set(key, {
        sectionId: m.sectionId || "unknown",
        sectionTitle: m.sectionTitle || "Other",
        sectionOrder: typeof m.sectionOrder === "number" ? m.sectionOrder : 999,
        modules: [],
      });
    }
    map.get(key).modules.push(m);
  }

  const grouped = Array.from(map.values()).map((sec) => ({
    ...sec,
    modules: [...sec.modules].sort(
      (a, b) => (a.order ?? 999) - (b.order ?? 999)
    ),
  }));

  grouped.sort((a, b) => (a.sectionOrder ?? 999) - (b.sectionOrder ?? 999));
  return grouped;
}

function pickNFrom(arr, n) {
  if (n <= 0) return [];
  if (arr.length <= n) return [...arr];
  return shuffleArray(arr).slice(0, n);
}

// ---------- provider ----------
export const StudyProvider = ({ children }) => {
  const { user, db } = useAuth();

  // Catalog
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [modulesError, setModulesError] = useState(null);

  // Progress
  const [progressByModule, setProgressByModule] = useState({});
  const [progressLoading, setProgressLoading] = useState(false);

  // Active module content
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [activeModuleMeta, setActiveModuleMeta] = useState(null);

  const [summaryBlocks, setSummaryBlocks] = useState([]);
  const [questionBanks, setQuestionBanks] = useState({ 1: [], 2: [], 3: [] });
  const [moduleContentLoading, setModuleContentLoading] = useState(false);
  const [moduleContentError, setModuleContentError] = useState(null);

  // Quiz session runtime state
  const [quizSession, setQuizSession] = useState(null);

  // --------- load catalog ----------
  useEffect(() => {
    // ✅ ADD: Don't fetch until user is logged in
    if (!db || !user?.uid) return;

    const run = async () => {
      setModulesLoading(true);
      setModulesError(null);

      try {
        const list = await fetchPublishedModulesForActiveTopics(db);
        setModules(list);
      } catch (e) {
        console.error("fetchPublishedModulesForActiveTopics error:", e);
        setModulesError(e?.message || "Failed to load modules");
      } finally {
        setModulesLoading(false);
      }
    };

    run();
  }, [db, user?.uid]); // ✅ ADD: user?.uid to dependency array

  // --------- load progress ----------
  useEffect(() => {
    if (!db || !user?.uid || modules.length === 0) return;

    const run = async () => {
      setProgressLoading(true);
      try {
        const ids = modules.map((m) => m.moduleId).filter(Boolean);
        const map = await fetchStudyProgressForModules(db, user.uid, ids);
        setProgressByModule(map);
      } catch (e) {
        console.error("fetchStudyProgressForModules error:", e);
      } finally {
        setProgressLoading(false);
      }
    };

    run();
  }, [db, user?.uid, modules]);

  const modulesBySection = useMemo(
    () => groupModulesBySection(modules),
    [modules]
  );

  const refreshModules = async () => {
    if (!db || !user?.uid) return; // ✅ ADD: user check
    setModulesLoading(true);
    setModulesError(null);
    try {
      const list = await fetchPublishedModulesForActiveTopics(db);
      setModules(list);
    } catch (e) {
      console.error(e);
      setModulesError(e?.message || "Failed to refresh modules");
    } finally {
      setModulesLoading(false);
    }
  };

  // ---------- content loader ----------
  const loadModule = async (moduleId) => {
    if (!db) return;

    // ✅ Guard: if already loaded, don’t re-fetch
    if (activeModuleId === moduleId && summaryBlocks.length > 0) {
      return;
    }

    setModuleContentLoading(true);
    setModuleContentError(null);

    try {
      const meta = modules.find((m) => m.moduleId === moduleId) || null;
      setActiveModuleId(moduleId);
      setActiveModuleMeta(meta);

      if (user?.uid && meta) {
        recordModuleVisit(db, user.uid, meta).catch((e) =>
          console.error("recordModuleVisit error:", e)
        );
      }

      const { summary, banks } = await fetchModuleContent(db, moduleId);
      setSummaryBlocks(summary.blocks || []);
      setQuestionBanks({
        1: Array.isArray(banks[1]) ? banks[1] : [],
        2: Array.isArray(banks[2]) ? banks[2] : [],
        3: Array.isArray(banks[3]) ? banks[3] : [],
      });
      console.log(`✅ Loaded module content for ${moduleId}`,
        { summary, banks });
    } catch (e) {
      console.error("loadModule error:", e);
      setModuleContentError(e?.message || "Failed to load module content");
    } finally {
      setModuleContentLoading(false);
    }
  };

  const clearModule = () => {
    setActiveModuleId(null);
    setActiveModuleMeta(null);
    setSummaryBlocks([]);
    setQuestionBanks({ 1: [], 2: [], 3: [] });
    setModuleContentError(null);
    setQuizSession(null);
  };

  // ---------- quiz engine ----------
  const startQuiz = (options = {}) => {
    if (!activeModuleId) throw new Error("No active module loaded");

    const {
      counts = { 1: 10, 2: 10, 3: 10 },
      shuffleQuestions = true,
      shuffleChoices = true,
      showRationalesMode = "afterAnswer",
      levels = [1, 2, 3],
    } = options;

    const chosen = [];

    for (const lvl of levels) {
      const bank = questionBanks[lvl] || [];
      const n = counts[lvl] ?? 0;
      chosen.push(...pickNFrom(bank, n));
    }

    const orderedQuestions = shuffleQuestions ? shuffleArray(chosen) : chosen;

    // ✅ IMPORTANT: keep choices (including rationale) in session for end review
    const sessionQuestions = orderedQuestions.map((q) => {
      const choices = Array.isArray(q.choices) ? q.choices : [];
      const shuffledChoices = shuffleChoices ? shuffleArray(choices) : choices;

      return {
        id: q.id,
        level: q.level,
        prompt: q.prompt,
        choices: shuffledChoices, // <-- keep rationale data
        correctChoiceId: q.correctChoiceId,
        // optional (if present in your question schema)
        explanation: q.explanation ?? null,
      };
    });

    setQuizSession({
      sessionId: `${activeModuleId}-${Date.now()}`,
      moduleId: activeModuleId,
      createdAtMs: Date.now(),
      settings: {
        counts,
        shuffleQuestions,
        shuffleChoices,
        showRationalesMode,
        levels,
      },
      questions: sessionQuestions,
      answers: {},
      completedAtMs: null,
    });
  };

  const answerQuestion = (questionId, selectedChoiceId) => {
    setQuizSession((prev) => {
      if (!prev) return prev;

      const q = prev.questions.find((x) => x.id === questionId);
      if (!q) return prev;

      const isCorrect = selectedChoiceId === q.correctChoiceId;

      return {
        ...prev,
        answers: {
          ...prev.answers,
          [questionId]: {
            selectedChoiceId,
            isCorrect,
            answeredAtMs: Date.now(),
          },
        },
      };
    });
  };

  const finishQuiz = async () => {
    if (!quizSession) return null;

    const total = quizSession.questions.length;
    const answered = Object.values(quizSession.answers);
    const correct = answered.filter((a) => a.isCorrect).length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    const result = { score, total, correct };

    setQuizSession((prev) =>
      prev ? { ...prev, completedAtMs: Date.now() } : prev
    );

    if (db && user?.uid && activeModuleMeta) {
      try {
        await recordQuizResult(db, user.uid, activeModuleMeta, result);
        setProgressByModule((prev) => ({
          ...prev,
          [activeModuleMeta.moduleId]: {
            ...(prev[activeModuleMeta.moduleId] || {}),
            lastQuiz: result,
          },
        }));
      } catch (e) {
        console.error("recordQuizResult error:", e);
      }
    }

    return result;
  };

  const resetQuiz = () => setQuizSession(null);

  const value = useMemo(
    () => ({
      modules,
      modulesBySection,
      modulesLoading,
      modulesError,
      refreshModules,

      progressByModule,
      progressLoading,

      activeModuleId,
      activeModuleMeta,
      summaryBlocks,
      questionBanks,
      moduleContentLoading,
      moduleContentError,
      loadModule,
      clearModule,

      quizSession,
      startQuiz,
      answerQuestion,
      finishQuiz,
      resetQuiz,
    }),
    [
      modules,
      modulesBySection,
      modulesLoading,
      modulesError,
      progressByModule,
      progressLoading,
      activeModuleId,
      activeModuleMeta,
      summaryBlocks,
      questionBanks,
      moduleContentLoading,
      moduleContentError,
      quizSession,
    ]
  );

  return (
    <StudyContext.Provider value={value}>{children}</StudyContext.Provider>
  );
};
