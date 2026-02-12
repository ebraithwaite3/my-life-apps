import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import { DateTime } from 'luxon';

const HOUR_HEIGHT = 60;
const START_HOUR = 6;   // 6am
const END_HOUR = 23;    // 11pm
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const DAY_HEADER_HEIGHT = 50;
const TIME_COLUMN_WIDTH = 40; // ← Reduced from 50

const WeekView = ({ 
  weekData,
  userCalendars = [],
  onDayPress,
  onSwipeLeft,
  onSwipeRight,
}) => {
  const { theme } = useTheme();
  const scrollViewRef = useRef(null);

  // Scroll to current time on mount
  useEffect(() => {
    const now = DateTime.local();
    const currentHour = now.hour;
    if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
      const scrollPosition = (currentHour - START_HOUR - 1) * HOUR_HEIGHT;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, scrollPosition), animated: true });
      }, 100);
    }
  }, []);

  // Swipe gesture
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.velocityX > 500) {
        onSwipeRight?.();
      } else if (event.velocityX < -500) {
        onSwipeLeft?.();
      }
    });

    const getEventColor = (event) => {
        // Find the calendar this event belongs to
        const calendar = userCalendars.find(
          (cal) => cal.calendarId === event.calendarId
        );
        
        if (calendar && calendar.color) {
          return calendar.color;
        }
        
        // Fallback to theme primary
        return theme.primary;
      };

  const getEventPosition = (event) => {
    const startTime = DateTime.fromISO(event.startTime);
    const startHour = startTime.hour + startTime.minute / 60;
    
    // Calculate top position
    const top = (startHour - START_HOUR) * HOUR_HEIGHT;
    
    // Calculate height (minimum 30pt for better visibility)
    let height = 30;
    if (event.endTime) {
      const endTime = DateTime.fromISO(event.endTime);
      const endHour = endTime.hour + endTime.minute / 60;
      const duration = endHour - startHour;
      height = Math.max(duration * HOUR_HEIGHT - 2, 30); // -2 for spacing
    }
    
    return { top, height };
  };

  const renderEvent = (event, dayIndex) => {
    const { top, height } = getEventPosition(event);
    const color = getEventColor(event);
    const startTime = DateTime.fromISO(event.startTime).toFormat('h:mm a');
    
    return (
      <TouchableOpacity
        key={event.eventId}
        style={[
          styles.eventBlock,
          {
            top,
            height,
            backgroundColor: color,
          }
        ]}
        onPress={() => console.log('Event pressed:', event)}
      >
        <Text style={styles.eventTitle} numberOfLines={height > 40 ? 2 : 1}>
          {event.title}
        </Text>
        {height > 35 && (
          <Text style={styles.eventTime}>{startTime}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      height: DAY_HEADER_HEIGHT,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.background,
    },
    // Empty spacer for time column alignment
    headerSpacer: {
      width: TIME_COLUMN_WIDTH,
    },
    headerDaysContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    dayColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNumber: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.text.primary,
    },
    todayCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FF3B30', // iOS red
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayNumber: {
      fontSize: 24,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    scrollContent: {
      flexDirection: 'row',
    },
    timeColumn: {
      width: TIME_COLUMN_WIDTH,
      backgroundColor: theme.background,
    },
    timeLabel: {
      height: HOUR_HEIGHT,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: 4,
    },
    timeLabelText: {
      fontSize: 10,
      color: theme.textSecondary || theme.text.secondary,
      opacity: 0.6,
    },
    dayColumnsContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    dayEventsColumn: {
      flex: 1,
      position: 'relative',
      borderLeftWidth: 0.5,
      borderLeftColor: theme.border,
    },
    hourRow: {
      height: HOUR_HEIGHT,
      borderTopWidth: 0.5,
      borderTopColor: theme.border,
    },
    eventBlock: {
      position: 'absolute',
      left: 2,
      right: 2,
      borderRadius: 4,
      padding: 4,
      paddingHorizontal: 6,
      overflow: 'hidden',
    },
    eventTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
      lineHeight: 14,
    },
    eventTime: {
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.9)',
      marginTop: 2,
    },
  });

  if (!weekData || weekData.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Loading week...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.container}>
          {/* Day Number Headers */}
          <View style={styles.header}>
            {/* Spacer for time column */}
            <View style={styles.headerSpacer} />
            
            {/* Day numbers container - matches columns below */}
            <View style={styles.headerDaysContainer}>
              {weekData.map((day) => (
                <TouchableOpacity
                  key={day.date}
                  style={styles.dayColumn}
                  onPress={() => onDayPress(day.date)}
                >
                  {day.isToday ? (
                    <View style={styles.todayCircle}>
                      <Text style={styles.todayNumber}>{day.dayNumber}</Text>
                    </View>
                  ) : (
                    <Text style={styles.dayNumber}>{day.dayNumber}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Scrollable Week Grid */}
          <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
            <View style={styles.scrollContent}>
              {/* Time Labels */}
              <View style={styles.timeColumn}>
                {HOURS.map((hour) => (
                  <View key={hour} style={styles.timeLabel}>
                    <Text style={styles.timeLabelText}>
                      {hour > 12 ? `${hour - 12}` : hour === 12 ? '12' : `${hour}`}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Day Columns with Events */}
              <View style={styles.dayColumnsContainer}>
                {weekData.map((day, dayIndex) => (
                  <View key={day.date} style={styles.dayEventsColumn}>
                    {/* Hour grid lines */}
                    {HOURS.map((hour) => (
                      <View key={hour} style={styles.hourRow} />
                    ))}
                    
                    {/* Events */}
                    {day.events.map((event) => renderEvent(event, dayIndex))}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

export default WeekView;