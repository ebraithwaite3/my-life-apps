// components/calendar/MonthView.js
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { DateTime } from 'luxon';

const MonthView = ({ month, year, events = [], onDayPress }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  // Generate calendar days for the month
  const calendarDays = useMemo(() => {
    const monthStart = DateTime.fromObject({ year, month: DateTime.fromFormat(month, "LLLL").month });
    const startOfMonth = monthStart.startOf('month');
    const endOfMonth = monthStart.endOf('month');

    // Calculate start of grid (include previous month days to fill first week)
    const daysToSubtract = startOfMonth.weekday === 7 ? 0 : startOfMonth.weekday;
    const startOfGrid = startOfMonth.minus({ days: daysToSubtract });

    // Calculate total cells needed (complete weeks)
    const daysInMonth = endOfMonth.day;
    const totalDaysNeeded = daysToSubtract + daysInMonth;
    const weeksNeeded = Math.ceil(totalDaysNeeded / 7);
    const totalCells = weeksNeeded * 7;

    const days = [];
    let current = startOfGrid;
    const today = DateTime.now();

    for (let i = 0; i < totalCells; i++) {
      const isCurrentMonth = current.month === monthStart.month;
      const dateISO = current.toISODate();
      
      // Get events for this day
      const dayEvents = events.filter(event => {
        const eventDate = DateTime.fromISO(event.startTime);
        return eventDate.toISODate() === dateISO && !event.deleted;
      });

      days.push({
        date: current,
        dateISO: dateISO,
        isCurrentMonth,
        isToday: current.toISODate() === today.toISODate(),
        events: dayEvents,
        eventCount: dayEvents.length,
      });
      current = current.plus({ days: 1 });
    }

    return days;
  }, [month, year, events]);

  // Group days into weeks
  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const renderEventIndicators = (dayEvents) => {
    if (!dayEvents || dayEvents.length === 0) return null;
    const maxIndicators = 3;
    const visibleEvents = dayEvents.slice(0, maxIndicators);
    
    return (
      <View style={styles.eventIndicators}>
        {visibleEvents.map((event, index) => (
          <View
            key={index}
            style={[
              styles.eventBar,
              { backgroundColor: event.calendarColor || theme.primary },
            ]}
          >
            <Text style={styles.eventText} numberOfLines={1}>
              {event.title}
            </Text>
          </View>
        ))}
        {dayEvents.length > maxIndicators && (
          <Text style={[styles.moreEventsText, { color: theme.text.secondary }]}>
            +{dayEvents.length - maxIndicators}
          </Text>
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: getSpacing.md,
    },
    weekHeader: {
      flexDirection: 'row',
      marginBottom: getSpacing.sm,
      paddingTop: getSpacing.sm,
    },
    dayHeader: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: getSpacing.xs,
    },
    dayHeaderText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.text.secondary,
    },
    calendarGrid: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      padding: getSpacing.xs,
    },
    weekRow: {
      flexDirection: 'row',
    },
    dayCell: {
      flex: 1,
      minHeight: 80,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: getSpacing.xs,
      borderRadius: getBorderRadius.sm,
      marginVertical: 1,
    },
    todayCell: {
      borderWidth: 2,
      borderColor: theme.error || '#FF0000',
    },
    otherMonthCell: {
      opacity: 0,
    },
    dayText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '500',
      color: theme.text.primary,
      marginBottom: getSpacing.xs,
    },
    todayText: {
      color: theme.error || '#FF0000',
      fontWeight: '700',
    },
    eventIndicators: {
      width: '100%',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      marginTop: getSpacing.xs,
      gap: 2,
      paddingHorizontal: 2,
    },
    eventBar: {
      height: 14,
      borderRadius: 2,
      paddingHorizontal: 3,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    eventText: {
      fontSize: 8,
      color: 'white',
      fontWeight: '500',
    },
    moreEventsText: {
      fontSize: 8,
      fontWeight: '600',
      marginLeft: 2,
    },
  });

  return (
    <ScrollView style={styles.container}>
      {/* Week Header */}
      <View style={styles.weekHeader}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <View key={day} style={styles.dayHeader}>
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => (
              <TouchableOpacity
                key={dayIndex}
                style={[
                  styles.dayCell,
                  day.isToday && styles.todayCell,
                  !day.isCurrentMonth && styles.otherMonthCell,
                ]}
                onPress={() => day.isCurrentMonth && onDayPress(day.dateISO)}
                activeOpacity={0.7}
                disabled={!day.isCurrentMonth}
              >
                {day.isCurrentMonth && (
                  <>
                    <Text
                      style={[
                        styles.dayText,
                        day.isToday && styles.todayText,
                      ]}
                    >
                      {day.date.day}
                    </Text>
                    {renderEventIndicators(day.events)}
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default MonthView;