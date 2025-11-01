// src/navigation/MainNavigator.js
import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Main screens
import TodayScreen from '../screens/TodayScreen';
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
import GroceryHomeScreen from '../screens/GroceryHomeScreen'; // <-- ADDED
import GroceryInventoryScreen from '../screens/GroceryInventoryScreen';
import GroceryBankScreen from '../screens/GroceryBankScreen';
import GroceryShoppingListScreen from '../screens/GroceryShoppingListScreen';
import GroceryMealsScreen from '../screens/GroceryMealsScreen';

// Sub-screens
import EventDetailsScreen from '../screens/EventDetailsScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';

import Header from '../components/Header';

const Tab = createBottomTabNavigator();
const TodayStack = createStackNavigator();
const CalendarStack = createStackNavigator();
const GroupsStack = createStackNavigator();
const MessagesStack = createStackNavigator();
const PreferencesStack = createStackNavigator();
const GroceryStack = createStackNavigator(); // <-- ADDED

// Stack navigators for each tab
function TodayStackScreen() {
  return (
    <TodayStack.Navigator screenOptions={{ headerShown: false }}>
      <TodayStack.Screen name="TodayHome" component={TodayScreen} />
      <TodayStack.Screen name="EventDetails" component={EventDetailsScreen} />
      <TodayStack.Screen name="CreateEvent" component={CreateEventScreen} />
      <TodayStack.Screen name="AddScreen" component={AddScreen} />
      <TodayStack.Screen name="CreateTask" component={CreateTaskScreen} />
      <TodayStack.Screen name="ImportCalendar" component={ImportCalendarScreen} />
      <TodayStack.Screen name="CalendarEdit" component={CalendarEditScreen} />
    </TodayStack.Navigator>
  );
}

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

// <-- ADDED: Grocery Stack
function GroceryStackScreen() {
  return (
    <GroceryStack.Navigator screenOptions={{ headerShown: false }}>
      <GroceryStack.Screen name="GroceryHome" component={GroceryHomeScreen} />
      <GroceryStack.Screen name="GroceryInventory" component={GroceryInventoryScreen} />
      <GroceryStack.Screen name="GroceryBank" component={GroceryBankScreen} />
      <GroceryStack.Screen name="GroceryMeals" component={GroceryMealsScreen} />
      <GroceryStack.Screen name="GroceryShoppingList" component={GroceryShoppingListScreen} />
      {/* Add more grocery screens here as needed */}
    </GroceryStack.Navigator>
  );
}

function TabNavigator({ initialRoute, theme, onLogout, unreadMessagesCount, unacceptedChecklistsCount }) {
  const getTabBarIcon = (routeName, focused) => {
    let icon;
    
    switch (routeName) {
      case 'Today':
        icon = focused ? '📅' : '📋';
        break;
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
        initialRouteName={initialRoute}
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
          name="Today"
          component={TodayStackScreen}
          options={{ tabBarLabel: 'Today' }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              const state = navigation.getState();
              // Prevent default action if already at home screen of this tab
              if (state.index === 0) {
                e.preventDefault();
              }
              navigation.navigate('Today', { screen: 'TodayHome' });
            },
          })}
        />
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
        {/* <-- ADDED: Hidden Grocery Stack */}
        <Tab.Screen 
          name="Grocery" 
          component={GroceryStackScreen}
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { width: 0, height: 0, display: 'none' },
          }}
        />
      </Tab.Navigator>
    </>
  );
}

const MainNavigator = ({ onLogout }) => {
  const { theme, isDarkMode } = useTheme();
  const [initialRoute, setInitialRoute] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const { loading, user, unreadMessagesCount, unacceptedChecklistsCount, retryUserSubscription } = useData();
  const { user: authUser } = useAuth();

  console.log("Unread messages in MainNavigator:", unreadMessagesCount);

  // Get the default page from the user doc
  // in preferences.defaultLoadingPage
  useEffect(() => {
    const fetchInitialRoute = async () => {
      try {
        if (user && user.preferences && user.preferences.defaultLoadingPage) {
          setInitialRoute(user.preferences.defaultLoadingPage);
        } else {
          // Fallback to AsyncStorage if user data isn't available yet
          const storedRoute = await AsyncStorage.getItem('defaultLoadingPage');
          setInitialRoute(storedRoute || 'Today');
        }
      } catch (error) {
        console.error('Error fetching initial route:', error);
        setInitialRoute('Today'); // Fallback to Today on error
      } finally {
        setIsReady(true);
      }
    };

    fetchInitialRoute();
  }, [user]);

  if (loading || !isReady) {
    return <LoadingScreen />;
  }

  // Add diagnostic log
  console.log("Retry diagnostic:", {
    loading,
    user: !!user,
    authUser: !!authUser,
    isReady,
    showRetry: !loading && !user && authUser && isReady,
  });

  // Check to see if we need to be able to retry auth
  const showRetry = !loading && !user && authUser && isReady;
  console.log("Show retry option:", showRetry);
  console.log("Loading state:", loading, "User:", user, "AuthUser:", authUser, "isReady:", isReady);

  const linking = {
    prefixes: ['calendarconnectionv2://'],
    config: {
      screens: {
        Today: {
          screens: {
            TodayHome: 'today',
            EventDetails: 'today/event/:eventId',
            CreateEvent: 'today/create',
            Messages: 'today/messages',
            CreateTask: 'today/create-task',
          },
        },
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
        Grocery: {
          screens: {
            GroceryHome: 'grocery',
            GroceryShoppingList: 'grocery/shopping-list',
            GroceryInventory: 'grocery/inventory',
            GroceryBank: 'grocery/bank',
            GroceryMeals: 'grocery/meals',
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
        initialRoute={initialRoute} 
        theme={theme} 
        onLogout={onLogout}
        unreadMessagesCount={unreadMessagesCount}
        unacceptedChecklistsCount={unacceptedChecklistsCount}
      />
    </NavigationContainer>
  );
};

export default MainNavigator;