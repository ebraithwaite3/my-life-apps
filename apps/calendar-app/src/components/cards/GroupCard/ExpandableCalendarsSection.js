import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useData } from '../../../contexts/DataContext';
import { useGroupActions } from '../../../hooks';

const ExpandableCalendarsSection = ({ 
  group, 
  currentUserId
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { user } = useData();
  const { removeCalendarFromGroup, addCalendarsToGroup } = useGroupActions();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCalendars, setSelectedCalendars] = useState([]); // Current UI state
  const [originalCalendars, setOriginalCalendars] = useState([]); // Original group calendars
  const [addedCalendars, setAddedCalendars] = useState([]); // To be added
  const [removedCalendars, setRemovedCalendars] = useState([]); // To be removed
  const [loading, setLoading] = useState(false);

  // Check if current user is admin
  const currentUserMember = group.members?.find(member => member.userId === currentUserId);
  const isAdmin = currentUserMember?.role === 'admin';

  // Get user's available calendars (only for admins)
  const userCalendars = isAdmin ? [
    ...(user?.calendars || []).map(cal => ({
      calendarId: cal.calendarId,
      name: cal.name,
      calendarAddress: cal.calendarAddress,
      calendarType: cal.calendarType,
      color: cal.color,
      description: cal.description,
      type: 'owned'
    })),
  ] : [];

  // Initialize state when component mounts or group changes
  useEffect(() => {
    if (group && isAdmin) {
      const currentlySharedIds = (group.calendars || group.sharedCalendars || []).map(cal => 
        cal.calendarId || cal.id
      );
      
      setOriginalCalendars(currentlySharedIds);
      setSelectedCalendars(currentlySharedIds);
      setAddedCalendars([]);
      setRemovedCalendars([]);
    }
  }, [group, isAdmin]);

  const toggleCalendarSelection = (calendarId) => {
    if (!isAdmin || loading) return;
    
    const isCurrentlySelected = selectedCalendars.includes(calendarId);
    const wasOriginallyInGroup = originalCalendars.includes(calendarId);
    
    if (isCurrentlySelected) {
      // Deselecting - remove from selectedCalendars
      setSelectedCalendars(prev => prev.filter(id => id !== calendarId));
      
      if (wasOriginallyInGroup) {
        // Was originally in group, now being removed
        setRemovedCalendars(prev => [...prev, calendarId]);
        // Remove from added if it was there (shouldn't be, but just in case)
        setAddedCalendars(prev => prev.filter(id => id !== calendarId));
      } else {
        // Was being added, now cancelled the addition
        setAddedCalendars(prev => prev.filter(id => id !== calendarId));
      }
    } else {
      // Selecting - add to selectedCalendars
      setSelectedCalendars(prev => [...prev, calendarId]);
      
      if (wasOriginallyInGroup) {
        // Was originally in group, was being removed, now adding back
        setRemovedCalendars(prev => prev.filter(id => id !== calendarId));
      } else {
        // New addition
        setAddedCalendars(prev => [...prev, calendarId]);
      }
    }
  };

  const handleSaveChanges = async () => {
    const hasChanges = addedCalendars.length > 0 || removedCalendars.length > 0;
    
    if (!hasChanges || !isAdmin) return;
  
    setLoading(true);
    try {
      // Add calendars to group
      if (addedCalendars.length > 0) {
        const addedCalendarObjects = userCalendars.filter(cal => {
          const isMatch = addedCalendars.includes(cal.calendarId);
          return isMatch;
        });
        
        await addCalendarsToGroup(group.id, addedCalendarObjects);
      }
      
      if (removedCalendars.length > 0) {
        const removedCalendarObjects = userCalendars.filter(cal => 
          removedCalendars.includes(cal.calendarId)
        );
        await removeCalendarFromGroup(group.id, removedCalendarObjects);
      }
      
      // Reset change tracking
      setOriginalCalendars(selectedCalendars);
      setAddedCalendars([]);
      setRemovedCalendars([]);
      
      Alert.alert('Calendars Updated', 'Group calendars have been successfully updated.');
    } catch (error) {
      console.error('Error updating group calendars:', error);
      Alert.alert('Error', 'Failed to update calendars. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelChanges = () => {
    // Reset everything to original state
    setSelectedCalendars(originalCalendars);
    setAddedCalendars([]);
    setRemovedCalendars([]);
  };

  const toggleExpanded = () => {
    const hasChanges = addedCalendars.length > 0 || removedCalendars.length > 0;
    
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Save or cancel them before closing.',
        [{ text: 'OK' }]
      );
      return;
    }
    setIsExpanded(!isExpanded);
  };

  // Get the actual calendar objects for adding and logging
const addedCalendarObjects = userCalendars.filter(cal => {
    const isMatch = addedCalendars.includes(cal.calendarId);
    return isMatch;
  });

  const removedCalendarObjects = userCalendars.filter(cal => {
    const isMatch = removedCalendars.includes(cal.calendarId);
    return isMatch;
  });

  const styles = {
    container: {
      marginTop: getSpacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      marginLeft: getSpacing.sm,
    },
    expandedContent: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      marginTop: getSpacing.sm,
      padding: getSpacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    calendarItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.md,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.sm,
      marginBottom: getSpacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    calendarItemSelected: {
      backgroundColor: theme.primary + '20', // 20% opacity
      borderColor: theme.primary,
    },
    calendarItemAdded: {
      backgroundColor: theme.success + '20', // Green tint for newly added
      borderColor: theme.success,
    },
    calendarItemRemoved: {
      backgroundColor: theme.error + '20', // Red tint for to-be-removed
      borderColor: theme.error,
      opacity: 0.7,
    },
    calendarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    calendarColor: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginRight: getSpacing.md,
    },
    calendarInfo: {
      flex: 1,
    },
    calendarName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '500',
      color: theme.text.primary,
    },
    calendarType: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginTop: 2,
    },
    calendarStatus: {
      fontSize: getTypography.caption.fontSize,
      fontWeight: '600',
      marginTop: 2,
    },
    addedStatus: {
      color: theme.success,
    },
    removedStatus: {
      color: theme.error,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderRadius: getBorderRadius.xs,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    readOnlyCalendarItem: {
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    actionButtons: {
      flexDirection: 'row',
      marginTop: getSpacing.lg,
      gap: getSpacing.md,
    },
    actionButton: {
      flex: 1,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.lg,
      borderRadius: getBorderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: theme.button?.secondary || theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    saveButton: {
      backgroundColor: theme.primary,
    },
    saveButtonDisabled: {
      backgroundColor: theme.text.tertiary,
    },
    buttonText: {
      fontSize: getTypography.button.fontSize,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: theme.button?.secondaryText || theme.text.secondary,
    },
    saveButtonText: {
      color: theme.text.inverse,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
      fontStyle: 'italic',
      padding: getSpacing.xl,
    },
    changesSummary: {
      backgroundColor: theme.info + '15',
      borderRadius: getBorderRadius.sm,
      padding: getSpacing.md,
      marginBottom: getSpacing.md,
      borderWidth: 1,
      borderColor: theme.info + '30',
    },
    changesSummaryText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
    },
  };

  const sharedCalendarsCount = (group.calendars || group.sharedCalendars || []).length;
  const hasChanges = addedCalendars.length > 0 || removedCalendars.length > 0;

  // Helper function to get calendar item style
  const getCalendarItemStyle = (calendarId) => {
    const isSelected = selectedCalendars.includes(calendarId);
    const isAdded = addedCalendars.includes(calendarId);
    const isRemoved = removedCalendars.includes(calendarId);
    
    let style = [styles.calendarItem];
    
    if (isSelected && !isRemoved) {
      style.push(styles.calendarItemSelected);
    }
    if (isAdded) {
      style.push(styles.calendarItemAdded);
    }
    if (isRemoved) {
      style.push(styles.calendarItemRemoved);
    }
    
    return style;
  };

  // Helper function to get status text
  const getStatusText = (calendarId) => {
    if (addedCalendars.includes(calendarId)) {
      return 'Will be added';
    }
    if (removedCalendars.includes(calendarId)) {
      return 'Will be removed';
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Header - Always visible */}
      <TouchableOpacity 
        style={styles.header} 
        onPress={toggleExpanded}
        disabled={loading}
      >
        <View style={styles.headerLeft}>
          <Ionicons 
            name="calendar-outline" 
            size={20} 
            color={theme.text.secondary} 
          />
          <Text style={styles.headerText}>
            {sharedCalendarsCount} Shared Calendar{sharedCalendarsCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={theme.text.secondary} 
        />
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {isAdmin ? (
            // Admin view - Can manage calendars
            <>
              {/* Changes Summary */}
              {hasChanges && (
                <View style={styles.changesSummary}>
                  <Text style={styles.changesSummaryText}>
                    {addedCalendars.length > 0 && `${addedCalendars.length} to add`}
                    {addedCalendars.length > 0 && removedCalendars.length > 0 && ' • '}
                    {removedCalendars.length > 0 && `${removedCalendars.length} to remove`}
                  </Text>
                </View>
              )}

              {userCalendars.length === 0 ? (
                <Text style={styles.emptyText}>
                  No calendars available to share.{'\n'}Import some calendars first!
                </Text>
              ) : (
                <>
                  {userCalendars.map(calendar => {
                    const isSelected = selectedCalendars.includes(calendar.calendarId);
                    const statusText = getStatusText(calendar.calendarId);
                    
                    return (
                      <TouchableOpacity
                        key={calendar.calendarId}
                        style={getCalendarItemStyle(calendar.calendarId)}
                        onPress={() => toggleCalendarSelection(calendar.calendarId)}
                        disabled={loading}
                      >
                        <View style={styles.calendarLeft}>
                          <View 
                            style={[
                              styles.calendarColor, 
                              { backgroundColor: calendar.color }
                            ]} 
                          />
                          <View style={styles.calendarInfo}>
                            <Text style={styles.calendarName}>{calendar.name}</Text>
                            <Text style={styles.calendarType}>
                              {calendar.type === 'owned' ? 'Your Calendar' : 'Subscription'} • {calendar.calendarType}
                            </Text>
                            {statusText && (
                              <Text style={[
                                styles.calendarStatus,
                                addedCalendars.includes(calendar.calendarId) ? styles.addedStatus : styles.removedStatus
                              ]}>
                                {statusText}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={[
                          styles.checkbox,
                          isSelected && styles.checkboxSelected
                        ]}>
                          {isSelected && (
                            <Ionicons name="checkmark" size={14} color="white" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  
                  {/* Action Buttons - Only show if there are changes */}
                  {hasChanges && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={handleCancelChanges}
                        disabled={loading}
                      >
                        <Text style={[styles.buttonText, styles.cancelButtonText]}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.actionButton, 
                          styles.saveButton,
                          loading && styles.saveButtonDisabled
                        ]}
                        onPress={handleSaveChanges}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={[styles.buttonText, styles.saveButtonText]}>
                            Update
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </>
          ) : (
            // Member view - Read-only list of shared calendars
            <>
              {sharedCalendarsCount === 0 ? (
                <Text style={styles.emptyText}>
                  No calendars shared in this group yet.
                </Text>
              ) : (
                (group.calendars || group.sharedCalendars || []).map(calendar => (
                  <View key={calendar.calendarId || calendar.calendarId} style={[styles.calendarItem, styles.readOnlyCalendarItem]}>
                    <View style={styles.calendarLeft}>
                      <View 
                        style={[
                          styles.calendarColor, 
                          { backgroundColor: calendar.color }
                        ]} 
                      />
                      <View style={styles.calendarInfo}>
                        <Text style={styles.calendarName}>{calendar.name}</Text>
                        <Text style={styles.calendarType}>
                          Shared Calendar • {calendar.calendarType}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="eye-outline" size={16} color={theme.text.secondary} />
                  </View>
                ))
              )}
            </>
          )}
        </View>
      )}
    </View>
);
};

export default ExpandableCalendarsSection;