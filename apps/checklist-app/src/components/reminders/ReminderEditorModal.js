import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTime } from 'luxon';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import { updateDocument } from '@my-apps/services';
import { ModalWrapper, ModalHeader, SimpleDateTimeSelector, SpinnerPickerContent } from '@my-apps/ui';
import { validateReminder } from '@my-apps/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK_DAYS = [
  { key: 'MO', label: 'Mon' },
  { key: 'TU', label: 'Tue' },
  { key: 'WE', label: 'Wed' },
  { key: 'TH', label: 'Thu' },
  { key: 'FR', label: 'Fri' },
  { key: 'SA', label: 'Sat' },
  { key: 'SU', label: 'Sun' },
];

const RECURRENCE_OPTIONS = [
  { key: 'oneTime',       label: 'One Time'     },
  { key: 'everyNDays',    label: 'Every N Days' },
  { key: 'everyNMinutes', label: 'Every N Min'  },
  { key: 'scheduleByDay', label: 'Weekly'       },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getDoneDescription(recurrenceType, intervalN) {
  switch (recurrenceType) {
    case 'oneTime':       return 'Deletes this reminder when Done is tapped';
    case 'everyNDays':    return `Reschedules ${intervalN} day(s) at the same time when Done is tapped`;
    case 'everyNMinutes': return `Reschedules in ${intervalN} minute(s) when Done is tapped`;
    case 'scheduleByDay': return 'Reschedules to next scheduled day/time when Done is tapped';
    default:              return '';
  }
}

function parseTimeStr(timeStr) {
  const [hStr, mStr] = (timeStr || '09:00').split(':');
  const h24Raw = parseInt(hStr, 10);
  const h24 = isNaN(h24Raw) ? 9 : h24Raw;
  const m = parseInt(mStr, 10) || 0;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return { hour12, minute: m, period };
}

function toHHmm(hour12, minute, period) {
  let h24 = hour12;
  if (period === 'PM' && hour12 !== 12) h24 = hour12 + 12;
  else if (period === 'AM' && hour12 === 12) h24 = 0;
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatTimeDisplay(timeStr) {
  const { hour12, minute, period } = parseTimeStr(timeStr);
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

const DAY_HOURS = Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1).padStart(2, '0'), value: i + 1 }));
const DAY_MINUTES = Array.from({ length: 12 }, (_, i) => { const v = i * 5; return { label: String(v).padStart(2, '0'), value: v }; });
const DAY_PERIODS = [{ label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }];

// ─── Component ────────────────────────────────────────────────────────────────

