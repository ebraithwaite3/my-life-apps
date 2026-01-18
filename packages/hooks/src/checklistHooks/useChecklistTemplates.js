import { useState, useMemo } from 'react';
import { Alert } from 'react-native';
import { doc, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import { useAuth } from '../../../contexts/src/AuthContext';
import { useData } from '../../../contexts/src/DataContext';

/**
 * Clean a template - remove undefined fields and ensure completed is boolean
 */
const cleanTemplate = (template) => {
  const cleaned = {
    ...template,
    items: template.items.map(item => {
      const cleanedItem = {
        ...item,
        completed: item.completed === true,
      };
      
      // Handle sub-items if they exist
      if (item.subItems) {
        cleanedItem.subItems = item.subItems.map(sub => ({
          ...sub,
          completed: sub.completed === true,
        }));
      }
      
      return cleanedItem;
    }),
    updatedAt: new Date().toISOString(),
  };

  // Remove any undefined top-level fields
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });

  return cleaned;
};

/**
 * useChecklistTemplates - Manage checklist templates (CRUD operations)
 * 
 * Handles:
 * - Getting all templates (personal + group)
 * - Saving templates (create/update)
 * - Deleting templates
 * - Moving templates between personal/group contexts
 * - Determining available move targets
 */
export const useChecklistTemplates = () => {
  const { db } = useAuth();
  const { user, groups } = useData();
  const [isLoading, setIsLoading] = useState(false);

  // Get all templates from user and groups
  const allTemplates = useMemo(() => {
    const templates = [];

    // Personal templates
    if (user?.checklistTemplates) {
      user.checklistTemplates.forEach(template => {
        templates.push({
          ...template,
          userId: user.userId,
          isPersonal: true,
          contextType: 'personal',
        });
      });
    }

    // Group templates
    if (groups && groups.length > 0) {
      groups.forEach(group => {
        if (group?.checklistTemplates) {
          group.checklistTemplates.forEach(template => {
            templates.push({
              ...template,
              groupId: group.groupId || group.id,
              groupName: group.name || group.groupId,
              isGroupTemplate: true,
              contextType: 'group',
            });
          });
        }
      });
    }

    return templates;
  }, [user, groups]);

  /**
   * Save a template (create or update)
   * @param {Object} template - Template object to save
   * @param {Object} context - { type: 'personal' | 'group', groupId?: string, groupName?: string }
   * @returns {Promise<boolean>} - Success status
   */
  const saveTemplate = async (template, context) => {
    console.log('🔵 saveTemplate called');
    console.log('  Template:', template);
    console.log('  Context:', context);
    
    if (!context || !context.type) {
      console.error('❌ saveTemplate: context is required');
      Alert.alert('Error', 'Template context is required');
      return false;
    }
  
    setIsLoading(true);
  
    try {
      // Clean the template being saved
      const cleanedTemplate = cleanTemplate(template);
  
      console.log('🧹 Cleaned template:', cleanedTemplate);
  
      if (context.type === 'personal') {
        console.log('💾 Saving to PERSONAL templates');
        console.log('  User ID:', user?.userId);
        
        const currentTemplates = user?.checklistTemplates || [];
        const existingIndex = currentTemplates.findIndex(
          t => t.id === cleanedTemplate.id
        );
  
        console.log('  Existing index:', existingIndex);
  
        // IMPORTANT: Clean ALL templates before saving
        const updatedTemplates =
          existingIndex !== -1
            ? currentTemplates.map(t =>
                t.id === cleanedTemplate.id ? cleanedTemplate : cleanTemplate(t)
              )
            : [...currentTemplates.map(cleanTemplate), cleanedTemplate];
  
        console.log('  Updated templates count:', updatedTemplates.length);
        console.log('  Updating Firestore...');
  
        await updateDoc(doc(db, 'users', user.userId), {
          checklistTemplates: updatedTemplates,
        });
  
        console.log('✅ Firestore update completed');
      } else if (context.type === 'group') {
        console.log('💾 Saving to GROUP templates');
        console.log('  Group ID:', context.groupId);
        
        if (!context.groupId) {
          throw new Error('groupId is required for group templates');
        }
  
        const group = groups.find(
          g => (g.groupId || g.id) === context.groupId
        );
  
        console.log('  Found group:', group?.name);
        
        const currentTemplates = group?.checklistTemplates || [];
        const existingIndex = currentTemplates.findIndex(
          t => t.id === cleanedTemplate.id
        );
  
        console.log('  Existing index:', existingIndex);
  
        // IMPORTANT: Clean ALL templates before saving
        const updatedTemplates =
          existingIndex !== -1
            ? currentTemplates.map(t =>
                t.id === cleanedTemplate.id ? cleanedTemplate : cleanTemplate(t)
              )
            : [...currentTemplates.map(cleanTemplate), cleanedTemplate];
  
        console.log('  Updated templates count:', updatedTemplates.length);
        console.log('  Updating Firestore...');
  
        await updateDoc(doc(db, 'groups', context.groupId), {
          checklistTemplates: updatedTemplates,
        });
  
        console.log('✅ Firestore update completed');
      }
  
      console.log('✅ Template saved successfully:', cleanedTemplate.name);
      return true;
    } catch (error) {
      console.error('❌ Error saving template:', error);
      console.error('  Error details:', error.message);
      Alert.alert('Error', 'Failed to save template. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
      console.log('🔵 saveTemplate finished');
    }
  };

  /**
   * Delete a template
   * @param {Object} template - Template to delete (must have isGroupTemplate, groupId, or isPersonal)
   * @returns {Promise<boolean>} - Success status
   */
  const deleteTemplate = async (template) => {
    setIsLoading(true);

    try {
      if (template.isGroupTemplate) {
        const group = groups.find(
          g => (g.groupId || g.id) === template.groupId
        );
        const updatedTemplates =
          group?.checklistTemplates?.filter(
            t => t.id !== template.id
          ) || [];

        await updateDoc(doc(db, 'groups', template.groupId), {
          checklistTemplates: updatedTemplates,
        });
      } else {
        const updatedTemplates =
          user?.checklistTemplates?.filter(
            t => t.id !== template.id
          ) || [];

        await updateDoc(doc(db, 'users', user.userId), {
          checklistTemplates: updatedTemplates,
        });
      }

      console.log('✅ Template deleted successfully:', template.name);
      return true;
    } catch (error) {
      console.error('❌ Error deleting template:', error);
      Alert.alert('Error', 'Failed to delete template.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Move a template between personal and group contexts
   * @param {Object} template - Template to move
   * @param {Object} targetContext - { type: 'personal' | 'group', groupId?: string, groupName?: string }
   * @returns {Promise<boolean>} - Success status
   */
  const moveTemplate = async (template, targetContext) => {
    setIsLoading(true);

    try {
      // Step 1: Remove from current location
      if (template.isGroupTemplate) {
        const group = groups.find(
          g => (g.groupId || g.id) === template.groupId
        );
        const updatedTemplates =
          group?.checklistTemplates?.filter(t => t.id !== template.id) || [];

        await updateDoc(doc(db, 'groups', template.groupId), {
          checklistTemplates: updatedTemplates,
        });
      } else {
        const updatedTemplates =
          user?.checklistTemplates?.filter(t => t.id !== template.id) || [];

        await updateDoc(doc(db, 'users', user.userId), {
          checklistTemplates: updatedTemplates,
        });
      }

      // Step 2: Clean template (remove context-specific fields)
      const cleanedTemplate = {
        id: template.id,
        name: template.name,
        items: template.items,
        createdAt: template.createdAt,
        updatedAt: new Date().toISOString(),
      };

      if (template.defaultNotifyAdmin) {
        cleanedTemplate.defaultNotifyAdmin = true;
      }
      if (template.defaultReminderTime) {
        cleanedTemplate.defaultReminderTime = template.defaultReminderTime;
      }

      // Step 3: Add to new location
      if (targetContext.type === 'personal') {
        await updateDoc(doc(db, 'users', user.userId), {
          checklistTemplates: [
            ...(user?.checklistTemplates || []),
            cleanedTemplate,
          ],
        });
      } else {
        const group = groups.find(
          g => (g.groupId || g.id) === targetContext.groupId
        );

        await updateDoc(doc(db, 'groups', targetContext.groupId), {
          checklistTemplates: [
            ...(group?.checklistTemplates || []),
            cleanedTemplate,
          ],
        });
      }

      console.log('✅ Template moved successfully:', template.name);
      return true;
    } catch (error) {
      console.error('❌ Error moving template:', error);
      Alert.alert('Error', 'Failed to move template.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get available move targets for a template
   * @param {Object} template - Template to get move targets for
   * @returns {Array} - Array of { type, groupId?, groupName? }
   */
  const getAvailableMoveTargets = (template) => {
    const targets = [];

    if (template.isGroupTemplate) {
      // Can move to personal
      targets.push({ type: 'personal' });

      // Can move to other groups
      groups.forEach(group => {
        const groupId = group.groupId || group.id;
        if (groupId !== template.groupId) {
          targets.push({
            type: 'group',
            groupId,
            groupName: group.name || groupId,
          });
        }
      });
    } else {
      // Personal template can move to any group
      groups.forEach(group => {
        targets.push({
          type: 'group',
          groupId: group.groupId || group.id,
          groupName: group.name || group.groupId,
        });
      });
    }

    return targets;
  };

  /**
 * Updates the order field for multiple templates in a single batch operation
 * Used when user manually reorders templates in custom sort mode
 * Since templates are stored as an array field in user/group docs, we need to:
 * 1. Add order index to each template
 * 2. Group templates by their parent document (user or group)
 * 3. Update each parent document's checklistTemplates array
 * @param {Array} orderedTemplates - Array of template objects in their new order
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
const updateTemplateOrder = async (orderedTemplates) => {
  try {
    // Add order index to each template
    const templatesWithOrder = orderedTemplates.map((template, index) => ({
      ...template,
      order: index,
      updatedAt: new Date().toISOString(),
    }));

    // Group templates by their parent document
    const groupedTemplates = {};
    
    templatesWithOrder.forEach(template => {
      const key = template.contextType === 'group' 
        ? `group_${template.groupId}`
        : `user_${template.userId}`; // Use template.userId instead of user.uid
      
      if (!groupedTemplates[key]) {
        groupedTemplates[key] = [];
      }
      groupedTemplates[key].push(template);
    });

    // Update each parent document
    const batch = writeBatch(db);
    
    for (const [key, templates] of Object.entries(groupedTemplates)) {
      const isGroup = key.startsWith('group_');
      const docPath = isGroup 
        ? `groups/${key.replace('group_', '')}`
        : `users/${key.replace('user_', '')}`;
      
      const docRef = doc(db, docPath);
      
      // Get current document to preserve templates not in the reorder list
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentTemplates = docSnap.data().checklistTemplates || [];
        
        // Create a map of updated templates by ID
        const updatedMap = new Map(templates.map(t => [t.id, t]));
        
        // Update templates that are in our list, keep others unchanged
        const updatedTemplates = currentTemplates.map(t => 
          updatedMap.has(t.id) ? updatedMap.get(t.id) : t
        );
        
        // Sort by order field (templates with order come first, sorted by order)
        updatedTemplates.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          if (a.order !== undefined) return -1;
          if (b.order !== undefined) return 1;
          return 0;
        });
        
        batch.update(docRef, { checklistTemplates: updatedTemplates });
      }
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error updating template order:', error);
    Alert.alert('Error', 'Failed to update template order');
    return false;
  }
};

  /**
   * Prompt user to select context (personal or group) for saving
   * @param {Function} onSelect - Callback with selected context
   */
  const promptForContext = (onSelect) => {
    if (!groups || groups.length === 0) {
      // No groups, use personal
      onSelect({ type: 'personal' });
      return;
    }

    // Show alert with options
    Alert.alert(
      'Save Template',
      'Where would you like to save this template?',
      [
        {
          text: 'Personal Template',
          onPress: () => onSelect({ type: 'personal' }),
        },
        ...groups.map(group => ({
          text: `${group.name || group.groupId} Template`,
          onPress: () =>
            onSelect({
              type: 'group',
              groupId: group.groupId || group.id,
              groupName: group.name || group.groupId,
            }),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return {
    allTemplates,
    saveTemplate,
    deleteTemplate,
    moveTemplate,
    getAvailableMoveTargets,
    updateTemplateOrder,
    promptForContext,
    isLoading,
  };
};