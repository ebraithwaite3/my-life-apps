// Create a new file: services/messageService.js
import { updateDocument } from "./firestoreService";
import { DateTime } from "luxon";
import * as Crypto from 'expo-crypto';
import { arrayUnion } from "firebase/firestore";

const uuidv4 = () => Crypto.randomUUID();

export const addMessageToUser = async (receivingUserId, sendingUserInfo, message ) => {
  if (!receivingUserId || !sendingUserInfo || !message) return;
  
  try {
    const newMessage = {
      messageId: uuidv4(),
      senderId: sendingUserInfo.userId,
      senderName: sendingUserInfo.username || sendingUserInfo.email,
      content: message,
      timestamp: DateTime.now().toISO(),
      read: false,
      navigationInfo: sendingUserInfo.screenForNavigation || null,
      groupName: sendingUserInfo.groupName || null,
    };

    await updateDocument("messages", receivingUserId, {
      messages: arrayUnion(newMessage),
      updatedAt: DateTime.now().toISO(),
    });

    console.log(`✅ Message sent to user ${receivingUserId}:`, newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

export const deleteMessageForUser = async (userId, messageId) => {
    if (!userId || !messageId) return;
  
    try {
      const userMessagesDoc = await getDocument("messages", userId);
      
      if (userMessagesDoc?.messages) {
        const updatedMessages = userMessagesDoc.messages.filter(msg => msg.messageId !== messageId);
        
        await updateDocument("messages", userId, {
          messages: updatedMessages,  // ✅ Your original approach was actually fine
          updatedAt: DateTime.now().toISO(),
        });
  
        console.log(`✅ Message ${messageId} deleted for user ${userId}`);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };