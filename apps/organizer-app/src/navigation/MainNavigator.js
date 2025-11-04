// src/navigation/MainNavigator.js
import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '@my-apps/contexts';
import { AppHeader } from '@my-apps/ui';

// Main screens
import DashboardScreen from '../screens/DashboardScreen';
import CalendarScreen from '../screens/CalendarScreen';
import GroupsScreen from '../screens/GroupsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import PreferencesScreen from '../screens/PreferencesScreen';

const Tab = createBottomTabNavigator();
const DashboardStack = createStackNavigator();
const CalendarStack = createStackNavigator();
const GroupsStack = createStackNavigator();
const MessagesStack = createStackNavigator();
const PreferencesStack = createStackNavigator();

// Stack navigators for each tab
function DashboardStackScreen() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardHome" component={DashboardScreen} />
    </DashboardStack.Navigator>
  );
}

function CalendarStackScreen() {
  return (
    <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
      <CalendarStack.Screen name="CalendarHome" component={CalendarScreen} />
    </CalendarStack.Navigator>
  );
}

function GroupsStackScreen() {
  return (
    <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupsStack.Screen name="GroupsHome" component={GroupsScreen} />
    </GroupsStack.Navigator>
  );
}

function MessagesStackScreen() {
  return (
    <MessagesStack.Navigator screenOptions={{ headerShown: false }}>
      <MessagesStack.Screen name="MessagesHome" component={MessagesScreen} />
    </MessagesStack.Navigator>
  );
}

function PreferencesStackScreen() {
  return (
    <PreferencesStack.Navigator screenOptions={{ headerShown: false }}>
      <PreferencesStack.Screen name="PreferencesHome" component={PreferencesScreen} />
    </PreferencesStack.Navigator>
  );
}

// Header wrapper with navigation context
function HeaderWithNavigation({ onLogout }) {
  const navigation = useNavigation();

  // Build menu items for MyOrganizer
  const menuItems = [
    {
      icon: '💪',
      label: 'Open Workouts',
      onPress: () => console.log('TODO: Deep link to workout app')
    },
    {
      icon: '✅',
      label: 'Open Tasks',
      onPress: () => console.log('TODO: Deep link to tasks app')
    },
    {
      icon: '🛒',
      label: 'Open Groceries',
      onPress: () => console.log('TODO: Deep link to grocery app')
    },
    {
      icon: '🚪',
      label: 'Logout',
      onPress: onLogout,
      variant: 'danger'
    }
  ];

  return (
    <AppHeader
      appName="MyOrganizer"
      menuItems={menuItems}
    />
  );
}

function TabNavigator({ theme, onLogout }) {
  const getTabBarIcon = (routeName, focused) => {
    let icon;
    
    switch (routeName) {
      case 'Dashboard':
        icon = focused ? '🏠' : '🏘️';
        break;
      case 'Calendar':
        icon = focused ? '🗓️' : '📆';
        break;
      case 'Groups':
        icon = focused ? '👥' : '👤';
        break;
      case 'Messages':
        icon = focused ? '💬' : '🗨️';
        break;
      case 'Preferences':
        icon = focused ? '⚙️' : '🔧';
        break;
      default:
        icon = '❓';
    }
    
    return <Text style={{ fontSize: 20 }}>{icon}</Text>;
  };

  return (
    <>
      <HeaderWithNavigation onLogout={onLogout} />
      
      <Tab.Navigator
        initialRouteName="Dashboard"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => getTabBarIcon(route.name, focused),
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.text?.secondary || '#999',
          tabBarStyle: {
            backgroundColor: theme.card || theme.surface || '#fff',
            borderTopColor: theme.border || '#e0e0e0',
            borderTopWidth: 1,
            paddingBottom: 8,
            paddingTop: 8,
            height: 80,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 4,
          },
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardStackScreen}
          options={{ tabBarLabel: 'Home' }}
        />
        <Tab.Screen 
          name="Calendar" 
          component={CalendarStackScreen}
          options={{ tabBarLabel: 'Calendar' }}
        />
        <Tab.Screen 
          name="Groups" 
          component={GroupsStackScreen}
          options={{ tabBarLabel: 'Groups' }}
        />
        <Tab.Screen 
          name="Messages" 
          component={MessagesStackScreen}
          options={{ tabBarLabel: 'Messages' }}
        />
        <Tab.Screen
          name="Preferences"
          component={PreferencesStackScreen}
          options={{ tabBarLabel: 'Settings' }}
        />
      </Tab.Navigator>
    </>
  );
}

const MainNavigator = ({ onLogout }) => {
  const { theme } = useTheme();

  const linking = {
    prefixes: ['myorganizer://'],
    config: {
      screens: {
        Dashboard: {
          screens: {
            DashboardHome: 'home',
          },
        },
        Calendar: {
          screens: {
            CalendarHome: 'calendar',
          },
        },
        Groups: {
          screens: {
            GroupsHome: 'groups',
          },
        },
        Messages: {
          screens: {
            MessagesHome: 'messages',
          },
        },
        Preferences: {
          screens: {
            PreferencesHome: 'preferences',
          },
        },
        NotFound: '*',
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <TabNavigator theme={theme} onLogout={onLogout} />
    </NavigationContainer>
  );
};

export default MainNavigator;