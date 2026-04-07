import * as Crypto from "expo-crypto";
import { useData } from "@my-apps/contexts";
import { updateDocument } from "@my-apps/services";

const uuidv4 = () => Crypto.randomUUID();

/**
 * Admin-only hook for the household tasks library.
 * Tasks and categories are stored on the admin user document.
 * Returns { tasks, categories, saveTask, deleteTask, saveCategory, deleteCategory }
 */
const useHouseholdTasks = () => {
  const { user } = useData();

  const tasks = user?.householdTasks || [];
  const categories = user?.householdTaskCategories || [];

  const saveTask = async (task) => {
    const isNew = !task.id;
    const taskData = {
      ...task,
      id: task.id || uuidv4(),
      createdAt: task.createdAt || new Date().toISOString(),
    };
    const updatedTasks = isNew
      ? [...tasks, taskData]
      : tasks.map((t) => (t.id === taskData.id ? taskData : t));
    await updateDocument("users", user.userId, { householdTasks: updatedTasks });
  };

  const deleteTask = async (id) => {
    const updatedTasks = tasks.filter((t) => t.id !== id);
    await updateDocument("users", user.userId, { householdTasks: updatedTasks });
  };

  const saveCategory = async (name) => {
    const trimmed = name.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const updatedCategories = [...categories, trimmed];
    await updateDocument("users", user.userId, {
      householdTaskCategories: updatedCategories,
    });
  };

  const deleteCategory = async (name) => {
    const updatedCategories = categories.filter((c) => c !== name);
    await updateDocument("users", user.userId, {
      householdTaskCategories: updatedCategories,
    });
  };

  const reorderCategories = async (orderedCategories) => {
    await updateDocument("users", user.userId, {
      householdTaskCategories: orderedCategories,
    });
  };

  return { tasks, categories, saveTask, deleteTask, saveCategory, deleteCategory, reorderCategories };
};

export default useHouseholdTasks;
