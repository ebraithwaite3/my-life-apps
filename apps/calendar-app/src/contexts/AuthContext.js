// AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeAuth, initializeFirestore } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDoc } from 'firebase/firestore';
import { getDocumentsByField, updateDocument, deleteDocument } from '../services/firestoreService';
import { addMessageToUser } from '../services/messageService';
import { DateTime } from 'luxon';
import * as Crypto from 'expo-crypto';


const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  console.log("DB STATE:", db);

  const uuidv4 = () => Crypto.randomUUID();

  useEffect(() => {
    const setupAuth = async () => {
      try {
        console.log('Setting up auth...');
        
        // Initialize both auth and firestore
        const [authInstance, dbInstance] = await Promise.all([
          initializeAuth(),
          initializeFirestore()
        ]);
        
        setAuth(authInstance);
        setDb(dbInstance);
        
        // Import auth functions dynamically
        const authModule = await import('firebase/auth');
        
        // Set up auth state listener
        const unsubscribe = authModule.onAuthStateChanged(authInstance, (user) => {
          console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
          setUser(user);
          setLoading(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Auth setup error:', error);
        setLoading(false);
      }
    };

    setupAuth();
  }, []);

  const createMessageDoc = async (userId) => {
    try {
      const firestoreModule = await import('firebase/firestore');
      const { DateTime } = await import('luxon');
      
      const createdAt = DateTime.now().toISO();
      const messageData = {
        userId,
        messages: [],
        createdAt,
        updatedAt: createdAt,
      };
  
      const messageRef = firestoreModule.doc(db, "messages", userId);
      await firestoreModule.setDoc(messageRef, messageData);
      console.log("✅ Message document created for user:", userId);
  
      return messageData;
    } catch (error) {
      console.error("❌ Error creating message document:", error);
      throw error;
    }
  };

  // Helper function to create user document in Firestore
  const createUserDocument = async (user, username, notifications, groupInvites = [], additionalData = {}) => {
    if (!user || !db) return;
    
    try {
      const firestoreModule = await import('firebase/firestore');
      const { DateTime } = await import('luxon');
      
      const userRef = firestoreModule.doc(db, 'users', user.uid);
      
      // Check if user document already exists
      const userSnapshot = await firestoreModule.getDoc(userRef);
      
      if (!userSnapshot.exists()) {
        const now = DateTime.now().toISO();
        const userData = {
          userId: user.uid,
          email: user.email,
          username: username,
          groupInvites: groupInvites,
          groups: [],
          calendars: [],
          createdAt: now,
          updatedAt: now,
          isActive: true,
          // Additional fields for app functionality
          profilePicture: user.photoURL || null,
          preferences: {
            theme: 'system',
            defaultLoadingPage: 'Calendar',
            defaultCalendarView: 'month',
            defaultTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            weekStartsOn: 'sunday',
            notifications: notifications,
            notifyFor: {
              groupActivity: notifications,
              newTasks: notifications,
              updatedTasks: notifications,
              deletedTasks: notifications,
              newNotes: notifications,
              mentions: notifications,
              reminders: notifications,
              messages: notifications,
              newEvents: notifications,
              updatedEvents: notifications,
              deletedEvents: notifications,
            }
          },
          ...additionalData
        };
        
        await firestoreModule.setDoc(userRef, userData);
        console.log('User document created:', userData);
        return userData;
      } else {
        // Update last login time
        const now = DateTime.now().toISO();
        await firestoreModule.updateDoc(userRef, {
          updatedAt: now
        });
        console.log('User document exists, updated timestamp');
        return userSnapshot.data();
      }
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  };

  // Function to create individual task document for user
  const createIndividualTaskDoc = async (userId, username) => {
    if (!userId || typeof userId !== 'string') {
      throw new Error("Invalid user ID");
    }
    if (!username || typeof username !== 'string') {
      throw new Error("Invalid username");
    }
  
    try {
      const firestoreModule = await import('firebase/firestore');
      const createdAt = DateTime.now().toISO();
      
      const taskData = {
        userId: userId,
        name: `${username}'s Tasks`,
        createdBy: { userId, username },
        createdDate: createdAt,
        updatedDate: createdAt,
        tasks: [],
      };
  
      const taskRef = firestoreModule.doc(db, "tasks", userId);
      await firestoreModule.setDoc(taskRef, taskData);
      console.log("Individual Task document created for user:", userId);
      
      return taskData;
    } catch (error) {
      console.error("Error creating individual task document:", error);
      throw error;
    }
  };
  
  // Function to create internal calendar for user
  const createUserInternalCalendar = async (userId, username, calendarId) => {
    if (!userId || typeof userId !== 'string') {
      throw new Error("Invalid user ID");
    }
    if (!username || typeof username !== 'string') {
      throw new Error("Invalid username");
    }
  
    try {
      const firestoreModule = await import('firebase/firestore');
      console.log("Creating internal calendar for user:", userId, username);
  
      const internalCalendarData = {
        admins: [userId],
        calendarId: calendarId,
        color: '#02092b',
        createdAt: DateTime.now().toISO(),
        createdBy: userId,
        description: `${username}'s Personal Calendar`,
        events: {},
        isActive: true,
        name: `${username}'s Calendar`,
        subscribingUsers: [userId],
        type: 'internal',
        updatedAt: DateTime.now().toISO(),
      };
      
      const calendarRef = firestoreModule.doc(db, 'calendars', calendarId);
      await firestoreModule.setDoc(calendarRef, internalCalendarData);
      console.log("Internal calendar created with ID:", calendarId);
      return internalCalendarData;
    } catch (error) {
      console.error("Error creating internal calendar:", error);
      throw error;
    }
  };

  const login = async (email, password) => {
    if (!auth) throw new Error('Auth not initialized');
    const authModule = await import('firebase/auth');
    const result = await authModule.signInWithEmailAndPassword(auth, email, password);
    
    // Update user document on login
    //await createUserDocument(result.user);
    
    return result;
  };

  const signup = async (email, password, username, notifications) => {
    if (!auth) throw new Error('Auth not initialized');
    const authModule = await import('firebase/auth');
    
    // Step 1: Create Firebase auth user first (outside the atomic block)
    const result = await authModule.createUserWithEmailAndPassword(auth, email, password);
    
    // Declare variables for rollback
    let userCalendarId = null;
    
    // ATOMIC OPERATIONS: Create user document and related documents
    try {
      // Step 2: Check for stored invites before creating user document
      let pendingInvites = [];
      let adminDocId = null;
      
      const adminQuery = await getDocumentsByField("admin", "type", "storedInvites");
      if (adminQuery.length > 0) {
        const adminDoc = adminQuery[0];
        adminDocId = adminDoc.id;
        
        // Find invites for this email
        const userInvites = (adminDoc.invites || []).filter(
          invite => invite.email.toLowerCase() === email.toLowerCase()
        );
        
        if (userInvites.length > 0) {
          console.log(`Found ${userInvites.length} stored invite(s) for ${email}`);
          
          // Convert stored invites to groupInvites format
          pendingInvites = userInvites.map(invite => ({
            groupId: invite.groupId,
            groupName: invite.groupName,
            inviteCode: invite.inviteCode,
            role: invite.role,
            inviterUserId: invite.inviterUserId || 'unknown',
            inviterName: invite.inviterName,
            invitedAt: invite.invitedAt || DateTime.now().toISO(),
            status: 'pending'
          }));
          
          // Remove these invites from the admin doc
          const remainingInvites = (adminDoc.invites || []).filter(
            invite => invite.email.toLowerCase() !== email.toLowerCase()
          );
          
          await updateDocument("admin", adminDocId, {
            invites: remainingInvites,
            updatedAt: DateTime.now().toISO(),
          });
          
          console.log(`Moved ${userInvites.length} invite(s) from admin storage to user document`);
        }
      }
  
      // Step 3: Create user document (now with pending invites)
      await createUserDocument(result.user, username, notifications, pendingInvites);
      console.log('User document created');
  
      // Step 4: Create message document
      await createMessageDoc(result.user.uid);
      console.log('Message document created');
  
      // Step 5: Create internal calendar doc for user
      userCalendarId = uuidv4();
      await createUserInternalCalendar(result.user.uid, username, userCalendarId);
      console.log('Internal calendar created');
  
      // Step 6: Add calendar reference to user document
      const userCalendarRef = {
        calendarId: userCalendarId,
        name: `${username}'s Calendar`,
        calendarType: "internal",
        isOwner: true,
        permissions: "write",
        color: "#02092b",
        description: `${username}'s Personal Calendar`,
        importedBy: result.user.uid,
      };
  
      await updateDocument("users", result.user.uid, {
        calendars: [userCalendarRef]
      });
      console.log('Calendar reference added to user document');
  
      // Step 7: Create users individual task doc
      await createIndividualTaskDoc(result.user.uid, username);
      console.log('Individual task document created');
      
      // Step 8: Send welcome messages for any pending invites
      if (pendingInvites.length > 0) {
        for (const invite of pendingInvites) {
          const messageText = `Welcome! You have a pending invitation to join ${invite.groupName} from ${invite.inviterName}. Check your Groups section to accept or decline.`;
          
          const sendingUserInfo = {
            userId: 'system',
            username: 'System',
            groupName: invite.groupName,
            screenForNavigation: {
              screen: 'Groups'
            }
          };
          
          await addMessageToUser(result.user.uid, sendingUserInfo, messageText);
        }
        
        console.log(`Sent ${pendingInvites.length} welcome message(s) for pending invites`);
      }
  
    } catch (error) {
      console.error('Atomic operation failed:', error);
      
      // Rollback: Delete all created documents
      const rollbackPromises = [
        deleteDocument("users", result.user.uid).catch(err => 
          console.error("User rollback failed:", err)
        ),
        deleteDocument("messages", result.user.uid).catch(err => 
          console.error("Messages rollback failed:", err)
        ),
        deleteDocument("tasks", result.user.uid).catch(err => 
          console.error("Tasks rollback failed:", err)
        )
      ];
  
      // Only try to delete calendar if it was created
      if (userCalendarId) {
        rollbackPromises.push(
          deleteDocument("calendars", userCalendarId).catch(err => 
            console.error("Calendar rollback failed:", err)
          )
        );
      }
  
      await Promise.allSettled(rollbackPromises);
      console.log('Rollback operations completed');
      
      // Delete Firebase auth user since document creation failed
      try {
        await result.user.delete();
        console.log('Rollback: Firebase auth user deleted');
      } catch (rollbackError) {
        console.error('Auth user rollback failed:', rollbackError);
      }
      
      throw new Error("Failed to create complete user profile");
    }
  
    return result;
  };

  const logout = async () => {
    if (!auth) throw new Error('Auth not initialized');
    const authModule = await import('firebase/auth');
    return authModule.signOut(auth);
  };

  const value = {
    user,
    login,
    signup,
    logout,
    loading,
    auth,
    db,
    createUserDocument
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};