import { useState } from 'react';

/**
 * useCalendarState - Core calendar UI state management
 * 
 * Returns all state and setters for calendar screens
 * Used by ALL apps
 */
export const useCalendarState = (preferences = {}) => {
  // View state
  const [selectedView, setSelectedView] = useState(
    preferences?.defaultCalendarView || "day"
  );

  // Modal states
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [addChecklistModalVisible, setAddChecklistModalVisible] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);

  // Selected items
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [selectedChecklistEvent, setSelectedChecklistEvent] = useState(null);

  // Checklist mode & updates
  const [checklistMode, setChecklistMode] = useState("complete");
  const [updatedItems, setUpdatedItems] = useState([]);
  const [isDirtyComplete, setIsDirtyComplete] = useState(false);

  // Filter states
  const [showOnlyFilteredActivities, setShowOnlyFilteredActivities] = useState(false);
  const [showDeletedEvents, setShowDeletedEvents] = useState(false); // ← ADD THIS

  return {
    // View
    selectedView,
    setSelectedView,

    // Modals
    eventModalVisible,
    setEventModalVisible,
    addChecklistModalVisible,
    setAddChecklistModalVisible,
    showChecklistModal,
    setShowChecklistModal,

    // Selected items
    selectedEvent,
    setSelectedEvent,
    selectedChecklist,
    setSelectedChecklist,
    selectedChecklistEvent,
    setSelectedChecklistEvent,

    // Checklist mode
    checklistMode,
    setChecklistMode,
    updatedItems,
    setUpdatedItems,
    isDirtyComplete,
    setIsDirtyComplete,

    // Filters
    showOnlyFilteredActivities,
    setShowOnlyFilteredActivities,
    showDeletedEvents,        // ← ADD THIS
    setShowDeletedEvents,     // ← ADD THIS
  };
};