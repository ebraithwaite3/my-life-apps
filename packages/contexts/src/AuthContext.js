// AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeAuth, initializeFirestore } from '@my-apps/services';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDoc } from 'firebase/firestore';
import { 
  getDocumentsByField, 
  updateDocument, 
  deleteDocument, 
  setGlobalDb 
} from '@my-apps/services';
import { addMessageToUser } from '@my-apps/services';
import { DateTime } from 'luxon';
import * as Crypto from 'expo-crypto';
import { setupPushNotifications } from '../services/notificationService'; // ← ADD THIS


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
        console.log('Setting up auth... START', new Date().toISOString());
        
        const [authInstance, dbInstance] = await Promise.all([
          initializeAuth(),
          initializeFirestore()
        ]);
        
        console.log('Inits complete', new Date().toISOString());
        setAuth(authInstance);
        setDb(dbInstance);
        setGlobalDb(dbInstance);
  
        const authModule = await import('firebase/auth');
        console.log('Auth module imported', new Date().toISOString());
        
        // ← MAKE THIS ASYNC
        const unsubscribe = authModule.onAuthStateChanged(authInstance, async (user) => {
          console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user', new Date().toISOString());
          setUser(user);
          setLoading(false);

          // ← ADD THIS BLOCK
          // ✅ Setup push notifications when user logs in
          if (user) {
            console.log('User logged in, setting up push notifications...');
            try {
              await setupPushNotifications(user.uid);
              console.log('✅ Push notifications setup complete!');
            } catch (error) {
              console.error('❌ Push notification setup failed:', error);
              // Don't block login if notifications fail
            }
          }
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
          joinedApps: [
            "organizer"
          ],
          createdAt: now,
          updatedAt: now,
          isActive: true,
          // Additional fields for app functionality
          profilePicture: user.photoURL || null,
          preferences: {
            theme: 'system',
            defaultCalendarView: 'day',
            defaultTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            weekStartsOn: 'sunday',
            notifications: notifications,
            notifyFor: {
              calendarEvents: notifications,
              tasks: notifications,
              grocery: notifications,
              workout: notifications,
              reminders: notifications
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

      // Step 7: Send welcome messages for any pending invites
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
    authLoading: loading,
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