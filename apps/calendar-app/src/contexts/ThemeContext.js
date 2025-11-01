import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Theme from '../constants/Theme';

const ThemeContext = createContext();

export const CustomThemeProvider = ({ children }) => {  // Renamed from ThemeProvider
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSystemTheme, setIsSystemTheme] = useState(true);

  useEffect(() => {
    initializeTheme();
  }, []);

  useEffect(() => {
    if (isSystemTheme) {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setIsDarkMode(colorScheme === 'dark');
      });
      return () => subscription?.remove();
    }
  }, [isSystemTheme]);

  const initializeTheme = async () => {
    try {
      const savedThemePreference = await AsyncStorage.getItem('themePreference');
      
      if (savedThemePreference) {
        const preference = JSON.parse(savedThemePreference);
        setIsSystemTheme(preference.isSystemTheme);
        
        if (preference.isSystemTheme) {
          const systemColorScheme = Appearance.getColorScheme();
          setIsDarkMode(systemColorScheme === 'dark');
        } else {
          setIsDarkMode(preference.isDarkMode);
        }
      } else {
        const systemColorScheme = Appearance.getColorScheme();
        setIsDarkMode(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      const systemColorScheme = Appearance.getColorScheme();
      setIsDarkMode(systemColorScheme === 'dark');
    }
  };

  const saveThemePreference = async (newIsSystemTheme, newIsDarkMode) => {
    try {
      const preference = {
        isSystemTheme: newIsSystemTheme,
        isDarkMode: newIsDarkMode
      };
      await AsyncStorage.setItem('themePreference', JSON.stringify(preference));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    setIsSystemTheme(false);
    saveThemePreference(false, newIsDarkMode);
  };

  const setSystemTheme = () => {
    setIsSystemTheme(true);
    const systemColorScheme = Appearance.getColorScheme();
    setIsDarkMode(systemColorScheme === 'dark');
    saveThemePreference(true, systemColorScheme === 'dark');
  };

  const setManualTheme = (darkMode) => {
    setIsSystemTheme(false);
    setIsDarkMode(darkMode);
    saveThemePreference(false, darkMode);
  };

  const currentTheme = isDarkMode ? Theme.dark : Theme.light;

  const value = {
    isDarkMode,
    isSystemTheme,
    theme: currentTheme,
    toggleTheme,
    setSystemTheme,
    setManualTheme,
    getSpacing: Theme.spacing,
    getTypography: Theme.typography,
    getBorderRadius: Theme.borderRadius
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a CustomThemeProvider');
  }
  return context;
};

export default ThemeContext;