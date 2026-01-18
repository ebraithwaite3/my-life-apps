/**
 * Sort items alphabetically by name
 */
export const sortByName = (items, ascending = true) => {
    return [...items].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return ascending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
  };
  
  /**
   * Sort items by date created
   */
  export const sortByDateCreated = (items, newest = true) => {
    return [...items].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return newest ? dateB - dateA : dateA - dateB;
    });
  };
  
  /**
   * Sort items by last used
   */
  export const sortByLastUsed = (items, mostRecent = true) => {
    return [...items].sort((a, b) => {
      const dateA = new Date(a.lastUsed || 0).getTime();
      const dateB = new Date(b.lastUsed || 0).getTime();
      
      // Items without lastUsed go to the end
      if (!a.lastUsed && !b.lastUsed) return 0;
      if (!a.lastUsed) return 1;
      if (!b.lastUsed) return -1;
      
      return mostRecent ? dateB - dateA : dateA - dateB;
    });
  };
  
  /**
   * Apply sorting based on sort type
   */
  export const applySorting = (items, sortType) => {
    const sorted = [...items];
  
    switch (sortType) {
      case 'a-z':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'z-a':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
      
      case 'oldest':
        return sorted.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
      
      case 'custom':
        // Sort by order field, fallback to createdAt if no order exists
        return sorted.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          if (a.order !== undefined) return -1;
          if (b.order !== undefined) return 1;
          return new Date(a.createdAt) - new Date(b.createdAt);
        });
      
      default:
        return sorted;
    }
  };