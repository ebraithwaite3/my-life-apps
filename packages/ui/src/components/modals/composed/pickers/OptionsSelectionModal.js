import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@my-apps/contexts';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PopUpModalWrapper from '../../base/PopUpModalWrapper';
import ModalHeader from '../../../headers/ModalHeader';
import OptionsListContent from '../../content/OptionsListContent';

const OptionsSelectionModal = ({ 
  visible, 
  title = "Select Option",
  options = [], 
  onSelect, 
  onClose,
  emptyMessage = "No options available",
  multiSelect = false,
  selectedValues = [],
}) => {
  const { theme, getSpacing } = useTheme();
  const [localSelection, setLocalSelection] = useState([]);

  useEffect(() => {
    if (visible && multiSelect) {
      setLocalSelection(selectedValues || []);
    }
  }, [visible, selectedValues, multiSelect]);

  const handleSelect = (item) => {
    if (multiSelect) {
      const isSelected = localSelection.includes(item.value);
      if (isSelected) {
        setLocalSelection(prev => prev.filter(v => v !== item.value));
      } else {
        setLocalSelection(prev => [...prev, item.value]);
      }
    } else {
      onSelect(item);
      onClose();
    }
  };

  const handleDone = () => {
    if (multiSelect) {
      localSelection.forEach(value => {
        const item = options.find(opt => opt.value === value);
        if (item) onSelect(item);
      });
    }
    onClose();
  };

  const styles = StyleSheet.create({
    scrollView: {
      backgroundColor: theme.surface || theme.background,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.primary,
      marginRight: getSpacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxSelected: {
      backgroundColor: theme.primary,
    },
    optionText: {
      flex: 1,
      fontSize: 15,
      color: theme.text.primary,
    },
    emptyContainer: {
      padding: getSpacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 15,
      color: theme.text.secondary,
      textAlign: 'center',
    },
  });

  return (
    <PopUpModalWrapper 
      visible={visible} 
      onClose={onClose}
      width="99%"
      maxHeight="70%"
    >
      <ModalHeader
        title={title}
        onCancel={onClose}
        showDone={multiSelect}
        onDone={multiSelect ? handleDone : undefined}
      />
      
      {multiSelect ? (
        options.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView}>
            {options.map((item) => {
              const isSelected = localSelection.includes(item.value);
              return (
                <TouchableOpacity 
                  key={item.id || item.value}
                  style={styles.optionRow}
                  onPress={() => handleSelect(item)}
                >
                  <View style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected
                  ]}>
                    {isSelected && (
                      <Icon name="check" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.optionText}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )
      ) : (
        <OptionsListContent 
          options={options}
          onSelect={handleSelect}
          emptyMessage={emptyMessage}
        />
      )}
    </PopUpModalWrapper>
  );
};

export default OptionsSelectionModal;