export const isSpellingList = (name) =>
  name?.toLowerCase().includes("spelling list");

export const isVocabList = (item) => item?.listType === "vocab";

export const isGroceryList = (name) =>
  name?.toLowerCase().trim() === "grocery list";
