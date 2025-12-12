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
        
        const unsubscribe = authModule.onAuthStateChanged(authInstance, async (user) => {
          console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user', new Date().toISOString());
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

  // Helper function to create default preferences based on notifications setting
  const createDefaultPreferences = (notificationsEnabled) => {
    return {
      workoutPreferences: {
        syncWorkoutsToCalendar: false,
        addChecklistToWorkout: false,
        checklistId: "",
      },
      defaultCalendarView: 'day',
      theme: 'system',
      defaultTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      weekStartsOn: 'sunday',
      notifications: notificationsEnabled,
      communicationPreferences: {
        notifications: {
          active: notificationsEnabled,
          notifyFor: {
            creation: {
              events: notificationsEnabled,
              activities: notificationsEnabled,
            },
            edits: {
              events: notificationsEnabled,
              activities: notificationsEnabled,
            },
            deletions: {
              events: notificationsEnabled,
              activities: notificationsEnabled,
            },
            reminders: {
              events: notificationsEnabled,
              activities: notificationsEnabled,
            },
            messages: {
              events: notificationsEnabled,
              activities: notificationsEnabled,
            },
          },
        },
        messages: {
          active: notificationsEnabled,
          notifyFor: {
            creation: {
              events: notificationsEnabled,
              activities: notificationsEnabled,
            },
            edits: {
              events: notificationsEnabled,
              activities: notificationsEnabled,
            },
            deletions: {
              events: notificationsEnabled,
              activities: notificationsEnabled,
            },
            reminders: {
              events: notificationsEnabled,
              activities: notificationsEnabled,
            },
            messages: {
              events: notificationsEnabled,
              activities: notificationsEnabled,
            },
          },
        },
      },
    };
  };

  // Helper function to create user document in Firestore
const createUserDocument = async (user, username, notifications, groupInvites = [], additionalData = {}) => {
  if (!user || !db) {
    throw new Error('Missing user or db in createUserDocument');
  }
  
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
        joinedApps: [],
        createdAt: now,
        updatedAt: now,
        isActive: true,
        profilePicture: user.photoURL || null,
        preferences: createDefaultPreferences(notifications),
        ...additionalData
      };
      
      console.log('Creating user document with data:', JSON.stringify(userData, null, 2));
      
      await firestoreModule.setDoc(userRef, userData);
      
      // Verify it was created
      const verifySnapshot = await firestoreModule.getDoc(userRef);
      if (!verifySnapshot.exists()) {
        throw new Error('User document creation verification failed');
      }
      
      const createdData = verifySnapshot.data();
      console.log('User document created and verified:', Object.keys(createdData));
      
      // Check if all expected fields are present
      const expectedFields = ['userId', 'email', 'username', 'preferences', 'calendars', 'groups'];
      const missingFields = expectedFields.filter(field => !createdData[field]);
      if (missingFields.length > 0) {
        console.error('Missing fields in created document:', missingFields);
        throw new Error(`User document missing fields: ${missingFields.join(', ')}`);
      }
      
      return createdData;
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
    console.error('Error in createUserDocument:', error);
    throw error; // Re-throw to trigger rollback
  }
};

  const login = async (email, password) => {
    if (!auth) throw new Error('Auth not initialized');
    const authModule = await import('firebase/auth');
    const result = await authModule.signInWithEmailAndPassword(auth, email, password);
    
    return result;
  };

  const signup = async (email, password, username, notifications) => {
    if (!auth) throw new Error('Auth not initialized');
    const authModule = await import('firebase/auth');
    
    // Step 1: Create Firebase auth user first (outside the atomic block)
    const result = await authModule.createUserWithEmailAndPassword(auth, email, password);
    
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
  
      // Step 3: Create user document (now with pending invites and new preferences structure)
      await createUserDocument(result.user, username, notifications, pendingInvites);
      console.log('User document created');
  
      // Step 4: Create message document
      await createMessageDoc(result.user.uid);
      console.log('Message document created');
  
      // Step 5: NOTE - No longer creating internal calendar document since we're using sharded collections
      // Calendar events will be stored in month-sharded collections like calendar-events-2025-01
      // The user can add calendar references to their calendars array as needed
      console.log('Skipping internal calendar creation - using sharded collections');

      // Step 6: Send welcome messages for any pending invites
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
      
      // Rollback: Delete created documents
      const rollbackPromises = [
        deleteDocument("users", result.user.uid).catch(err => 
          console.error("User rollback failed:", err)
        ),
        deleteDocument("messages", result.user.uid).catch(err => 
          console.error("Messages rollback failed:", err)
        )
      ];
  
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