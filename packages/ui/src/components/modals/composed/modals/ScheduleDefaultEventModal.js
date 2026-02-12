import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@my-apps/contexts';
import ModalHeader from '../../../headers/ModalHeader';
import TextInputRow from '../../../forms/TextInputRow';
import SelectorRow from '../../../forms/SelectorRow';
import ReminderSelector from '../../../forms/ReminderSelector';
import ModalWrapper from '../../base/ModalWrapper';
import OptionsSelectionModal from '../pickers/OptionsSelectionModal';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Convert 24hr time to 12hr format
const formatTime12Hour = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours < 12 ? 'AM' : 'PM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

const ScheduleDefaultEventModal = ({
  visible,
  onClose,
  onSave,
  event = null,
  userCalendars = [],
  activities = [], // ← Activity configuration
}) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();

  // Form state
  const [title, setTitle] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedCalendarId, setSelectedCalendarId] = useState(userCalendars[0]?.calendarId);
  const [reminder, setReminder] = useState(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  // Modal state
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);

  // ✅ FIX: Update form state when event prop changes
  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDayOfWeek(event.dayOfWeek ?? 1);
      setStartTime(event.startTime || '09:00');
      setEndTime(event.endTime || '10:00');
      setSelectedCalendarId(event.calendarId || userCalendars[0]?.calendarId);
      setReminder(event.reminder || null);
      setDescription(event.description || '');
      setLocation(event.location || '');
    } else {
      // New event - reset to defaults
      setTitle('');
      setDayOfWeek(1);
      setStartTime('09:00');
      setEndTime('10:00');
      setSelectedCalendarId(userCalendars[0]?.calendarId);
      setReminder(null);
      setDescription('');
      setLocation('');
    }
  }, [event, visible]); // ← Reset when event changes OR modal opens

  const selectedCalendar = userCalendars.find(c => c.calendarId === selectedCalendarId);

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }
  
    // Build activities array from selected activities
    const activitiesData = activities
      .filter(a => a.selectedActivity)
      .map(a => ({
        ...a.selectedActivity,
        activityType: a.type,
      }));
  
    // Convert reminder to template format (time only)
    let templateReminder = null;
    if (reminder) {
      if (typeof reminder === 'object' && reminder.scheduledFor) {
        // Extract just the time from scheduledFor
        const dt = new Date(reminder.scheduledFor);
        const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
        
        templateReminder = {
          time,  // Just HH:mm
          isRecurring: reminder.isRecurring || false,
        };
  
        // Convert runtime recurring config (intervalSeconds) → template config (frequency/interval)
        if (reminder.isRecurring && reminder.recurringConfig) {
          const { intervalSeconds, totalOccurrences, completedCancelsRecurring } = reminder.recurringConfig;
          
          // Convert intervalSeconds to frequency + interval
          let frequency, interval;
          
          if (intervalSeconds < 3600) {
            // Minutes (60, 120, 300, etc.)
            frequency = 'minutely';
            interval = intervalSeconds / 60;
          } else if (intervalSeconds < 86400) {
            // Hours (3600, 7200, etc.)
            frequency = 'hourly';
            interval = intervalSeconds / 3600;
          } else if (intervalSeconds < 604800) {
            // Days (86400, 172800, etc.)
            frequency = 'daily';
            interval = intervalSeconds / 86400;
          } else if (intervalSeconds < 2592000) {
            // Weeks (604800, 1209600, etc.)
            frequency = 'weekly';
            interval = intervalSeconds / 604800;
          } else {
            // Months (2592000+)
            frequency = 'monthly';
            interval = intervalSeconds / 2592000;
          }
          
          templateReminder.recurringConfig = {
            frequency,
            interval: Math.round(interval),
            ...(totalOccurrences !== null && { totalOccurrences }),
            ...(completedCancelsRecurring !== undefined && { completedCancelsRecurring }),
            // For weekly, add daysOfWeek (defaults to event's day)
            ...(frequency === 'weekly' && { daysOfWeek: [dayOfWeek] }),
          };
        }
      } else if (typeof reminder === 'number') {
        // Legacy format (minutes before)
        const [startHour, startMin] = startTime.split(':').map(Number);
        const totalMinutes = startHour * 60 + startMin - reminder;
        const reminderHour = Math.floor(totalMinutes / 60);
        const reminderMin = totalMinutes % 60;
        
        templateReminder = {
          time: `${String(reminderHour).padStart(2, '0')}:${String(reminderMin).padStart(2, '0')}`,
          isRecurring: false
        };
      }
    }
  
    const eventData = {
      id: event?.id,
      title: title.trim(),
      dayOfWeek,
      startTime,
      endTime,
      calendarId: selectedCalendarId,
      reminder: templateReminder,
      description,
      location,
      activities: activitiesData,
    };
  
    onSave(eventData);
    handleClose();
  };

  const handleClose = () => {
    // Clear activity selections
    activities.forEach(a => a.onSelectActivity(null));
    onClose();
  };

  // Handle activity selector press
  const handleActivityPress = (activityConfig) => {
    setCurrentActivity(activityConfig);
    setShowActivityPicker(true);
  };

  // Handle activity template selection
  const handleActivitySelect = (option) => {
    if (option.value === 'none') {
      currentActivity.onSelectActivity(null);
    } else {
      const template = currentActivity.editorProps?.templates?.find(t => t.id === option.value);
      if (template) {
        const newActivity = currentActivity.transformTemplate
          ? currentActivity.transformTemplate(template)
          : { ...template, id: `${currentActivity.type}_${Date.now()}` };
        currentActivity.onSelectActivity(newActivity);
      }
    }
    setShowActivityPicker(false);
    setCurrentActivity(null);
  };

  // Build picker options
  const dayOptions = DAYS.map((day, index) => ({
    id: index,
    label: day,
    value: index,
  }));

  const calendarOptions = userCalendars.map(cal => ({
    id: cal.calendarId,
    label: cal.name,
    value: cal.calendarId,
    colorDot: cal.color,
  }));

  // Build activity picker options
  const activityOptions = currentActivity
    ? [
        { id: 'none', label: 'None', value: 'none' },
        ...(currentActivity.editorProps?.templates || []).map(template => ({
          id: template.id,
          label: template.name,
          value: template.id,
        }))
      ]
    : [];

  // Generate time options (every 15 minutes)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeValue = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour < 12 ? 'AM' : 'PM';
        const displayMinute = String(minute).padStart(2, '0');
        const timeLabel = `${displayHour}:${displayMinute} ${ampm}`;
        
        options.push({
          id: timeValue,
          label: timeLabel,
          value: timeValue,
        });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Convert template time to fake date for ReminderSelector
  const getFakeStartDate = () => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: getBorderRadius.lg,
      borderTopRightRadius: getBorderRadius.lg,
      width: '100%',
      height: '90%',
    },
    content: {
      flex: 1,
    },
    scrollContainer: {
      paddingBottom: getSpacing.xl * 2,
    },
  });

  if (!visible) return null;

  return (
    <ModalWrapper visible={visible} onClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ModalHeader
            title={event?.id ? 'Edit Template Event' : 'New Template Event'}
            onCancel={handleClose}
            onDone={handleSave}
            doneText={event?.id ? 'Update' : 'Add'}
          />

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <TextInputRow
              label="Title"
              placeholder="Event title"
              value={title}
              onChangeText={setTitle}
              autoCapitalize="words"
            />

            {/* ✅ Activity Selectors */}
            {activities.map((activityConfig) => {
              const SelectorComponent = activityConfig.SelectorComponent;
              return (
                <SelectorComponent
                  key={activityConfig.type}
                  label={activityConfig.label}
                  selectedChecklist={activityConfig.selectedActivity}
                  savedChecklists={activityConfig.editorProps?.templates || []}
                  onPress={() => handleActivityPress(activityConfig)}
                  onClear={() => activityConfig.onSelectActivity(null)}
                />
              );
            })}

            <SelectorRow
              label="Day"
              value={DAYS[dayOfWeek]}
              onPress={() => setShowDayPicker(true)}
            />

            <SelectorRow
              label="Start Time"
              value={formatTime12Hour(startTime)}
              onPress={() => setShowStartTimePicker(true)}
            />

            <SelectorRow
              label="End Time"
              value={formatTime12Hour(endTime)}
              onPress={() => setShowEndTimePicker(true)}
            />

            <SelectorRow
              label="Calendar"
              value={selectedCalendar?.name}
              colorDot={selectedCalendar?.color}
              onPress={() => setShowCalendarPicker(true)}
            />

            <ReminderSelector
              reminder={reminder}
              onReminderChange={setReminder}
              eventStartDate={getFakeStartDate()}
              isAllDay={false}
              isTemplateMode={true}
            />

            <TextInputRow
              label="Description"
              placeholder="Optional description"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <TextInputRow
              label="Location"
              placeholder="Optional location"
              value={location}
              onChangeText={setLocation}
            />
          </ScrollView>

          {/* Pickers */}
          <OptionsSelectionModal
            visible={showDayPicker}
            title="Select Day"
            options={dayOptions}
            onSelect={(option) => {
              setDayOfWeek(option.value);
              setShowDayPicker(false);
            }}
            onClose={() => setShowDayPicker(false)}
          />

          <OptionsSelectionModal
            visible={showCalendarPicker}
            title="Select Calendar"
            options={calendarOptions}
            onSelect={(option) => {
              setSelectedCalendarId(option.value);
              setShowCalendarPicker(false);
            }}
            onClose={() => setShowCalendarPicker(false)}
          />

          <OptionsSelectionModal
            visible={showStartTimePicker}
            title="Start Time"
            options={timeOptions}
            onSelect={(option) => {
              setStartTime(option.value);
              setShowStartTimePicker(false);
            }}
            onClose={() => setShowStartTimePicker(false)}
          />

          <OptionsSelectionModal
            visible={showEndTimePicker}
            title="End Time"
            options={timeOptions}
            onSelect={(option) => {
              setEndTime(option.value);
              setShowEndTimePicker(false);
            }}
            onClose={() => setShowEndTimePicker(false)}
          />

          <OptionsSelectionModal
            visible={showActivityPicker}
            title={`Select ${currentActivity?.label || 'Activity'}`}
            options={activityOptions}
            onSelect={handleActivitySelect}
            onClose={() => {
              setShowActivityPicker(false);
              setCurrentActivity(null);
            }}
          />
        </KeyboardAvoidingView>
      </View>
    </ModalWrapper>
  );
};

export default ScheduleDefaultEventModal;