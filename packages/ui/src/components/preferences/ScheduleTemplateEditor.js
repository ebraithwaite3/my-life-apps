// /packages/ui/src/components/ScheduleTemplateEditor.js

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTheme, useAuth } from '@my-apps/contexts';
import PageHeader from '../headers/PageHeader'
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { doc, setDoc } from 'firebase/firestore';
import ScheduleDefaultEventModal from '../modals/composed/modals/ScheduleDefaultEventModal';

const HOUR_HEIGHT = 60;
const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const DAY_HEADER_HEIGHT = 50;
const TIME_COLUMN_WIDTH = 40;
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const ScheduleTemplateEditor = ({ template, userCalendars, activities = [], onClose }) => {
    console.log('🎨 ScheduleTemplateEditor RENDERING');
    console.log('Template:', template);
    console.log('UserCalendars:', userCalendars?.length);
  const { theme, getSpacing } = useTheme();
  const { db, user } = useAuth();
  const scrollViewRef = useRef(null);

  const [templateName, setTemplateName] = useState(template?.name || 'New Schedule');
  const [templateIcon, setTemplateIcon] = useState(template?.icon || 'calendar');
  const [events, setEvents] = useState(template?.events || []);
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Scroll to 9am on mount
  useEffect(() => {
    setTimeout(() => {
      const scrollPosition = (9 - START_HOUR) * HOUR_HEIGHT;
      scrollViewRef.current?.scrollTo({ y: scrollPosition, animated: false });
    }, 100);
  }, []);

  const getEventPosition = (event) => {
    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const startDecimal = startHour + startMinute / 60;
    const top = (startDecimal - START_HOUR) * HOUR_HEIGHT;

    let height = 30;
    if (event.endTime) {
      const [endHour, endMinute] = event.endTime.split(':').map(Number);
      const endDecimal = endHour + endMinute / 60;
      const duration = endDecimal - startDecimal;
      height = Math.max(duration * HOUR_HEIGHT - 2, 30);
    }

    return { top, height };
  };

  const getEventColor = (event) => {
    const calendar = userCalendars.find(c => c.calendarId === event.calendarId);
    return calendar?.color || theme.primary;
  };

  const handleAddEvent = (dayOfWeek, hour) => {
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    const endTime = `${String(hour + 1).padStart(2, '0')}:00`;

    setEditingEvent({ dayOfWeek, startTime, endTime });
    setEventModalVisible(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventModalVisible(true);
  };

  const handleDeleteEvent = (eventId) => {
    Alert.alert(
      'Delete Event',
      'Remove this event from the template?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setEvents(prev => prev.filter(e => e.id !== eventId));
          }
        }
      ]
    );
  };

  const handleSaveEvent = (eventData) => {
    if (editingEvent?.id) {
      // Update existing
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? eventData : e));
    } else {
      // Add new
      setEvents(prev => [...prev, { ...eventData, id: `evt-${Date.now()}` }]);
    }

    setEventModalVisible(false);
    setEditingEvent(null);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    setSaving(true);

    try {
      const templateId = template?.id || `template-${Date.now()}`;
      const templateRef = doc(db, 'users', user.uid, 'scheduleTemplates', templateId);

      await setDoc(templateRef, {
        id: templateId,
        name: templateName,
        icon: templateIcon,
        events: events,
        createdAt: template?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Template saved!', [
        {
          text: 'OK',
          onPress: onClose
        }
      ]);
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const renderEvent = (event) => {
    const { top, height } = getEventPosition(event);
    const color = getEventColor(event);

    return (
      <TouchableOpacity
        key={event.id}
        style={[
          styles.eventBlock,
          {
            top,
            height,
            backgroundColor: color,
          }
        ]}
        onPress={() => handleEditEvent(event)}
        onLongPress={() => handleDeleteEvent(event.id)}
      >
        <Text style={styles.eventTitle} numberOfLines={height > 40 ? 2 : 1}>
          {event.title}
        </Text>
        {height > 35 && (
          <Text style={styles.eventTime}>{event.startTime}</Text>
        )}
        {event.reminder?.isRecurring && height > 50 && (
          <Icon name="sync" size={12} color="rgba(255,255,255,0.9)" />
        )}
      </TouchableOpacity>
    );
  };

  const renderDayColumn = (dayIndex) => {
    const dayEvents = events.filter(e => e.dayOfWeek === dayIndex);

    return (
      <View key={dayIndex} style={styles.dayEventsColumn}>
        {/* Hour grid lines */}
        {HOURS.map((hour) => (
          <TouchableOpacity
            key={hour}
            style={styles.hourRow}
            onPress={() => handleAddEvent(dayIndex, hour)}
          />
        ))}

        {/* Events */}
        {dayEvents.map(event => renderEvent(event))}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    nameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: getSpacing.md,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: getSpacing.sm,
    },
    nameInput: {
      flex: 1,
      fontSize: 20,
      fontWeight: '600',
      color: theme.text.primary,
      padding: 8,
    },
    nameText: {
      flex: 1,
      fontSize: 20,
      fontWeight: '600',
      color: theme.text.primary,
      padding: 8,
    },
    header: {
      flexDirection: 'row',
      height: DAY_HEADER_HEIGHT,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.background,
    },
    headerSpacer: {
      width: TIME_COLUMN_WIDTH,
    },
    headerDaysContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    dayColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayLetter: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text.primary,
    },
    scrollContent: {
      flexDirection: 'row',
    },
    timeColumn: {
      width: TIME_COLUMN_WIDTH,
      backgroundColor: theme.background,
    },
    timeLabel: {
      height: HOUR_HEIGHT,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: 4,
    },
    timeLabelText: {
      fontSize: 10,
      color: theme.text.secondary,
      opacity: 0.6,
    },
    dayColumnsContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    dayEventsColumn: {
      flex: 1,
      position: 'relative',
      borderLeftWidth: 0.5,
      borderLeftColor: theme.border,
    },
    hourRow: {
      height: HOUR_HEIGHT,
      borderTopWidth: 0.5,
      borderTopColor: theme.border,
    },
    eventBlock: {
      position: 'absolute',
      left: 2,
      right: 2,
      borderRadius: 4,
      padding: 4,
      paddingHorizontal: 6,
      overflow: 'hidden',
    },
    eventTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
      lineHeight: 13,
    },
    eventTime: {
      fontSize: 9,
      color: 'rgba(255, 255, 255, 0.9)',
      marginTop: 2,
    },
  });

  return (
    <View style={styles.container}>
      <PageHeader
        showBackButton
        onBackPress={onClose}
        title={template ? "Edit Template" : "New Template"}
        icons={[
          {
            icon: saving ? 'loading' : 'checkbox-outline',
            action: handleSaveTemplate,
          }
        ]}
      />

      {/* Template Name Editor */}
      <View style={styles.nameContainer}>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name={templateIcon} size={24} color={theme.primary} />
        </TouchableOpacity>
        {editingName ? (
          <TextInput
            style={styles.nameInput}
            value={templateName}
            onChangeText={setTemplateName}
            onBlur={() => setEditingName(false)}
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <TouchableOpacity onPress={() => setEditingName(true)} style={{ flex: 1 }}>
            <Text style={styles.nameText}>{templateName}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Week Grid */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {/* Day Letter Headers */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <View style={styles.headerDaysContainer}>
              {DAYS.map((letter, index) => (
                <View key={index} style={styles.dayColumn}>
                  <Text style={styles.dayLetter}>{letter}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Scrollable Grid */}
          <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
            <View style={styles.scrollContent}>
              {/* Time Labels */}
              <View style={styles.timeColumn}>
                {HOURS.map((hour) => (
                  <View key={hour} style={styles.timeLabel}>
                    <Text style={styles.timeLabelText}>
                      {hour > 12 ? `${hour - 12}` : hour === 12 ? '12' : `${hour}`}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Day Columns */}
              <View style={styles.dayColumnsContainer}>
                {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => renderDayColumn(dayIndex))}
              </View>
            </View>
          </ScrollView>
        </View>
      </GestureHandlerRootView>

      {/* Event Modal */}
      <ScheduleDefaultEventModal
        visible={eventModalVisible}
        onClose={() => {
          setEventModalVisible(false);
          setEditingEvent(null);
        }}
        event={editingEvent}
        userCalendars={userCalendars}
        activities={activities}
        onSave={handleSaveEvent}
      />
    </View>
  );
};

export default ScheduleTemplateEditor;