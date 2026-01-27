import * as Crypto from 'expo-crypto';
import { DateTime } from 'luxon';

const uuidv4 = () => Crypto.randomUUID();

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

      if (hasSubItems) {
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
        baseItem.yesNoConfig = item.yesNoConfig;
      }
      
      if (hasSubItems) {
        baseItem.subItems = item.subItems
          .filter(sub => sub.name.trim())
          .map(sub => ({
            id: sub.id,
            name: sub.name.trim(),
            itemType: 'checkbox',
            parentId: item.id,
            completed: isTemplate ? undefined : sub.completed ?? false,
          }));
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