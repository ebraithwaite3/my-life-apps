import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useData } from '@my-apps/contexts';
import { PopUpModalWrapper } from '../../base';
import ModalHeader from '../../../headers/ModalHeader';
import SpinnerPickerContent from '../../content/pickers/SpinnerPickerContent';
import { showSuccessToast } from '@my-apps/utils';

const ADD_WORKOUT_URL =
  'https://us-central1-calendarconnectionv2.cloudfunctions.net/addWorkout';

// Convert a JS Date to the day string the cloud function expects
const formatDateForApi = (date) => {
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'long' }); // "Monday" etc.
};

// Convert "HH:mm" (24h) to "H:MM AM" format the cloud function expects
const formatTimeForApi = (timeString) => {
  const [h, m] = timeString.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const minutePart = m > 0 ? `:${String(m).padStart(2, '0')}` : '';
  return `${hour}${minutePart} ${period}`;
};

const formatDateDisplay = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

const formatTimeDisplay = (timeString) => {
  const [h, m] = timeString.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const minute = String(m).padStart(2, '0');
  return `${hour}:${minute} ${period}`;
};

const getDefaultTime = (eventStartTime) => {
  if (!eventStartTime) return '08:00';
  const d = new Date(eventStartTime);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const ScheduleWorkoutModal = ({ visible, onClose, eventDate }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { user } = useData();

  const workoutTemplates = user?.workoutTemplates || [];

  const parseTime = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return {
      hour: h === 0 ? 12 : h > 12 ? h - 12 : h,
      minute: m,
      period: h >= 12 ? 'PM' : 'AM',
    };
  };

  const defaultTime = getDefaultTime(eventDate);
  const parsedDefault = parseTime(defaultTime);

  const [selectedHour, setSelectedHour] = useState(parsedDefault.hour);
  const [selectedMinute, setSelectedMinute] = useState(parsedDefault.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(parsedDefault.period);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [includeChecklist, setIncludeChecklist] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTime = (() => {
    let h = selectedHour;
    if (selectedPeriod === 'PM' && selectedHour !== 12) h = selectedHour + 12;
    else if (selectedPeriod === 'AM' && selectedHour === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
  })();

  useEffect(() => {
    if (visible) {
      const t = parseTime(getDefaultTime(eventDate));
      setSelectedHour(t.hour);
      setSelectedMinute(t.minute);
      setSelectedPeriod(t.period);
      setShowTimePicker(false);
      setSelectedWorkout(workoutTemplates[0]?.name ?? null);
      setIncludeChecklist(true);
    }
  }, [visible]);

  const handleConfirm = () => {
    if (!selectedWorkout) {
      Alert.alert('Select Workout', 'Please select a workout template first.');
      return;
    }

    const day = formatDateForApi(eventDate);
    const time = formatTimeForApi(selectedTime);

    setIsSubmitting(true);

    // Fire and forget — close modal immediately
    onClose();

    fetch(ADD_WORKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day,
        time,
        workout: selectedWorkout,
        checklist: includeChecklist,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showSuccessToast('Workout Scheduled', `Workout scheduled for ${day}`);
        } else {
          Alert.alert(
            'Scheduling Failed',
            data.error || data.message || 'Could not schedule workout.'
          );
        }
      })
      .catch((err) => {
        Alert.alert('Scheduling Failed', err.message || 'Could not reach the server.');
      })
      .finally(() => setIsSubmitting(false));
  };

  const styles = StyleSheet.create({
    content: {
      padding: getSpacing.lg,
      paddingBottom: getSpacing.xl,
    },
    sectionLabel: {
      fontSize: getTypography.caption.fontSize,
      fontWeight: '600',
      color: theme.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: getSpacing.lg,
      marginBottom: getSpacing.sm,
    },
    staticField: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.md,
    },
    timeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.md,
    },
    timeText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    workoutOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.md,
      marginBottom: getSpacing.xs,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    workoutOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}10`,
    },
    radioCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.text.tertiary,
      marginRight: getSpacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioCircleSelected: {
      borderColor: theme.primary,
    },
    radioCircleInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.primary,
    },
    workoutName: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      flex: 1,
    },
    checklistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.sm,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.md,
    },
    checklistLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.tertiary,
      textAlign: 'center',
      paddingVertical: getSpacing.xl,
    },
  });

  return (
    <>
      <PopUpModalWrapper visible={visible} onClose={onClose} maxHeight="85%">
        <View style={{ height: '100%' }}>
          <ModalHeader
            title="Schedule Workout"
            onCancel={onClose}
            onDone={handleConfirm}
            doneText="Add"
            doneDisabled={!selectedWorkout || isSubmitting}
          />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Date — read-only */}
            <Text style={styles.sectionLabel}>Date</Text>
            <Text style={styles.staticField}>
              {eventDate ? formatDateDisplay(eventDate) : 'No date set'}
            </Text>

            {/* Time */}
            <Text style={styles.sectionLabel}>Time</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker((v) => !v)}
            >
              <Text style={styles.timeText}>{formatTimeDisplay(selectedTime)}</Text>
              <Ionicons name={showTimePicker ? 'chevron-up' : 'chevron-down'} size={18} color={theme.text.secondary} />
            </TouchableOpacity>
            {showTimePicker && (
              <SpinnerPickerContent
                columns={[
                  {
                    items: Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1).padStart(2, '0'), value: i + 1 })),
                    selectedValue: selectedHour,
                    onValueChange: setSelectedHour,
                    circular: true,
                  },
                  {
                    items: Array.from({ length: 12 }, (_, i) => ({ label: String(i * 5).padStart(2, '0'), value: i * 5 })),
                    selectedValue: selectedMinute,
                    onValueChange: setSelectedMinute,
                    circular: true,
                  },
                  {
                    items: [{ label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }],
                    selectedValue: selectedPeriod,
                    onValueChange: setSelectedPeriod,
                    circular: false,
                  },
                ]}
                theme={theme}
              />
            )}

            {/* Workout */}
            <Text style={styles.sectionLabel}>Workout</Text>
            {workoutTemplates.length === 0 ? (
              <Text style={styles.emptyText}>No workout templates found.</Text>
            ) : (
              workoutTemplates.map((template) => {
                const isSelected = selectedWorkout === template.name;
                return (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.workoutOption,
                      isSelected && styles.workoutOptionSelected,
                    ]}
                    onPress={() => setSelectedWorkout(template.name)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleSelected,
                    ]}>
                      {isSelected && <View style={styles.radioCircleInner} />}
                    </View>
                    <Text style={styles.workoutName}>{template.name}</Text>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Include checklist */}
            <Text style={styles.sectionLabel}>Options</Text>
            <View style={styles.checklistRow}>
              <Text style={styles.checklistLabel}>Include gym checklist</Text>
              <Switch
                value={includeChecklist}
                onValueChange={setIncludeChecklist}
                trackColor={{ false: theme.border, true: `${theme.primary}80` }}
                thumbColor={includeChecklist ? theme.primary : theme.text.tertiary}
              />
            </View>
          </ScrollView>
        </View>
      </PopUpModalWrapper>

    </>
  );
};

export default ScheduleWorkoutModal;
