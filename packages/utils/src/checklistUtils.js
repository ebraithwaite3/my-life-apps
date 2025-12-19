/**
 * Checklist Utility Functions
 * Pure functions for checklist validation, status checks, and transformations
 */

/**
 * Check if checklist is saved as a template
 * @param {Object} checklist - Checklist object
 * @param {Array} templates - Array of template objects (from user or group)
 * @returns {boolean}
 */
export const isChecklistATemplate = (checklist, templates = []) => {
    if (!checklist?.id) return false;
    return templates.some(template => template.id === checklist.id);
  };
  
  /**
   * Check if all checklist items are completed
   * @param {Object} checklist - Checklist with items array
   * @returns {boolean}
   */
  export const isChecklistComplete = (checklist) => {
    if (!checklist?.items || checklist.items.length === 0) return false;
    return checklist.items.every(item => item.completed === true);
  };
  
  /**
   * Get completion percentage
   * @param {Object} checklist - Checklist with items array
   * @returns {number} - Percentage (0-100)
   */
  export const getCompletionPercentage = (checklist) => {
    if (!checklist?.items || checklist.items.length === 0) return 0;
    const completed = checklist.items.filter(item => item.completed).length;
    return Math.round((completed / checklist.items.length) * 100);
  };
  
  /**
   * Check if all required items are completed
   * @param {Object} checklist - Checklist with items array
   * @returns {boolean}
   */
  export const areRequiredItemsComplete = (checklist) => {
    if (!checklist?.items) return true; // No items = nothing required
    const requiredItems = checklist.items.filter(item => item.requiredForScreenTime === true);
    if (requiredItems.length === 0) return true; // No required items
    return requiredItems.every(item => item.completed === true);
  };
  
  /**
   * Get counts of completed, incomplete, and required items
   * @param {Object} checklist - Checklist with items array
   * @returns {Object} - { total, completed, incomplete, required, requiredCompleted }
   */
  export const getChecklistStats = (checklist) => {
    if (!checklist?.items) {
      return { total: 0, completed: 0, incomplete: 0, required: 0, requiredCompleted: 0 };
    }
  
    const total = checklist.items.length;
    const completed = checklist.items.filter(item => item.completed).length;
    const incomplete = total - completed;
    const required = checklist.items.filter(item => item.requiredForScreenTime).length;
    const requiredCompleted = checklist.items.filter(
      item => item.requiredForScreenTime && item.completed
    ).length;
  
    return { total, completed, incomplete, required, requiredCompleted };
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
  
  /**
   * Generate a template object from a checklist instance
   * Strips instance-specific data (completion status, timestamps, etc.)
   * @param {Object} checklist - Checklist instance
   * @returns {Object} - Template object
   */
  export const generateTemplateFromChecklist = (checklist) => {
    return {
      id: checklist.id || `template_${Date.now()}`,
      name: checklist.name,
      items: checklist.items.map(item => ({
        id: item.id,
        name: item.name,
        requiredForScreenTime: item.requiredForScreenTime || false,
      })),
      defaultNotifyAdmin: checklist.notifyAdmin || false,
      defaultReminderTime: checklist.defaultReminderTime || null,
      createdAt: Date.now(),
    };
  };
  
  /**
   * Duplicate a checklist with new IDs
   * @param {Object} checklist - Checklist to duplicate
   * @param {string} newName - Optional new name (defaults to "Copy of [name]")
   * @returns {Object} - New checklist with new IDs
   */
  export const duplicateChecklist = (checklist, newName = null) => {
    const timestamp = Date.now();
    return {
      ...checklist,
      id: `checklist_${timestamp}`,
      name: newName || `Copy of ${checklist.name}`,
      items: checklist.items.map((item, index) => ({
        ...item,
        id: `item_${timestamp}_${index}`,
        completed: false, // Reset completion
      })),
      createdAt: timestamp,
    };
  };
  
  /**
   * Sort checklist items
   * @param {Array} items - Checklist items
   * @param {string} sortBy - 'default' | 'completed' | 'incomplete' | 'required'
   * @returns {Array} - Sorted items
   */
  export const sortChecklistItems = (items, sortBy = 'default') => {
    const sorted = [...items];
  
    switch (sortBy) {
      case 'completed':
        // Incomplete first, then completed
        return sorted.sort((a, b) => {
          if (a.completed === b.completed) return 0;
          return a.completed ? 1 : -1;
        });
  
      case 'incomplete':
        // Completed first, then incomplete
        return sorted.sort((a, b) => {
          if (a.completed === b.completed) return 0;
          return a.completed ? -1 : 1;
        });
  
      case 'required':
        // Required first, then others
        return sorted.sort((a, b) => {
          if (a.requiredForScreenTime === b.requiredForScreenTime) return 0;
          return a.requiredForScreenTime ? -1 : 1;
        });
  
      default:
        return sorted; // Original order
    }
  };
  
  /**
   * Check if checklist has unsaved changes
   * @param {Object} original - Original checklist
   * @param {Object} current - Current checklist
   * @returns {boolean}
   */
  export const hasUnsavedChanges = (original, current) => {
    if (!original || !current) return false;
  
    // Check name
    if (original.name !== current.name) return true;
  
    // Check items count
    if (original.items.length !== current.items.length) return true;
  
    // Check items content
    for (let i = 0; i < original.items.length; i++) {
      const origItem = original.items[i];
      const currItem = current.items[i];
  
      if (
        origItem.name !== currItem.name ||
        origItem.completed !== currItem.completed ||
        origItem.requiredForScreenTime !== currItem.requiredForScreenTime
      ) {
        return true;
      }
    }
  
    return false;
  };