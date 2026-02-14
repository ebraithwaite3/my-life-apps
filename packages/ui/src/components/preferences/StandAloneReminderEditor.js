import React, { useState, useEffect } from 'react';
import {
  View,
  Text, // ← ADDED
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@my-apps/contexts';
import ModalHeader from '../headers/ModalHeader';
import TextInputRow from '../forms/TextInputRow';
import SelectorRow from '../forms/SelectorRow';
import ModalWrapper from '../modals/base/ModalWrapper';
import OptionsSelectionModal from '../modals/composed/pickers/OptionsSelectionModal';
import CustomReminderModal from '../modals/composed/modals/CustomReminderModal';
import { generateUUID } from '@my-apps/utils';
import { DateTime } from 'luxon';

const StandAloneReminderEditor = ({
  visible,
  onClose,
  reminder = null,
  onSave,
  onDelete,
  allUsers = [], // Array of { userId, name }
}) => {
  const { theme, getSpacing, getBorderRadius } = useTheme();

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [reminderTime, setReminderTime] = useState(null);
  const [deepLinkScreen, setDeepLinkScreen] = useState('Calendar');
  const [deepLinkApp, setDeepLinkApp] = useState('checklist-app');

  // Modal state
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showScreenPicker, setShowScreenPicker] = useState(false);
  const [showAppPicker, setShowAppPicker] = useState(false);

  // Initialize form from reminder prop
  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title || '');
      setMessage(reminder.message || '');
      setSelectedRecipients(reminder.recipients || []);
      setReminderTime(reminder.schedule || null);
      setDeepLinkScreen(reminder.data?.screen || 'Calendar');
      setDeepLinkApp(reminder.data?.app || 'checklist-app');
    } else {
      // Reset for new reminder
      setTitle('');
      setMessage('');
      setSelectedRecipients([]);
      setReminderTime(null);
      setDeepLinkScreen('Calendar');
      setDeepLinkApp('checklist-app');
    }
  }, [reminder, visible]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Required', 'Please enter a message');
      return;
    }

    if (selectedRecipients.length === 0) {
      Alert.alert('Required', 'Please select at least one recipient');
      return;
    }

    if (!reminderTime) {
      Alert.alert('Required', 'Please set a reminder time');
      return;
    }

    const reminderData = {
      id: reminder?.id || generateUUID(),
      title: title.trim(),
      message: message.trim(),
      recipients: selectedRecipients,
      schedule: reminderTime,
      isActive: reminder?.isActive ?? true,
      createdAt: reminder?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        screen: deepLinkScreen,
        app: deepLinkApp,
      },
    };

    onSave(reminderData);
    handleClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(reminder.id);
            handleClose();
          },
        },
      ]
    );
  };

  const handleClose = () => {
    onClose();
  };

  // Format reminder display
  const formatReminderDisplay = () => {
    if (!reminderTime) return 'Not set';

    const dt = DateTime.fromISO(reminderTime.scheduledFor);
    const recurringText = reminderTime.isRecurring ? ' (Recurring)' : '';
    
    return dt.toFormat("MMM d 'at' h:mm a") + recurringText;
  };

  // Format recipients display
  const formatRecipientsDisplay = () => {
    if (selectedRecipients.length === 0) return 'None selected';
    if (selectedRecipients.length === 1) {
      const user = allUsers.find(u => u.userId === selectedRecipients[0]);
      return user?.name || '1 recipient';
    }
    return `${selectedRecipients.length} recipients`;
  };

  // Recipient options (with checkboxes for multi-select)
  const recipientOptions = allUsers.map(user => ({
    id: user.userId,
    label: user.name,
    value: user.userId,
    selected: selectedRecipients.includes(user.userId),
  }));

  const handleRecipientToggle = (userId) => {
    setSelectedRecipients(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const screenOptions = [
    { id: 'calendar', label: 'Calendar', value: 'Calendar' },
    { id: 'pinned', label: 'Pinned', value: 'Pinned' },
    { id: 'home', label: 'Home', value: 'Home' },
  ];

  const appOptions = [
    { id: 'checklist', label: 'Checklist App', value: 'checklist-app' },
    { id: 'organizer', label: 'Organizer App', value: 'organizer-app' },
    { id: 'workout', label: 'Workout App', value: 'workout-app' },
  ];

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
    deleteButton: {
      marginTop: getSpacing.lg,
      marginHorizontal: getSpacing.lg,
      padding: getSpacing.md,
      backgroundColor: theme.error + '20',
      borderRadius: getBorderRadius.md,
      alignItems: 'center',
    },
    deleteButtonText: {
      color: theme.error,
      fontSize: 15,
      fontWeight: '600',
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
            title={reminder ? 'Edit Reminder' : 'New Reminder'}
            onCancel={handleClose}
            onDone={handleSave}
            doneText={reminder ? 'Update' : 'Create'}
          />

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <TextInputRow
              label="Title"
              placeholder="e.g., Schedule Weekly Checklists"
              value={title}
              onChangeText={setTitle}
              autoCapitalize="words"
            />

            <TextInputRow
              label="Message"
              placeholder="e.g., Time to plan this week's checklists!"
              value={message}
              onChangeText={setMessage}
              multiline
            />

            <SelectorRow
              label="Recipients"
              value={formatRecipientsDisplay()}
              onPress={() => setShowRecipientPicker(true)}
              icon="people"
            />

            <SelectorRow
              label="Reminder Time"
              value={formatReminderDisplay()}
              onPress={() => setShowReminderModal(true)}
              icon="time"
            />

            <SelectorRow
              label="Deep Link Screen"
              value={deepLinkScreen}
              onPress={() => setShowScreenPicker(true)}
              icon="link"
            />

            <SelectorRow
              label="Deep Link App"
              value={deepLinkApp}
              onPress={() => setShowAppPicker(true)}
              icon="apps"
            />

            {reminder && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>Delete Reminder</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Recipient Picker Modal */}
          <OptionsSelectionModal
            visible={showRecipientPicker}
            title="Select Recipients"
            options={recipientOptions}
            onSelect={(option) => handleRecipientToggle(option.value)}
            onClose={() => setShowRecipientPicker(false)}
            multiSelect
            selectedValues={selectedRecipients}
          />

          {/* Reminder Time Modal - ONLY RENDER WHEN SHOWING */}
          {showReminderModal && (
            <CustomReminderModal
              visible={showReminderModal}
              onClose={() => setShowReminderModal(false)}
              reminder={reminderTime}
              eventStartDate={new Date()} // Standalone, so just use now
              isAllDay={false}
              onConfirm={(timeData) => {
                setReminderTime(timeData);
                setShowReminderModal(false);
              }}
            />
          )}

          {/* Screen Picker */}
          <OptionsSelectionModal
            visible={showScreenPicker}
            title="Deep Link Screen"
            options={screenOptions}
            onSelect={(option) => {
              setDeepLinkScreen(option.value);
              setShowScreenPicker(false);
            }}
            onClose={() => setShowScreenPicker(false)}
          />

          {/* App Picker */}
          <OptionsSelectionModal
            visible={showAppPicker}
            title="Deep Link App"
            options={appOptions}
            onSelect={(option) => {
              setDeepLinkApp(option.value);
              setShowAppPicker(false);
            }}
            onClose={() => setShowAppPicker(false)}
          />
        </KeyboardAvoidingView>
      </View>
    </ModalWrapper>
  );
};

export default StandAloneReminderEditor;