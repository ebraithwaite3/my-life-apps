// packages/ui/src/components/SelectModal.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '@my-apps/contexts';

/**
 * SelectModal - A self-contained dropdown-style selector with modal picker
 * 
 * @param {string} title - Modal header title (e.g., "Select Checklist")
 * @param {string} placeholder - Placeholder text when nothing selected
 * @param {string|number} value - Currently selected value
 * @param {Array} options - Array of options to select from
 * @param {function} onSelect - Callback when option is selected: (value) => void
 * @param {function} getLabel - Extract label from option: (item) => string
 * @param {function} getValue - Extract value from option: (item) => string|number
 * @param {string} emptyMessage - Message when no options available
 * @param {boolean} disabled - Whether the button is disabled
 */
const SelectModal = ({
  title,
  placeholder = '— Select an option —',
  value,
  options = [],
  onSelect,
  getLabel,
  getValue,
  emptyMessage = 'No options available',
  disabled = false,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Find selected option to display its label
  const selectedOption = options.find((opt) => String(getValue(opt)) === String(value));
  const displayText = selectedOption ? getLabel(selectedOption) : placeholder;
  const isPlaceholder = !selectedOption;

  const handleSelect = (optionValue) => {
    onSelect(optionValue);
    setModalVisible(false);
  };

  const styles = StyleSheet.create({
    // Button styles
    button: {
      width: '100%',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.surface || theme.background,
      paddingVertical: 12,
      paddingHorizontal: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      opacity: disabled ? 0.5 : 1,
    },
    buttonText: {
      fontSize: 16,
      color: theme.text.primary,
    },
    placeholderText: {
      fontSize: 16,
      color: theme.text.secondary,
    },
    arrow: {
      fontSize: 18,
      color: theme.text.primary,
    },

    // Modal styles
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.lg,
      width: '90%',
      maxHeight: '60%',
      marginHorizontal: getSpacing.lg,
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
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.primary,
    },
    option: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    selectedOption: {
      backgroundColor: theme.primary + '20',
    },
    optionText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    emptyContainer: {
      padding: getSpacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
    },
  });

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setModalVisible(true)}
        disabled={disabled}
      >
        <Text style={isPlaceholder ? styles.placeholderText : styles.buttonText}>
          {displayText}
        </Text>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modal}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>{title}</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={styles.doneButton}>Done</Text>
                  </TouchableOpacity>
                </View>

                {/* Options List */}
                <ScrollView>
                  {options.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>{emptyMessage}</Text>
                    </View>
                  ) : (
                    options.map((option) => {
                      const optionValue = getValue(option);
                      const isSelected = String(optionValue) === String(value);

                      return (
                        <TouchableOpacity
                          key={String(optionValue)}
                          style={[styles.option, isSelected && styles.selectedOption]}
                          onPress={() => handleSelect(optionValue)}
                        >
                          <Text style={styles.optionText}>{getLabel(option)}</Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default SelectModal;