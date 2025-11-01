import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import SlideOutMenu from './SlideOutMenu';

const Header = ({ 
  onProfilePress, 
  showBackButton = false, 
  title = null,
  onLogout,
  onBackPress = null
}) => {
  const { theme, isDarkMode, toggleTheme, getSpacing, getTypography } = useTheme();
  const { user, calendars, isUserAdmin } = useData();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  console.log("CALENDARS IN HEADER:", calendars, calendars.length);

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
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    centerSection: {
      flex: 2,
      alignItems: 'center',
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flex: 1,
    },
    backButton: {
      paddingHorizontal: getSpacing.sm,
      paddingVertical: getSpacing.sm,
      marginRight: getSpacing.sm,
    },
    backText: {
      fontSize: getTypography.body.fontSize,
      color: theme.primary,
      fontWeight: '600',
    },
    profileContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    profilePlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: getSpacing.sm,
    },
    profileInitials: {
      color: theme.text.inverse,
      fontSize: 14,
      fontWeight: 'bold',
    },
    greeting: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      fontWeight: '500',
      flex: 1,
    },
    headerTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: getTypography.h4.fontWeight,
      color: theme.text.primary,
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

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      <View style={styles.container}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          {showBackButton && onBackPress && (
            <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          )}
          
          {!showBackButton && user && (
            <TouchableOpacity 
              style={styles.profileContainer} 
              onPress={onProfilePress}
            >
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitials}>
                  {getInitials(user.username)}
                </Text>
              </View>
              <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
                {getGreeting()}, {user.username?.split(' ')[0] || 'User'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Center Section */}
        <View style={styles.centerSection}>
          {title && (
            <Text style={styles.headerTitle}>{title}</Text>
          )}
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          {/* Hamburger Menu */}
          <TouchableOpacity 
            style={styles.hamburgerButton} 
            onPress={() => setIsMenuVisible(!isMenuVisible)}
          >
            <Text style={styles.hamburgerText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Slide Out Menu */}
      <SlideOutMenu
        isVisible={isMenuVisible}
        user={user}
        isUserAdmin={isUserAdmin}
        calendarsCount={calendars?.length}
        onClose={() => setIsMenuVisible(false)}
        onLogout={onLogout}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
    </>
  );
};

export default Header;