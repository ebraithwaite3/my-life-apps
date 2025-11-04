// packages/ui/src/components/headers/AppHeader.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@my-apps/contexts';
import { HeaderMenu } from '../menus';

/**
 * AppHeader - Shared application header with app name and menu
 * 
 * @param {string} appName - The name of the app to display
 * @param {Array} menuItems - Array of menu items: { icon, label, onPress, variant }
 */
const AppHeader = ({ 
  appName = "My App",
  menuItems = []
}) => {
  const { theme, isDarkMode, toggleTheme, getSpacing, getTypography } = useTheme();
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      paddingTop: 50, // Account for status bar
      backgroundColor: theme.header,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      shadowColor: theme.shadow.color,
      shadowOffset: theme.shadow.offset,
      shadowOpacity: theme.shadow.opacity,
      shadowRadius: theme.shadow.radius,
      elevation: theme.shadow.elevation,
    },
    appName: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: '700',
      color: theme.text.primary,
      flex: 1,
    },
    hamburgerButton: {
      padding: getSpacing.sm,
      paddingHorizontal: getSpacing.lg,
      marginLeft: getSpacing.sm,
      borderRadius: 20,
      backgroundColor: theme.button.secondary,
    },
    hamburgerText: {
      fontSize: 18,
      color: theme.button.secondaryText,
      lineHeight: 20,
    },
  });

  return (
    <>
      <View style={styles.container}>
        {/* App Name */}
        <Text style={styles.appName}>{appName}</Text>

        {/* Hamburger Menu Button */}
        <TouchableOpacity 
          style={styles.hamburgerButton} 
          onPress={() => setIsMenuVisible(true)}
        >
          <Text style={styles.hamburgerText}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Header Menu */}
      <HeaderMenu
        isVisible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        menuItems={menuItems}
      />
    </>
  );
};

export default AppHeader;