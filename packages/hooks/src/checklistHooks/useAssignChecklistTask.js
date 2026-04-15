import { DateTime } from 'luxon';
import { getDocument, setDocument } from '@my-apps/services';
import * as Crypto from 'expo-crypto';
import { getFunctions, httpsCallable } from 'firebase/functions';

const uuidv4 = () => Crypto.randomUUID();

/**
 * useAssignChecklistTask
 *
 * Appends a task to each assigned member's checklist event.
 *
 * Admin (self-assign): handled OUTSIDE this hook — caller just pushes the item
 * into the local items state and the normal onItemToggle save path handles it.
 *
 * Kids: find their "[Name] Checklist" event for today in
 *   calendars/{member.calendarId}/months/{monthKey}
 * and append the task item to the checklist activity's items array.
 *
 * Requires: member has { userId, name, calendarId } in their group member doc.
 */
export const useAssignChecklistTask = () => {

  const assignTask = async ({ members, taskName, currentUserId }) => {
    const results = [];
    const today = DateTime.now().toFormat('yyyy-MM-dd');
    const monthKey = DateTime.now().toFormat('yyyy-MM');

    for (const member of members) {
      if (member.userId === currentUserId) continue; // admin self-assign handled by caller

      if (!member.calendarId) {
        console.warn(`⚠️ No calendarId on member ${member.name || member.userId} — skipping`);
        results.push({ memberId: member.userId, success: false, error: 'No calendarId on member' });
        continue;
      }

      try {
        const monthPath = `calendars/${member.calendarId}/months`;
        const monthDoc = await getDocument(monthPath, monthKey);

        if (!monthDoc?.events) {
          console.warn(`⚠️ No events found for ${member.name} in ${monthKey}`);
          results.push({ memberId: member.userId, success: false, error: 'No events this month' });
          continue;
        }

        // Find their checklist event for today
        const eventsMap = monthDoc.events;
        const memberName = (member.name || '').toLowerCase();
        let targetEventId = null;
        let targetEvent = null;

        for (const [evId, ev] of Object.entries(eventsMap)) {
          const title = (ev.title || ev.summary || '').toLowerCase();
          const startDate = (ev.startTime || ev.start?.dateTime || ev.start?.date || '').slice(0, 10);
          if (title.includes(memberName) && title.includes('checklist') && startDate === today) {
            targetEventId = evId;
            targetEvent = ev;
            break;
          }
        }

        if (!targetEvent) {
          console.warn(`⚠️ No checklist event found for ${member.name} on ${today}`);
          results.push({ memberId: member.userId, success: false, error: `No checklist event found for ${member.name} today` });
          continue;
        }

        // Find the checklist activity and append the new item
        const activities = targetEvent.activities || [];
        const checklistActivityIdx = activities.findIndex(a => a.activityType === 'checklist');

        let updatedActivities;
        if (checklistActivityIdx !== -1) {
          const activity = activities[checklistActivityIdx];
          const existingItems = activity.items || [];
          // Idempotency: skip if same task name already exists
          if (existingItems.some(i => i.name?.toLowerCase() === taskName.toLowerCase())) {
            console.log(`ℹ️ Task "${taskName}" already exists for ${member.name} — skipping`);
            results.push({ memberId: member.userId, success: true, skipped: true });
            continue;
          }
          const newItem = { id: uuidv4(), name: taskName, itemType: 'checkbox', completed: false };
          updatedActivities = activities.map((a, idx) =>
            idx === checklistActivityIdx
              ? { ...a, items: [...existingItems, newItem] }
              : a
          );
        } else {
          // No checklist activity yet — create one
          const newItem = { id: uuidv4(), name: taskName, itemType: 'checkbox', completed: false };
          updatedActivities = [
            ...activities,
            { id: uuidv4(), activityType: 'checklist', items: [newItem] },
          ];
        }

        // Write back
        const updatedEventsMap = {
          ...eventsMap,
          [targetEventId]: { ...targetEvent, activities: updatedActivities },
        };
        await setDocument(monthPath, monthKey, { ...monthDoc, events: updatedEventsMap });

        console.log(`✅ Assigned "${taskName}" to ${member.name}`);
        results.push({ memberId: member.userId, success: true });

        // Send push notification to member
        try {
          const functions = getFunctions();
          const sendBatch = httpsCallable(functions, 'sendBatchPushNotification');
          await sendBatch({
            userIds: [member.userId],
            title: 'New task added to your checklist!',
            body: taskName,
            data: { app: 'checklist-app' },
          });
        } catch (notifErr) {
          console.warn(`⚠️ Notification failed for ${member.name}:`, notifErr.message);
        }

      } catch (err) {
        console.error(`❌ Error assigning to ${member.name}:`, err);
        results.push({ memberId: member.userId, success: false, error: err.message });
      }
    }

    return results;
  };

  return { assignTask };
};
