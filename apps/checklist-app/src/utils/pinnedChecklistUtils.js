export const isSpellingList = (name) =>
  name?.toLowerCase().includes("spelling list");

export const isVocabList = (item) => item?.listType === "vocab";
