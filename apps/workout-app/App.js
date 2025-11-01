import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { CustomThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { DataProvider } from './src/contexts/DataContext';
import LoginScreen from './src/screens/LoginScreen';
import MainNavigator from './src/navigation/MainNavigator';
import Toast from 'react-native-toast-message';

// 1. Import GestureHandlerRootView
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Main app component that uses all contexts
const MainApp = () => {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (user) {
    return (
      <>
        <MainNavigator onLogout={handleLogout} />
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      </>
    );
  }

  return (
    <>
      <LoginScreen />
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </>
  );
};

// Root app component with all providers
export default function App() {
  return (
    <CustomThemeProvider>
      <AuthProvider>
        <DataProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <MainApp />
            <Toast />
          </GestureHandlerRootView>
        </DataProvider>
      </AuthProvider>
    </CustomThemeProvider>
  );
}