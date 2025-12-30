// src/navigation/MainNavigator.js
import React from "react";
import { Text, View, ActivityIndicator, Linking } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { useTheme } from "@my-apps/contexts";
import { useAuth } from "@my-apps/contexts";
import { useData } from "@my-apps/contexts";
import { AppHeader } from "@my-apps/ui";
import { LoadingScreen } from "@my-apps/ui";
import { DateTime } from "luxon";

// Keep NotificationProvider for deep linking
import { NotificationProvider } from "@my-apps/contexts";

// Main screens
import DashboardScreen from "../screens/DashboardScreen";
import CalendarScreen from "../screens/CalendarScreen";
import GroupsScreen from "../screens/GroupsScreen";
import MessagesScreen from "../screens/MessagesScreen";
import PreferencesScreen from "../screens/PreferencesScreen";
import LoginScreen from "../screens/LoginScreen";
import TodayScreen from "../screens/TodayScreen";

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();
const DashboardStack = createStackNavigator();
const CalendarStack = createStackNavigator();
const GroupsStack = createStackNavigator();
const MessagesStack = createStackNavigator();
const PreferencesStack = createStackNavigator();
const TodayStack = createStackNavigator();

// Stack navigators for each tab
function TodayStackScreen() {
  return (
    <TodayStack.Navigator screenOptions={{ headerShown: false }}>
      <TodayStack.Screen name="TodayHome" component={TodayScreen} />
    </TodayStack.Navigator>
  );
}

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
      <CalendarStack.Screen name="CalendarHome">
        {(props) => <CalendarScreen {...props} />}
      </CalendarStack.Screen>
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
      <PreferencesStack.Screen
        name="PreferencesHome"
        component={PreferencesScreen}
      />
    </PreferencesStack.Navigator>
  );
}

// Header wrapper with navigation context
function HeaderWithNavigation({ onLogout }) {
  const navigation = useNavigation();

  // Build menu items for MyOrganizer
  const menuItems = [
    {
      icon: "✅",
      label: "Open Checklists",
      onPress: () => Linking.openURL("mychecklist://"),
    },
    {
      icon: "💪",
      label: "Open Workouts",
      onPress: () => console.log("TODO: Deep link to workout app"),
    },
    {
      icon: "⛳",
      label: "Open Golf",
      onPress: () => console.log("TODO: Deep link to golf app"),
    },
    {
      icon: "🚪",
      label: "Logout",
      onPress: onLogout,
      variant: "danger",
    },
  ];

  return <AppHeader appName="MyOrganizer" menuItems={menuItems} />;
}

const getTabBarIcon = (routeName, unreadCount = 0) => {
  let icon;

  switch (routeName) {
    case "Today":
      icon = "📅";
      break;
    case "Dashboard":
      icon = "🏠";
      break;
    case "Calendar":
      icon = "📆";
      break;
    case "Groups":
      icon = "👥";
      break;
    case "Messages":
      icon = "💬";
      break;
    case "Preferences":
      icon = "⚙️";
      break;
    default:
      icon = "❓";
  }

  // Show badge for Messages tab if there are unread messages
  if (routeName === "Messages" && unreadCount > 0) {
    return (
      <View style={{ position: 'relative' }}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -8,
            backgroundColor: '#F44336',
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      </View>
    );
  }

  return <Text style={{ fontSize: 20 }}>{icon}</Text>;
};

function TabNavigator({ theme, onLogout }) {
  const { unreadMessagesCount } = useData();

  return (
    <>
      <HeaderWithNavigation onLogout={onLogout} />

      <Tab.Navigator
        initialRouteName="Today"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: () => getTabBarIcon(route.name, unreadMessagesCount),
          tabBarActiveTintColor: theme.text?.secondary || "#333",
          tabBarInactiveTintColor: theme.text?.secondary || "#999",
          tabBarActiveBackgroundColor: theme.primarySoft || "#e3f2ff",
          tabBarItemStyle: {
            borderRadius: 12,
            marginHorizontal: 2,
            marginTop: -8
          },
          tabBarStyle: {
            backgroundColor: theme.card || theme.surface || "#fff",
            borderTopColor: theme.border || "#e0e0e0",
            borderTopWidth: 1,
            paddingBottom: 8,
            paddingTop: 8,
            height: 80,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
            marginTop: 4,
          },
        })}
      >
        <Tab.Screen
          name="Today"
          component={TodayStackScreen}
          options={{ tabBarLabel: "Today" }}
        />
        <Tab.Screen
          name="Dashboard"
          component={DashboardStackScreen}
          options={{ tabBarLabel: "Home" }}
        />
        <Tab.Screen
          name="Calendar"
          component={CalendarStackScreen}
          options={{ tabBarLabel: "Calendar" }}
        />
        <Tab.Screen
          name="Groups"
          component={GroupsStackScreen}
          options={{ tabBarLabel: "Groups" }}
        />
        <Tab.Screen
          name="Messages"
          component={MessagesStackScreen}
          options={{ tabBarLabel: "Messages" }}
        />
        <Tab.Screen
          name="Preferences"
          component={PreferencesStackScreen}
          options={{ tabBarLabel: "Settings" }}
        />
      </Tab.Navigator>
    </>
  );
}

// Root navigator that handles auth state
function RootNavigator({ onLogout }) {
  const { user, authLoading } = useAuth();
  const { userLoading } = useData();
  const { theme } = useTheme();

  if (authLoading || userLoading) {
    return (
      <LoadingScreen
        icon={require("../../assets/CalendarConnectionv2AppIcon.png")}
        message="Loading your organizer..."
        iconSize={128}
      />
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <RootStack.Screen name="Main">
          {() => <TabNavigator theme={theme} onLogout={onLogout} />}
        </RootStack.Screen>
      ) : (
        <RootStack.Screen name="Login" component={LoginScreen} />
      )}
    </RootStack.Navigator>
  );
}

const MainNavigator = ({ onLogout }) => {
  const { setSelectedDate, setSelectedMonth, setSelectedYear } = useData();

  const linking = {
    prefixes: ["myorganizer://"],
    config: {
      screens: {
        Main: {
          screens: {
            Today: {
              screens: {
                TodayHome: "today",
              },
            },
            Dashboard: {
              screens: {
                DashboardHome: "home",
              },
            },
            Calendar: {
              screens: {
                CalendarHome: "calendar",
              },
            },
            Groups: {
              screens: {
                GroupsHome: "groups",
              },
            },
            Messages: {
              screens: {
                MessagesHome: "messages",
              },
            },
            Preferences: {
              screens: {
                PreferencesHome: "preferences",
              },
            },
          },
        },
        Login: "login",
        NotFound: "*",
      },
    },

    subscribe(listener) {
      const onReceiveURL = ({ url }) => {
        console.log("🔗 Deep link received:", url);

        const { queryParams } = Linking.parse(url);

        if (queryParams?.date) {
          console.log("📅 Setting date from deep link:", queryParams.date);
          const dt = DateTime.fromISO(queryParams.date);

          setSelectedDate(queryParams.date);
          setSelectedMonth(dt.monthLong);
          setSelectedYear(dt.year);
        }

        listener(url);
      };

      const subscription = Linking.addEventListener("url", onReceiveURL);

      return () => subscription?.remove();
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <NotificationProvider>
        <RootNavigator onLogout={onLogout} />
      </NotificationProvider>
    </NavigationContainer>
  );
};

export default MainNavigator;