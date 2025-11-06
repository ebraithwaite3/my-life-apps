import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
  } from "react";
  import { useAuth } from "./AuthContext";
  import { DateTime } from "luxon";
  import {
    setGlobalDb,
    subscribeToDocument,
    updateDocument,
  } from "../services/firestoreService";
  import {
    removeCalendarFromUser,
    syncCalendarById,
  } from "../services/calendarService";
  
  const DataContext = createContext();
  
  export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
      throw new Error("useData must be used within a DataProvider");
    }
    return context;
  };
  
  export const DataProvider = ({ children }) => {
    const { user: authUser, db } = useAuth();
  
    // Core states
    const [user, setUser] = useState(null);
    console.log("User State:", user);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(DateTime.local().toISODate());
  
    // Resource states
    const [calendars, setCalendars] = useState([]);
    const [groups, setGroups] = useState([]);
    const [messages, setMessages] = useState([]);
    console.log("Calendar State:", calendars);
  
    // Loading states (only needed for initial loads)
    const [calendarsLoading, setCalendarsLoading] = useState(false);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);
  
   
    // Auto-sync states
    const [autoSyncInProgress, setAutoSyncInProgress] = useState(false);
    const [syncingCalendarIds, setSyncingCalendarIds] = useState(new Set());
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

    // Date States (start with current date)
    const [selectedDate, setSelectedDate] = useState(DateTime.local().toISODate());
    const [selectedMonth, setSelectedMonth] = useState(DateTime.local().monthLong);
    const [selectedYear, setSelectedYear] = useState(DateTime.local().year);
    console.log("📅 Date States:", {
        selectedDate: selectedDate,
        selectedMonth: selectedMonth,
        selectedYear: selectedYear,
        });
    // Debugging logs
  
    console.log("📊 DataContext State:", {
      loading,
      userLoaded: !!user,
      calendarsCount: calendars?.length,
      groupsCount: groups?.length,
      messagesCount: messages.messages?.length,
      unreadMessagesCount: messages.messages?.filter((m) => !m.read).length || 0,
    });
  
    // Is User Admin
    const isUserAdmin = useMemo(() => {
      return user?.admin === true;
    }, [user]);
    console.log("👑 Is User Admin:", isUserAdmin);
  
    // ===== USER SUBSCRIPTION =====
    useEffect(() => {
      console.log("🔔 Setting up user subscription...");
      let unsubscribeUser = null;
  
      if (authUser && db) {
        setGlobalDb(db);
        setLoading(true);
  
        unsubscribeUser = subscribeToDocument(
          "users",
          authUser.uid,
          (userData) => {
            if (userData) {
              console.log("👤 User data updated - userId:", userData.userId);
              setUser(userData);
            } else {
              console.warn(
                "❌ No user document found for Firebase UID:",
                authUser.uid
              );
              setUser(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("❌ User subscription error:", error);
            console.error("❌ Error code:", error.code);
            console.error("❌ Error message:", error.message);
            console.error("❌ Auth user:", authUser?.uid);
            console.error("❌ DB state:", !!db);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setLoading(false);
        setCalendars([]);
        setGroups([]);
        setMessages([]);
      }
  
      return () => {
        if (unsubscribeUser) unsubscribeUser();
      };
    }, [authUser, db]);
  
    // ===== CALENDARS REAL-TIME SUBSCRIPTION =====
// 1. INTERNAL MONTHLY CALENDAR - Updates when month/year changes
useEffect(() => {
    if (!user?.userId || !selectedMonth || !selectedYear) {
      console.log("📅 No user or date selected for internal calendar");
      // Remove internal calendar from array if no user/date
      setCalendars((prev) => prev.filter(cal => cal.type !== 'internal'));
      return;
    }
  
    console.log(`📅 Subscribing to internal calendar: ${selectedMonth} ${selectedYear}`);
  
    const internalCalendarDocId = `${user.userId}_${selectedMonth.toLowerCase()}${selectedYear}`;
    
    const unsubscribe = subscribeToDocument(
      "calendars",
      internalCalendarDocId,
      (calendarDoc) => {
        if (calendarDoc) {
          console.log(`✅ Internal calendar loaded: ${selectedMonth} ${selectedYear}`);
          setCalendars((prev) => {
            // Remove old internal calendar and add new one
            const withoutInternal = prev.filter(cal => cal.type !== 'internal');
            return [
              {
                id: internalCalendarDocId,
                calendarId: internalCalendarDocId,
                type: 'internal',
                isOwner: true,
                permissions: 'write',
                ...calendarDoc,
                eventsCount: Object.keys(calendarDoc.events || {}).length,
              },
              ...withoutInternal,
            ];
          });
        } else {
          console.log(`📅 No internal calendar doc for ${selectedMonth} ${selectedYear}, creating placeholder`);
          // Add empty internal calendar structure
          setCalendars((prev) => {
            const withoutInternal = prev.filter(cal => cal.type !== 'internal');
            return [
              {
                id: internalCalendarDocId,
                calendarId: internalCalendarDocId,
                type: 'internal',
                userId: user.userId,
                name: `${user.username || 'My'} Calendar`,
                color: user.preferences?.calendarColor || '#02092b',
                month: selectedMonth.toLowerCase(),
                year: selectedYear,
                events: {},
                eventsCount: 0,
                isOwner: true,
                permissions: 'write',
              },
              ...withoutInternal,
            ];
          });
        }
      },
      (error) => {
        console.error(`❌ Internal calendar subscription error:`, error);
      }
    );
  
    return () => {
      console.log(`🧹 Cleaning up internal calendar subscription: ${selectedMonth} ${selectedYear}`);
      unsubscribe();
    };
  }, [user?.userId, user?.username, user?.preferences?.calendarColor, selectedMonth, selectedYear]);
  
  // 2. EXTERNAL/GROUP CALENDARS - Only updates when user.calendars changes
useEffect(() => {
    // Filter for external calendars - check both 'type' and 'calendarType' fields
    const externalCalendarRefs = (user?.calendars || []).filter(
      (ref) => {
        console.log("📅 Checking calendar ref:", ref);
        if (!ref.calendarId && !ref.calendarAddress) return false;
        const calType = ref.calendarType || ref.type;
        console.log("📅 Calendar Ref:", ref.calendarId, "Type:", calType);
        return calType !== 'internal'; // Include anything that's not internal
      }
    );
    console.log("📅 External calendar references:", externalCalendarRefs, "Calendars", user?.calendars);
  
    if (externalCalendarRefs.length === 0) {
      console.log("📅 No external calendar references found");
      // Remove any external calendars from array, keep internal
      setCalendars((prev) => prev.filter(cal => cal.type === 'internal'));
      setCalendarsLoading(false);
      return;
    }
  
    console.log("📅 Setting up external calendar subscriptions:", externalCalendarRefs.length);
    console.log("📅 External calendar IDs:", externalCalendarRefs.map(r => r.calendarId));
    setCalendarsLoading(true);
  
    const unsubscribes = [];
  
    // Initialize external calendars with user ref data
    const initialExternalCalendars = externalCalendarRefs.map((ref) => ({
      id: ref.calendarId,
      calendarId: ref.calendarId,
      name: ref.name,
      color: ref.color,
      description: ref.description,
      calendarAddress: ref.calendarAddress || ref.address,
      type: ref.calendarType || ref.type || 'external',
      permissions: ref.permissions,
      isOwner: ref.isOwner,
      events: {},
      eventsCount: 0,
      syncStatus: "loading",
      lastSynced: null,
    }));
    console.log("📅 Initial external calendars:", initialExternalCalendars);
    // Add external calendars to state (keeping internal calendar)
    setCalendars((prev) => {
      const internal = prev.filter(cal => cal.type === 'internal');
      console.log("📅 Adding external calendars. Internal count:", internal.length);
      return [...internal, ...initialExternalCalendars];
    });
  
    // Subscribe to each external calendar
    externalCalendarRefs.forEach((ref) => {
      const unsubscribe = subscribeToDocument(
        "calendars",
        ref.calendarId,
        (calendarDoc) => {
          if (calendarDoc) {
            console.log(`📅 External calendar ${ref.calendarId} data received`);
            setCalendars((prev) => {
              // Find and update, or add if not exists
              const existingIndex = prev.findIndex(cal => cal.calendarId === ref.calendarId);
              
              if (existingIndex >= 0) {
                // Update existing
                const updated = [...prev];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  ...calendarDoc,
                  eventsCount: Object.keys(calendarDoc.events || {}).length,
                  syncStatus: calendarDoc.sync?.syncStatus || "unknown",
                  lastSynced: calendarDoc.sync?.lastSyncedAt,
                };
                return updated;
              } else {
                // Add new (shouldn't happen, but just in case)
                console.log(`📅 Adding missing external calendar: ${ref.calendarId}`);
                return [...prev, {
                  id: ref.calendarId,
                  calendarId: ref.calendarId,
                  ...calendarDoc,
                  eventsCount: Object.keys(calendarDoc.events || {}).length,
                  syncStatus: calendarDoc.sync?.syncStatus || "unknown",
                  lastSynced: calendarDoc.sync?.lastSyncedAt,
                }];
              }
            });
          } else {
            console.warn(`❌ External calendar ${ref.calendarId} not found in Firestore`);
            setCalendars((prev) =>
              prev.filter((cal) => cal.calendarId !== ref.calendarId || cal.type === 'internal')
            );
          }
        },
        (error) => {
          console.error(`❌ External calendar ${ref.calendarId} subscription error:`, error);
        }
      );
  
      unsubscribes.push(unsubscribe);
    });
  
    setCalendarsLoading(false);
  
    return () => {
      console.log("🧹 Cleaning up external calendar subscriptions");
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user?.calendars]);
  
    // ===== GROUPS REAL-TIME SUBSCRIPTION =====
    useEffect(() => {
      const {
        collection,
        query,
        where,
        documentId,
        onSnapshot,
      } = require("firebase/firestore");
  
      const validGroupRefs = (user?.groups || []).filter((ref) => ref.groupId);
  
      if (validGroupRefs.length === 0) {
        console.log("👥 No valid group references found");
        setGroups([]);
        setGroupsLoading(false);
        return;
      }
  
      console.log("👥 Setting up group subscriptions...");
      setGroupsLoading(true);
  
      const groupIds = validGroupRefs.map((ref) => ref.groupId);
      const unsubscribes = [];
  
      // Initialize groups array with user ref data
      const initialGroups = validGroupRefs.map((ref) => ({
        id: ref.groupId,
        groupId: ref.groupId, // Also provide groupId
        name: ref.name,
        role: ref.role,
        joinedAt: ref.joinedAt,
        // Placeholder until real-time data arrives
        members: [],
        calendars: [],
      }));
  
      setGroups(initialGroups);
  
      // Split group IDs into chunks of 10 for Firestore 'in' query limit
      const chunks = [];
      for (let i = 0; i < groupIds.length; i += 10) {
        chunks.push(groupIds.slice(i, i + 10));
      }
  
      console.log(`👥 Subscribing to ${chunks.length} group batch(es)`);
  
      // Subscribe to each chunk
      chunks.forEach((chunk, chunkIndex) => {
        const q = query(
          collection(db, "groups"),
          where(documentId(), "in", chunk)
        );
  
        const unsubscribe = onSnapshot(
          q,
          (querySnapshot) => {
            console.log(`👥 Group batch ${chunkIndex + 1} updated`);
  
            querySnapshot.docs.forEach((docSnap) => {
              const groupId = docSnap.id;
              const groupDoc = docSnap.data();
  
              setGroups((prev) =>
                prev.map((group) =>
                  group.id === groupId
                    ? {
                        ...group,
                        ...groupDoc,
                      }
                    : group
                )
              );
            });
          },
          (error) => {
            console.error(`❌ Group batch ${chunkIndex + 1} error:`, error);
          }
        );
  
        unsubscribes.push(unsubscribe);
      });
  
      setGroupsLoading(false);
  
      return () => {
        console.log("🧹 Cleaning up group subscriptions");
        unsubscribes.forEach((unsubscribe) => unsubscribe());
      };
    }, [user?.groups, db]);
  
    // ===== MESSAGES REAL-TIME SUBSCRIPTION =====
    useEffect(() => {
      if (!user?.userId) {
        console.log("💬 No user ID found, skipping messages subscription");
        setMessages([]);
        setMessagesLoading(false);
        return;
      }
  
      console.log("💬 Setting up messages subscription...");
      setMessagesLoading(true);
  
      const unsubscribe = subscribeToDocument(
        "messages",
        user.userId,
        (messagesDoc) => {
          if (messagesDoc) {
            console.log("💬 Messages updated");
            setMessages(messagesDoc);
          } else {
            console.log("💬 No messages document found");
            setMessages({ messages: [] });
          }
          setMessagesLoading(false);
        },
        (error) => {
          console.error("❌ Messages subscription error:", error);
          setMessagesLoading(false);
        }
      );
  
      return () => {
        console.log("🧹 Cleaning up messages subscription");
        unsubscribe();
      };
    }, [user?.userId]);

    // ===== ACTIONS =====
    const removeCalendar = useCallback(
      async (calendarId) => {
        try {
          console.log("🗑️ Removing calendar:", calendarId);
          await removeCalendarFromUser(authUser.uid, calendarId);
          console.log("✅ Calendar removed");
          // Real-time subscription will handle the UI update
        } catch (error) {
          console.error("❌ Error removing calendar:", error);
          throw error;
        }
      },
      [authUser?.uid]
    );
  
    const syncCalendar = useCallback(async (calendarId) => {
      try {
        console.log("🔄 Syncing calendar:", calendarId);
        const result = await syncCalendarById(calendarId);
        console.log("✅ Calendar synced:", result);
        // Real-time subscription will handle the UI update
        return result;
      } catch (error) {
        console.error("❌ Error syncing calendar:", error);
        throw error;
      }
    }, []);
  
    // ===== HELPER FUNCTIONS =====
    const setWorkingDate = useCallback((date) => {
      setCurrentDate(date);
      console.log("📅 Set working date:", date);
    }, []);
  
    const getCalendarById = useCallback(
      (calendarId) => {
        return calendars.find(
          (cal) => cal.id === calendarId || cal.calendarId === calendarId
        );
      },
      [calendars]
    );
  
    const getCalendarsByType = useCallback(
      (type) => {
        return calendars.filter((cal) => cal.type === type);
      },
      [calendars]
    );
  
    const unreadMessagesCount = useMemo(() => {
      return messages.messages?.filter((m) => !m.read).length || 0;
    }, [messages]);
  
    const unacceptedChecklistsCount = useMemo(() => {
      const checklists = user?.savedChecklists || [];
      return checklists.filter((cl) => cl.accepted === false).length;
    }, [user]);
  
    const messagesCount = useMemo(() => {
      return messages.messages?.length || 0;
    }, [messages]);
  
    // Gather the last sync times of all calendars (and filter out any that have been synced in the last 24 hours, use Luxon for date handling)
    // I need to return enough info to also potentially be able to sync that/those calendars
    const calendarsThatNeedToSync = useMemo(() => {
      const now = DateTime.now();
      return calendars
        .map((cal) => ({
          calendarId: cal.calendarId,
          name: cal.name,
          lastSynced: cal.lastSynced ? DateTime.fromISO(cal.lastSynced) : null,
        }))
        .filter((cal) => cal.lastSynced) // Only keep those with a lastSynced time
        .map((cal) => ({
          ...cal,
          hoursSinceLastSync: now.diff(cal.lastSynced, "hours").hours,
        }))
        .filter((cal) => cal.hoursSinceLastSync >= 24) // Only keep those not synced in the last 24 hours
        .sort((a, b) => b.hoursSinceLastSync - a.hoursSinceLastSync); // Sort by longest time since last sync
    }, [calendars]);
  
    console.log("⏱️ Calendars Not Synced in last 24 h:", calendarsThatNeedToSync);
  
    // ===== AUTO-SYNC FUNCTIONALITY =====
    // Auto-sync function using the same pattern as your CalendarScreen
    const performAutoSync = useCallback(async () => {
      if (autoSyncInProgress || calendarsThatNeedToSync.length === 0) {
        return { successCount: 0, errorCount: 0, errors: [] };
      }
  
      console.log(
        "🔄 Starting auto-sync for",
        calendarsThatNeedToSync.length,
        "outdated calendars"
      );
      setAutoSyncInProgress(true);
  
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
  
      try {
        const syncPromises = calendarsThatNeedToSync.map(async (calendarInfo) => {
          setSyncingCalendarIds(
            (prev) => new Set([...prev, calendarInfo.calendarId])
          );
  
          try {
            await syncCalendar(calendarInfo.calendarId);
            successCount++;
            console.log(`✅ Auto-synced: ${calendarInfo.name}`);
          } catch (error) {
            errorCount++;
            errors.push(`${calendarInfo.name}: ${error.message}`);
            console.error(`❌ Auto-sync failed for ${calendarInfo.name}:`, error);
          } finally {
            setSyncingCalendarIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(calendarInfo.calendarId);
              return newSet;
            });
          }
        });
  
        await Promise.all(syncPromises);
  
        console.log(
          `🔄 Auto-sync complete: ${successCount} success, ${errorCount} failed`
        );
  
        if (errorCount > 0) {
          console.warn("Auto-sync errors:", errors);
        }
      } catch (error) {
        console.error("Auto-sync error:", error);
      } finally {
        setAutoSyncInProgress(false);
        setSyncingCalendarIds(new Set());
      }
  
      return { successCount, errorCount, errors };
    }, [calendarsThatNeedToSync, syncCalendar, autoSyncInProgress]);
  
    // Manual trigger function
    const triggerManualSync = useCallback(async () => {
      if (calendarsThatNeedToSync.length === 0) {
        console.log("No calendars need syncing");
        return { successCount: 0, errorCount: 0, errors: [] };
      }
  
      return await performAutoSync();
    }, [performAutoSync, calendarsThatNeedToSync]);
  
    // Auto-sync effect - triggers when calendars need sync
    useEffect(() => {
      if (
        autoSyncEnabled &&
        calendarsThatNeedToSync.length > 0 &&
        !autoSyncInProgress
      ) {
        // Add a delay to avoid triggering during initial loading
        const timer = setTimeout(() => {
          performAutoSync();
        }, 3000); // 3 second delay
  
        return () => clearTimeout(timer);
      }
    }, [
      calendarsThatNeedToSync,
      autoSyncEnabled,
      autoSyncInProgress,
      performAutoSync,
    ]);
  
    const retryUserSubscription = useCallback(() => {
      if (authUser && db && !user) {
        console.log("🔄 Manually retrying user subscription...");
        setLoading(true);
        // Force re-run the user subscription effect
        setUser(null);
      }
    }, [authUser, db, user]);
  
    // ===== CONTEXT VALUE =====
    const value = useMemo(
      () => ({
        // Core data
        user,
        loading,
        currentDate,
        setWorkingDate,
        isUserAdmin,

        //Dates States
        selectedDate,
        setSelectedDate,
        selectedMonth,
        setSelectedMonth,
        selectedYear,
        setSelectedYear,
  
        // Values
        unreadMessagesCount,
        unacceptedChecklistsCount,
        messagesCount,
  
        // Resources (now real-time!)
        calendars,
        groups,
        messages,
  
        // Loading states (only for initial setup)
        calendarsLoading,
        groupsLoading,
        messagesLoading,
  
        // Computed properties
        isDataLoaded: !loading && !!user,
        hasCalendars: calendars.length > 0,
        hasGroups: groups.length > 0,
  
        // Legacy compatibility
        calendarsInfo: user?.calendars || [],
        groupsInfo: user?.groups || [],
        preferences: user?.preferences || {},
        myUsername: user?.username || "",
        myUserId: user?.userId || "",
  
        // Calendar helpers
        getCalendarById,
        getCalendarsByType,
  
        // Actions
        removeCalendar,
        syncCalendar,
        retryUserSubscription,
  
        // Auto-sync states and actions
        autoSyncInProgress,
        syncingCalendarIds,
        autoSyncEnabled,
        calendarsThatNeedToSync,
        performAutoSync,
        triggerManualSync,
        setAutoSyncEnabled,
      }),
      [
        user,
        loading,
        currentDate,
        calendars,
        groups,
        calendarsLoading,
        groupsLoading,
        messages,
        messagesLoading,
        setWorkingDate,
        getCalendarById,
        getCalendarsByType,
        removeCalendar,
        syncCalendar,
        unreadMessagesCount,
        unacceptedChecklistsCount,
        messagesCount,
        autoSyncInProgress,
        syncingCalendarIds,
        autoSyncEnabled,
        calendarsThatNeedToSync,
        performAutoSync,
        triggerManualSync,
        retryUserSubscription,
        isUserAdmin,
        selectedDate,
        selectedMonth,
        selectedYear,
      ]
    );
  
    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
  };