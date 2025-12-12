import { useAuth } from '@my-apps/contexts';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

export const useDeleteNotification = () => {
    const { user: authUser, db } = useAuth();

    const deleteNotification = async (eventId) => {
        try {
            console.log(`🗑️ Searching for notifications with eventId:`, eventId);
            
            // Query the collection for documents where eventId matches
            const notificationsRef = collection(db, 'pendingNotifications');
            const q = query(notificationsRef, where('eventId', '==', eventId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log(`ℹ️ No pending notifications found for eventId:`, eventId);
                return { success: true, deletedCount: 0 };
            }

            console.log(`📋 Found ${querySnapshot.size} notification(s) to delete`);

            let deletedCount = 0;

            // Delete each matching document
            for (const docSnap of querySnapshot.docs) {
                await deleteDoc(docSnap.ref);
                console.log(`✅ Deleted notification:`, docSnap.id);
                deletedCount++;
            }

            console.log(`✅ Deleted ${deletedCount} notification(s) for eventId:`, eventId);

            return { success: true, deletedCount };
        } catch (err) {
            console.error('❌ Error deleting notification', err);
            return { success: false, error: err.message };
        }
    };

    return deleteNotification;
};