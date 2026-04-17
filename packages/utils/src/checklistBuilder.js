import * as Crypto from 'expo-crypto';
import { DateTime } from 'luxon';

const uuidv4 = () => Crypto.randomUUID();

// yesNo types whose sub-items are generated at runtime (answer time) — not static editor content
const RUNTIME_YESNO_TYPES = ['multiChoice', 'fillIn', 'guided', 'assignable'];

const stripRuntimeYesNoState = (config) => {
  if (!config) return config;
  const { answered, answer, ...staticConfig } = config;
  return staticConfig;
};

export const buildChecklistObject = ({
  checklistName,
  items,
  isEditing,
  isTemplate,
  checklist,
  reminderMinutes,
  reminderTime,
  notifyAdminOnCompletion,
  defaultNotifyAdmin,
  defaultReminderTime,
  defaultIsRecurring,        // ✅ NEW
  defaultRecurringConfig,    // ✅ NEW
  hasEventTime,
  eventStartTime,
}) => {
  const validItems = items
    .filter((i) => i.name.trim())
    .map((item) => {
      const baseItem = {
        id: item.id,
        name: item.name.trim(),
        completed: isTemplate ? undefined : item.completed ?? false,
      };

      const hasSubItems = item.subItems && item.subItems.length > 0 && 
                          item.subItems.some(sub => sub.name.trim());

      if (hasSubItems && item.itemType !== 'yesNo') {
        baseItem.itemType = 'group';
      } else if (item.itemType && item.itemType !== "checkbox") {
        baseItem.itemType = item.itemType;
      }

      if (item.requiredForScreenTime) {
        baseItem.requiredForScreenTime = true;
      }
      if (item.requiresParentApproval) {
        baseItem.requiresParentApproval = true;
      }
      if (item.yesNoConfig) {
        baseItem.yesNoConfig = isTemplate
          ? stripRuntimeYesNoState(item.yesNoConfig)
          : item.yesNoConfig;
      }
      if (item.checklistLinkConfig) {
        baseItem.checklistLinkConfig = item.checklistLinkConfig;
      }
      if (item.link) {
        baseItem.link = item.link;
      }
      if (item.sourceChecklistId) {
        baseItem.sourceChecklistId = item.sourceChecklistId;
      }
      if (item.sourceItemId) {
        baseItem.sourceItemId = item.sourceItemId;
      }

      // For templates: skip runtime-generated sub-items (multiChoice/fillIn/guided answers).
      // Keep static sub-items (header type, plain groups).
      const shouldIncludeSubItems = hasSubItems && (
        !isTemplate ||
        item.itemType !== 'yesNo' ||
        !RUNTIME_YESNO_TYPES.includes(item.yesNoConfig?.type)
      );

      if (shouldIncludeSubItems) {
        baseItem.subItems = item.subItems
          .filter(sub => sub.name.trim())
          .map(sub => {
            const baseSub = {
              id: sub.id,
              name: sub.name.trim(),
              parentId: item.id,
              completed: isTemplate ? undefined : sub.completed ?? false,
              ...(sub.sourceChecklistId && { sourceChecklistId: sub.sourceChecklistId }),
              ...(sub.sourceItemId && { sourceItemId: sub.sourceItemId }),
            };
            if (sub.itemType === 'yesNo') {
              baseSub.itemType = 'yesNo';
              baseSub.yesNoConfig = isTemplate
                ? stripRuntimeYesNoState(sub.yesNoConfig)
                : sub.yesNoConfig;
            } else if (sub.itemType === 'checklistLink') {
              baseSub.itemType = 'checklistLink';
              if (sub.checklistLinkConfig) baseSub.checklistLinkConfig = sub.checklistLinkConfig;
            } else {
              baseSub.itemType = 'checkbox';
            }
            // Preserve these regardless of type
            if (sub.link) baseSub.link = sub.link;
            if (sub.requiredForScreenTime) baseSub.requiredForScreenTime = true;
            if (sub.requiresParentApproval) baseSub.requiresParentApproval = true;
            return baseSub;
          });
      }

      return baseItem;
    });

  const newChecklist = {
    id: isEditing ? checklist.id : uuidv4(),
    name: checklistName.trim(),
    items: validItems,
    createdAt: isEditing ? checklist.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isTemplate) {
    // ✅ TEMPLATES: Save default values
    if (defaultNotifyAdmin) {
      newChecklist.defaultNotifyAdmin = true;
    }
    if (defaultReminderTime) {
      newChecklist.defaultReminderTime = defaultReminderTime;
    }
    if (defaultIsRecurring) {
      newChecklist.defaultIsRecurring = true;
      newChecklist.defaultRecurringConfig = defaultRecurringConfig;
    }
  } else {
    // REGULAR CHECKLISTS: Save actual values
    if (notifyAdminOnCompletion) {
      newChecklist.notifyAdmin = true;
    }

    // Note: Reminders for regular checklists are now handled via pendingNotifications collection
    // These fields (reminderMinutes, reminderTime) are legacy and only used for calendar events
    if (hasEventTime && reminderMinutes !== null) {
      const eventTime = DateTime.fromISO(eventStartTime.toISOString());
      const reminderTimeObj = DateTime.fromISO(reminderMinutes);
      const minutesBefore = Math.round(eventTime.diff(reminderTimeObj, 'minutes').minutes);
      
      newChecklist.reminderMinutes = minutesBefore;
    } else if (!hasEventTime && reminderTime) {
      newChecklist.reminderTime = reminderTime;
    }
  }

  return newChecklist;
};