import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const SlideOutMenu = ({ 
  isVisible,
  user,
  isUserAdmin,
  calendarsCount,
  onClose, 
  onLogout, 
  isDarkMode, 
  toggleTheme
}) => {
  console.log("USER IN SLIDE OUT MENU:", user);
  const { theme, getSpacing, getTypography } = useTheme();
  const navigation = useNavigation();

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
    logoutItem: {
      borderBottomColor: theme.error,
    },
    logoutText: {
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
    // Option 1: Toggle Switch Style
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
    // Option 3: Visual Toggle
    visualToggle: {
      width: 44,
      height: 24,
      backgroundColor: theme.button.secondary,
      borderRadius: 12,
      padding: 2,
      marginLeft: 'auto',
      justifyContent: 'center',
    },
    toggleActive: {
      backgroundColor: theme.primary,
    },
    toggleKnob: {
      width: 20,
      height: 20,
      backgroundColor: theme.surface,
      borderRadius: 10,
      transform: [{ translateX: 0 }],
    },
    knobActive: {
      transform: [{ translateX: 20 }],
    },
  });

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  const handleCalendarNavigation = () => {
    onClose();
    navigation.navigate('Calendar', { screen: 'CalendarEdit' });
  };

  const handlePublicCalendarsNavigation = () => {
    console.log("Navigating to Public Calendars...");
    onClose();
    navigation.navigate('Calendar', { 
      screen: 'PublicCalendars' 
    });
  }

  // Handle Groceries Navigation
  const handleGroceriesNavigation = () => {
    onClose();
    navigation.navigate('Grocery',
      { screen: 'GroceryHome' }
    );
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

              {/* Option 1: Toggle Switch Style */}
              <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
                <Text style={styles.menuItemIcon}>🌓</Text>
                <Text style={styles.menuItemText}>Theme</Text>
                <View style={styles.toggleContainer}>
                  <Text style={[styles.toggleOption, !isDarkMode && styles.activeToggle]}>Light</Text>
                  <Text style={[styles.toggleOption, isDarkMode && styles.activeToggle]}>Dark</Text>
                </View>
              </TouchableOpacity>

              {/* My Calendars */}
              <TouchableOpacity style={styles.menuItem} onPress={handleCalendarNavigation}>
                <Text style={styles.menuItemIcon}>📅</Text>
                <Text style={styles.menuItemText}>My Calendars ({calendarsCount})</Text>
              </TouchableOpacity>

              {/* If User is Admin, show Public Calendars Text */}
              {isUserAdmin && (
                <TouchableOpacity style={styles.menuItem} onPress={handlePublicCalendarsNavigation}>
                  <Text style={styles.menuItemIcon}>🌐</Text>
                  <Text style={styles.menuItemText}>Public Calendars</Text>
                </TouchableOpacity>
              )}

              {/* Groceries, if user has groceryId */}
              {user?.groceryId && (
                <TouchableOpacity style={styles.menuItem} onPress={handleGroceriesNavigation}>
                  <Text style={styles.menuItemIcon}>🛒</Text>
                  <Text style={styles.menuItemText}>Groceries</Text>
                </TouchableOpacity>
              )}

              {/* Logout */}
              <TouchableOpacity 
                style={[styles.menuItem, styles.logoutItem]} 
                onPress={handleLogout}
              >
                <Text style={styles.menuItemIcon}>🚪</Text>
                <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default SlideOutMenu;