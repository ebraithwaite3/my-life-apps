/**
 * Checklist Utility Functions
 * Pure functions for checklist progress calculation and validation
 */

/**
 * Calculate progress for a checklist, properly handling nested items
 * Counts sub-items for groups, multiChoice, and fillIn items instead of the parent
 * 
 * @param {Array} items - Array of checklist items
 * @returns {Object} - { completed: number, total: number }
 */
export const calculateChecklistProgress = (items = []) => {
  let completed = 0;
  let total = 0;

  items.forEach(item => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isGroupOrMultiOrFill = item.itemType === 'group' || 
      (item.itemType === 'yesNo' && (item.yesNoConfig?.type === 'multiChoice' || item.yesNoConfig?.type === 'fillIn'));

    if (hasSubItems && isGroupOrMultiOrFill) {
      // For groups, multiChoice, and fillIn, count sub-items instead of parent
      item.subItems.forEach(sub => {
        total++;
        if (sub.completed) completed++;
      });
    } else {
      // Regular items or simple yes/no items
      total++;
      if (item.completed) completed++;
    }
  });

  return { completed, total };
};

/**
 * Get completion percentage (handles nested items)
 * @param {Array} items - Array of checklist items
 * @returns {number} - Percentage (0-100)
 */
export const getCompletionPercentage = (items = []) => {
  const { completed, total } = calculateChecklistProgress(items);
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

/**
 * Check if all checklist items are completed (handles nested items)
 * Used by useChecklistState
 * @param {Array} items - Array of checklist items
 * @returns {boolean}
 */
export const isChecklistComplete = (items = []) => {
  if (!items || items.length === 0) return false;
  const { completed, total } = calculateChecklistProgress(items);
  return completed === total;
};

/**
 * Get counts of completed, incomplete, and required items (handles nested items)
 * @param {Array} items - Array of checklist items
 * @returns {Object} - { total, completed, incomplete, required, requiredCompleted }
 */
export const getChecklistStats = (items = []) => {
  if (!items || items.length === 0) {
    return { total: 0, completed: 0, incomplete: 0, required: 0, requiredCompleted: 0 };
  }

  const { completed: completedCount, total: totalCount } = calculateChecklistProgress(items);
  const incomplete = totalCount - completedCount;

  // For required items, we still count at the item level (not sub-items)
  // because requiredForScreenTime is a property of the top-level item
  const required = items.filter(item => item.requiredForScreenTime).length;
  const requiredCompleted = items.filter(
    item => item.requiredForScreenTime && item.completed
  ).length;

  return { 
    total: totalCount, 
    completed: completedCount, 
    incomplete, 
    required, 
    requiredCompleted 
  };
};

/**
 * Validate if checklist can be saved as template
 * @param {Object} checklist - Checklist to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export const canSaveAsTemplate = (checklist) => {
  const errors = [];

  if (!checklist?.name || checklist.name.trim().length === 0) {
    errors.push("Checklist must have a name");
  }

  if (!checklist?.items || checklist.items.length === 0) {
    errors.push("Checklist must have at least one item");
  }

  if (checklist?.items && checklist.items.some(item => !item.name || item.name.trim().length === 0)) {
    errors.push("All items must have a name");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};