import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTime } from 'luxon';
import { Ionicons } from '@expo/vector-icons';
import {
  useTheme,
  useData,
  JACK_USER_ID,
  ELLIE_USER_ID,
} from '@my-apps/contexts';
import { updateDocument } from '@my-apps/services';
import { ModalWrapper, ModalHeader, PillSelectionButton } from '@my-apps/ui';
import ReminderEditorModal from './ReminderEditorModal';

const formatRecurring = (reminder) => {
  // New schema
  const r = reminder.recurrence;
  if (r?.everyNMinutes) return `Every ${r.everyNMinutes.n} min`;
  if (r?.everyNDays) return `Every ${r.everyNDays.n} day${r.everyNDays.n !== 1 ? 's' : ''}`;
  if (r?.scheduleByDay?.length) {
    const DAY_LABELS = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
    const days = r.scheduleByDay.map(e => DAY_LABELS[e.day] || e.day).join(', ');
    const time = r.scheduleByDay[0]?.time || '';
    return `${days} at ${time}`;
  }
  // Legacy flat schema
  if (reminder.recurringIntervalMinutes) return `Every ${reminder.recurringIntervalMinutes} min`;
  if (reminder.recurringIntervalDays) return `Every ${reminder.recurringIntervalDays} day${reminder.recurringIntervalDays !== 1 ? 's' : ''}`;
  if (reminder.recurringSchedule?.length) {
    const DAY_LABELS = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
    const days = reminder.recurringSchedule.map(e => DAY_LABELS[e.day] || e.day).join(', ');
    const time = reminder.recurringSchedule[0]?.time || '';
    return `${days} at ${time}`;
  }
  return null;
};

