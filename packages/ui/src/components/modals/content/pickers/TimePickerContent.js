import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { DateTime } from 'luxon';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

const SpinnerColumn = ({ 
  items, 
  selectedValue, 
  onValueChange, 
  theme, 
  isLast = false,
}) => {
  const scrollViewRef = useRef(null);
  const [initialized, setInitialized] = useState(false);

  // Triple for circular
  const displayItems = [...items, ...items, ...items];

  useEffect(() => {
    if (scrollViewRef.current && !initialized) {
      const selectedIndex = items.findIndex(item => item.value === selectedValue);
      if (selectedIndex >= 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: (selectedIndex + items.length) * ITEM_HEIGHT,
            animated: false,
          });
          setInitialized(true);
        }, 100);
      }
    }
  }, [items, selectedValue, initialized]);

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const actualIndex = index % items.length;
    const item = items[actualIndex];
    if (item && item.value !== selectedValue) {
      onValueChange(item.value);
    }
  };

  const handleMomentumScrollEnd = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const actualIndex = index % items.length;
    
    if (index < items.length || index >= items.length * 2) {
      const middleIndex = actualIndex + items.length;
      scrollViewRef.current?.scrollTo({
        y: middleIndex * ITEM_HEIGHT,
        animated: false,
      });
    } else {
      scrollViewRef.current?.scrollTo({
        y: index * ITEM_HEIGHT,
        animated: true,
      });
    }
  };

  const styles = StyleSheet.create({
    column: {
      flex: 1,
      position: 'relative',
      borderRightWidth: isLast ? 0 : StyleSheet.hairlineWidth,
      borderRightColor: theme.border,
    },
    item: {
      height: ITEM_HEIGHT,
      justifyContent: 'center',
      alignItems: 'center',
    },
    itemText: {
      fontSize: 18,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.column}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
      >
        {displayItems.map((item, index) => {
          const isSelected = item.value === selectedValue;
          return (
            <TouchableOpacity
              key={`${item.value}-${index}`}
              style={styles.item}
              onPress={() => {
                onValueChange(item.value);
                const targetIndex = items.findIndex(i => i.value === item.value) + items.length;
                scrollViewRef.current?.scrollTo({
                  y: targetIndex * ITEM_HEIGHT,
                  animated: true,
                });
              }}
            >
              <Text
                style={[
                  styles.itemText,
                  { 
                    color: isSelected ? theme.text.primary : theme.text.tertiary,
                    fontWeight: isSelected ? '600' : 'normal',
                    fontSize: isSelected ? 20 : 18,
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const TimePickerContent = ({ selectedTime, onSelectTime }) => {
  const { theme, getSpacing } = useTheme();
  
  const dt = DateTime.fromJSDate(selectedTime);
  const hour12 = dt.hour === 0 ? 12 : dt.hour > 12 ? dt.hour - 12 : dt.hour;
  
  const [selectedHour, setSelectedHour] = useState(hour12);
  const [selectedMinute, setSelectedMinute] = useState(dt.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(dt.hour >= 12 ? 'PM' : 'AM');

  useEffect(() => {
    // Update parent when any value changes
    let hour24 = selectedHour;
    if (selectedPeriod === 'PM' && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedPeriod === 'AM' && selectedHour === 12) {
      hour24 = 0;
    }
    
    const newTime = DateTime.fromJSDate(selectedTime).set({
      hour: hour24,
      minute: selectedMinute,
    });
    
    onSelectTime(newTime.toJSDate());
  }, [selectedHour, selectedMinute, selectedPeriod]);

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

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      flexDirection: 'row',
      height: ITEM_HEIGHT * VISIBLE_ITEMS,
      position: 'relative',
    },
    highlight: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
      height: ITEM_HEIGHT,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      backgroundColor: theme.primary + '08',
      pointerEvents: 'none',
    },
  });

  return (
    <View style={styles.container}>
      <SpinnerColumn
        items={hours}
        selectedValue={selectedHour}
        onValueChange={setSelectedHour}
        theme={theme}
      />
      <SpinnerColumn
        items={minutes}
        selectedValue={selectedMinute}
        onValueChange={setSelectedMinute}
        theme={theme}
      />
      <SpinnerColumn
        items={periods}
        selectedValue={selectedPeriod}
        onValueChange={setSelectedPeriod}
        theme={theme}
        isLast={true}
      />
      <View style={styles.highlight} />
    </View>
  );
};

export default TimePickerContent;