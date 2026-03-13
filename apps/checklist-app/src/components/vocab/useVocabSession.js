import { useState, useRef, useEffect } from "react";

/**
 * Core hook managing the vocab quiz session queue, scoring, and state.
 *
 * @param {object[]} items    - Vocab items ({ id, word, definition, correct, incorrect, skipped })
 * @param {string}   listMode - "once" | "loop" | "add-missed"
 * @param {boolean}  shuffled - If true, shuffles queue; reactively resets session when toggled
 */

const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const useVocabSession = ({ items, listMode, shuffled = false }) => {
  const originalItemsRef = useRef([...items]);

  // Keep a ref so buildQueue always reads the latest shuffled value without stale closure
  const shuffledRef = useRef(shuffled);
  useEffect(() => {
    shuffledRef.current = shuffled;
  }, [shuffled]);

  const buildQueue = () =>
    shuffledRef.current
      ? shuffleArray([...originalItemsRef.current])
      : [...originalItemsRef.current];

  const [queue, setQueue] = useState(buildQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [attemptLog, setAttemptLog] = useState([]); // [{item, result: 'right'|'wrong'|'skip'}]

  // Reset session whenever shuffle mode changes (skip initial mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setQueue(buildQueue());
    setCurrentIndex(0);
    setSessionComplete(false);
    setAttemptLog([]);
  }, [shuffled]);

  const currentWord = queue[currentIndex] || null;

  const advance = (activeQueue) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= activeQueue.length) {
      if (listMode === "loop") {
        const next = shuffledRef.current
          ? shuffleArray([...originalItemsRef.current])
          : [...originalItemsRef.current];
        setQueue(next);
        setCurrentIndex(0);
      } else {
        setSessionComplete(true);
      }
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  const handleRight = () => {
    setAttemptLog((prev) => [
      ...prev,
      { item: queue[currentIndex], result: "right" },
    ]);
    advance(queue);
  };

  const handleWrong = () => {
    const word = queue[currentIndex];
    setAttemptLog((prev) => [...prev, { item: word, result: "wrong" }]);
    if (listMode === "add-missed") {
      const newQueue = [...queue, word];
      setQueue(newQueue);
      advance(newQueue);
    } else {
      advance(queue);
    }
  };

  const handleSkip = () => {
    setAttemptLog((prev) => [
      ...prev,
      { item: queue[currentIndex], result: "skip" },
    ]);
    advance(queue);
  };

  // Navigate without scoring (used by flash cards)
  const goBack = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const goForward = () => {
    if (currentIndex < queue.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const sessionStats = {
    correct: attemptLog.filter((a) => a.result === "right").length,
    incorrect: attemptLog.filter((a) => a.result === "wrong").length,
    skipped: attemptLog.filter((a) => a.result === "skip").length,
  };

  const troubleWordIds = new Set(
    attemptLog.filter((a) => a.result === "wrong").map((a) => a.item.id)
  );
  const troubleWords = originalItemsRef.current.filter((item) =>
    troubleWordIds.has(item.id)
  );

  const getUpdatedItemsWithStats = () => {
    const deltaMap = {};
    attemptLog.forEach(({ item, result }) => {
      if (!deltaMap[item.id]) {
        deltaMap[item.id] = { correct: 0, incorrect: 0, skipped: 0 };
      }
      if (result === "right") deltaMap[item.id].correct += 1;
      else if (result === "wrong") deltaMap[item.id].incorrect += 1;
      else if (result === "skip") deltaMap[item.id].skipped += 1;
    });

    return originalItemsRef.current.map((item) => ({
      ...item,
      correct: (item.correct || 0) + (deltaMap[item.id]?.correct || 0),
      incorrect: (item.incorrect || 0) + (deltaMap[item.id]?.incorrect || 0),
      skipped: (item.skipped || 0) + (deltaMap[item.id]?.skipped || 0),
    }));
  };

  const sessionResults = {
    ...sessionStats,
    troubleWords,
    getUpdatedItemsWithStats,
  };

  const restartSession = () => {
    setQueue(buildQueue());
    setCurrentIndex(0);
    setSessionComplete(false);
    setAttemptLog([]);
  };

  return {
    currentWord,
    queueLength: queue.length,
    currentIndex,
    handleRight,
    handleWrong,
    handleSkip,
    goBack,
    goForward,
    sessionComplete,
    sessionResults,
    restartSession,
  };
};
