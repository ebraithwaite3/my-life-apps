import { useAuth } from '@my-apps/contexts';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

export const useDeleteNotification = () => {
    const { user: authUser, db } = useAuth();

    const deleteNotification = async (identifier) => {
        try {
            console.log(`🗑️ Searching for notifications with identifier:`, identifier);
            
            const notificationsRef = collection(db, 'pendingNotifications');
            
            // First try searching by notificationId (for checklists/activities)
            let q = query(notificationsRef, where('notificationId', '==', identifier));
            let querySnapshot = await getDocs(q);

            // If not found, try searching by eventId (for events)
            if (querySnapshot.empty) {
                console.log(`ℹ️ No notifications found by notificationId, trying eventId`);
                q = query(notificationsRef, where('eventId', '==', identifier));
                querySnapshot = await getDocs(q);
            }

            if (querySnapshot.empty) {
                console.log(`ℹ️ No pending notifications found for:`, identifier);
                return { success: true, deletedCount: 0 };
            }

            console.log(`📋 Found ${querySnapshot.size} notification(s) to delete`);

            let deletedCount = 0;

            for (const docSnap of querySnapshot.docs) {
                await deleteDoc(docSnap.ref);
                console.log(`✅ Deleted notification:`, docSnap.id);
                deletedCount++;
            }

            console.log(`✅ Deleted ${deletedCount} notification(s) for:`, identifier);

            return { success: true, deletedCount };
        } catch (err) {
            console.error('❌ Error deleting notification', err);
            return { success: false, error: err.message };
        }
    };

    return deleteNotification;
};