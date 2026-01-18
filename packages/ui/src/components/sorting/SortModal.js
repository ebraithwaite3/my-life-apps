import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';

const SortModal = ({ 
  visible, 
  onClose, 
  options, // Array of { id, label, icon, disabled?, closesModal? }
  currentSort,
  onSelectSort,
  headerRightContent = null, // Optional: custom content for top right (default = X button)
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const handleSelect = (option) => {
    onSelectSort(option.id);
    // Close modal if option has closesModal: true, otherwise stay open
    if (option.closesModal) {
      onClose();
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: getBorderRadius.lg,
      borderTopRightRadius: getBorderRadius.lg,
      paddingBottom: getSpacing.xl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: getSpacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    headerRight: {
      padding: getSpacing.xs,
    },
    optionsList: {
      paddingTop: getSpacing.sm,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: getSpacing.lg,
      gap: getSpacing.md,
    },
    optionIcon: {
      width: 24,
      alignItems: 'center',
    },
    optionText: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
    },
    activeOption: {
      backgroundColor: theme.primary + '10',
    },
    disabledOption: {
      opacity: 0.4,
    },
    checkIcon: {
      width: 24,
      alignItems: 'center',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Sort By</Text>
            <View style={styles.headerRight}>
              {headerRightContent || (
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={theme.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.optionsList}>
            {options.map((option) => {
              const isActive = currentSort === option.id;
              const isDisabled = option.disabled === true;
              
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.option, 
                    isActive && styles.activeOption,
                    isDisabled && styles.disabledOption
                  ]}
                  onPress={() => handleSelect(option)}
                  disabled={isDisabled}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={isActive ? theme.primary : theme.text.secondary}
                    />
                  </View>
                  <Text style={[
                    styles.optionText,
                    isActive && { color: theme.primary, fontWeight: '600' }
                  ]}>
                    {option.label}
                  </Text>
                  <View style={styles.checkIcon}>
                    {isActive && (
                      <Ionicons name="checkmark" size={20} color={theme.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default SortModal;