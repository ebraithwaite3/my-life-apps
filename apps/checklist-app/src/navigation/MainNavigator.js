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
// import CalendarScreen from "../screens/CalendarScreen";
import ChecklistCalendarScreen from "../screens/ChecklistCalendarScreen";
import PinnedScreen from "../screens/PinnedScreen";
import TemplatesScreen from "../screens/TemplatesScreen";
import MessagesScreen from "../screens/MessagesScreen";
import PreferencesScreen from "../screens/PreferencesScreen";
import LoginScreen from "../screens/LoginScreen";

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();
const CalendarStack = createStackNavigator();
const PinnedStack = createStackNavigator();
const TemplatesStack = createStackNavigator();
const MessagesStack = createStackNavigator();
const PreferencesStack = createStackNavigator();

// Stack navigators for each tab
function CalendarStackScreen() {
  return (
    <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
      <CalendarStack.Screen name="CalendarHome" component={ChecklistCalendarScreen} />
    </CalendarStack.Navigator>
  );
}

function PinnedStackScreen() {
  return (
    <PinnedStack.Navigator screenOptions={{ headerShown: false }}>
      <PinnedStack.Screen name="PinnedHome" component={PinnedScreen} />
    </PinnedStack.Navigator>
  );
}

function TemplatesStackScreen() {
  return (
    <TemplatesStack.Navigator screenOptions={{ headerShown: false }}>
      <TemplatesStack.Screen name="TemplatesHome" component={TemplatesScreen} />
    </TemplatesStack.Navigator>
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
  const { allCalendars } = useData();
  console.log("ALL CALENDARS IN HEADER:", allCalendars);
  const navigation = useNavigation();

  // Build menu items for MyChecklists
  const menuItems = [
    // {
    //   icon: "📆",
    //   label: "Open Organizer",
    //   onPress: () => Linking.openURL("myorganizer://"),
    // },
    // {
    //   icon: "💪",
    //   label: "Open Workouts",
    //   onPress: () => console.log("TODO: Deep link to workout app"),
    // },
    // {
    //   icon: "⛳",
    //   label: "Open Golf",
    //   onPress: () => console.log("TODO: Deep link to golf app"),
    // },
    {
      icon: "🚪",
      label: "Logout",
      onPress: onLogout,
      variant: "danger",
    },
  ];

  return <AppHeader appName="MyChecklists" menuItems={menuItems} userCalendars={allCalendars || []} />;
}

const getTabBarIcon = (routeName, unreadCount = 0) => {
  let icon;

  switch (routeName) {
    case "Calendar":
      icon = "📆";
      break;
    case "Pinned":
      icon = "📌";
      break;
    case "Templates":
      icon = "📋";
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
        initialRouteName="Calendar"
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
          name="Calendar"
          component={CalendarStackScreen}
          options={{ tabBarLabel: "Calendar" }}
        />
        <Tab.Screen
          name="Pinned"
          component={PinnedStackScreen}
          options={{ tabBarLabel: "Pinned" }}
        />
        <Tab.Screen
          name="Templates"
          component={TemplatesStackScreen}
          options={{ tabBarLabel: "Templates" }}
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
        icon={require("../../assets/MyChecklistIcon.png")}
        message="Loading your checklists..."
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
    prefixes: ["mychecklist://"],
    config: {
      screens: {
        Main: {
          screens: {
            Calendar: {
              screens: {
                CalendarHome: "calendar",
              },
            },
            Pinned: {
              screens: {
                PinnedHome: "pinned",
              },
            },
            Templates: {
              screens: {
                TemplatesHome: "templates",
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