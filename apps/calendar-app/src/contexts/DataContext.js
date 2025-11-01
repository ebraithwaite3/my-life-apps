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
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(DateTime.local().toISODate());

  // Resource states
  const [calendars, setCalendars] = useState([]);
  const [groups, setGroups] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [groceries, setGroceries] = useState([]); // NEW
  console.log("GROCERIES IN DATA CONTEXT:", groceries);

  // Loading states (only needed for initial loads)
  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [groceriesLoading, setGroceriesLoading] = useState(false); // NEW

  // Auto-sync states
  const [autoSyncInProgress, setAutoSyncInProgress] = useState(false);
  const [syncingCalendarIds, setSyncingCalendarIds] = useState(new Set());
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  console.log("📊 DataContext State:", {
    loading,
    userLoaded: !!user,
    calendarsCount: calendars?.length,
    groupsCount: groups?.length,
    tasksCount: tasks?.length,
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
      setTasks([]);
      setMessages([]);
    }

    return () => {
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [authUser, db]);

  // ===== CALENDARS REAL-TIME SUBSCRIPTION =====
  useEffect(() => {
    // Filter out any calendars with undefined/null calendarId
    const validCalendarRefs = (user?.calendars || []).filter(
      (ref) => ref.calendarId
    );

    if (validCalendarRefs.length === 0) {
      console.log("📅 No valid calendar references found");
      setCalendars([]);
      setCalendarsLoading(false);
      return;
    }

    console.log("📅 Setting up calendar subscriptions...");
    setCalendarsLoading(true);

    const calendarIds = validCalendarRefs.map((ref) => ref.calendarId);
    const unsubscribes = [];

    console.log("📅 Valid calendar IDs:", calendarIds);

    // Initialize calendars array with user ref data
    const initialCalendars = validCalendarRefs.map((ref) => ({
      id: ref.calendarId, // Keep 'id' for consistency with your existing code
      calendarId: ref.calendarId, // Also provide calendarId
      name: ref.name,
      color: ref.color,
      description: ref.description,
      calendarAddress: ref.calendarAddress || ref.address,
      type: ref.calendarType || ref.type,
      permissions: ref.permissions,
      isOwner: ref.isOwner,
      // Placeholder until real-time data arrives
      events: {},
      eventsCount: 0,
      syncStatus: "loading",
      lastSynced: null,
    }));

    setCalendars(initialCalendars);

    // Subscribe to each calendar document individually
    calendarIds.forEach((calendarId) => {
      const unsubscribe = subscribeToDocument(
        "calendars",
        calendarId,
        (calendarDoc) => {
          if (calendarDoc) {
            console.log(`📅 Calendar ${calendarId} updated`);
            setCalendars((prev) =>
              prev.map((cal) => {
                if (cal.calendarId === calendarId) {
                  return {
                    ...cal,
                    ...calendarDoc,
                    // Computed properties
                    eventsCount: Object.keys(calendarDoc.events || {}).length,
                    syncStatus: calendarDoc.sync?.syncStatus || "unknown",
                    lastSynced: calendarDoc.sync?.lastSyncedAt,
                  };
                }
                return cal;
              })
            );
          } else {
            console.warn(`❌ Calendar document ${calendarId} not found`);
            // Remove from calendars if document doesn't exist
            setCalendars((prev) =>
              prev.filter((cal) => cal.calendarId !== calendarId)
            );
          }
        },
        (error) => {
          console.error(`❌ Calendar ${calendarId} subscription error:`, error);
        }
      );

      unsubscribes.push(unsubscribe);
    });

    setCalendarsLoading(false);

    return () => {
      console.log("🧹 Cleaning up calendar subscriptions");
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
      tasks: [],
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
              prev.map((group) => {
                if (group.groupId === groupId) {
                  return {
                    ...group,
                    ...groupDoc,
                  };
                }
                return group;
              })
            );
          });
        },
        (error) => {
          console.error(
            `❌ Group batch ${chunkIndex + 1} subscription error:`,
            error
          );
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

  // ===== ASSIGNMENTS REAL-TIME SUBSCRIPTION =====
  useEffect(() => {
    if (!user?.userId) {
      console.log("📝 No user ID found for tasks");
      setTasks([]);
      setTasksLoading(false);
      return;
    }

    console.log("📝 Setting up task subscriptions...");
    setTasksLoading(true);

    const unsubscribes = [];
    const taskDocIds = [];

    // Always include personal tasks (using userId)
    taskDocIds.push(user.userId);

    // Add group task documents (using groupId)
    const validGroupRefs = (user?.groups || []).filter((ref) => ref.groupId);
    const groupIds = validGroupRefs.map((ref) => ref.groupId);
    taskDocIds.push(...groupIds);

    console.log("📝 Subscribing to task documents:", taskDocIds);

    // Initialize empty tasks
    setTasks([]);

    // Subscribe to each task document (personal + all groups)
    taskDocIds.forEach((docId) => {
      const isPersonalTasks = docId === user.userId;

      const unsubscribe = subscribeToDocument(
        "tasks",
        docId,
        (taskDoc) => {
          if (taskDoc) {
            console.log(
              `📝 Tasks for ${
                isPersonalTasks ? "personal" : "group"
              } ${docId} updated`
            );

            // Add metadata to distinguish personal vs group tasks
            const enrichedTaskDoc = {
              ...taskDoc,
              isPersonal: isPersonalTasks,
              docId: docId,
              groupName: isPersonalTasks
                ? null
                : validGroupRefs.find((g) => g.groupId === docId)?.name,
            };

            setTasks((prev) => {
              // Remove old tasks for this docId and add new ones
              const filteredTasks = prev.filter((task) => task.docId !== docId);
              return [...filteredTasks, enrichedTaskDoc];
            });
          } else {
            console.log(
              `ℹ️ No tasks document for ${
                isPersonalTasks ? "personal" : "group"
              } ${docId}`
            );
            // Remove tasks for this docId if document doesn't exist
            setTasks((prev) => prev.filter((task) => task.docId !== docId));
          }
        },
        (error) => {
          console.error(`❌ Tasks ${docId} subscription error:`, error);
        }
      );

      unsubscribes.push(unsubscribe);
    });

    setTasksLoading(false);

    return () => {
      console.log("🧹 Cleaning up task subscriptions");
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user?.userId, user?.groups]);

  // ===== MESSAGES REAL-TIME SUBSCRIPTION =====
  useEffect(() => {
    if (!user?.userId) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    console.log("💬 Setting up messages subscription...");
    setMessagesLoading(true);

    // Messages are stored with document ID = userId
    const unsubscribe = subscribeToDocument(
      "messages",
      user.userId,
      (messageDoc) => {
        if (messageDoc) {
          console.log(`💬 Messages for user ${user.userId} updated`);
          setMessages(messageDoc);
        } else {
          console.log(`ℹ️ No messages document for user ${user.userId}`);
          setMessages([]);
        }
        setMessagesLoading(false);
      },
      (error) => {
        console.error(`❌ Messages subscription error:`, error);
        setMessagesLoading(false);
      }
    );

    return () => {
      console.log("🧹 Cleaning up messages subscription");
      unsubscribe();
    };
  }, [user?.userId]);

  // ========== GROCERY SUBSCRIPTIONS ==========
  useEffect(() => {
    if (!user?.groceryId) {
      console.log("🛒 No grocery ID found");
      setGroceries({
        foodBank: {},
        meals: [],
        inventory: [],
        shoppingList: [],
      });
      setGroceriesLoading(false);
      return;
    }

    console.log("🛒 Setting up grocery subscription...");
    setGroceriesLoading(true);

    // Groceries are stored in the groceries collection with 4 documents
    // All start with the groceryId and then have _foodBank, _meals, _inventory, _shoppingList
    // Lets dump them all into a single groceries state object for simplicity
    const groceryDocIds = [
      `${user.groceryId}_foodBank`,
      `${user.groceryId}_meals`,
      `${user.groceryId}_inventory`,
      `${user.groceryId}_shoppingList`,
    ];

    const unsubscribes = [];
    let loadedCount = 0;

    // Initialize empty groceries object
    const initialGroceries = {
      foodBank: {},
      meals: [],
      inventory: [],
      shoppingList: [],
    };
    setGroceries(initialGroceries);

    groceryDocIds.forEach((docId) => {
      const unsubscribe = subscribeToDocument(
        "groceries",
        docId,
        (groceryDoc) => {
          if (groceryDoc) {
            console.log(`🛒 Grocery document ${docId} updated`);
            setGroceries((prev) => {
              const newGroceries = { ...prev };
              if (docId.endsWith("_foodBank")) {
                // FoodBank is now nested under a foodBank property
                // Fallback to groceryDoc for backwards compatibility
                newGroceries.foodBank = groceryDoc.foodBank || groceryDoc;
              } else if (docId.endsWith("_meals")) {
                // Meals might have items array or be structured differently
                newGroceries.meals = groceryDoc.items || groceryDoc.meals || [];
              } else if (docId.endsWith("_inventory")) {
                // Inventory has items array
                newGroceries.inventory =
                  groceryDoc.items || groceryDoc.inventory || [];
              } else if (docId.endsWith("_shoppingList")) {
                // Shopping list has items array
                newGroceries.shoppingList =
                  groceryDoc.items || groceryDoc.shoppingList || [];
              }
              return newGroceries;
            });
          } else {
            console.log(`ℹ️ No grocery document found for ${docId}`);
            // Clear out the relevant section if document doesn't exist
            setGroceries((prev) => {
              const newGroceries = { ...prev };
              if (docId.endsWith("_foodBank")) {
                newGroceries.foodBank = {};
              } else if (docId.endsWith("_meals")) {
                newGroceries.meals = [];
              } else if (docId.endsWith("_inventory")) {
                newGroceries.inventory = [];
              } else if (docId.endsWith("_shoppingList")) {
                newGroceries.shoppingList = [];
              }
              return newGroceries;
            });
          }

          // Only set loading to false when all documents have loaded
          loadedCount++;
          if (loadedCount === groceryDocIds.length) {
            console.log("🛒 All grocery documents loaded");
            setGroceriesLoading(false);
          }
        },
        (error) => {
          console.error(`❌ Grocery ${docId} subscription error:`, error);

          // Still increment counter on error so loading completes
          loadedCount++;
          if (loadedCount === groceryDocIds.length) {
            console.log("🛒 All grocery documents processed (with errors)");
            setGroceriesLoading(false);
          }
        }
      );
      unsubscribes.push(unsubscribe);
    });

    return () => {
      console.log("🧹 Cleaning up grocery subscriptions");
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user?.groceryId]);

  // ===== CALENDAR ACTIONS =====
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

      // Values
      unreadMessagesCount,
      unacceptedChecklistsCount,
      messagesCount,

      // Resources (now real-time!)
      calendars,
      groups,
      tasks,
      messages,
      groceries, // NEW

      // Loading states (only for initial setup)
      calendarsLoading,
      groupsLoading,
      tasksLoading,
      messagesLoading,
      groceriesLoading, // NEW

      // Computed properties
      isDataLoaded: !loading && !!user,
      hasCalendars: calendars.length > 0,
      hasGroups: groups.length > 0,
      hasTasks: tasks.length > 0,

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
      tasks,
      calendarsLoading,
      groupsLoading,
      tasksLoading,
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
      groceries,
      groceriesLoading,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
