import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import { ModalHeader } from '../../../headers';
import PopUpModalWrapper from '../../base/PopUpModalWrapper';

const MultipleChoiceSelectionModal = ({
  visible,
  options = [], // Array of strings like ["Math", "ELA", "Science"]
  onConfirm, // (selectedOptions: string[]) => void
  onCancel,
  itemName = "Item", // For display in header
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [selectedOptions, setSelectedOptions] = useState([]);

  useEffect(() => {
    // Reset selections when modal opens
    if (visible) {
      setSelectedOptions([]);
    }
  }, [visible]);

  const toggleOption = (option) => {
    setSelectedOptions(prev => {
      if (prev.includes(option)) {
        return prev.filter(opt => opt !== option);
      } else {
        return [...prev, option];
      }
    });
  };

  const handleConfirm = () => {
    if (selectedOptions.length === 0) {
      // Could show alert, but for now just prevent
      return;
    }
    onConfirm(selectedOptions);
  };

  const styles = StyleSheet.create({
    scrollContent: {
      padding: getSpacing.lg,
    },
    headerText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.md,
      textAlign: 'center',
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      marginBottom: getSpacing.sm,
      borderRadius: getBorderRadius.md,
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.border,
    },
    optionRowSelected: {
      backgroundColor: `${theme.primary}15`,
      borderColor: theme.primary,
    },
    checkbox: {
      marginRight: getSpacing.lg,
      width: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      flex: 1,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: getSpacing.xl * 2,
    },
    emptyStateText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
    },
  });

  return (
    <PopUpModalWrapper
      visible={visible}
      onClose={onCancel}
      maxHeight="70%"
    >
      <View style={{ height: '100%' }}>
        <ModalHeader
          title="Select Options"
          onCancel={onCancel}
          onDone={handleConfirm}
          doneText="Confirm"
          doneDisabled={selectedOptions.length === 0}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.headerText}>
            Which apply for {itemName}?
          </Text>

          {options.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="list-outline"
                size={64}
                color={theme.text.tertiary}
              />
              <Text style={styles.emptyStateText}>
                No options available
              </Text>
            </View>
          ) : (
            options.map((option, index) => {
              const isSelected = selectedOptions.includes(option);
              return (
                <TouchableOpacity
                  key={`${option}-${index}`}
                  style={[
                    styles.optionRow,
                    isSelected && styles.optionRowSelected,
                  ]}
                  onPress={() => toggleOption(option)}
                  activeOpacity={0.7}
                >
                  <View style={styles.checkbox}>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={28}
                      color={isSelected ? theme.primary : theme.text.tertiary}
                    />
                  </View>
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </PopUpModalWrapper>
  );
};

export default MultipleChoiceSelectionModal;