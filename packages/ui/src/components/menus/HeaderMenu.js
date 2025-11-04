// packages/ui/src/components/menus/HeaderMenu.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useTheme } from '@my-apps/contexts';

/**
 * HeaderMenu - Slide-out menu for app header with customizable items
 * 
 * @param {boolean} isVisible - Whether menu is visible
 * @param {function} onClose - Callback to close menu
 * @param {boolean} isDarkMode - Current theme mode
 * @param {function} toggleTheme - Callback to toggle theme
 * @param {Array} menuItems - Array of menu items: { icon, label, onPress, variant }
 *   - variant: 'danger' for destructive actions like logout
 */
const HeaderMenu = ({ 
  isVisible,
  onClose, 
  isDarkMode, 
  toggleTheme,
  menuItems = []
}) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
    },
    menu: {
      backgroundColor: theme.surface,
      width: 250,
      height: '100%',
      paddingTop: 60,
      paddingHorizontal: getSpacing.lg,
      borderLeftWidth: 1,
      borderLeftColor: theme.border,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    menuItemText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginLeft: getSpacing.sm,
      flex: 1,
    },
    menuItemIcon: {
      width: 20,
      fontSize: 16,
      color: theme.text.secondary,
    },
    dangerItem: {
      borderBottomColor: theme.error,
    },
    dangerText: {
      color: theme.error,
    },
    closeButton: {
      alignItems: 'flex-end',
      marginBottom: getSpacing.lg,
    },
    closeText: {
      fontSize: 24,
      color: theme.text.primary,
    },
    toggleContainer: {
      flexDirection: 'row',
      backgroundColor: theme.button.secondary,
      borderRadius: 16,
      padding: 2,
      marginLeft: 'auto',
    },
    toggleOption: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      fontSize: 12,
      fontWeight: '500',
      color: theme.text.secondary,
      borderRadius: 14,
    },
    activeToggle: {
      backgroundColor: theme.primary,
      color: theme.text.inverse,
    },
  });

  const handleItemPress = (onPress) => {
    onClose();
    onPress();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.menu}>
              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Theme Toggle - Built-in */}
                <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
                  <Text style={styles.menuItemIcon}>🌓</Text>
                  <Text style={styles.menuItemText}>Theme</Text>
                  <View style={styles.toggleContainer}>
                    <Text style={[styles.toggleOption, !isDarkMode && styles.activeToggle]}>Light</Text>
                    <Text style={[styles.toggleOption, isDarkMode && styles.activeToggle]}>Dark</Text>
                  </View>
                </TouchableOpacity>

                {/* Custom Menu Items */}
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.menuItem,
                      item.variant === 'danger' && styles.dangerItem
                    ]}
                    onPress={() => handleItemPress(item.onPress)}
                  >
                    <Text style={styles.menuItemIcon}>{item.icon}</Text>
                    <Text style={[
                      styles.menuItemText,
                      item.variant === 'danger' && styles.dangerText
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default HeaderMenu;