const ReminderEditorModal = ({
  visible,
  onClose,
  reminder,
  userId,
  allReminders,
  reminderDefaults,
  todayItems,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const insets = useSafeAreaInsets();

  const isEditing = reminder !== null && reminder !== undefined;
  const scrollRef = useRef(null);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [linkedTitle, setLinkedTitle] = useState(null);
  const [recurrenceType, setRecurrenceType] = useState('oneTime');
  const [intervalN, setIntervalN] = useState('1');
  const [weeklyDays, setWeeklyDays] = useState([]);
  const [retryEnabled, setRetryEnabled] = useState(false);
  const [retryIntervalMinutes, setRetryIntervalMinutes] = useState('30');
  const [retryUntil, setRetryUntil] = useState(null);
  const [snoozable, setSnoozable] = useState(null);
  const [reschedulable, setReschedulable] = useState(null);
  const [scheduledTime, setScheduledTime] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [expandedDayKey, setExpandedDayKey] = useState(null);
  const [dayHour, setDayHour] = useState(9);
  const [dayMinute, setDayMinute] = useState(0);
  const [dayPeriod, setDayPeriod] = useState('AM');
  const [retryUntilExpanded, setRetryUntilExpanded] = useState(false);
  const [retryUntilHour, setRetryUntilHour] = useState(9);
  const [retryUntilMinute, setRetryUntilMinute] = useState(0);
  const [retryUntilPeriod, setRetryUntilPeriod] = useState('PM');

  useEffect(() => {
    if (!visible) return;

    if (reminder) {
      setTitle(reminder.title || '');
      setMessage(reminder.message || '');
      setLinkedTitle(reminder.linkedTitle || null);

      // Recurrence — prefer new schema, fall back to old
      if (reminder.recurrence?.scheduleByDay) {
        setRecurrenceType('scheduleByDay');
        setWeeklyDays(reminder.recurrence.scheduleByDay);
      } else if (reminder.recurrence?.everyNDays) {
        setRecurrenceType('everyNDays');
        setIntervalN(String(reminder.recurrence.everyNDays.n));
        setWeeklyDays([]);
      } else if (reminder.recurrence?.everyNMinutes) {
        setRecurrenceType('everyNMinutes');
        setIntervalN(String(reminder.recurrence.everyNMinutes.n));
        setWeeklyDays([]);
      } else if (reminder.recurrence?.oneTime) {
        setRecurrenceType('oneTime');
        setWeeklyDays([]);
      } else if (reminder.recurringSchedule?.length) {
        // Legacy flat schema
        setRecurrenceType('scheduleByDay');
        setWeeklyDays(reminder.recurringSchedule.map(e => ({
          day: e.day,
          time: e.time,
          timezone: e.timezone || 'America/New_York',
        })));
      } else if (reminder.recurringIntervalDays) {
        setRecurrenceType('everyNDays');
        setIntervalN(String(reminder.recurringIntervalDays));
        setWeeklyDays([]);
      } else if (reminder.recurringIntervalMinutes) {
        setRecurrenceType('everyNMinutes');
        setIntervalN(String(reminder.recurringIntervalMinutes));
        setWeeklyDays([]);
      } else {
        setRecurrenceType('oneTime');
        setWeeklyDays([]);
      }

      // Retry — prefer new schema, fall back to old
      if (reminder.retry?.intervalMinutes) {
        setRetryEnabled(true);
        setRetryIntervalMinutes(String(reminder.retry.intervalMinutes));
        const until = reminder.retry.retryUntil || null;
        setRetryUntil(until);
        if (until) {
          const { hour12, minute, period } = parseTimeStr(until);
          setRetryUntilHour(hour12); setRetryUntilMinute(minute); setRetryUntilPeriod(period);
        }
      } else if (reminder.unacknowledgedRetryMinutes != null) {
        setRetryEnabled(true);
        setRetryIntervalMinutes(String(reminder.unacknowledgedRetryMinutes));
        setRetryUntil(null);
      } else {
        setRetryEnabled(false);
        setRetryIntervalMinutes('30');
        setRetryUntil(null);
      }

      // Interaction controls — null means inherit from reminderDefaults
      setSnoozable(reminder.snoozable ?? null);
      setReschedulable(reminder.reschedulable ?? null);
      setScheduledTime(reminder.scheduledTime ? new Date(reminder.scheduledTime) : new Date());
    } else {
      setTitle('');
      setMessage('');
      setLinkedTitle(null);
      setRecurrenceType('oneTime');
      setIntervalN('1');
      setWeeklyDays([]);
      setRetryEnabled(false);
      setRetryIntervalMinutes('30');
      setRetryUntil(null);
      setRetryUntilHour(9); setRetryUntilMinute(0); setRetryUntilPeriod('PM');
      setSnoozable(null);
      setReschedulable(null);
      setScheduledTime(new Date(Date.now() + 3600000));
    }
    setShowLinkPicker(false);
    setExpandedDayKey(null);
    setRetryUntilExpanded(false);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 50);
  }, [visible, reminder]);

  const toggleWeekDay = (dayKey) => {
    const tz = reminderDefaults?.timezone || 'America/New_York';
    setWeeklyDays(prev => {
      const exists = prev.find(d => d.day === dayKey);
      if (exists) return prev.filter(d => d.day !== dayKey);
      return [...prev, { day: dayKey, time: '09:00', timezone: tz }];
    });
  };

  const updateWeekDayTime = (dayKey, time) => {
    setWeeklyDays(prev => prev.map(d => d.day === dayKey ? { ...d, time } : d));
  };

  const handleDayPickerToggle = (dayKey) => {
    if (expandedDayKey === dayKey) {
      setExpandedDayKey(null);
      return;
    }
    const wd = weeklyDays.find(d => d.day === dayKey);
    const { hour12, minute, period } = parseTimeStr(wd?.time || '09:00');
    setDayHour(hour12);
    setDayMinute(minute);
    setDayPeriod(period);
    setExpandedDayKey(dayKey);
  };

  const handleDayTimeChange = (field, value) => {
    const hour = field === 'hour' ? value : dayHour;
    const minute = field === 'minute' ? value : dayMinute;
    const period = field === 'period' ? value : dayPeriod;
    if (field === 'hour') setDayHour(value);
    if (field === 'minute') setDayMinute(value);
    if (field === 'period') setDayPeriod(value);
    if (expandedDayKey) {
      updateWeekDayTime(expandedDayKey, toHHmm(hour, minute, period));
    }
  };

  const handleRetryUntilChange = (field, value) => {
    const hour = field === 'hour' ? value : retryUntilHour;
    const minute = field === 'minute' ? value : retryUntilMinute;
    const period = field === 'period' ? value : retryUntilPeriod;
    if (field === 'hour') setRetryUntilHour(value);
    if (field === 'minute') setRetryUntilMinute(value);
    if (field === 'period') setRetryUntilPeriod(value);
    setRetryUntil(toHHmm(hour, minute, period));
  };

  const handleRetryUntilToggle = (enabled) => {
    if (enabled) {
      setRetryUntil(toHHmm(retryUntilHour, retryUntilMinute, retryUntilPeriod));
      setRetryUntilExpanded(true);
    } else {
      setRetryUntil(null);
      setRetryUntilExpanded(false);
    }
  };

  // Interaction control toggles
  const snoozableEffective = snoozable ?? reminderDefaults?.snoozable ?? false;
  const reschedulableEffective = reschedulable ?? reminderDefaults?.reschedulable ?? false;

  const handleSnoozableToggle = () => {
    const newEffective = !snoozableEffective;
    const defaultVal = reminderDefaults?.snoozable ?? false;
    setSnoozable(newEffective === defaultVal ? null : newEffective);
  };

  const handleReschedulableToggle = () => {
    const newEffective = !reschedulableEffective;
    const defaultVal = reminderDefaults?.reschedulable ?? false;
    setReschedulable(newEffective === defaultVal ? null : newEffective);
  };

  const interactionLabel = (value, isNull) =>
    `${value ? 'On' : 'Off'} ${isNull ? '(your default)' : '(override)'}`;

  // Link picker — exclude items already linked by OTHER reminders
  const unlinkedItems = useMemo(() =>
    (todayItems || []).filter(item =>
      !item.completed &&
      !allReminders.some(r =>
        r.id !== reminder?.id &&
        r.linkedTitle?.trim().toLowerCase() === item.name?.trim().toLowerCase()
      )
    ),
    [todayItems, allReminders, reminder?.id]
  );

  // onTodoComplete auto-derived
  const onTodoComplete = linkedTitle
    ? (recurrenceType === 'oneTime' ? 'delete' : 'reschedule')
    : null;

  const handleSave = async () => {
    if (!title.trim() || !scheduledTime) return;
    setIsSaving(true);

    const now = new Date().toISOString();
    const isoTime = scheduledTime.toISOString();
    const tz = reminderDefaults?.timezone || 'America/New_York';

    // Recurrence object
    let recurrence;
    if (recurrenceType === 'oneTime') {
      recurrence = { oneTime: true };
    } else if (recurrenceType === 'everyNDays') {
      recurrence = {
        everyNDays: {
          n: Number(intervalN),
          time: DateTime.fromJSDate(scheduledTime).setZone(tz).toFormat('HH:mm'),
          timezone: tz,
        },
      };
    } else if (recurrenceType === 'everyNMinutes') {
      recurrence = { everyNMinutes: { n: Number(intervalN) } };
    } else if (recurrenceType === 'scheduleByDay') {
      recurrence = { scheduleByDay: weeklyDays };
    }

    // Retry object
    const retry = retryEnabled
      ? { intervalMinutes: Number(retryIntervalMinutes), retryUntil: retryUntil || null }
      : null;

    // Actions object
    const actions = {
      done: {},
      ...(recurrenceType !== 'oneTime' && {
        remindTomorrow: {
          morning: reminderDefaults?.defaultMorningTime || '06:40',
          evening: reminderDefaults?.defaultEveningTime || '21:40',
          timezone: tz,
        },
      }),
    };

    const effectiveMessage = message.trim() || title.trim();

    const reminderData = {
      id: isEditing ? reminder.id : `reminder-${Date.now()}`,
      title: title.trim(),
      message: effectiveMessage,
      deliveryMode: 'alert+push',
      scheduledTime: isoTime,
      scheduledAlertTime: isoTime,
      acknowledgedAt: null,
      paused: false,
      pausedUntil: null,
      recurrence,
      retry,
      actions,
      sideEffects: [],
      linkedTitle: linkedTitle || null,
      onTodoComplete,
      deepLinkTarget: null,
      deletable: true,
      templateId: null,
      // Only write explicit overrides; null = inherit from reminderDefaults
      ...(snoozable !== null && { snoozable }),
      ...(reschedulable !== null && { reschedulable }),
      notification: {
        title: title.trim(),
        body: effectiveMessage,
        scheduledTime: isoTime,
        screen: null,
        handlerName: null,
        handlerParams: null,
        data: { app: 'checklist-app' },
      },
      createdAt: isEditing ? (reminder.createdAt || now) : now,
      updatedAt: now,
    };

    const { valid, errors, warnings } = validateReminder(reminderData);
    if (!valid) {
      setIsSaving(false);
      Alert.alert('Cannot Save Reminder', errors.join('\n'), [{ text: 'OK' }]);
      return;
    }
    if (warnings.length) {
      console.warn('⚠️ ReminderEditorModal warnings:', warnings);
    }

    const updatedReminders = isEditing
      ? allReminders.map(r => r.id === reminderData.id ? reminderData : r)
      : [...allReminders, reminderData];

    try {
      await updateDocument('masterConfig', userId, { reminders: updatedReminders });
    } catch (err) {
      console.error('❌ ReminderEditorModal save failed:', err);
    }

    setIsSaving(false);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert('Delete Reminder?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateDocument('masterConfig', userId, {
              reminders: allReminders.filter(r => r.id !== reminder.id),
            });
          } catch (err) {
            console.error('❌ ReminderEditorModal delete failed:', err);
          }
          onClose();
        },
      },
    ]);
  };

  const canSave = title.trim().length > 0 && !!scheduledTime && !isSaving;

  return (
    <ModalWrapper visible={visible} onClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.surface, paddingTop: insets.top }]}>
        <ModalHeader
          title={isEditing ? 'Edit Reminder' : 'New Reminder'}
          cancelText="Cancel"
          onCancel={onClose}
          doneText="Save"
          onDone={handleSave}
          doneDisabled={!canSave}
        />

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scroll, { padding: getSpacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={[styles.label, { color: theme.text.secondary, fontSize: getTypography.caption.fontSize }]}>
            TITLE
          </Text>
          <View style={[styles.titleRow, { marginBottom: getSpacing.xs }]}>
            <TextInput
              style={[
                styles.input,
                styles.titleInput,
                {
                  backgroundColor: theme.background,
                  color: theme.text.primary,
                  borderColor: theme.border.primary,
                  borderRadius: getBorderRadius.sm,
                  fontSize: getTypography.body.fontSize,
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Reminder title"
              placeholderTextColor={theme.text.tertiary}
            />
            <TouchableOpacity
              onPress={() => setShowLinkPicker(true)}
              style={[styles.linkButton, { borderColor: linkedTitle ? theme.primary : theme.border.primary, borderRadius: getBorderRadius.sm }]}
            >
              <Ionicons
                name={linkedTitle ? 'link' : 'link-outline'}
                size={18}
                color={linkedTitle ? theme.primary : theme.text.secondary}
              />
            </TouchableOpacity>
          </View>

          {/* Linked title chip */}
          {linkedTitle && (
            <View style={[styles.linkChip, { backgroundColor: theme.primary + '22', borderColor: theme.primary, borderRadius: getBorderRadius.sm, marginBottom: getSpacing.lg }]}>
              <Ionicons name="link-outline" size={12} color={theme.primary} />
              <Text style={[styles.linkChipText, { color: theme.primary, fontSize: getTypography.caption.fontSize }]} numberOfLines={1}>
                {linkedTitle}
              </Text>
              <TouchableOpacity onPress={() => setLinkedTitle(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={14} color={theme.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Message (optional) */}
          <Text style={[styles.label, { color: theme.text.secondary, fontSize: getTypography.caption.fontSize, marginTop: linkedTitle ? 0 : getSpacing.sm }]}>
            MESSAGE <Text style={{ color: theme.text.tertiary, fontWeight: '400' }}>(optional, defaults to title)</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              {
                backgroundColor: theme.background,
                color: theme.text.primary,
                borderColor: theme.border.primary,
                borderRadius: getBorderRadius.sm,
                fontSize: getTypography.body.fontSize,
                marginBottom: getSpacing.lg,
              },
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder="Optional body text"
            placeholderTextColor={theme.text.tertiary}
            multiline
            numberOfLines={2}
          />

          {/* Recurrence */}
          <Text style={[styles.label, { color: theme.text.secondary, fontSize: getTypography.caption.fontSize }]}>
            RECURRENCE
          </Text>
          <View style={[styles.pillRow, { marginBottom: getSpacing.sm }]}>
            {RECURRENCE_OPTIONS.map(opt => {
              const active = recurrenceType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setRecurrenceType(opt.key)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? theme.primary : theme.background,
                      borderColor: active ? theme.primary : theme.border.primary,
                      borderRadius: getBorderRadius.sm,
                      paddingVertical: getSpacing.xs,
                      paddingHorizontal: getSpacing.sm,
                      marginRight: getSpacing.xs,
                      marginBottom: getSpacing.xs,
                    },
                  ]}
                >
                  <Text style={[styles.pillText, { color: active ? '#fff' : theme.text.primary, fontSize: getTypography.caption.fontSize }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {(recurrenceType === 'everyNDays' || recurrenceType === 'everyNMinutes') && (
            <View style={[styles.inlineRow, { marginBottom: getSpacing.lg }]}>
              <Text style={{ color: theme.text.primary, fontSize: getTypography.body.fontSize, marginRight: getSpacing.sm }}>
                Every
              </Text>
              <TextInput
                style={[styles.smallInput, { backgroundColor: theme.background, color: theme.text.primary, borderColor: theme.border.primary, borderRadius: getBorderRadius.sm, fontSize: getTypography.body.fontSize }]}
                value={intervalN}
                onChangeText={setIntervalN}
                keyboardType="numeric"
              />
              <Text style={{ color: theme.text.primary, fontSize: getTypography.body.fontSize, marginLeft: getSpacing.sm }}>
                {recurrenceType === 'everyNDays' ? 'day(s)' : 'minute(s)'}
              </Text>
            </View>
          )}

          {recurrenceType === 'scheduleByDay' && (
            <View style={{ marginBottom: getSpacing.lg }}>
              <View style={[styles.pillRow, { marginBottom: getSpacing.sm }]}>
                {WEEK_DAYS.map(d => {
                  const selected = weeklyDays.some(w => w.day === d.key);
                  return (
                    <TouchableOpacity
                      key={d.key}
                      onPress={() => toggleWeekDay(d.key)}
                      style={[
                        styles.pill,
                        {
                          backgroundColor: selected ? theme.primary : theme.background,
                          borderColor: selected ? theme.primary : theme.border.primary,
                          borderRadius: getBorderRadius.sm,
                          paddingVertical: getSpacing.xs,
                          paddingHorizontal: getSpacing.sm,
                          marginRight: getSpacing.xs,
                          marginBottom: getSpacing.xs,
                        },
                      ]}
                    >
                      <Text style={[styles.pillText, { color: selected ? '#fff' : theme.text.primary, fontSize: getTypography.caption.fontSize }]}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {weeklyDays.map(wd => (
                <View key={wd.day} style={{ marginBottom: getSpacing.xs }}>
                  <View style={[styles.inlineRow, { justifyContent: 'space-between', marginBottom: getSpacing.xs }]}>
                    <Text style={{ color: theme.text.primary, fontSize: getTypography.body.fontSize, fontWeight: '500', width: 44 }}>
                      {WEEK_DAYS.find(d => d.key === wd.day)?.label}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDayPickerToggle(wd.day)}
                      style={[
                        styles.dayTimeButton,
                        {
                          backgroundColor: theme.background,
                          borderColor: expandedDayKey === wd.day ? theme.primary : theme.border.primary,
                          borderWidth: expandedDayKey === wd.day ? 2 : 1,
                          borderRadius: getBorderRadius.sm,
                          paddingHorizontal: getSpacing.sm,
                          paddingVertical: getSpacing.xs,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.text.primary, fontSize: getTypography.body.fontSize }}>
                        {formatTimeDisplay(wd.time)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {expandedDayKey === wd.day && (
                    <View style={{ overflow: 'hidden', marginBottom: getSpacing.sm }}>
                      <SpinnerPickerContent
                        columns={[
                          { items: DAY_HOURS,   selectedValue: dayHour,   onValueChange: (v) => handleDayTimeChange('hour', v),   circular: true  },
                          { items: DAY_MINUTES, selectedValue: dayMinute, onValueChange: (v) => handleDayTimeChange('minute', v), circular: true  },
                          { items: DAY_PERIODS, selectedValue: dayPeriod, onValueChange: (v) => handleDayTimeChange('period', v), circular: false },
                        ]}
                        theme={theme}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Done Action (read-only) */}
          <Text style={[styles.label, { color: theme.text.secondary, fontSize: getTypography.caption.fontSize }]}>
            DONE ACTION
          </Text>
          <Text style={{ color: theme.text.tertiary, fontSize: getTypography.caption.fontSize, marginBottom: getSpacing.lg }}>
            {getDoneDescription(recurrenceType, intervalN)}
          </Text>

          {/* Retry */}
          <View style={[styles.controlRow, { marginBottom: retryEnabled ? getSpacing.sm : getSpacing.lg }]}>
            <Text style={{ color: theme.text.primary, fontSize: getTypography.body.fontSize }}>
              Retry if ignored
            </Text>
            <Switch
              value={retryEnabled}
              onValueChange={setRetryEnabled}
              trackColor={{ false: theme.border.primary, true: theme.primary }}
            />
          </View>

          {retryEnabled && (
            <View style={{ marginBottom: getSpacing.lg }}>
              <View style={[styles.inlineRow, { marginBottom: getSpacing.sm }]}>
                <Text style={{ color: theme.text.primary, fontSize: getTypography.body.fontSize, marginRight: getSpacing.sm }}>
                  Every
                </Text>
                <TextInput
                  style={[styles.smallInput, { backgroundColor: theme.background, color: theme.text.primary, borderColor: theme.border.primary, borderRadius: getBorderRadius.sm, fontSize: getTypography.body.fontSize }]}
                  value={retryIntervalMinutes}
                  onChangeText={setRetryIntervalMinutes}
                  keyboardType="numeric"
                />
                <Text style={{ color: theme.text.primary, fontSize: getTypography.body.fontSize, marginLeft: getSpacing.sm }}>
                  minute(s)
                </Text>
              </View>
              <View style={[styles.controlRow, { marginBottom: retryUntil !== null ? getSpacing.xs : 0 }]}>
                <Text style={{ color: theme.text.primary, fontSize: getTypography.body.fontSize }}>
                  Stop retrying at
                </Text>
                <View style={styles.controlRight}>
                  {retryUntil !== null && (
                    <TouchableOpacity
                      onPress={() => setRetryUntilExpanded(v => !v)}
                      style={[
                        styles.dayTimeButton,
                        {
                          backgroundColor: theme.background,
                          borderColor: retryUntilExpanded ? theme.primary : theme.border.primary,
                          borderWidth: retryUntilExpanded ? 2 : 1,
                          borderRadius: getBorderRadius.sm,
                          paddingHorizontal: getSpacing.sm,
                          paddingVertical: getSpacing.xs,
                          marginRight: getSpacing.sm,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.text.primary, fontSize: getTypography.body.fontSize }}>
                        {formatTimeDisplay(retryUntil)}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Switch
                    value={retryUntil !== null}
                    onValueChange={handleRetryUntilToggle}
                    trackColor={{ false: theme.border.primary, true: theme.primary }}
                  />
                </View>
              </View>
              {retryUntil !== null && retryUntilExpanded && (
                <View style={{ overflow: 'hidden', marginTop: getSpacing.xs }}>
                  <SpinnerPickerContent
                    columns={[
                      { items: DAY_HOURS,   selectedValue: retryUntilHour,   onValueChange: (v) => handleRetryUntilChange('hour', v),   circular: true  },
                      { items: DAY_MINUTES, selectedValue: retryUntilMinute, onValueChange: (v) => handleRetryUntilChange('minute', v), circular: true  },
                      { items: DAY_PERIODS, selectedValue: retryUntilPeriod, onValueChange: (v) => handleRetryUntilChange('period', v), circular: false },
                    ]}
                    theme={theme}
                  />
                </View>
              )}
            </View>
          )}

          {/* Interaction Controls */}
          <Text style={[styles.label, { color: theme.text.secondary, fontSize: getTypography.caption.fontSize }]}>
            INTERACTION
          </Text>
          <View style={[styles.controlRow, { marginBottom: getSpacing.sm }]}>
            <Text style={{ color: theme.text.primary, fontSize: getTypography.body.fontSize }}>
              Snoozable
            </Text>
            <View style={styles.controlRight}>
              <Text style={{ color: theme.text.secondary, fontSize: getTypography.caption.fontSize, marginRight: getSpacing.sm }}>
                {interactionLabel(snoozableEffective, snoozable === null)}
              </Text>
              <Switch
                value={snoozableEffective}
                onValueChange={handleSnoozableToggle}
                trackColor={{ false: theme.border.primary, true: theme.primary }}
              />
            </View>
          </View>
          <View style={[styles.controlRow, { marginBottom: getSpacing.lg }]}>
            <Text style={{ color: theme.text.primary, fontSize: getTypography.body.fontSize }}>
              Reschedulable
            </Text>
            <View style={styles.controlRight}>
              <Text style={{ color: theme.text.secondary, fontSize: getTypography.caption.fontSize, marginRight: getSpacing.sm }}>
                {interactionLabel(reschedulableEffective, reschedulable === null)}
              </Text>
              <Switch
                value={reschedulableEffective}
                onValueChange={handleReschedulableToggle}
                trackColor={{ false: theme.border.primary, true: theme.primary }}
              />
            </View>
          </View>

          {/* First Fire Time */}
          <Text style={[styles.label, { color: theme.text.secondary, fontSize: getTypography.caption.fontSize }]}>
            FIRST FIRE TIME
          </Text>
          {scheduledTime && (
            <SimpleDateTimeSelector
              label=""
              selectedDate={scheduledTime}
              onDateChange={setScheduledTime}
              compact
              defaultOpen="time"
            />
          )}

          {/* Delete (edit mode only) */}
          {isEditing && (
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.deleteButton, { borderColor: theme.error, borderRadius: getBorderRadius.sm, marginTop: getSpacing.xl }]}
            >
              <Text style={[styles.deleteText, { color: theme.error, fontSize: getTypography.body.fontSize }]}>
                Delete Reminder
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Link picker overlay */}
        {showLinkPicker && (
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerSheet, { backgroundColor: theme.surface, borderTopLeftRadius: getBorderRadius.lg, borderTopRightRadius: getBorderRadius.lg }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: theme.border.primary, paddingHorizontal: getSpacing.lg, paddingVertical: getSpacing.md }]}>
                <Text style={{ color: theme.text.primary, fontSize: getTypography.body.fontSize, fontWeight: '600' }}>
                  Link to checklist item
                </Text>
                <TouchableOpacity onPress={() => setShowLinkPicker(false)}>
                  <Ionicons name="close" size={22} color={theme.text.primary} />
                </TouchableOpacity>
              </View>

              {unlinkedItems.length === 0 ? (
                <View style={styles.pickerEmpty}>
                  <Text style={{ color: theme.text.secondary, fontSize: getTypography.body.fontSize }}>
                    No unlinked checklist items for today
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={unlinkedItems}
                  keyExtractor={item => item.id}
                  style={{ maxHeight: 280 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, { borderBottomColor: theme.border.primary, paddingHorizontal: getSpacing.lg, paddingVertical: getSpacing.md }]}
                      onPress={() => {
                        setTitle(item.name);
                        setLinkedTitle(item.name);
                        setShowLinkPicker(false);
                      }}
                    >
                      <Text style={{ color: theme.text.primary, fontSize: getTypography.body.fontSize }}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        )}
      </View>
    </ModalWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleInput: {
    flex: 1,
    marginRight: 8,
  },
  linkButton: {
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  linkChipText: {
    fontWeight: '500',
    maxWidth: 200,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    borderWidth: 1,
  },
  pillText: {
    fontWeight: '500',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallInput: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 64,
    textAlign: 'center',
  },
  dayTimeButton: {
    alignItems: 'center',
    minWidth: 100,
  },
  deleteButton: {
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteText: {
    fontWeight: '600',
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  pickerSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  pickerItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerEmpty: {
    padding: 24,
    alignItems: 'center',
  },
});

export default ReminderEditorModal;
