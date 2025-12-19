import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DateTime } from 'luxon';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import PopUpModalWrapper from '../../base/PopUpModalWrapper';
import ModalHeader from '../../../headers/ModalHeader';

/**
 * CalendarPicker - iOS-style month calendar picker
 */
const CalendarPicker = ({ visible, selectedDate, onConfirm, onClose }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const [viewDate, setViewDate] = useState(DateTime.now());
  const [tempSelectedDate, setTempSelectedDate] = useState(null);

  useEffect(() => {
    if (visible) {
      const initial = selectedDate ? DateTime.fromJSDate(selectedDate) : DateTime.now();
      setViewDate(initial.startOf('month'));
      setTempSelectedDate(initial);
    }
  }, [visible, selectedDate]);

  const handlePrevMonth = () => {
    setViewDate(viewDate.minus({ months: 1 }));
  };

  const handleNextMonth = () => {
    setViewDate(viewDate.plus({ months: 1 }));
  };

  const handleDateSelect = (date) => {
    setTempSelectedDate(date);
  };

  const handleConfirm = () => {
    if (tempSelectedDate) {
      onConfirm(tempSelectedDate.toJSDate());
      onClose();
    }
  };

  const getDaysInMonth = () => {
    const firstDay = viewDate.startOf('month');
    const lastDay = viewDate.endOf('month');
    const startWeekday = firstDay.weekday % 7; // Sunday = 0
    
    const days = [];
    
    // Previous month filler
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
    
    // Next month filler
    const remaining = 42 - days.length; // 6 rows
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
    return tempSelectedDate && date.hasSame(tempSelectedDate, 'day');
  };

  const styles = StyleSheet.create({
    content: {
      padding: getSpacing.md,
    },
    monthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.sm,
    },
    monthText: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    navButton: {
      padding: getSpacing.sm,
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: getSpacing.xs,
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
    },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
    },
    dayButton: {
      width: '100%',
      height: '100%',
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayButton: {
      backgroundColor: theme.error + '15',
    },
    selectedButton: {
      backgroundColor: theme.error,
    },
    dayText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    todayText: {
      color: theme.error,
      fontWeight: '600',
    },
    selectedText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    otherMonthText: {
      color: theme.text.tertiary,
    },
  });

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const days = getDaysInMonth();

  return (
    <PopUpModalWrapper visible={visible} onClose={onClose} maxHeight="80%">
      <ModalHeader
        title="Select Date"
        onCancel={onClose}
        onDone={handleConfirm}
      />
      
      <View style={styles.content}>
        {/* Month navigation */}
        <View style={styles.monthHeader}>
          <TouchableOpacity style={styles.navButton} onPress={handlePrevMonth}>
            <Ionicons name="chevron-back" size={24} color={theme.error} />
          </TouchableOpacity>
          
          <TouchableOpacity>
            <Text style={styles.monthText}>
              {viewDate.toFormat('MMMM yyyy')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navButton} onPress={handleNextMonth}>
            <Ionicons name="chevron-forward" size={24} color={theme.error} />
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
            
            return (
              <View key={i} style={styles.dayCell}>
                <TouchableOpacity
                  style={[
                    styles.dayButton,
                    today && !selected && styles.todayButton,
                    selected && styles.selectedButton,
                  ]}
                  onPress={() => handleDateSelect(dayObj.date)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !dayObj.isCurrentMonth && styles.otherMonthText,
                      today && !selected && styles.todayText,
                      selected && styles.selectedText,
                    ]}
                  >
                    {dayObj.date.day}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    </PopUpModalWrapper>
  );
};

export default CalendarPicker;