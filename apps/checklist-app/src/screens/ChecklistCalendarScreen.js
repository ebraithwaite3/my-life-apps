import React, { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { SharedCalendarScreen } from "@my-apps/screens";
import {
  ChecklistModal,
  SharedEventModal,
  ChecklistSelector,
  EditChecklistContent,
  AddChecklistToEventModal,
} from "@my-apps/ui";
import { useData, useChecklistData, useAuth } from "@my-apps/contexts";
import {
  useCalendarState,
  useCalendarEvents,
  useCalendarHandlers,
  useChecklistTemplates,
  usePinnedChecklists,
  useRemoveChecklistItems,
  useUpdateExternalActivities,
  useUpdateInternalActivities,
} from "@my-apps/hooks";
import { Alert } from "react-native";
import { DateTime } from "luxon";
import * as Clipboard from "expo-clipboard";
import { showSuccessToast } from "@my-apps/utils";
import { useCombinedPayloadData } from "../components/developer/useEndpointData";

/**
 * ChecklistCalendarScreen - Complete with all features
 *
 * ✅ Navigation params handling (deep links)
 * ✅ Deleted events filter
 * ✅ Today button
 * ✅ Swipe gestures
 * ✅ MonthView
 */
const ChecklistCalendarScreen = ({ navigation, route }) => {
  const {
    user,
    getSpacing,
    selectedDate,
    selectedMonth,
    selectedYear,
    currentDate,
    navigateToNextDay,
    navigateToPreviousDay,
    navigateToPreviousMonth,
    navigateToNextMonth,
    navigateToDate,
    navigateToToday,
    navigateToNextWeek,
    navigateToPreviousWeek,
    getEventsForDay,
    getEventsForWeek,
    getActivitiesForDay,
    getActivitiesForEntity,
    isAdmin,
    preferences,
    groups,
    addingToEvent,
    setAddingToEvent,
  } = useData();
  console.log("Route params:", route.params, "Adding to event:", addingToEvent);

  // Get the joinedApps count from the user
  const joinedAppsCount = useMemo(() => {
    return user?.joinedApps ? Object.keys(user.joinedApps).length : 0;
  }, [user]);

  // Kids banner state (admin only)
  const JACK_USER_ID  = "ObqbPOKgzwYr2SmlN8UQOaDbkzE2";
  const ELLIE_USER_ID = "CjW9bPGIjrgEqkjE9HxNF6xuxfA3";
  const [showKidsBanners, setShowKidsBanners] = useState(false);

  const computeKidBanner = useCallback((entityId, label) => {
    const all = getActivitiesForEntity(entityId);
    const date = DateTime.fromISO(selectedDate);
    const start = date.startOf('day');
    const end = date.endOf('day');
    let total = 0, completed = 0;
    let matchedEvent = null;
    let matchedChecklist = null;
    all.forEach(item => {
      if (!item.startTime) return;
      const s = DateTime.fromISO(item.startTime);
      if (s < start || s > end) return;
      const checklist = item.activities?.find(a => a.activityType === 'checklist');
      if (!checklist) return;
      total += checklist.items?.length ?? 0;
      completed += checklist.items?.filter(i => i.completed).length ?? 0;
      if (!matchedEvent) { matchedEvent = item; matchedChecklist = checklist; }
    });
    return { label, total, completed, event: matchedEvent, activity: matchedChecklist, entityId };
  }, [getActivitiesForEntity, selectedDate]);

  const kidsBanners = useMemo(() => {
    if (!showKidsBanners) return [];
    return [
      computeKidBanner(JACK_USER_ID, "Jack To Do"),
      computeKidBanner(ELLIE_USER_ID, "Ellie To Do"),
    ];
  }, [showKidsBanners, computeKidBanner]);

  const updateInternalActivities = useUpdateInternalActivities();
  const updateExternalActivities = useUpdateExternalActivities();

  const [pendingKidUserId, setPendingKidUserId] = useState(null);
  const [pendingToDoMode, setPendingToDoMode] = useState(false);

  const computeKidCarryover = useCallback((entityId) => {
    const yesterday = DateTime.fromISO(selectedDate).minus({ days: 1 }).toISODate();
    const all = getActivitiesForEntity(entityId);
    const date = DateTime.fromISO(yesterday);
    const start = date.startOf('day');
    const end = date.endOf('day');
    const yesterdayToDo = all.find(item => {
      if (!item.startTime) return false;
      const s = DateTime.fromISO(item.startTime);
      return s >= start && s <= end && item.title?.trim().toLowerCase().includes('to do');
    });
    const checklistActivity = yesterdayToDo?.activities?.find(a => a.activityType === 'checklist');
    return checklistActivity?.items?.filter(i => !i.completed) ?? [];
  }, [getActivitiesForEntity, selectedDate]);

  // HOOK 1: Calendar UI state
  const calendarState = useCalendarState(preferences);

  // HOOK 2: Calendar events data
  const calendarEvents = useCalendarEvents({
    selectedDate,
    selectedMonth,
    selectedYear,
    getEventsForDay,
    getActivitiesForDay,
    filterActivitiesFor: "checklist",
    showOnlyFilteredActivities: calendarState.showOnlyFilteredActivities,
    showDeletedEvents: calendarState.showDeletedEvents,
  });

  // HOOK 3: Calendar handlers
  const calendarHandlers = useCalendarHandlers({
    user,
    ...calendarState,
    selectedChecklist: calendarState.selectedChecklist,
    selectedChecklistEvent: calendarState.selectedChecklistEvent,
    selectedEvent: calendarState.selectedEvent,
    updatedItems: calendarState.updatedItems,
  });

  const getCombinedPayloadData = useCombinedPayloadData();
  const handleClaudePress = useCallback(async () => {
    const prompt = getCombinedPayloadData(selectedDate);
    await Clipboard.setStringAsync(prompt);
    showSuccessToast("Copied to clipboard");
  }, [getCombinedPayloadData, selectedDate]);

  const { allTemplates, saveTemplate, promptForContext } =
    useChecklistTemplates();
  const { createPinnedChecklist, updatePinnedChecklist } =
    usePinnedChecklists();
  const { allPinned } = useChecklistData();
  const { db } = useAuth();
  const { removeItemsFromSource } = useRemoveChecklistItems(db, user, updateInternalActivities, updateExternalActivities);

  //console.log("🔍 Calendar screen allPinned:", allPinned);
  console.log("🔍 Calendar screen allPinned length:", allPinned?.length);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [selectedCalendarIdForMoving, setSelectedCalendarIdForMoving] = useState(null);
  const [carryoverItems, setCarryoverItems] = useState([]);
  const pendingDeepLink = useRef(null);

  useEffect(() => {
    if (addingToEvent.isActive) {
      console.log("📅 Calendar opened in adding mode:", addingToEvent);
      console.log("📦 Items to add:", addingToEvent.itemsToMove);
      console.log("🔙 Return path:", addingToEvent.returnPath);

      // Force to month view
      calendarState.setSelectedView('month');
    }
  }, [addingToEvent.isActive]);


  // Handle navigation params for deep links (notifications, etc.)
  // Step 1: capture params and kick off navigation; store pending checklist open for step 2
  useEffect(() => {
    const { date, view, checklistId, eventId, activityId, dateOffset } = route.params || {};
    const targetId = checklistId || activityId;

    // dateOffset: relative day offset from today (e.g. 1 = tomorrow, -1 = yesterday)
    // Used by notifications that should always open relative to "now" rather than a fixed date
    const resolvedDate = dateOffset != null
      ? DateTime.now().plus({ days: Number(dateOffset) }).toISODate()
      : date;

    if (!resolvedDate) return;

    console.log("📅 Deep link — date:", resolvedDate, "view:", view, "targetId:", targetId);
    navigateToDate(resolvedDate);
    calendarState.setSelectedView(view || "day");

    if (targetId) {
      const dateISO = resolvedDate.split("T")[0];
      pendingDeepLink.current = { dateISO, targetId, eventId };
    }

    navigation.setParams({
      date: undefined,
      view: undefined,
      checklistId: undefined,
      eventId: undefined,
      activityId: undefined,
      dateOffset: undefined,
    });
  }, [route.params]);

  // Step 2: once calendar data loads (getEventsForDay reference updates), try to open the checklist
  useEffect(() => {
    const pending = pendingDeepLink.current;
    if (!pending) return;

    const { dateISO, targetId, eventId } = pending;
    const dayEvents = getEventsForDay(dateISO);
    const dayActivities = getActivitiesForDay(dateISO);

    // Events use eventId field (Google Calendar IDs), not id
    const event = eventId
      ? dayEvents.find((e) => e.eventId === eventId)
      : dayEvents.find((e) => e.activities?.some((a) => a.id === targetId));

    // Activity may be embedded in the event (Google Calendar) or a standalone internal activity
    const activity = event?.activities?.find((a) => a.id === targetId)
      || dayActivities.find((a) => a.id === targetId);

    if (activity && event) {
      console.log("📬 Deep link — opening checklist:", activity.name);
      pendingDeepLink.current = null;
      setTimeout(() => calendarHandlers.handleViewChecklist(event, activity), 300);
    } else if (dayEvents.length > 0 || dayActivities.length > 0) {
      // Data is loaded but no match found — clear pending to avoid infinite retries
      console.warn("📬 Deep link — no matching checklist found for targetId:", targetId);
      pendingDeepLink.current = null;
    }
    // If dayEvents and dayActivities are both empty, data hasn't loaded yet — keep pending and wait
  }, [getEventsForDay, getActivitiesForDay]);

  console.log("What modal is shown?", {
    eventModalVisible: calendarState.eventModalVisible,
    addChecklistModalVisible: calendarState.addChecklistModalVisible,
    showChecklistModal: calendarState.showChecklistModal,
  });

  // Use Effect to close modals if adding checklist items to an event
  useEffect(() => {
    if (addingToEvent.isActive) {
      console.log("📅 Calendar opened in adding mode:", addingToEvent);
      
      // ✅ Close any open modals
      calendarState.setShowChecklistModal(false);
      calendarState.setAddChecklistModalVisible(false);
      calendarState.setEventModalVisible(false);
      
      // Force to month view
      calendarState.setSelectedView('month');
    }
  }, [addingToEvent.isActive]);

  const handleCreateToDo = useCallback(() => {
    Alert.alert(
      "Whose To Do?",
      `Create a To Do for ${selectedDate}`,
      [
        {
          text: "Mine",
          onPress: () => {
            setPendingToDoMode(true);
            calendarState.setEventModalVisible(true);
          },
        },
        {
          text: "Jack",
          onPress: () => {
            setPendingKidUserId(JACK_USER_ID);
            calendarState.setEventModalVisible(true);
          },
        },
        {
          text: "Ellie",
          onPress: () => {
            setPendingKidUserId(ELLIE_USER_ID);
            calendarState.setEventModalVisible(true);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }, [selectedDate, calendarState]);

  const handleEventSuccess = async () => {
    if (addingToEvent.isActive) {
      console.log("✅ Event created successfully, cleaning up adding mode");
      
      // Remove items from source
      try {
        await removeItemsFromSource(
          addingToEvent.sourceInfo, 
          addingToEvent.itemsToMove
        );
      } catch (error) {
        console.error("Error removing items:", error);
      }

      setSelectedCalendarIdForMoving(null);
      
      // Clear state
      setAddingToEvent({
        isActive: false,
        itemsToMove: [],
        returnPath: null,
        sourceInfo: null,
      });
      
      // Navigate back
      navigation.navigate(addingToEvent.returnPath);
    }
  };

  // Handles Add Activity button press
  // If theres addingToEvent, it pre-populates the checklist otherwise normal flow
  const handleAddActivity = (event) => {
    // Compute carryover items from yesterday's To Do checklist.
    // Use getActivitiesForDay (live activities collection) not getEventsForDay
    // (which embeds a stale snapshot of activities at event-creation time).
    if (event.title?.trim().toLowerCase().includes('to do')) {
      const yesterday = DateTime.fromISO(selectedDate).minus({ days: 1 }).toISODate();
      const kidUserId = event.targetUserId;
      if (kidUserId) {
        // Kid event — look up their activities via getActivitiesForEntity
        setCarryoverItems(computeKidCarryover(kidUserId));
      } else {
        // Eric — use the aggregated day lookup
        const yesterdayActivities = getActivitiesForDay(yesterday);
        const yesterdayToDo = yesterdayActivities.find(
          a => a.title?.trim().toLowerCase().includes('to do')
        );
        const checklistActivity = yesterdayToDo?.activities?.find(a => a.activityType === 'checklist');
        setCarryoverItems(checklistActivity?.items?.filter(i => !i.completed) ?? []);
      }
    } else {
      setCarryoverItems([]);
    }

    if (addingToEvent.isActive) {
      // Create pre-populated checklist from items being moved
      const checklist = {
        id: `checklist_${Date.now()}`,
        name: "Checklist",
        items: addingToEvent.itemsToMove.map(item => ({
          ...item,
          completed: false,
        })),
        createdAt: Date.now(),
      };
      
      setSelectedChecklist(checklist);
      calendarState.setSelectedEvent(event);
      calendarState.setAddChecklistModalVisible(true);
    } else {
      // Normal flow
      calendarHandlers.handleAddChecklist(event);
    }
  };

  const handleAddItemsToExistingChecklist = async (activity, event) => {
    console.log("🔄 Adding items to existing checklist:", activity.name);
    
    // ✅ Check if same event - need to handle differently
    const isSameEvent = addingToEvent.sourceInfo?.eventId === event.eventId;
    
    if (isSameEvent) {
      console.log("🔄 Same event - doing add AND remove in one operation");
      
      const itemIdsSet = new Set(addingToEvent.sourceInfo.itemIdsToRemove);
      
      // Update ALL activities in one pass
      const updatedActivities = event.activities.map(act => {
        // Add items to destination checklist
        if (act.id === activity.id) {
          return {
            ...act,
            items: [
              ...act.items,
              ...addingToEvent.itemsToMove.map(item => ({
                ...item,
                completed: false,
              }))
            ]
          };
        }
        // Remove items from source checklist
        if (act.id === addingToEvent.sourceInfo.checklistId && act.activityType === 'checklist') {
          return {
            ...act,
            items: act.items.filter(item => !itemIdsSet.has(item.id))
          };
        }
        // Keep other activities unchanged
        return act;
      });
      
      // Save once
      const isInternal = event.calendarId === 'internal';
      const result = isInternal 
        ? await updateInternalActivities(event.eventId, event.startTime, updatedActivities, event.groupId)
        : await updateExternalActivities(event.eventId, event.calendarId, event.startTime, updatedActivities);
      
      if (result.success) {
        const returnPath = addingToEvent.returnPath;
        const itemCount = addingToEvent.itemsToMove.length;
        const checklistName = activity.name;
        
        setAddingToEvent({ isActive: false, itemsToMove: [], returnPath: null, sourceInfo: null });
        
        navigation.navigate(returnPath);
        
        setTimeout(() => {
          Alert.alert("Success", `Moved ${itemCount} items to "${checklistName}"`);
        }, 100);
      }
      
    } else {
      // Different event - add, then remove (existing logic)
      const mergedItems = [
        ...activity.items,
        ...addingToEvent.itemsToMove.map(item => ({
          ...item,
          completed: false,
        }))
      ];
      
      const updatedActivities = event.activities.map(act => 
        act.id === activity.id ? { ...act, items: mergedItems } : act
      );
      
      const isInternal = event.calendarId === 'internal';
      const result = isInternal 
        ? await updateInternalActivities(event.eventId, event.startTime, updatedActivities, event.groupId)
        : await updateExternalActivities(event.eventId, event.calendarId, event.startTime, updatedActivities);
      
      if (result.success) {
        console.log("✅ Result success, proceeding with cleanup");
        
        try {
          await removeItemsFromSource(addingToEvent.sourceInfo, addingToEvent.itemsToMove);
        } catch (error) {
          console.error("❌ Error removing from source:", error);
        }
        
        const returnPath = addingToEvent.returnPath;
        const itemCount = addingToEvent.itemsToMove.length;
        const checklistName = activity.name;
        
        setAddingToEvent({ isActive: false, itemsToMove: [], returnPath: null, sourceInfo: null });
        
        navigation.navigate(returnPath);
        
        setTimeout(() => {
          Alert.alert("Success", `Added ${itemCount} items to "${checklistName}"`);
        }, 100);
      }
    }
  };

  return (
    <>
      {/* Main Calendar Screen */}
      <SharedCalendarScreen
        filterActivitiesFor="checklist"
        navigation={navigation}
        route={route}
        // STATE: Pass from calendarState
        selectedView={calendarState.selectedView}
        setSelectedView={calendarState.setSelectedView}
        eventModalVisible={calendarState.eventModalVisible}
        setEventModalVisible={calendarState.setEventModalVisible}
        showOnlyFilteredActivities={calendarState.showOnlyFilteredActivities}
        setShowOnlyFilteredActivities={
          calendarState.setShowOnlyFilteredActivities
        }
        showDeletedEvents={calendarState.showDeletedEvents}
        setShowDeletedEvents={calendarState.setShowDeletedEvents}
        // DATA: Pass from useData and calendarEvents
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        currentDate={currentDate}
        navigateToNextDay={navigateToNextDay}
        navigateToPreviousDay={navigateToPreviousDay}
        navigateToPreviousMonth={navigateToPreviousMonth}
        navigateToNextMonth={navigateToNextMonth}
        navigateToDate={navigateToDate}
        navigateToToday={navigateToToday}
        navigateToNextWeek={navigateToNextWeek}
        navigateToPreviousWeek={navigateToPreviousWeek}
        getEventsForWeek={getEventsForWeek}
        filteredTodaysEvents={calendarEvents.filteredTodaysEvents}
        deletedEventsCount={calendarEvents.deletedEventsCount}
        allEventsForMonth={calendarEvents.allEventsForMonth}
        joinedAppsCount={joinedAppsCount}
        user={user}
        // MODAL STATE: For hiding Today button when modals open
        addChecklistModalVisible={calendarState.addChecklistModalVisible}
        showChecklistModal={calendarState.showChecklistModal}
        // HANDLERS: Pass from calendarHandlers
        onDeleteEvent={calendarHandlers.handleDeleteEvent}
        onEditEvent={calendarHandlers.handleEditEvent}
        onAddActivity={handleAddActivity}
        onActivityPress={(activity, event) => {
          // ✅ Check if in adding mode first
          if (addingToEvent.isActive) {
            if (activity.activityType === 'checklist') {
              handleAddItemsToExistingChecklist(activity, event);
            }
            return;  // Don't continue to normal flow
          }
          
          // Normal flow - existing logic
          console.log("🔍 Activity:", activity);
          console.log("🔍 Event:", event);
          console.log("🔍 Calling handleViewChecklist");
          const calendarId = event.calendarId;
          console.log("🔍 Event's calendarId:", calendarId);
          setSelectedCalendarIdForMoving(calendarId);
        
          calendarHandlers.handleViewChecklist(event, activity);
        
          console.log("🔍 After handleViewChecklist");
        }}
        onActivityDelete={(activity, event) => {
          // ActivityRow passes (activity, event) but handleDeleteChecklist expects (event, activity)
          calendarHandlers.handleDeleteChecklist(event, activity);
        }}
        addingToEvent={addingToEvent}
        setAddingToEvent={setAddingToEvent}
        setSelectedChecklist={setSelectedChecklist}
        isDeleting={calendarState.isDeleting}
        kidsBanners={kidsBanners}
        showKidsBanners={showKidsBanners}
        isAdmin={isAdmin}
        onClaudePress={user?.admin ? handleClaudePress : undefined}
        onToggleKidsBanners={() => setShowKidsBanners(v => !v)}
        onCreateToDo={handleCreateToDo}
        onKidBannerPress={(banner) => {
          if (banner.event && banner.activity) {
            const eventWithTarget = { ...banner.event, targetUserId: banner.entityId };
            calendarHandlers.handleViewChecklist(eventWithTarget, banner.activity);
          }
        }}
      />

      {/* Shared Event Modal with Checklist Configuration */}
      <SharedEventModal
        isVisible={calendarState.eventModalVisible}
        onClose={() => {
          calendarState.setSelectedEvent(null);
          calendarState.setEventModalVisible(false);
          setPendingKidUserId(null);
          setPendingToDoMode(false);
        }}
        targetUserId={pendingKidUserId}
        suppressWorkoutAlert={pendingKidUserId != null}
        externalCarryoverItems={pendingKidUserId != null ? computeKidCarryover(pendingKidUserId) : null}
        onSuccess={() => {
          setPendingKidUserId(null);
          setPendingToDoMode(false);
          handleEventSuccess();
        }}
        event={calendarState.selectedEvent}
        userCalendars={user?.calendars || []}
        groups={groups || []}
        initialDate={selectedDate}
        user={user}
        // App-specific config
        appName="checklist"
        eventTitles={{ new: "New List", edit: "Edit List" }}
        defaultTitle={
          pendingKidUserId === JACK_USER_ID ? "Jack To Do" :
          pendingKidUserId === ELLIE_USER_ID ? "Ellie To Do" :
          pendingToDoMode ? "To Do" :
          "Checklist"
        }
        // Activity configuration
        activities={[
          {
            type: "checklist",
            label: "Checklist",
            required: false,
            SelectorComponent: ChecklistSelector,
            EditorComponent: EditChecklistContent,
            selectedActivity: selectedChecklist,
            onSelectActivity: setSelectedChecklist,
            // Add this transformer
            transformTemplate: (template) => ({
              id: `checklist_${Date.now()}`,
              name: template.name,
              items: template.items.map((item, index) => ({
                ...item,
                id: item.id || `item_${Date.now()}_${index}`,
                completed: false,
              })),
              createdAt: Date.now(),
              ...(template.defaultNotifyAdmin && { notifyAdmin: true }),
            }),
            editorProps: {
              templates: allTemplates,
              onSaveTemplate: saveTemplate,
              promptForContext,
              prefilledTitle: "Checklist",
              isUserAdmin: user?.admin === true,
              useQuickAddMode: true,
              pinnedChecklists: allPinned,
            },
          },
        ]}
      />

      {/* Checklist Modals (shared component - all apps use this) */}
      <ChecklistModal
        {...calendarState}
        {...calendarHandlers}
        user={user}
        getSpacing={getSpacing}
        templates={allTemplates}
        onSaveTemplate={saveTemplate}
        promptForContext={promptForContext}
        pinnedChecklists={allPinned}
        onCreatePinnedChecklist={createPinnedChecklist}
        onUpdatePinnedChecklist={updatePinnedChecklist}
        selectedCalendarIdForMoving={selectedCalendarIdForMoving}
        setSelectedCalendarIdForMoving={setSelectedCalendarIdForMoving}
        useQuickAddMode={true}
      />

      {/* Add Checklist to Event Modal */}
      <AddChecklistToEventModal
        visible={calendarState.addChecklistModalVisible}
        onClose={() => {
          calendarState.setAddChecklistModalVisible(false);
          calendarState.setSelectedEvent(null);
          setSelectedChecklist(null);
          setCarryoverItems([]);
        }}
        carryoverItems={carryoverItems}
        onSuccess={handleEventSuccess}
        selectedEvent={calendarState.selectedEvent}
        preselectedChecklist={selectedChecklist}
        templates={allTemplates}
        onSaveChecklist={calendarHandlers.handleSaveChecklist}
        onSaveTemplate={saveTemplate}
        promptForContext={promptForContext}
        isUserAdmin={user?.admin === true}
        useQuickAddMode={true}
        pinnedChecklists={allPinned}
      />
    </>
  );
};

export default ChecklistCalendarScreen;
