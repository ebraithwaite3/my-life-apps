import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { DateTime } from 'luxon';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

const SpinnerColumn = ({ items, selectedValue, onValueChange, height = ITEM_HEIGHT, theme, styles, isLast = false }) => {
  const scrollViewRef = useRef(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (scrollViewRef.current && !initialized) {
      const selectedIndex = items.findIndex(item => item.value === selectedValue);
      if (selectedIndex >= 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: selectedIndex * height,
            animated: false,
          });
          setInitialized(true);
        }, 100);
      }
    }
  }, [items, selectedValue, initialized, height]);

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / height);
    const item = items[index];
    if (item && item.value !== selectedValue) {
      onValueChange(item.value);
    }
  };

  const handleMomentumScrollEnd = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / height);
    scrollViewRef.current?.scrollTo({
      y: index * height,
      animated: true,
    });
  };

  return (
    <View style={[styles.columnContainer, isLast && styles.lastColumn]}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: height * Math.floor(VISIBLE_ITEMS / 2),
        }}
      >
        {items.map((item, index) => {
          const isSelected = item.value === selectedValue;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.columnItem, { height }]}
              onPress={() => {
                onValueChange(item.value);
                scrollViewRef.current?.scrollTo({
                  y: index * height,
                  animated: true,
                });
              }}
            >
              <Text
                style={[
                  styles.columnItemText,
                  { color: isSelected ? theme.text.primary : theme.text.tertiary },
                  isSelected && { fontWeight: '600', fontSize: 20 },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {/* Selection indicator */}
      <View
        style={[
          styles.selectionIndicator,
          {
            borderTopColor: theme.primary,
            borderBottomColor: theme.primary,
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
};

const getStyles = (theme, getSpacing, getBorderRadius, getTypography) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: theme.surface,
    borderRadius: getBorderRadius.lg,
    width: '85%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: theme.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getSpacing.lg,
    paddingVertical: getSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: {
    fontSize: getTypography.h4.fontSize,
    fontWeight: '600',
    color: theme.text.primary,
  },
  doneButton: {
    paddingVertical: getSpacing.sm,
    paddingHorizontal: getSpacing.sm,
  },
  doneButtonText: {
    fontSize: getTypography.body.fontSize,
    fontWeight: '600',
    color: theme.primary,
  },
  columnsContainer: {
    flexDirection: 'row',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    backgroundColor: theme.background,
  },
  columnContainer: {
    flex: 1,
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: theme.border,
  },
  lastColumn: {
    borderRightWidth: 0,
  },
  columnItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnItemText: {
    fontSize: 16,
    textAlign: 'center',
  },
  selectionIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    height: ITEM_HEIGHT,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
});

const SpinnerPicker = ({ visible, mode, value, onConfirm, onClose }) => {
  const { theme, getSpacing, getBorderRadius, getTypography } = useTheme();
  
  // Date state
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedYear, setSelectedYear] = useState(2024);
  
  // Time state
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('AM');

  useEffect(() => {
    if (visible && value) {
      const dt = DateTime.isDateTime(value) ? value : DateTime.fromJSDate(value);
      
      if (mode === 'date') {
        setSelectedMonth(dt.month);
        setSelectedDay(dt.day);
        setSelectedYear(dt.year);
      } else if (mode === 'time') {
        const hour12 = dt.hour === 0 ? 12 : dt.hour > 12 ? dt.hour - 12 : dt.hour;
        setSelectedHour(hour12);
        setSelectedMinute(dt.minute);
        setSelectedPeriod(dt.hour >= 12 ? 'PM' : 'AM');
      }
    }
  }, [visible, value, mode]);

  const handleConfirm = () => {
    let newDate;
    const currentDt = DateTime.isDateTime(value) ? value : DateTime.fromJSDate(value);
    
    if (mode === 'date') {
      newDate = currentDt.set({
        year: selectedYear,
        month: selectedMonth,
        day: selectedDay,
      });
    } else if (mode === 'time') {
      let hour24 = selectedHour;
      if (selectedPeriod === 'PM' && selectedHour !== 12) {
        hour24 = selectedHour + 12;
      } else if (selectedPeriod === 'AM' && selectedHour === 12) {
        hour24 = 0;
      }
      newDate = currentDt.set({
        hour: hour24,
        minute: selectedMinute,
      });
    }
    
    onConfirm(newDate.toJSDate());
    onClose();
  };

  // Generate options
  const months = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 },
  ];

  const getDaysInMonth = (month, year) => {
    const daysInMonth = DateTime.local(year, month, 1).daysInMonth;
    return Array.from({ length: daysInMonth }, (_, i) => ({
      label: String(i + 1),
      value: i + 1,
    }));
  };

  const years = Array.from({ length: 20 }, (_, i) => {
    const year = DateTime.local().year - 5 + i;
    return { label: String(year), value: year };
  });

  const hours = Array.from({ length: 12 }, (_, i) => ({
    label: String(i + 1).padStart(2, '0'),
    value: i + 1,
  }));

  const minutes = Array.from({ length: 60 }, (_, i) => ({
    label: String(i).padStart(2, '0'),
    value: i,
  }));

  const periods = [
    { label: 'AM', value: 'AM' },
    { label: 'PM', value: 'PM' },
  ];

  const styles = getStyles(theme, getSpacing, getBorderRadius, getTypography);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.pickerContainer}>
              <View style={styles.header}>
                <View style={{ width: 60 }} />
                <Text style={styles.headerTitle}>
                  {mode === 'date' ? 'Select Date' : 'Select Time'}
                </Text>
                <TouchableOpacity style={styles.doneButton} onPress={handleConfirm}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.columnsContainer}>
                {mode === 'date' ? (
                  <>
                    <SpinnerColumn
                      items={months}
                      selectedValue={selectedMonth}
                      onValueChange={setSelectedMonth}
                      theme={theme}
                      styles={styles}
                    />
                    <SpinnerColumn
                      items={getDaysInMonth(selectedMonth, selectedYear)}
                      selectedValue={selectedDay}
                      onValueChange={setSelectedDay}
                      theme={theme}
                      styles={styles}
                    />
                    <SpinnerColumn
                      items={years}
                      selectedValue={selectedYear}
                      onValueChange={setSelectedYear}
                      theme={theme}
                      styles={styles}
                      isLast={true}
                    />
                  </>
                ) : (
                  <>
                    <SpinnerColumn
                      items={hours}
                      selectedValue={selectedHour}
                      onValueChange={setSelectedHour}
                      theme={theme}
                      styles={styles}
                    />
                    <SpinnerColumn
                      items={minutes}
                      selectedValue={selectedMinute}
                      onValueChange={setSelectedMinute}
                      theme={theme}
                      styles={styles}
                    />
                    <SpinnerColumn
                      items={periods}
                      selectedValue={selectedPeriod}
                      onValueChange={setSelectedPeriod}
                      theme={theme}
                      styles={styles}
                      isLast={true}
                    />
                  </>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default SpinnerPicker;