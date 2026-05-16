import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTime } from 'luxon';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import { updateDocument } from '@my-apps/services';
import { ModalWrapper, ModalHeader, PillSelectionButton } from '@my-apps/ui';

const JACK_USER_ID  = 'ObqbPOKgzwYr2SmlN8UQOaDbkzE2';
const ELLIE_USER_ID = 'CjW9bPGIjrgEqkjE9HxNF6xuxfA3';
// SARAH_USER_ID = '...' — add here when ready

const formatRecurring = (reminder) => {
  if (reminder.recurringIntervalMinutes) {
    return `Every ${reminder.recurringIntervalMinutes} min`;
  }
  if (reminder.recurringIntervalDays) {
    return `Every ${reminder.recurringIntervalDays} day${reminder.recurringIntervalDays !== 1 ? 's' : ''}`;
  }
  if (reminder.recurringSchedule?.length) {
    const DAY_LABELS = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
    const days = reminder.recurringSchedule.map(e => DAY_LABELS[e.day] || e.day).join(', ');
    const time = reminder.recurringSchedule[0]?.time || '';
    return `${days} at ${time}`;
  }
  return null;
};

const ReminderCard = ({ reminder, isPaused, onTogglePause, theme, getSpacing, getTypography, getBorderRadius }) => {
  const scheduledET = reminder.scheduledTime
    ? DateTime.fromISO(reminder.scheduledTime).setZone('America/New_York').toFormat('h:mm a')
    : '—';
  const recurringLabel = formatRecurring(reminder);

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
        {/* Left: info */}
        <View style={styles.cardInfo}>
          {/* Title row with optional link icon */}
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { color: theme.text.primary, fontSize: getTypography.body.fontSize }]} numberOfLines={1}>
              {reminder.title || 'Reminder'}
            </Text>
            {reminder.linkedItem && (
              <Ionicons
                name="link-outline"
                size={13}
                color={theme.text.secondary}
                style={styles.linkIcon}
              />
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
        </View>

        {/* Right: pause/unpause button */}
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
  const [selectedUser, setSelectedUser] = useState('eric');
  const [pendingChanges, setPendingChanges] = useState({});

  // Reset state each time modal opens
  useEffect(() => {
    if (visible) {
      setSelectedUser('eric');
      setPendingChanges({});
    }
  }, [visible]);

  const familyUsers = useMemo(() => [
    { key: 'eric',  label: 'Eric',  reminders: ericReminders,  userId: ericUserId },
    { key: 'jack',  label: 'Jack',  reminders: jackReminders,  userId: JACK_USER_ID },
    { key: 'ellie', label: 'Ellie', reminders: ellieReminders, userId: ELLIE_USER_ID },
    // { key: 'sarah', label: 'Sarah', reminders: sarahReminders, userId: SARAH_USER_ID },
  ], [ericReminders, jackReminders, ellieReminders, ericUserId]);

  const remindersForDay = useMemo(() => {
    const entry = familyUsers.find(u => u.key === selectedUser);
    const source = entry?.reminders || [];
    return source.filter(r => {
      if (!r.scheduledTime) return false;
      const reminderDay = DateTime.fromISO(r.scheduledTime)
        .setZone('America/New_York')
        .toISODate();
      return reminderDay === selectedDate;
    });
  }, [selectedUser, familyUsers, selectedDate]);

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
          <View style={[styles.pillContainer, { paddingHorizontal: getSpacing.lg, paddingVertical: getSpacing.md }]}>
            <PillSelectionButton
              options={pillOptions}
              selectedValue={selectedUser}
              onSelect={setSelectedUser}
            />
          </View>
        )}

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
                theme={theme}
                getSpacing={getSpacing}
                getTypography={getTypography}
                getBorderRadius={getBorderRadius}
              />
            ))
          )}
        </ScrollView>
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
  pillContainer: {
    borderBottomWidth: 1,
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
