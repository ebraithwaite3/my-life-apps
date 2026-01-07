/**
 * Exercise Utilities
 * Helper functions for working with the workout catalog
 */

/**
 * Get exercise by ID
 * @param {Array} exercises - Array of exercises from catalog
 * @param {string} exerciseId - Exercise ID to find
 * @returns {Object|null} - Exercise object or null
 */
export const getExerciseById = (exercises, exerciseId) => {
    if (!exercises || !exerciseId) return null;
    return exercises.find(ex => ex.id === exerciseId) || null;
  };
  
  /**
   * Get exercises by category
   * @param {Array} exercises - Array of exercises from catalog
   * @param {string} category - Category to filter by
   * @returns {Array} - Filtered exercises
   */
  export const getExercisesByCategory = (exercises, category) => {
    if (!exercises || !category) return [];
    return exercises.filter(ex => ex.category === category);
  };
  
  /**
   * Get exercises by tracking field
   * @param {Array} exercises - Array of exercises from catalog
   * @param {string} trackingField - Tracking field to filter by (e.g., "weight", "time")
   * @returns {Array} - Filtered exercises
   */
  export const getExercisesByTracking = (exercises, trackingField) => {
    if (!exercises || !trackingField) return [];
    return exercises.filter(ex => 
      ex.tracking && ex.tracking.includes(trackingField)
    );
  };
  
  /**
   * Group exercises by category
   * @param {Array} exercises - Array of exercises from catalog
   * @returns {Object} - Object with categories as keys
   */
  export const groupExercisesByCategory = (exercises) => {
    if (!exercises) return {};
    
    return exercises.reduce((acc, exercise) => {
      const category = exercise.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(exercise);
      return acc;
    }, {});
  };
  
  /**
   * Get all unique categories
   * @param {Array} exercises - Array of exercises from catalog
   * @returns {Array} - Array of unique category names
   */
  export const getAllCategories = (exercises) => {
    if (!exercises) return [];
    
    const categories = new Set();
    exercises.forEach(ex => {
      if (ex.category) {
        categories.add(ex.category);
      }
    });
    
    return Array.from(categories).sort();
  };
  
  /**
   * Get exercise names from template
   * @param {Array} templateExercises - Array of {exerciseId, order} from template
   * @param {Array} catalogExercises - Full exercise catalog
   * @returns {Array} - Array of exercise names
   */
  export const getExerciseNamesFromTemplate = (templateExercises, catalogExercises) => {
    if (!templateExercises || !catalogExercises) return [];
    
    return templateExercises
      .sort((a, b) => a.order - b.order)
      .map(te => {
        const exercise = getExerciseById(catalogExercises, te.exerciseId);
        return exercise ? exercise.name : 'Unknown Exercise';
      });
  };
  
  /**
   * Get categories from template exercises
   * @param {Array} templateExercises - Array of {exerciseId, order} from template
   * @param {Array} catalogExercises - Full exercise catalog
   * @returns {Array} - Array of unique categories
   */
  export const getCategoriesFromTemplate = (templateExercises, catalogExercises) => {
    if (!templateExercises || !catalogExercises) return [];
    
    const categories = new Set();
    templateExercises.forEach(te => {
      const exercise = getExerciseById(catalogExercises, te.exerciseId);
      if (exercise && exercise.category) {
        categories.add(exercise.category);
      }
    });
    
    return Array.from(categories);
  };
  
  /**
   * Search exercises by name (case-insensitive)
   * @param {Array} exercises - Array of exercises from catalog
   * @param {string} searchTerm - Search term
   * @returns {Array} - Matching exercises
   */
  export const searchExercises = (exercises, searchTerm) => {
    if (!exercises || !searchTerm) return exercises || [];
    
    const term = searchTerm.toLowerCase();
    return exercises.filter(ex => 
      ex.name.toLowerCase().includes(term)
    );
  };
  
  /**
   * Validate exercise IDs exist in catalog
   * @param {Array} exerciseIds - Array of exercise IDs to validate
   * @param {Array} catalogExercises - Full exercise catalog
   * @returns {Object} - {valid: Array, invalid: Array}
   */
  export const validateExerciseIds = (exerciseIds, catalogExercises) => {
    if (!exerciseIds || !catalogExercises) {
      return { valid: [], invalid: exerciseIds || [] };
    }
    
    const valid = [];
    const invalid = [];
    
    exerciseIds.forEach(id => {
      const exercise = getExerciseById(catalogExercises, id);
      if (exercise) {
        valid.push(id);
      } else {
        invalid.push(id);
      }
    });
    
    return { valid, invalid };
  };