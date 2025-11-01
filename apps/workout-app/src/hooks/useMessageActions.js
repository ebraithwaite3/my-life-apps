import React, { useCallback } from "react";
import { updateDocument, deleteDocument, getDocument } from "../services/firestoreService";
import { DateTime } from "luxon";

export const useMessageActions = () => {

    // Function to mark messages as read - always expects an array of messageIds
    const markMessagesAsRead = useCallback(async (userId, messageIds) => {
        console.log("markMessagesAsRead called with:", { userId, messageIds });
        if (!userId || !messageIds || !Array.isArray(messageIds) || messageIds.length === 0) return;
        
        try {
            // Get the user's messages document
            const messagesDoc = await getDocument('messages', userId);
            
            if (!messagesDoc || !messagesDoc.messages) {
                console.warn('No messages document found for user:', userId);
                return { success: false, count: 0 };
            }

            // Update the messages in the array
            const updatedMessages = messagesDoc.messages.map(message => {
                if (messageIds.includes(message.messageId)) {
                    return {
                        ...message,
                        read: true,
                        readAt: DateTime.now().toISO()
                    };
                }
                return message;
            });

            // Update the document with the modified messages array
            await updateDocument('messages', userId, {
                messages: updatedMessages,
                updatedAt: DateTime.now().toISO()
            });

            console.log(`Marked ${messageIds.length} message(s) as read for user ${userId}`);
            return { success: true, count: messageIds.length };
        } catch (error) {
            console.error('Error marking messages as read:', error);
            throw error;
        }
    }, []);

    // Function to mark messages as unread - always expects an array of messageIds
    const markMessagesAsUnread = useCallback(async (userId, messageIds) => {
        console.log("markMessagesAsUnread called with:", { userId, messageIds });
        if (!userId || !messageIds || !Array.isArray(messageIds) || messageIds.length === 0) return;
        
        try {
            // Get the user's messages document
            const messagesDoc = await getDocument('messages', userId);
            
            if (!messagesDoc || !messagesDoc.messages) {
                console.warn('No messages document found for user:', userId);
                return { success: false, count: 0 };
            }

            // Update the messages in the array
            const updatedMessages = messagesDoc.messages.map(message => {
                if (messageIds.includes(message.messageId)) {
                    return {
                        ...message,
                        read: false,
                        readAt: null
                    };
                }
                return message;
            });

            // Update the document with the modified messages array
            await updateDocument('messages', userId, {
                messages: updatedMessages,
                updatedAt: DateTime.now().toISO()
            });

            console.log(`Marked ${messageIds.length} message(s) as unread for user ${userId}`);
            return { success: true, count: messageIds.length };
        } catch (error) {
            console.error('Error marking messages as unread:', error);
            throw error;
        }
    }, []);

    // Function to delete messages - always expects an array of messageIds
    const deleteMessages = useCallback(async (userId, messageIds) => {
        console.log("deleteMessages called with:", { userId, messageIds });
        if (!userId || !messageIds || !Array.isArray(messageIds) || messageIds.length === 0) return;
        
        try {
            // Get the user's messages document
            const messagesDoc = await getDocument('messages', userId);
            
            if (!messagesDoc || !messagesDoc.messages) {
                console.warn('No messages document found for user:', userId);
                return { success: false, count: 0 };
            }

            // Filter out the messages to delete
            const updatedMessages = messagesDoc.messages.filter(message => 
                !messageIds.includes(message.messageId)
            );

            // Update the document with the filtered messages array
            await updateDocument('messages', userId, {
                messages: updatedMessages,
                updatedAt: DateTime.now().toISO()
            });

            console.log(`Deleted ${messageIds.length} message(s) for user ${userId}`);
            return { success: true, count: messageIds.length };
        } catch (error) {
            console.error('Error deleting messages:', error);
            throw error;
        }
    }, []);

    // Helper function to add a new message to a user's messages
    const addMessage = useCallback(async (userId, messageData) => {
        console.log("addMessage called with:", { userId, messageData });
        if (!userId || !messageData) return;

        try {
            // Get the user's messages document
            const messagesDoc = await getDocument('messages', userId);
            
            const currentMessages = messagesDoc?.messages || [];
            const newMessage = {
                ...messageData,
                messageId: messageData.messageId || DateTime.now().toMillis().toString(),
                timestamp: DateTime.now().toISO(),
                read: false,
                readAt: null
            };

            const updatedMessages = [...currentMessages, newMessage];

            // Update or create the document
            await updateDocument('messages', userId, {
                messages: updatedMessages,
                updatedAt: DateTime.now().toISO()
            });

            console.log(`Added message for user ${userId}`);
            return { success: true, message: newMessage };
        } catch (error) {
            console.error('Error adding message:', error);
            throw error;
        }
    }, []);

    return {
        markMessagesAsRead,
        markMessagesAsUnread,
        deleteMessages,
        addMessage,
    };
};