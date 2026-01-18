import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import ModalWrapper from '../modals/base/ModalWrapper';
import ModalHeader from '../headers/ModalHeader';
import DraggableRow from './DraggableRow';

const ROW_HEIGHT = 64;

const CustomOrderModal = ({ 
  visible, 
  items, 
  onSave, 
  onClose, 
  keyExtractor, 
  getItemName,
  title = "Reorder",
  showChevrons = false,
  onDrillDown = null,
  hiddenCount = 0, // NEW
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [order, setOrder] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (visible) setOrder(items.map(keyExtractor));
  }, [visible, items, keyExtractor]);

  const orderedItems = order
    .map((key) => items.find((i) => keyExtractor(i) === key))
    .filter(Boolean);

  const moveItem = useCallback((fromIndex, toIndex) => {
    setOrder((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  }, []);

  const styles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: theme.background,
      paddingTop: insets.top,
    },
    content: { 
      flex: 1,
      padding: getSpacing.md 
    },
    instructionContainer: {
      marginBottom: getSpacing.lg,
    },
    instruction: {
      textAlign: 'center',
      color: theme.text.secondary,
      fontSize: getTypography.bodySmall.fontSize,
    },
    hiddenCountText: {
      textAlign: 'center',
      color: theme.text.tertiary,
      fontSize: getTypography.bodySmall.fontSize,
      marginTop: getSpacing.xs,
      fontStyle: 'italic',
    },
    row: {
      height: ROW_HEIGHT - getSpacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      paddingHorizontal: getSpacing.md,
      borderRadius: getBorderRadius.md,
      marginBottom: getSpacing.sm,
    },
    dragHandle: {
        paddingHorizontal: getSpacing.md,
        paddingVertical: getSpacing.sm,
        marginLeft: -getSpacing.sm,
        alignSelf: 'stretch',
        justifyContent: 'center',
      },
      
    rowContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    name: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    groupIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: getSpacing.sm,
    },
    groupCount: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      marginRight: getSpacing.xs,
    },
    chevronButton: {
      padding: getSpacing.xs,
    },
  });

  return (
    <ModalWrapper visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <ModalHeader 
          title={title} 
          onCancel={onClose} 
          onDone={() => onSave(orderedItems)} 
          doneText="Save" 
        />

        <ScrollView 
          style={styles.content} 
          scrollEnabled={!isDragging}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.instructionContainer}>
            <Text style={styles.instruction}>
              Drag {'\u2630'} to reorder
            </Text>
            {hiddenCount > 0 && (
              <Text style={styles.hiddenCountText}>
                {hiddenCount} completed {hiddenCount === 1 ? 'item' : 'items'} hidden
              </Text>
            )}
          </View>

          {orderedItems.map((item, index) => {
            const hasSubItems = showChevrons && item.subItems && item.subItems.length > 0;
            
            return (
                <DraggableRow
                key={keyExtractor(item)}
                index={index}
                rowHeight={ROW_HEIGHT}
                onMove={moveItem}
                onDragStateChange={setIsDragging}
                numItems={orderedItems.length}
              >
                {({ panHandlers }) => (
                  <View style={styles.row}>
                    
                    {/* DRAG HANDLE — only draggable area */}
                    <View
                      style={styles.dragHandle}
                      {...panHandlers}
                    >
                      <Ionicons
                        name="reorder-three-outline"
                        size={22}
                        color={theme.text.secondary}
                      />
                    </View>
              
                    {/* EVERYTHING ELSE — scrolls normally */}
                    <View style={styles.rowContent}>
                      <Text style={styles.name}>{getItemName(item)}</Text>
              
                      {hasSubItems && (
                        <View style={styles.groupIndicator}>
                          <Text style={styles.groupCount}>
                            ({item.subItems.length})
                          </Text>
                          <TouchableOpacity
                            style={styles.chevronButton}
                            onPress={() => onDrillDown && onDrillDown(item)}
                          >
                            <Ionicons
                              name="chevron-forward"
                              size={20}
                              color={theme.text.secondary}
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
              
                  </View>
                )}
              </DraggableRow>
              
            );
          })}
        </ScrollView>
      </View>
    </ModalWrapper>
  );
};

export default CustomOrderModal;