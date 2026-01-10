import React, { useMemo, useEffect, useState } from 'react';
import { SharedCalendarScreen } from '@my-apps/screens';
import { ChecklistModal, SharedEventModal, ChecklistSelector, EditChecklistContent } from '@my-apps/ui';
import { useData } from '@my-apps/contexts';
import { 
  useCalendarState,
  useCalendarEvents,
  useCalendarHandlers,
  useChecklistTemplates,
} from "@my-apps/hooks";

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
    getEventsForDay,
    getActivitiesForDay,
    preferences,
    groups,
  } = useData();

  // Get the joinedApps count from the user
  const joinedAppsCount = useMemo(() => {
    return user?.joinedApps ? Object.keys(user.joinedApps).length : 0;
  }, [user]);

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

  const { allTemplates, saveTemplate, promptForContext } = useChecklistTemplates();
  const [selectedChecklist, setSelectedChecklist] = useState(null);

  // Handle navigation params for deep links (notifications, etc.)
  useEffect(() => {
    const { date, view } = route.params || {};

    if (date) {
      console.log("📅 Nav param date detected:", date, "View:", view);
      navigateToDate(date);

      if (view === "day") {
        console.log("🔄 Switching to day view");
        calendarState.setSelectedView("day");
      } else if (view === "month") {
        calendarState.setSelectedView("month");
      }

      // Clear params after handling
      navigation.setParams({ date: undefined, view: undefined });
    }
  }, [route.params, navigateToDate, navigation, calendarState]);

  console.log("What modal is shown?", {
    eventModalVisible: calendarState.eventModalVisible,
    addChecklistModalVisible: calendarState.addChecklistModalVisible,
    showChecklistModal: calendarState.showChecklistModal,
  });

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
        setShowOnlyFilteredActivities={calendarState.setShowOnlyFilteredActivities}
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
        onAddActivity={calendarHandlers.handleAddChecklist}
        onActivityPress={(activity, event) => {
          // ActivityRow passes (activity, event) but handleViewChecklist expects (event, activity)
          calendarHandlers.handleViewChecklist(event, activity);
        }}
        onActivityDelete={(activity, event) => {
          // ActivityRow passes (activity, event) but handleDeleteChecklist expects (event, activity)
          calendarHandlers.handleDeleteChecklist(event, activity);
        }}
      />

      {/* Shared Event Modal with Checklist Configuration */}
      <SharedEventModal
        isVisible={calendarState.eventModalVisible}
        onClose={() => {
          calendarState.setSelectedEvent(null);
          calendarState.setEventModalVisible(false);
        }}
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
      />
    </>
  );
};

export default ChecklistCalendarScreen;