// src/navigation/MainNavigator.js
import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// Main screens
import CalendarScreen from '../screens/CalendarScreen';
import GroupScreen from '../screens/GroupScreen';
import LoadingScreen from '../components/LoadingScreen';
import AddScreen from '../screens/AddScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import ImportCalendarScreen from '../screens/ImportCalendarScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import JoinGroupScreen from '../screens/JoinGroupScreen';
import MessagesScreen from '../screens/MessagesScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import DayScreen from '../screens/DayScreen';
import CalendarEditScreen from '../screens/CalendarEditScreen';
import AddPublicCalendarsScreen from '../screens/AddPublicCalendarsScreen';

// Sub-screens
import EventDetailsScreen from '../screens/EventDetailsScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';

import Header from '../components/Header';

const Tab = createBottomTabNavigator();
const CalendarStack = createStackNavigator();
const GroupsStack = createStackNavigator();
const MessagesStack = createStackNavigator();
const PreferencesStack = createStackNavigator();


function CalendarStackScreen() {
  return (
    <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
      <CalendarStack.Screen name="CalendarHome" component={CalendarScreen} />
      <CalendarStack.Screen name="EventDetails" component={EventDetailsScreen} />
      <CalendarStack.Screen name="CreateEvent" component={CreateEventScreen} />
      <CalendarStack.Screen name="AddScreen" component={AddScreen} />
      <CalendarStack.Screen name="ImportCalendar" component={ImportCalendarScreen} />
      <CalendarStack.Screen name="CreateTask" component={CreateTaskScreen} />
      <CalendarStack.Screen name="DayScreen" component={DayScreen} />
      <CalendarStack.Screen name="CalendarEdit" component={CalendarEditScreen} />
      <CalendarStack.Screen name="PublicCalendars" component={AddPublicCalendarsScreen} />
    </CalendarStack.Navigator>
  );
}

function GroupsStackScreen() {
  return (
    <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupsStack.Screen name="GroupsHome" component={GroupScreen} />
      <GroupsStack.Screen name="GroupDetails" component={GroupDetailsScreen} />
      <GroupsStack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <GroupsStack.Screen name="JoinGroup" component={JoinGroupScreen} />
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


function TabNavigator({ theme, onLogout, unreadMessagesCount, unacceptedChecklistsCount }) {
  const getTabBarIcon = (routeName, focused) => {
    let icon;
    
    switch (routeName) {
      case 'Calendar':
        icon = focused ? '🗓️' : '📆';
        break;
      case 'Groups':
        icon = focused ? '👥' : '👤';
        break;
      case 'Preferences':
        icon = focused ? '⚙️' : '🔧';
        break;
        case 'Messages':
        icon = focused ? '💬' : '🗨️';
        break;
      default:
        icon = '❓';
    }
    
    return <Text style={{ fontSize: 20 }}>{icon}</Text>;
  };

  // Helper function to format badge count
  const formatBadgeCount = (count) => {
    if (count === 0) return null;
    if (count <= 99) return count.toString();
    return '99+';
  };

  return (
    <>
      <Header 
        onProfilePress={() => console.log('Profile pressed')}
        onLogout={onLogout}
      />
      <Tab.Navigator
        initialRouteName="Calendar"
        screenOptions={({ route }) => ({
          headerShown: false, // We'll use our custom header
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
          // Badge styling
          tabBarBadgeStyle: {
            backgroundColor: theme.error || '#ef4444',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: '600',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            marginLeft: -6,
            marginTop: 2,
          },
        })}
      >
        <Tab.Screen 
          name="Calendar" 
          component={CalendarStackScreen}
          options={{
            tabBarLabel: 'Calendars',
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              const state = navigation.getState();
              if (state.index === 0) {
                e.preventDefault();
              }
              navigation.navigate('Calendar', { screen: 'CalendarHome' });
            },
          })}
        />
        <Tab.Screen 
          name="Groups" 
          component={GroupsStackScreen}
          options={{
            tabBarLabel: 'Groups',
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              const state = navigation.getState();
              if (state.index === 0) {
                e.preventDefault();
              }
              navigation.navigate('Groups', { screen: 'GroupsHome' });
            },
          })}
        />
        <Tab.Screen 
          name="Messages" 
          component={MessagesStackScreen}
          options={{
            tabBarLabel: 'Messages',
            // Add badge with unread count
            tabBarBadge: formatBadgeCount(unreadMessagesCount),
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              const state = navigation.getState();
              if (state.index === 0) {
                e.preventDefault();
              }
              navigation.navigate('Messages', { screen: 'MessagesHome' });
            },
          })}
        />
        <Tab.Screen
          name="Preferences"
          component={PreferencesStackScreen}
          options={{
            tabBarLabel: 'Preferences',
            tabBarBadge: formatBadgeCount(unacceptedChecklistsCount),
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              const state = navigation.getState();
              if (state.index === 0) {
                e.preventDefault();
              }
              navigation.navigate('Preferences', { screen: 'PreferencesHome' });
            },
          })}
        />
        
      </Tab.Navigator>
    </>
  );
}

const MainNavigator = ({ onLogout }) => {
  const { theme } = useTheme();
  const { loading, user, unreadMessagesCount, unacceptedChecklistsCount, retryUserSubscription } = useData();
  const { user: authUser } = useAuth();

  console.log("Unread messages in MainNavigator:", unreadMessagesCount);

  if (loading) {
    return <LoadingScreen />;
  }

  // Check to see if we need to be able to retry auth
  const showRetry = !loading && !user && authUser;
  console.log("Show retry option:", showRetry);

  const linking = {
    prefixes: ['myworkouts://'],
    config: {
      screens: {
        Calendar: {
          screens: {
            CalendarHome: 'calendar',
            EventDetails: 'calendar/event/:eventId',
            CreateEvent: 'calendar/create',
            ImportCalendar: 'calendar/import',
            Messages: 'calendar/messages',
            CreateTask: 'calendar/create-task',
          },
        },
        Groups: {
          screens: {
            GroupsHome: 'groups',
            GroupDetails: 'groups/:groupId',
            CreateGroup: 'groups/create',
            JoinGroup: 'groups/join',
            Messages: 'groups/messages',
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
            Messages: 'preferences/messages',
          },
        },
        NotFound: '*',
      },
    },
  };

  if (showRetry) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: theme.background,
        paddingHorizontal: 20 
      }}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.text.secondary} />
        <Text style={{ 
          fontSize: 18, 
          color: theme.text.primary, 
          marginVertical: 16,
          textAlign: 'center' 
        }}>
          Unable to load your profile
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: theme.text.secondary, 
          marginBottom: 24,
          textAlign: 'center' 
        }}>
          Please check your connection and try again
        </Text>
        <TouchableOpacity 
          style={{ 
            backgroundColor: theme.primary, 
            paddingHorizontal: 24, 
            paddingVertical: 12, 
            borderRadius: 8 
          }}
          onPress={retryUserSubscription}
        >
          <Text style={{ color: theme.text.inverse, fontWeight: '600', fontSize: 16 }}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer 
      linking={linking}
    >
      <TabNavigator 
        theme={theme} 
        onLogout={onLogout}
        unreadMessagesCount={unreadMessagesCount}
        unacceptedChecklistsCount={unacceptedChecklistsCount}
      />
    </NavigationContainer>
  );
};

export default MainNavigator;