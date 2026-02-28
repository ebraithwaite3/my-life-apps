import { useState, useRef } from "react";

/**
 * Core hook managing the spelling test session queue, scoring, and state.
 *
 * @param {object[]} items  - Checklist items (item.name is the word to spell)
 * @param {string}   listMode - "once" | "loop" | "add-missed"
 */
export const useSpellingSession = ({ items, listMode }) => {
  const originalItemsRef = useRef([...items]);

  const [queue, setQueue] = useState([...items]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [attemptLog, setAttemptLog] = useState([]); // [{item, result: 'right'|'wrong'|'skip'}]

  const currentWord = queue[currentIndex] || null;

  // Advance to the next word given the (possibly just-updated) queue.
  // Called synchronously inside each handler so we use the fresh queue value.
  const advance = (activeQueue) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= activeQueue.length) {
      if (listMode === "loop") {
        setQueue([...originalItemsRef.current]);
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

  // Aggregate stats for this session
  const sessionStats = {
    correct: attemptLog.filter((a) => a.result === "right").length,
    incorrect: attemptLog.filter((a) => a.result === "wrong").length,
    skipped: attemptLog.filter((a) => a.result === "skip").length,
  };

  // Unique items marked Wrong at least once this session
  const troubleWordIds = new Set(
    attemptLog.filter((a) => a.result === "wrong").map((a) => a.item.id)
  );
  const troubleWords = originalItemsRef.current.filter((item) =>
    troubleWordIds.has(item.id)
  );

  /**
   * Returns a copy of the original items array with this session's
   * correct/incorrect/skipped counts merged into each item's aggregate stats.
   * Call this when persisting after session completion.
   */
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
    setQueue([...originalItemsRef.current]);
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
    sessionComplete,
    sessionResults,
    restartSession,
  };
};
