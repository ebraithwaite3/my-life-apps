// src/utils/notificationUtils.js

/**
 * Helper function to gather users who want to be notified about a specific category
 * @param {string} notificationCategory - The notification category (e.g., 'deletedTasks', 'newTasks')
 * @param {string} groupId - The ID of the group to check
 * @param {Array} groups - Array of group objects
 * @param {Object} user - Current user object with userId
 * @returns {Array} Array of user IDs who want to be notified (excluding current user)
 */
export function gatherUsersToNotify(notificationCategory, groupId, groups, user) {
    const usersToNotify = new Set();
  
    // For the notification category, (e.g. deletedTasks), check in the group with the matching groupId
    // in the members array if notifyFor.deletedTasks is true, if so add that userId to the set
    const group = groups.find(g => g.groupId === groupId);
    if (group && group.members && Array.isArray(group.members)) {
      group.members.forEach(member => {
        console.log(`Member ${member.userId} notifyFor:`, member.notifyFor);
        if (member.notifyFor && 
            member.notifyFor[notificationCategory] && 
            member.userId !== user.userId) { // Exclude current user
          usersToNotify.add(member.userId);
        }
      });
    }
  
    return Array.from(usersToNotify);
  }