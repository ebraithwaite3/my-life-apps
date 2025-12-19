import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DateTime } from 'luxon';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';

/**
 * CalendarPickerContent - Inline month calendar (no modal)
 */
const CalendarPickerContent = ({ selectedDate, onSelectDate, disablePreviousDates = true }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const [viewDate, setViewDate] = useState(DateTime.now());

  useEffect(() => {
    if (selectedDate) {
      const dt = DateTime.fromJSDate(selectedDate);
      setViewDate(dt.startOf('month'));
    }
  }, [selectedDate]);

  // --- Logic Helpers ---

  const isPastDate = (date) => {
    if (!disablePreviousDates) return false;
    return date.startOf('day') < DateTime.now().startOf('day');
  };

  const canGoBack = () => {
    if (!disablePreviousDates) return true;
    return viewDate.startOf('month') > DateTime.now().startOf('month');
  };

  const handlePrevMonth = () => {
    if (canGoBack()) {
      setViewDate(viewDate.minus({ months: 1 }));
    }
  };

  const handleNextMonth = () => {
    setViewDate(viewDate.plus({ months: 1 }));
  };

  const handleDateSelect = (date) => {
    if (isPastDate(date)) return;
    onSelectDate(date.toJSDate());
  };

  const getDaysInMonth = () => {
    const firstDay = viewDate.startOf('month');
    const lastDay = viewDate.endOf('month');
    const startWeekday = firstDay.weekday % 7;
    
    const days = [];
    
    // Previous month filler (Leading)
    const prevMonth = firstDay.minus({ days: 1 });
    for (let i = startWeekday - 1; i >= 0; i--) {
      days.push({
        date: prevMonth.minus({ days: i }),
        isCurrentMonth: false,
      });
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.day; i++) {
      days.push({
        date: firstDay.set({ day: i }),
        isCurrentMonth: true,
      });
    }
    
    // Next month filler (Trailing)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: lastDay.plus({ days: i }),
        isCurrentMonth: false,
      });
    }
    
    return days;
  };

  const isToday = (date) => {
    return date.hasSame(DateTime.now(), 'day');
  };

  const isSelected = (date) => {
    if (!selectedDate) return false;
    return date.hasSame(DateTime.fromJSDate(selectedDate), 'day');
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      paddingVertical: getSpacing.md,
    },
    monthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      marginBottom: getSpacing.sm,
    },
    monthText: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    navButton: {
      padding: getSpacing.sm,
    },
    navButtonDisabled: {
      opacity: 0.2,
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
    },
    weekdayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: getSpacing.xs,
    },
    weekdayText: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.text.secondary,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: getSpacing.sm,
    },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
    },
    dayButton: {
      width: '90%',
      height: '90%',
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayButton: {
      backgroundColor: theme.primary + '15',
    },
    selectedButton: {
      backgroundColor: theme.primary,
    },
    dayText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    todayText: {
      color: theme.primary,
      fontWeight: '600',
    },
    selectedText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    disabledDayText: {
      color: theme.text.tertiary,
      opacity: 0.3,
    },
  });

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const days = getDaysInMonth();

  return (
    <View style={styles.container}>
      {/* Month navigation */}
      <View style={styles.monthHeader}>
        <TouchableOpacity 
          style={[styles.navButton, !canGoBack() && styles.navButtonDisabled]} 
          onPress={handlePrevMonth}
          disabled={!canGoBack()}
        >
          <Ionicons name="chevron-back" size={20} color={theme.primary} />
        </TouchableOpacity>
        
        <Text style={styles.monthText}>
          {viewDate.toFormat('MMMM yyyy')}
        </Text>
        
        <TouchableOpacity style={styles.navButton} onPress={handleNextMonth}>
          <Ionicons name="chevron-forward" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekdayRow}>
        {weekdays.map((day, i) => (
          <View key={i} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {days.map((dayObj, i) => {
          const today = isToday(dayObj.date);
          const selected = isSelected(dayObj.date);
          const disabled = isPastDate(dayObj.date);
          
          // Hides both leading (previous month) and trailing (next month) dates
          const isPaddingDate = !dayObj.isCurrentMonth;

          return (
            <View key={i} style={styles.dayCell}>
              {!isPaddingDate && (
                <TouchableOpacity
                  style={[
                    styles.dayButton,
                    today && !selected && styles.todayButton,
                    selected && styles.selectedButton,
                  ]}
                  onPress={() => handleDateSelect(dayObj.date)}
                  disabled={disabled}
                >
                  <Text
                    style={[
                      styles.dayText,
                      today && !selected && styles.todayText,
                      selected && styles.selectedText,
                      disabled && styles.disabledDayText,
                    ]}
                  >
                    {dayObj.date.day}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default CalendarPickerContent;