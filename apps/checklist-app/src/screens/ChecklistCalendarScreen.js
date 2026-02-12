import React, { useMemo, useEffect, useState } from "react";
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

  const updateInternalActivities = useUpdateInternalActivities();
  const updateExternalActivities = useUpdateExternalActivities();

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

  const { allTemplates, saveTemplate, promptForContext } =
    useChecklistTemplates();
  const { createPinnedChecklist, updatePinnedChecklist } =
    usePinnedChecklists();
  const { allPinned } = useChecklistData();
  const { db } = useAuth();
  const { removeItemsFromSource } = useRemoveChecklistItems(db, user, updateInternalActivities, updateExternalActivities);

  console.log("🔍 Calendar screen allPinned:", allPinned);
  console.log("🔍 Calendar screen allPinned length:", allPinned?.length);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [selectedCalendarIdForMoving, setSelectedCalendarIdForMoving] = useState(null);

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
  useEffect(() => {
    const { date, view, checklistId, eventId, activityId } = route.params || {};

    if (date) {
      console.log("📅 Nav param date detected:", date, "View:", view);
      navigateToDate(date);

      if (view === "day") {
        console.log("🔄 Switching to day view");
        calendarState.setSelectedView("day");
      } else if (view === "month") {
        calendarState.setSelectedView("month");
      }

      // TODO: Handle checklistId to auto-open the checklist modal

      // Clear ALL params after handling
      navigation.setParams({
        date: undefined,
        view: undefined,
        checklistId: undefined,
        eventId: undefined,
        activityId: undefined,
      });
    }
  }, [route.params, navigateToDate, navigation, calendarState]);

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
      />

      {/* Shared Event Modal with Checklist Configuration */}
      <SharedEventModal
        isVisible={calendarState.eventModalVisible}
        onClose={() => {
          calendarState.setSelectedEvent(null);
          calendarState.setEventModalVisible(false);
        }}
        onSuccess={handleEventSuccess}
        event={calendarState.selectedEvent}
        userCalendars={user?.calendars || []}
        groups={groups || []}
        initialDate={selectedDate}
        user={user}
        // App-specific config
        appName="checklist"
        eventTitles={{ new: "New List", edit: "Edit List" }}
        defaultTitle="Checklist"
        // Activity configuration
        activities={[
          {
            type: "checklist",
            label: "Checklist",
            required: true,
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
      />

      {/* Add Checklist to Event Modal */}
      <AddChecklistToEventModal
        visible={calendarState.addChecklistModalVisible}
        onClose={() => {
          calendarState.setAddChecklistModalVisible(false);
          calendarState.setSelectedEvent(null);
          setSelectedChecklist(null);
        }}
        onSuccess={handleEventSuccess}
        selectedEvent={calendarState.selectedEvent}
        preselectedChecklist={selectedChecklist}
        templates={allTemplates}
        onSaveChecklist={calendarHandlers.handleSaveChecklist}
        onSaveTemplate={saveTemplate}
        promptForContext={promptForContext}
        isUserAdmin={user?.admin === true}
      />
    </>
  );
};

export default ChecklistCalendarScreen;
