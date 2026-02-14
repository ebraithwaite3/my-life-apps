import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '@my-apps/contexts';
import ModalHeader from '../../../headers/ModalHeader';
import TextInputRow from '../../../forms/TextInputRow';
import SelectorRow from '../../../forms/SelectorRow';
import ModalWrapper from '../../base/ModalWrapper';
import OptionsSelectionModal from '../pickers/OptionsSelectionModal';
import CustomReminderModal from './CustomReminderModal';
import { DateTime } from 'luxon';

const QuickSendModal = ({
    visible,
    onClose,
    mode = 'now', // 'now' or 'schedule'
    onSend,
    allUsers = [],
  }) => {
    const { theme, getSpacing, getBorderRadius } = useTheme();
  
    // Form state
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [scheduledTime, setScheduledTime] = useState(null);
    const [deepLinkScreen, setDeepLinkScreen] = useState('Calendar');
    const [deepLinkApp, setDeepLinkApp] = useState('checklist-app');
  
    // Modal state
    const [showRecipientPicker, setShowRecipientPicker] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [showScreenPicker, setShowScreenPicker] = useState(false);
    const [showAppPicker, setShowAppPicker] = useState(false);
  
    // Reset form when modal opens
    useEffect(() => {
      if (visible) {
        setTitle('');
        setMessage('');
        setSelectedRecipients([]);
        setScheduledTime(null);
        setDeepLinkScreen('Calendar');
        setDeepLinkApp('checklist-app');
      }
    }, [visible]);
  
    const handleSend = () => {
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
  
      if (mode === 'schedule' && !scheduledTime) {
        Alert.alert('Required', 'Please set a time');
        return;
      }
  
      const notificationData = {
        title: title.trim(),
        message: message.trim(),
        recipients: selectedRecipients,
        data: {
          screen: deepLinkScreen,
          app: deepLinkApp,
        },
      };
  
      if (mode === 'schedule') {
        notificationData.schedule = scheduledTime;
        notificationData.isRecurring = scheduledTime?.isRecurring || false;
      }
  
      onSend(notificationData, mode);
      handleClose();
    };
  
    const handleClose = () => {
      onClose();
    };
  
    // Format scheduled time display
    const formatTimeDisplay = () => {
      if (!scheduledTime) return 'Not set';
  
      const dt = DateTime.fromISO(scheduledTime.scheduledFor);
      const recurringText = scheduledTime.isRecurring ? ' (Recurring)' : '';
      
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
  
    // Recipient options
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
        height: '80%',
      },
      content: {
        flex: 1,
      },
      scrollContainer: {
        paddingBottom: getSpacing.xl * 2,
      },
    });
  
    if (!visible) return null;
  
    const modalTitle = mode === 'now' ? 'Send Now' : 'Schedule Notification';
    const doneText = mode === 'now' ? 'Send' : 'Schedule';
  
    return (
      <ModalWrapper visible={visible} onClose={handleClose}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ModalHeader
              title={modalTitle}
              onCancel={handleClose}
              onDone={handleSend}
              doneText={doneText}
            />
  
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
            >
              <TextInputRow
                label="Title"
                placeholder="e.g., Team Meeting Reminder"
                value={title}
                onChangeText={setTitle}
                autoCapitalize="words"
              />
  
              <TextInputRow
                label="Message"
                placeholder="e.g., Don't forget the 3pm meeting!"
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
  
              {/* Only show time picker for schedule mode */}
              {mode === 'schedule' && (
                <SelectorRow
                  label="Scheduled Time"
                  value={formatTimeDisplay()}
                  onPress={() => setShowTimeModal(true)}
                  icon="time"
                />
              )}
  
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
  
            {/* Time Modal - Only for schedule mode */}
            {mode === 'schedule' && showTimeModal && (
              <CustomReminderModal
                visible={showTimeModal}
                onClose={() => setShowTimeModal(false)}
                reminder={scheduledTime}
                eventStartDate={new Date()}
                isAllDay={false}
                onConfirm={(timeData) => {
                  setScheduledTime(timeData);
                  setShowTimeModal(false);
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
  
  export default QuickSendModal;