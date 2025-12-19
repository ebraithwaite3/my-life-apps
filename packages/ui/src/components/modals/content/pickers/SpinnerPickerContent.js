import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

const SpinnerColumn = ({ 
  items, 
  selectedValue, 
  onValueChange, 
  theme, 
  isLast = false,
  circular = true, // NEW: control tripling behavior
}) => {
  const scrollViewRef = useRef(null);
  const [initialized, setInitialized] = useState(false);

  // Only triple for circular columns with enough items
  // For short lists (like AM/PM with 2 items), tripling is confusing
  const shouldTriple = circular && items.length > 2;
  const displayItems = shouldTriple ? [...items, ...items, ...items] : items;

  useEffect(() => {
    if (scrollViewRef.current && !initialized) {
      const selectedIndex = items.findIndex(item => item.value === selectedValue);
      if (selectedIndex >= 0) {
        setTimeout(() => {
          const scrollToIndex = shouldTriple ? selectedIndex + items.length : selectedIndex;
          scrollViewRef.current?.scrollTo({
            y: scrollToIndex * ITEM_HEIGHT,
            animated: false,
          });
          setInitialized(true);
        }, 100);
      }
    }
  }, [items, selectedValue, initialized, shouldTriple]);

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const actualIndex = shouldTriple ? index % items.length : index;
    const item = items[actualIndex];
    if (item && item.value !== selectedValue) {
      onValueChange(item.value);
    }
  };

  const handleMomentumScrollEnd = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    
    if (shouldTriple) {
      const actualIndex = index % items.length;
      
      // If in first or last section, snap to middle section
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
    } else {
      // For non-circular, just snap to position
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
                const targetIndex = shouldTriple 
                  ? items.findIndex(i => i.value === item.value) + items.length
                  : items.findIndex(i => i.value === item.value);
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

/**
 * Generic circular spinner picker component
 * 
 * @param {Array} columns - Array of column configurations
 *   Each column: { items, selectedValue, onValueChange, circular }
 * @param {Object} theme - Theme object
 * 
 * Example usage:
 * <SpinnerPickerContent
 *   columns={[
 *     { 
 *       items: hours, 
 *       selectedValue: selectedHour, 
 *       onValueChange: setSelectedHour,
 *       circular: true  // infinite scroll
 *     },
 *     { 
 *       items: periods, 
 *       selectedValue: selectedPeriod, 
 *       onValueChange: setSelectedPeriod,
 *       circular: false  // just 2 items, don't triple
 *     },
 *   ]}
 *   theme={theme}
 * />
 */
const SpinnerPickerContent = ({ columns, theme }) => {
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
      {columns.map((column, index) => (
        <SpinnerColumn
          key={index}
          items={column.items}
          selectedValue={column.selectedValue}
          onValueChange={column.onValueChange}
          theme={theme}
          isLast={index === columns.length - 1}
          circular={column.circular !== undefined ? column.circular : true}
        />
      ))}
      <View style={styles.highlight} />
    </View>
  );
};

export default SpinnerPickerContent;