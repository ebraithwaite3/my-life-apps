export const isSpellingList = (name) =>
  name?.toLowerCase().includes("spelling list");

export const isVocabList = (item) => item?.listType === "vocab";

export const isGroceryList = (nameOrChecklist) => {
  if (!nameOrChecklist) return false;
  if (typeof nameOrChecklist === 'string')
    return nameOrChecklist.toLowerCase().trim() === 'grocery list';
  return nameOrChecklist.type === 'grocery' ||
    nameOrChecklist.name?.toLowerCase().trim() === 'grocery list';
};
