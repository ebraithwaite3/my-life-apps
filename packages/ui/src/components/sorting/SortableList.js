import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import SortModal from './SortModal';
import DraggableRow from './DraggableRow';

const SortableList = ({
  items,
  renderItem,
  keyExtractor,
  sortOptions = [],
  currentSort = 'custom',
  onSortChange,
  onReorder,
  showSortButton = true,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const [showSortModal, setShowSortModal] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [localItems, setLocalItems] = useState(items);
  const scrollViewRef = useRef(null); // ✅ ADD REF

  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleDragStart = useCallback((index) => {
    console.log('🎯 Drag started:', index);
    setDraggingIndex(index);
    // ✅ Disable scrolling
    if (scrollViewRef.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: false });
    }
  }, []);

  const handleDragMove = useCallback((index, dy) => {
    const itemHeight = 80;
    const positions = Math.round(dy / itemHeight);
    
    if (positions !== 0) {
      const newIndex = Math.max(0, Math.min(localItems.length - 1, index + positions));
      
      if (newIndex !== index) {
        console.log('📦 Moving from', index, 'to', newIndex);
        const newItems = [...localItems];
        const [removed] = newItems.splice(index, 1);
        newItems.splice(newIndex, 0, removed);
        setLocalItems(newItems);
        setDraggingIndex(newIndex);
      }
    }
  }, [localItems]);

  const handleDragEnd = useCallback((index, dy) => {
    console.log('✋ Drag ended');
    setDraggingIndex(null);
    
    // ✅ Re-enable scrolling
    if (scrollViewRef.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: true });
    }
    
    if (JSON.stringify(localItems) !== JSON.stringify(items)) {
      console.log('💾 Saving new order');
      if (onReorder) {
        onReorder(localItems);
      }
    }
  }, [localItems, items, onReorder]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.xs,
      paddingVertical: getSpacing.sm,
      paddingHorizontal: getSpacing.md,
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      alignSelf: 'flex-start',
      marginBottom: getSpacing.md,
    },
    sortButtonText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      fontWeight: '600',
    },
  });

  const SortButton = () => {
    if (!showSortButton || sortOptions.length === 0) return null;

    const currentOption = sortOptions.find(opt => opt.id === currentSort);

    return (
      <TouchableOpacity 
        style={styles.sortButton}
        onPress={() => setShowSortModal(true)}
      >
        <Ionicons 
          name={currentOption?.icon || 'swap-vertical'} 
          size={16} 
          color={theme.text.secondary} 
        />
        <Text style={styles.sortButtonText}>
          {currentOption?.label || 'Sort'}
        </Text>
      </TouchableOpacity>
    );
  };

  if (localItems.length === 0) {
    return (
      <ScrollView 
        style={styles.container}
        contentContainerStyle={contentContainerStyle}
      >
        <SortButton />
        {ListEmptyComponent}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef} // ✅ ADD REF
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true} // ✅ Start enabled
      >
        <SortButton />
        {ListHeaderComponent}
        
        {localItems.map((item, index) => (
          <DraggableRow
            key={keyExtractor(item)}
            index={index}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            disabled={currentSort !== 'custom'}
            theme={theme}
          >
            <View style={{ 
              opacity: draggingIndex === index ? 0.7 : 1,
              transform: [{ scale: draggingIndex === index ? 1.02 : 1 }],
              backgroundColor: draggingIndex === index ? theme.primary + '10' : 'transparent'
            }}>
              {renderItem(item, index)}
            </View>
          </DraggableRow>
        ))}
      </ScrollView>

      <SortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        options={sortOptions}
        currentSort={currentSort}
        onSelectSort={onSortChange}
      />
    </View>
  );
};

export default SortableList;