import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { useCalendarActions } from '../hooks';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const AddPublicCalendarsScreen = ({ navigation }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { db } = useAuth();
  const { calendars, user } = useData();
  const { addUserToPublicCalendar } = useCalendarActions();
  const [publicCalendars, setPublicCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingCalendarId, setAddingCalendarId] = useState(null);

  // Memoize the public calendar IDs the user already has
  const usersPublicCalendarIds = useMemo(() => {
    if (!user?.calendars || !publicCalendars.length) return new Set();

    // Get IDs of all public calendars
    const publicCalIds = new Set(publicCalendars.map(cal => cal.calendarId));

    // Filter user's calendars to only those that are in the public calendars list
    const userPublicCals = user.calendars
      .filter(cal => publicCalIds.has(cal.calendarId))
      .map(cal => cal.calendarId);

    return new Set(userPublicCals);
  }, [user?.calendars, publicCalendars]);

  useEffect(() => {
    const fetchPublicCalendars = async () => {
      try {
        const adminRef = collection(db, 'admin');
        const q = query(adminRef, where('type', '==', 'publicCalendars'));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          const calendars = docData.calendars || [];
          setPublicCalendars(calendars);
          console.log('Public Calendars loaded:', calendars);
        } else {
          console.log('No public calendars document found');
        }
      } catch (error) {
        console.error('Error fetching public calendars:', error);
      } finally {
        setLoading(false);
      }
    };

    if (db) {
      fetchPublicCalendars();
    } else {
      console.error('DB is not available');
      setLoading(false);
    }
  }, [db]);

  const handleAddCalendar = async (cal) => {
    // Check if user already has this calendar
    if (usersPublicCalendarIds.has(cal.calendarId)) {
      Alert.alert('Already Added', 'You already have this calendar in your collection.');
      return;
    }

    setAddingCalendarId(cal.calendarId);

    try {
      await addUserToPublicCalendar(cal.calendarId);

      Alert.alert(
        'Success',
        `${cal.name} has been added to your calendars!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error adding calendar:', error);

      let errorMessage = 'Failed to add calendar. Please try again.';
      if (error.message === 'Calendar not found') {
        errorMessage = 'This calendar is no longer available.';
      } else if (error.message === 'Calendar is not public') {
        errorMessage = 'This calendar is not available for subscription.';
      } else if (error.message === 'User is already subscribed to this calendar') {
        errorMessage = 'You are already subscribed to this calendar.';
      }

      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      setAddingCalendarId(null);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContainer: {
      flex: 1,
    },
    actionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: getSpacing.md,
      paddingTop: getSpacing.lg,
      marginBottom: getSpacing.md,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    backButtonText: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: getTypography.h2.fontWeight,
      color: theme.text.primary,
    },
    content: {
      paddingHorizontal: getSpacing.md,
      paddingBottom: getSpacing.xl,
    },
    header: {
      marginBottom: getSpacing.lg,
    },
    headerText: {
      fontSize: getTypography.h1.fontSize,
      fontWeight: getTypography.h1.fontWeight,
      color: theme.text.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    calendarItem: {
      backgroundColor: theme.surface,
      padding: getSpacing.md,
      borderRadius: getBorderRadius.lg,
      marginBottom: getSpacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    calendarInfoWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: getSpacing.md,
    },
    calendarLogo: {
      width: 40,
      height: 40,
      borderRadius: 6,
      resizeMode: 'contain',
        backgroundColor: "white",
    },
    logoPlaceholder: {
      width: 40,
      height: 40,
    },
    calendarInfo: {
      flex: 1,
    },
    calendarName: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      marginBottom: getSpacing.xs,
    },
    calendarId: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
    },
    countText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.md,
    },
    addedBadge: {
      backgroundColor: theme.success || '#10b981',
      paddingHorizontal: getSpacing.sm,
      paddingVertical: getSpacing.xs,
      borderRadius: getBorderRadius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addedText: {
      fontSize: getTypography.caption.fontSize,
      color: '#fff',
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.actionHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={theme.text.primary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Public Calendars</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <>
              <Text style={styles.countText}>
                {publicCalendars.length} calendar
                {publicCalendars.length !== 1 ? 's' : ''} available
              </Text>

              {publicCalendars.map((cal, index) => {
                const isAdded = usersPublicCalendarIds.has(cal.calendarId);
                const isAdding = addingCalendarId === cal.calendarId;

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.calendarItem}
                    onPress={() => !isAdded && !isAdding && handleAddCalendar(cal)}
                    disabled={isAdded || isAdding}
                  >
                    <View style={styles.calendarInfoWrapper}>
                      {cal.logoUrl ? (
                        <Image
                          source={{ uri: cal.logoUrl.replace(/"$/, '') }}
                          style={styles.calendarLogo}
                        />
                      ) : (
                        <View style={styles.logoPlaceholder} />
                      )}

                      <View style={styles.calendarInfo}>
                        <Text style={styles.calendarName}>{cal.name}</Text>
                      </View>
                    </View>

                    {isAdding ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : isAdded ? (
                      <View style={styles.addedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={styles.addedText}>Added</Text>
                      </View>
                    ) : (
                      <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddPublicCalendarsScreen;
