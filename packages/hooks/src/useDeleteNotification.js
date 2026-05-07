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

            const existing = snap.data().notifications || [];
            // Match on id (was notificationId) or eventId
            const filtered = existing.filter(
                (n) => n.id !== identifier && n.eventId !== identifier
            );
            const deletedCount = existing.length - filtered.length;

            if (deletedCount === 0) {
                console.log(`ℹ️ No notifications found in masterConfig for:`, identifier);
                return { success: true, deletedCount: 0 };
            }

            await setDoc(configRef, { notifications: filtered }, { merge: true });
            console.log(`✅ Deleted ${deletedCount} notification(s) from masterConfig for:`, identifier);
            return { success: true, deletedCount };
        } catch (err) {
            console.error('❌ Error deleting notification', err);
            return { success: false, error: err.message };
        }
    };

    return deleteNotification;
};