const ReminderCard = ({ reminder, isPaused, onTogglePause, onEdit, theme, getSpacing, getTypography, getBorderRadius }) => {
  const scheduledET = reminder.scheduledTime
    ? DateTime.fromISO(reminder.scheduledTime).setZone('America/New_York').toFormat('h:mm a')
    : '—';
  const recurringLabel = formatRecurring(reminder);
  const isLinked = !!(reminder.linkedTitle || reminder.linkedItem);

  const infoContent = (
    <>
      <View style={styles.titleRow}>
        <Text style={[styles.cardTitle, { color: theme.text.primary, fontSize: getTypography.body.fontSize }]} numberOfLines={1}>
          {reminder.title || 'Reminder'}
        </Text>
        {isLinked && (
          <Ionicons name="link-outline" size={13} color={theme.text.secondary} style={styles.linkIcon} />
        )}
      </View>

      {reminder.message ? (
        <Text style={[styles.cardMessage, { color: theme.text.secondary, fontSize: getTypography.caption.fontSize }]} numberOfLines={2}>
          {reminder.message}
        </Text>
      ) : null}

      <Text style={[styles.cardTime, { color: theme.text.tertiary, fontSize: getTypography.caption.fontSize }]}>
        {scheduledET}{recurringLabel ? ` · ${recurringLabel}` : ''}
      </Text>
    </>
  );

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: theme.surface,
        borderColor: theme.border.primary,
        borderRadius: getBorderRadius.md,
        opacity: isPaused ? 0.6 : 1,
        marginBottom: getSpacing.sm,
        padding: getSpacing.md,
      },
    ]}>
      <View style={styles.cardRow}>
        {onEdit ? (
          <TouchableOpacity style={styles.cardInfo} onPress={onEdit} activeOpacity={0.6}>
            {infoContent}
          </TouchableOpacity>
        ) : (
          <View style={styles.cardInfo}>
            {infoContent}
          </View>
        )}

        <TouchableOpacity
          onPress={() => onTogglePause(reminder)}
          style={[
            styles.pauseButton,
            {
              borderColor: theme.primary,
              borderRadius: getBorderRadius.sm,
              paddingHorizontal: getSpacing.sm,
              paddingVertical: getSpacing.xs,
            },
          ]}
        >
          <Text style={[styles.pauseButtonText, { color: theme.primary, fontSize: getTypography.caption.fontSize }]}>
            {isPaused ? 'Unpause' : 'Pause'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const RemindersModal = ({
  visible,
  onClose,
  selectedDate,
  isAdmin,
  ericReminders,
  jackReminders,
  ellieReminders,
  ericUserId,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    allActivities,
    masterConfigReminderDefaults,
    jackMasterConfigReminderDefaults,
    ellieMasterConfigReminderDefaults,
  } = useData();

  const [selectedUser, setSelectedUser] = useState('eric');
  const [pendingChanges, setPendingChanges] = useState({});
  const [showAllDays, setShowAllDays] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorReminder, setEditorReminder] = useState(null);

  useEffect(() => {
    if (visible) {
      setSelectedUser('eric');
      setPendingChanges({});
      setShowAllDays(false);
      setEditorVisible(false);
      setEditorReminder(null);
    }
  }, [visible]);

  const familyUsers = useMemo(() => [
    { key: 'eric',  label: 'Eric',  reminders: ericReminders,  userId: ericUserId,  reminderDefaults: masterConfigReminderDefaults },
    { key: 'jack',  label: 'Jack',  reminders: jackReminders,  userId: JACK_USER_ID, reminderDefaults: jackMasterConfigReminderDefaults },
    { key: 'ellie', label: 'Ellie', reminders: ellieReminders, userId: ELLIE_USER_ID, reminderDefaults: ellieMasterConfigReminderDefaults },
  ], [ericReminders, jackReminders, ellieReminders, ericUserId, masterConfigReminderDefaults, jackMasterConfigReminderDefaults, ellieMasterConfigReminderDefaults]);

  const editorUserEntry = familyUsers.find(u => u.key === selectedUser);

  const remindersForDay = useMemo(() => {
    const source = editorUserEntry?.reminders || [];
    if (showAllDays) {
      return [...source].sort((a, b) =>
        new Date(a.scheduledTime || 0) - new Date(b.scheduledTime || 0)
      );
    }
    return source.filter(r => {
      if (!r.scheduledTime) return false;
      return DateTime.fromISO(r.scheduledTime)
        .setZone('America/New_York')
        .toISODate() === selectedDate;
    });
  }, [editorUserEntry, selectedDate, showAllDays]);

  // Checklist items for the selected user on today's date, for the link picker
  const todayItems = useMemo(() => {
    const uid = editorUserEntry?.userId;
    if (!uid) return [];
    const today = DateTime.now().toISODate();
    const monthKey = DateTime.now().toFormat('yyyy-LL');
    const entityData = allActivities[uid] || {};
    const monthItems = entityData[monthKey]?.items || {};
    const dayStart = DateTime.fromISO(today).startOf('day');
    const dayEnd = DateTime.fromISO(today).endOf('day');
    const dayEvents = Object.entries(monthItems)
      .map(([eventId, data]) => ({ eventId, ...data }))
      .filter(event => {
        if (!event.startTime) return false;
        const s = DateTime.fromISO(event.startTime);
        return s >= dayStart && s <= dayEnd;
      });
    const toDo = dayEvents.find(e => e.title?.trim().toLowerCase().includes('to do'));
    const checklistAct = toDo?.activities?.find(a => a.activityType === 'checklist');
    return checklistAct?.items || [];
  }, [allActivities, editorUserEntry?.userId]);

  const effectivePaused = (reminder) =>
    reminder.id in pendingChanges
      ? pendingChanges[reminder.id].paused
      : reminder.paused;

  const handleTogglePause = (reminder) => {
    const currently = effectivePaused(reminder);
    setPendingChanges(prev => ({
      ...prev,
      [reminder.id]: {
        paused: !currently,
        acknowledgedAt: !currently ? new Date().toISOString() : null,
      },
    }));
  };

  const handleSave = async () => {
    const changedIds = Object.keys(pendingChanges);
    if (!changedIds.length) { onClose(); return; }

    const applyChanges = (reminders) =>
      reminders.map(r =>
        r.id in pendingChanges ? { ...r, ...pendingChanges[r.id] } : r
      );

    try {
      for (const entry of familyUsers) {
        const idSet = new Set(entry.reminders.map(r => r.id));
        const isDirty = changedIds.some(id => idSet.has(id));
        if (isDirty) {
          await updateDocument('masterConfig', entry.userId, {
            reminders: applyChanges(entry.reminders),
          });
        }
      }
    } catch (err) {
      console.error('❌ RemindersModal save failed:', err);
    }

    onClose();
  };

  const handleClose = () => {
    if (Object.keys(pendingChanges).length > 0) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  const pillOptions = familyUsers.map(u => ({ label: u.label, value: u.key }));
  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  const formattedDate = selectedDate
    ? DateTime.fromISO(selectedDate).toFormat('MMM d, yyyy')
    : '';

  return (
    <ModalWrapper visible={visible} onClose={handleClose}>
      <View style={[styles.container, { backgroundColor: theme.surface, paddingTop: insets.top }]}>
        <ModalHeader
          title="Reminders"
          subtitle={formattedDate}
          onCancel={handleClose}
          cancelText="Close"
          onDone={handleSave}
          doneText="Save"
          doneDisabled={!hasPendingChanges}
        />

        {isAdmin && (
          <View style={[styles.pillContainer, { paddingHorizontal: getSpacing.lg, paddingVertical: getSpacing.md, flexDirection: 'row', alignItems: 'center', borderBottomColor: theme.border.primary }]}>
            <View style={{ flex: 1 }}>
              <PillSelectionButton
                options={pillOptions}
                selectedValue={selectedUser}
                onSelect={setSelectedUser}
              />
            </View>
            <TouchableOpacity
              onPress={() => {
                console.log('+ tapped, isAdmin:', isAdmin, 'editorVisible:', editorVisible);
                setEditorReminder(null);
                setEditorVisible(true);
              }}
              style={{ marginLeft: getSpacing.sm }}
            >
              <Ionicons name="add-circle-outline" size={26} color={theme.primary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.toggleRow, { paddingHorizontal: getSpacing.lg, paddingVertical: getSpacing.sm, borderBottomWidth: 1, borderBottomColor: theme.border.primary }]}>
          <Text style={{ color: theme.text.secondary, fontSize: getTypography.caption.fontSize }}>
            {showAllDays ? 'All Reminders' : 'Today Only'}
          </Text>
          <Switch
            value={showAllDays}
            onValueChange={setShowAllDays}
            trackColor={{ false: theme.border.primary, true: theme.primary }}
          />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { padding: getSpacing.md }]}>
          {remindersForDay.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="alarm-outline" size={48} color={theme.text.tertiary} />
              <Text style={[styles.emptyText, { color: theme.text.secondary, marginTop: getSpacing.md }]}>
                No reminders for this day
              </Text>
            </View>
          ) : (
            remindersForDay.map(reminder => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                isPaused={effectivePaused(reminder)}
                onTogglePause={handleTogglePause}
                onEdit={isAdmin ? () => { setEditorReminder(reminder); setEditorVisible(true); } : undefined}
                theme={theme}
                getSpacing={getSpacing}
                getTypography={getTypography}
                getBorderRadius={getBorderRadius}
              />
            ))
          )}
        </ScrollView>
      </View>

      <ReminderEditorModal
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        reminder={editorReminder}
        userId={editorUserEntry?.userId}
        allReminders={editorUserEntry?.reminders || []}
        reminderDefaults={editorUserEntry?.reminderDefaults ?? null}
        todayItems={todayItems}
      />
    </ModalWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pillContainer: {
    borderBottomWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
  },
  card: {
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTitle: {
    fontWeight: '600',
    flexShrink: 1,
  },
  linkIcon: {
    marginLeft: 4,
  },
  cardMessage: {
    marginBottom: 4,
  },
  cardTime: {
    marginTop: 2,
  },
  pauseButton: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButtonText: {
    fontWeight: '600',
  },
});

export default RemindersModal;
