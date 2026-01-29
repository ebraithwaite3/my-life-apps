import React from "react";
import { Text, View, Linking } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";

import { useTheme, useAuth, NotificationProvider } from "@my-apps/contexts";
import { AppHeader, LoadingScreen } from "@my-apps/ui";

// Screens
import StudyingHomeScreen from "../screens/StudyingHomeScreen";
import ModuleDetailsScreen from "../screens/ModuleDetailsScreen";
import PreferencesScreen from "../screens/PreferencesScreen";
import LoginScreen from "../screens/LoginScreen";

// Navigators
const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();
const Stack = createStackNavigator();

/* -------------------- STACKS -------------------- */

const LearningStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {/* Home (catalog) */}
    <Stack.Screen name="LearningMain" component={StudyingHomeScreen} />

    {/* Module details (selected module) */}
    <Stack.Screen name="ModuleDetails" component={ModuleDetailsScreen} />
  </Stack.Navigator>
);

const PreferencesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="PreferencesMain" component={PreferencesScreen} />
  </Stack.Navigator>
);

/* -------------------- HEADER -------------------- */

function HeaderWithNavigation({ onLogout }) {
  const navigation = useNavigation();

  const menuItems = [
    {
      icon: "🚪",
      label: "Logout",
      onPress: onLogout,
      variant: "danger",
    },
  ];

  return <AppHeader appName="MyStudying" menuItems={menuItems} />;
}

/* -------------------- TAB ICONS -------------------- */

const getTabBarIcon = (routeName) => {
  const icons = {
    Learning: "📚",
    Preferences: "⚙️",
  };

  return <Text style={{ fontSize: 20 }}>{icons[routeName]}</Text>;
};

/* -------------------- TABS -------------------- */

function TabNavigator({ onLogout }) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <HeaderWithNavigation onLogout={onLogout} />

      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: () => getTabBarIcon(route.name),
          tabBarActiveTintColor: theme.text?.primary || "#333",
          tabBarInactiveTintColor: theme.text?.secondary || "#999",
          tabBarStyle: {
            backgroundColor: theme.card || "#fff",
            borderTopWidth: 1,
            height: 80,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            marginTop: 4,
          },
        })}
      >
        <Tab.Screen
          name="Learning"
          component={LearningStack}
          options={{ tabBarLabel: "Learn" }}
        />
        <Tab.Screen
          name="Preferences"
          component={PreferencesStack}
          options={{ tabBarLabel: "Settings" }}
        />
      </Tab.Navigator>
    </View>
  );
}

/* -------------------- ROOT -------------------- */

function RootNavigator({ onLogout }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <LoadingScreen
        icon={require("../../assets/MyStudyingIcon.png")}
        message="Loading your study data..."
        iconSize={128}
      />
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <RootStack.Screen name="Main">
          {() => <TabNavigator onLogout={onLogout} />}
        </RootStack.Screen>
      ) : (
        <RootStack.Screen name="Login" component={LoginScreen} />
      )}
    </RootStack.Navigator>
  );
}

/* -------------------- MAIN -------------------- */

const MainNavigator = ({ onLogout }) => {
  const linking = {
    prefixes: ["mystudying://"],
    config: {
      screens: {
        Main: {
          screens: {
            Learning: {
              path: "learn",
              screens: {
                LearningMain: "",

                // ✅ deep link to module details:
                // mystudying://learn/module/understanding-the-curriculum
                ModuleDetails: "module/:moduleId",
              },
            },
            Preferences: "settings",
          },
        },
        Login: "login",
      },
    },

    subscribe(listener) {
      const onReceiveURL = ({ url }) => {
        console.log("🔗 Deep link received:", url);
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
