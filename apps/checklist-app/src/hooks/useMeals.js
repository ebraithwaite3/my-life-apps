import { useState, useEffect } from "react";
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { useAuth } from "@my-apps/contexts";
import { useData } from "@my-apps/contexts";

const GROCERY_GROUP_ID = "e041a76d-ed3a-4255-bcd3-d6ea3c25711b";

/**
 * Hook for the global meals library.
 * Only subscribes to Firestore if the user is a member of the grocery group.
 * Returns { meals, loading, saveMeal, deleteMeal }
 */
const useMeals = () => {
  const { db } = useAuth();
  const { groups } = useData();

  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const hasMealsAccess = groups?.some(
    (g) => (g.id || g.groupId) === GROCERY_GROUP_ID
  );

  useEffect(() => {
    if (!db || !hasMealsAccess) {
      setMeals([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "meals"), orderBy("sortOrder", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setMeals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("❌ Error loading meals:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [db, hasMealsAccess]);

  const saveMeal = async (meal) => {
    console.log("Saving meal to Firestore:", meal);
    const mealRef = doc(db, "meals", meal.id);
    await setDoc(mealRef, { ...meal, updatedAt: new Date().toISOString() }, { merge: true });
  };

  const deleteMeal = async (id) => {
    await deleteDoc(doc(db, "meals", id));
  };

  return { meals, loading, saveMeal, deleteMeal };
};

export default useMeals;
