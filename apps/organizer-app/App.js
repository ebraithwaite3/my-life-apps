// App.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { CustomThemeProvider, useTheme } from '@my-apps/contexts';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MainNavigator from './src/navigation/MainNavigator';

// Main app component
const MainApp = () => {
  const { isDarkMode } = useTheme();

  const handleLogout = () => {
    console.log('Logout pressed - TODO: implement auth');
  };

  return (
    <>
      <MainNavigator onLogout={handleLogout} />
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </>
  );
};

// Root app component with providers
export default function App() {
  return (
    <CustomThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <MainApp />
      </GestureHandlerRootView>
    </CustomThemeProvider>
  );
}