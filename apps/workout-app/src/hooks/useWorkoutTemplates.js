import { useState, useMemo } from 'react';
import { Alert } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@my-apps/contexts';
import { useData } from '@my-apps/contexts';

/**
 * useWorkoutTemplates - Manage workout templates (CRUD operations)
 * 
 * Handles:
 * - Getting all templates (personal + group)
 * - Saving templates (create/update)
 * - Deleting templates
 * - Moving templates between personal/group contexts
 * - Determining available move targets
 */
export const useWorkoutTemplates = () => {
  const { db } = useAuth();
  const { user, groups } = useData();
  const [isLoading, setIsLoading] = useState(false);

  // Get all templates from user and groups
  const allTemplates = useMemo(() => {
    const templates = [];

    // Personal templates
    if (user?.workoutTemplates) {
      user.workoutTemplates.forEach(template => {
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
        if (group?.workoutTemplates) {
          group.workoutTemplates.forEach(template => {
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
  console.log('📋 useWorkoutTemplates: allTemplates count =', allTemplates.length);

  /**
   * Save a template (create or update)
   * @param {Object} template - Template object to save
   * @param {Object} context - { type: 'personal' | 'group', groupId?: string, groupName?: string }
   * @returns {Promise<boolean>} - Success status
   */
  const saveTemplate = async (template, context) => {
    if (!context || !context.type) {
      console.error('❌ saveTemplate: context is required');
      Alert.alert('Error', 'Template context is required');
      return false;
    }

    setIsLoading(true);

    try {
      // Clean template (ensure proper structure)
      const cleanedTemplate = {
        ...template,
        exercises: template.exercises || [],
        updatedAt: new Date().toISOString(),
      };

      if (!cleanedTemplate.createdAt) {
        cleanedTemplate.createdAt = new Date().toISOString();
      }

      if (context.type === 'personal') {
        const currentTemplates = user?.workoutTemplates || [];
        const existingIndex = currentTemplates.findIndex(
          t => t.id === cleanedTemplate.id
        );

        const updatedTemplates =
          existingIndex !== -1
            ? currentTemplates.map(t =>
                t.id === cleanedTemplate.id ? cleanedTemplate : t
              )
            : [...currentTemplates, cleanedTemplate];

        await updateDoc(doc(db, 'users', user.userId), {
          workoutTemplates: updatedTemplates,
        });
      } else if (context.type === 'group') {
        if (!context.groupId) {
          throw new Error('groupId is required for group templates');
        }

        const group = groups.find(
          g => (g.groupId || g.id) === context.groupId
        );

        const currentTemplates = group?.workoutTemplates || [];
        const existingIndex = currentTemplates.findIndex(
          t => t.id === cleanedTemplate.id
        );

        const updatedTemplates =
          existingIndex !== -1
            ? currentTemplates.map(t =>
                t.id === cleanedTemplate.id ? cleanedTemplate : t
              )
            : [...currentTemplates, cleanedTemplate];

        await updateDoc(doc(db, 'groups', context.groupId), {
          workoutTemplates: updatedTemplates,
        });
      }

      console.log('✅ Workout template saved successfully:', cleanedTemplate.name);
      return true;
    } catch (error) {
      console.error('❌ Error saving workout template:', error);
      Alert.alert('Error', 'Failed to save template. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete a template
   * @param {Object} template - Template to delete
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
          group?.workoutTemplates?.filter(
            t => t.id !== template.id
          ) || [];

        await updateDoc(doc(db, 'groups', template.groupId), {
          workoutTemplates: updatedTemplates,
        });
      } else {
        const updatedTemplates =
          user?.workoutTemplates?.filter(
            t => t.id !== template.id
          ) || [];

        await updateDoc(doc(db, 'users', user.userId), {
          workoutTemplates: updatedTemplates,
        });
      }

      console.log('✅ Workout template deleted successfully:', template.name);
      return true;
    } catch (error) {
      console.error('❌ Error deleting workout template:', error);
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
          group?.workoutTemplates?.filter(t => t.id !== template.id) || [];

        await updateDoc(doc(db, 'groups', template.groupId), {
          workoutTemplates: updatedTemplates,
        });
      } else {
        const updatedTemplates =
          user?.workoutTemplates?.filter(t => t.id !== template.id) || [];

        await updateDoc(doc(db, 'users', user.userId), {
          workoutTemplates: updatedTemplates,
        });
      }

      // Step 2: Clean template (remove context-specific fields)
      const cleanTemplate = {
        id: template.id,
        name: template.name,
        exercises: template.exercises,
        createdAt: template.createdAt,
        updatedAt: new Date().toISOString(),
      };

      if (template.lastUsed) {
        cleanTemplate.lastUsed = template.lastUsed;
      }

      // Step 3: Add to new location
      if (targetContext.type === 'personal') {
        await updateDoc(doc(db, 'users', user.userId), {
          workoutTemplates: [
            ...(user?.workoutTemplates || []),
            cleanTemplate,
          ],
        });
      } else {
        const group = groups.find(
          g => (g.groupId || g.id) === targetContext.groupId
        );

        await updateDoc(doc(db, 'groups', targetContext.groupId), {
          workoutTemplates: [
            ...(group?.workoutTemplates || []),
            cleanTemplate,
          ],
        });
      }

      console.log('✅ Workout template moved successfully:', template.name);
      return true;
    } catch (error) {
      console.error('❌ Error moving workout template:', error);
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
      'Save Workout Template',
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
    promptForContext,
    isLoading,
  };
};