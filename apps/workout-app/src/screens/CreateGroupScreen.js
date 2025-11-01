import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { useGroupActions } from '../hooks';
import { Ionicons } from '@expo/vector-icons';
import ColorSelector from '../components/ColorSelector';

export default function CreateGroupScreen({ navigation }) {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { calendars, loading: dataLoading } = useData();
  const { createGroup } = useGroupActions();

  const [groupName, setGroupName] = useState('');
  const [selectedCalendars, setSelectedCalendars] = useState([]);
  const [creating, setCreating] = useState(false);
  const [groupColor, setGroupColor] = useState('#3B82F6'); // Default color

  const resetForm = () => {
    setGroupName('');
    setSelectedCalendars([]);
  };

  const handleCancel = () => {
    if (creating) return; // Don't allow cancel during creation
    
    // Check if user has entered any data - FIX: Remove reference to undefined customInviteCode
    const hasData = groupName.trim() || selectedCalendars.length > 0;
    
    if (hasData) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const handleCreate = async () => {
    console.log("Handle create group called:", groupName, "with calendars:", selectedCalendars);
    
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    // FIX: Ensure we're passing the correct data structure
    const groupData = {
      groupName: groupName.trim(),
      calendars: selectedCalendars, // Pass the full calendar objects
      groupCalendarColor: groupColor,
    };

    setCreating(true);

    try {
      console.log("Creating group with data:", groupData);
      await createGroup(groupData);
      
      // Reset form and show success
      resetForm();
      Alert.alert(
        'Success', 
        `Group "${groupData.groupName}" created successfully!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Create group error:', error);
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const toggleCalendarSelection = (calendar) => {
    setSelectedCalendars(prev => {
      const isSelected = prev.find(cal => cal.id === calendar.id);
      if (isSelected) {
        return prev.filter(cal => cal.id !== calendar.id);
      } else {
        return [...prev, calendar];
      }
    });
  };

  if (dataLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: getSpacing.md,
      fontSize: getTypography.body.fontSize,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    backButton: {
      marginRight: getSpacing.md,
      padding: getSpacing.sm,
    },
    title: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
    },
    headerRight: {
      width: 40, // Balance the header
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: getSpacing.lg,
    },
    section: {
      marginBottom: getSpacing.lg,
    },
    sectionTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: getTypography.h4.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
    },
    label: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.md,
      padding: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.surface,
      marginBottom: getSpacing.sm,
    },
    helpText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
      fontStyle: 'italic',
      marginTop: getSpacing.xs,
      lineHeight: 18,
    },
    calendarCheckbox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      marginBottom: getSpacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    calendarCheckboxLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    calendarColor: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: getSpacing.md,
    },
    calendarCheckboxText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: getBorderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    noCalendarsText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.tertiary,
      textAlign: 'center',
      fontStyle: 'italic',
      padding: getSpacing.xl,
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    bottomContainer: {
      padding: getSpacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    button: {
      flex: 1,
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      borderRadius: getBorderRadius.md,
      alignItems: 'center',
      marginHorizontal: getSpacing.sm,
    },
    cancelButton: {
      backgroundColor: theme.button.secondary,
    },
    createButton: {
      backgroundColor: theme.primary,
    },
    createButtonDisabled: {
      backgroundColor: theme.text.tertiary,
    },
    buttonText: {
      fontSize: getTypography.button.fontSize,
      fontWeight: getTypography.button.fontWeight,
    },
    cancelButtonText: {
      color: theme.button.secondaryText,
    },
    createButtonText: {
      color: theme.text.inverse,
    },
    creatingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    creatingText: {
      marginLeft: getSpacing.sm,
      color: theme.text.inverse,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
            disabled={creating}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={creating ? theme.text.tertiary : theme.text.primary} 
            />
          </TouchableOpacity>
          <Text style={styles.title}>Create Group</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Group Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., The Braithwaites, Lions Soccer Team"
              placeholderTextColor={theme.text.tertiary}
              value={groupName}
              onChangeText={setGroupName}
              editable={!creating}
            />
          </View>

          {/* Group Calendar Color Selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Group Calendar Color</Text>
            <ColorSelector
              selectedColor={groupColor}
              onColorSelect={setGroupColor}
              disabled={creating}
            />
            <Text style={styles.helpText}>
              Select a color for the group's internal calendar
            </Text>
          </View>

          {/* Calendar Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Select Calendars to Share ({selectedCalendars.length} selected)
            </Text>
            <Text style={styles.helpText}>
              Choose which of your calendars to include in this group
            </Text>
            
            {calendars && calendars.length > 0 ? (
              calendars.map(calendar => {
                const isSelected = selectedCalendars.find(cal => cal.id === calendar.id);
                return (
                  <TouchableOpacity
                    key={calendar.id}
                    style={styles.calendarCheckbox}
                    onPress={() => toggleCalendarSelection(calendar)}
                    disabled={creating}
                  >
                    <View style={styles.calendarCheckboxLeft}>
                      <View style={[styles.calendarColor, { backgroundColor: calendar.color }]} />
                      <Text style={styles.calendarCheckboxText}>{calendar.name}</Text>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.noCalendarsText}>
                No calendars available. Import some calendars first!
              </Text>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={creating}
          >
            <Text style={[styles.buttonText, styles.cancelButtonText]}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button, 
              creating ? styles.createButtonDisabled : styles.createButton
            ]}
            onPress={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <View style={styles.creatingContainer}>
                <ActivityIndicator size="small" color="white" />
                <Text style={[styles.buttonText, styles.creatingText]}>
                  Creating...
                </Text>
              </View>
            ) : (
              <Text style={[styles.buttonText, styles.createButtonText]}>
                Create Group
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}