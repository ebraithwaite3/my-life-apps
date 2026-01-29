// services/studyFirestore.js
// Firestore reads/writes for Study app (content + progress)

export const ACTIVE_TOPIC_IDS = ["workshops-prepare-to-teach"]; // for now

export async function fetchPublishedModulesForActiveTopics(db) {
  const firestore = await import("firebase/firestore");
  const { collection, getDocs, query, where, orderBy } = firestore;

  // Firestore supports "in" up to 10 values — we're fine.
  const q = query(
    collection(db, "modules"),
    where("published", "==", true),
    where("topicId", "in", ACTIVE_TOPIC_IDS),
    orderBy("sectionOrder", "asc"),
    orderBy("order", "asc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function fetchModuleContent(db, moduleId) {
  const firestore = await import("firebase/firestore");
  const { doc, getDoc } = firestore;

  const summaryRef = doc(db, "modules", moduleId, "content", "summary");
  const l1Ref = doc(db, "modules", moduleId, "content", "questions_l1");
  const l2Ref = doc(db, "modules", moduleId, "content", "questions_l2");
  const l3Ref = doc(db, "modules", moduleId, "content", "questions_l3");

  const [sumSnap, l1Snap, l2Snap, l3Snap] = await Promise.all([
    getDoc(summaryRef),
    getDoc(l1Ref),
    getDoc(l2Ref),
    getDoc(l3Ref),
  ]);

  return {
    summary: sumSnap.exists() ? sumSnap.data() : { version: 1, blocks: [] },
    banks: {
      1: l1Snap.exists() ? (l1Snap.data().questions || []) : [],
      2: l2Snap.exists() ? (l2Snap.data().questions || []) : [],
      3: l3Snap.exists() ? (l3Snap.data().questions || []) : [],
    },
  };
}

export async function fetchStudyProgressForModules(db, uid, moduleIds) {
  if (!uid) return {};

  const firestore = await import("firebase/firestore");
  const { doc, getDoc } = firestore;

  // Simple approach (fine for family-scale): get each doc.
  // If you later have lots of modules, we can batch or restructure.
  const results = await Promise.all(
    moduleIds.map(async (moduleId) => {
      const ref = doc(db, "users", uid, "studyProgress", moduleId);
      const snap = await getDoc(ref);
      return [moduleId, snap.exists() ? snap.data() : null];
    })
  );

  const map = {};
  for (const [moduleId, data] of results) {
    if (data) map[moduleId] = data;
  }
  return map;
}

export async function recordModuleVisit(db, uid, moduleMeta) {
  if (!uid) return;

  const firestore = await import("firebase/firestore");
  const { doc, setDoc, increment, serverTimestamp } = firestore;

  const ref = doc(db, "users", uid, "studyProgress", moduleMeta.moduleId);

  await setDoc(
    ref,
    {
      moduleId: moduleMeta.moduleId,
      topicId: moduleMeta.topicId || "",
      sectionId: moduleMeta.sectionId || "",
      lastVisitedAt: serverTimestamp(),
      totalVisits: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function recordQuizResult(db, uid, moduleMeta, result) {
  if (!uid) return;

  const firestore = await import("firebase/firestore");
  const { doc, getDoc, setDoc, serverTimestamp } = firestore;

  const ref = doc(db, "users", uid, "studyProgress", moduleMeta.moduleId);

  // Read bestQuiz to compare
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : {};
  const best = existing.bestQuiz;

  const nextLast = {
    score: result.score,
    total: result.total,
    correct: result.correct,
    takenAt: serverTimestamp(),
  };

  let nextBest = best;
  if (!best || typeof best.score !== "number" || result.score > best.score) {
    nextBest = nextLast;
  }

  await setDoc(
    ref,
    {
      moduleId: moduleMeta.moduleId,
      topicId: moduleMeta.topicId || "",
      sectionId: moduleMeta.sectionId || "",
      lastQuiz: nextLast,
      bestQuiz: nextBest,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
