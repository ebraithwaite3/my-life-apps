import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { DateTime } from 'luxon';

export const useScheduleTemplates = (db, userId, isAdmin) => {
    const [templates, setTemplates] = useState([]);
    const [activeTemplateId, setActiveTemplateId] = useState(null);
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [error, setError] = useState(null);
  
    // Load all templates
    useEffect(() => {
      if (!db || !userId || !isAdmin) {
        setTemplates([]);
        setTemplatesLoading(false);
        return;
      }
  
      // Subscribe to templates collection
      const unsubscribe = onSnapshot(
        collection(db, 'users', userId, 'scheduleTemplates'),
        (snapshot) => {
          const templatesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          templatesData.sort((a, b) => a.name.localeCompare(b.name));
          setTemplates(templatesData);
          setTemplatesLoading(false);
        },
        (err) => {
          console.error('❌ Templates error:', err);
          setError(err);
          setTemplatesLoading(false);
        }
      );
  
      return () => unsubscribe();
    }, [db, userId, isAdmin]);
  
    // Get active template
    const activeTemplate = useMemo(() => {
      return templates.find(t => t.id === activeTemplateId) || null;
    }, [templates, activeTemplateId]);
  
    // Convert template events to actual dates for a given week
    const getTemplateEventsForWeek = useCallback((dateISO) => {
      if (!activeTemplate) return [];
  
      const dt = DateTime.fromISO(dateISO);
      const weekStart = dt.minus({ days: dt.weekday % 7 }); // Sunday
  
      return activeTemplate.events.map(templateEvent => {
        const eventDate = weekStart.plus({ days: templateEvent.dayOfWeek });
        const [startHour, startMin] = templateEvent.startTime.split(':').map(Number);
        const [endHour, endMin] = templateEvent.endTime.split(':').map(Number);
  
        const startDateTime = eventDate.set({ hour: startHour, minute: startMin });
        const endDateTime = eventDate.set({ hour: endHour, minute: endMin });
  
        return {
          ...templateEvent,
          // Add fields that WeekView expects
          eventId: `template-${templateEvent.id}`,
          startTime: startDateTime.toISO(),
          endTime: endDateTime.toISO(),
          isTemplate: true, // ← Flag to style differently
        };
      });
    }, [activeTemplate]);
  
    return {
      templates,
      activeTemplate,
      activeTemplateId,
      setActiveTemplateId,
      getTemplateEventsForWeek,
      templatesLoading,
      error,
    };
  };