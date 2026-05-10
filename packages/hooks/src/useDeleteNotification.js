import { useAuth } from '@my-apps/contexts';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const useDeleteNotification = () => {
    const { user: authUser, db } = useAuth();

    const deleteNotification = async (identifier, overrideUserId = null) => {
        try {
            const userId = overrideUserId || authUser?.uid;
            if (!userId) return { success: true, deletedCount: 0 };

            const configRef = doc(db, 'masterConfig', userId);
            const snap = await getDoc(configRef);
            if (!snap.exists()) return { success: true, deletedCount: 0 };

            const existing = snap.data().reminders || [];
            // Match on id or eventId (eventId match is legacy fallback)
            const filtered = existing.filter(
                (r) => r.id !== identifier && r.eventId !== identifier
            );
            const deletedCount = existing.length - filtered.length;

            if (deletedCount === 0) {
                console.log(`ℹ️ No reminders found in masterConfig for:`, identifier);
                return { success: true, deletedCount: 0 };
            }

            await setDoc(configRef, { reminders: filtered }, { merge: true });
            console.log(`✅ Deleted ${deletedCount} reminder(s) from masterConfig for:`, identifier);
            return { success: true, deletedCount };
        } catch (err) {
            console.error('❌ Error deleting notification', err);
            return { success: false, error: err.message };
        }
    };

    return deleteNotification;
};
