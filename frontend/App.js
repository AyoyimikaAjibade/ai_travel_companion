// App.js
import React, { useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFonts } from "expo-font";
import {
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
} from "@expo-google-fonts/urbanist";
// ⚠️ Alias expo splash utils to avoid name collision
import * as ExpoSplash from "expo-splash-screen";

// Screens
import OnboardingScreen from "./src/screens/OnboardingScreen";
import ChatScreen from "./src/screens/ChatScreen";
import PackagesScreen from "./src/screens/PackagesScreen";
import PackageDetailsScreen from "./src/screens/PackageDetailsScreen";
import MyTripsScreen from "./src/screens/MyTripsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
// 👉 Your custom splash screen component
import AppSplashScreen from "./src/screens/SplashScreen";

// Icons
import { MessageCircle, Package, Luggage, Settings } from "lucide-react-native";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Keep the native splash until fonts are ready
ExpoSplash.preventAutoHideAsync().catch(() => {});

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let IconComponent = MessageCircle;
          if (route.name === "Packages") IconComponent = Package;
          if (route.name === "MyTrips") IconComponent = Luggage;
          if (route.name === "Settings") IconComponent = Settings;
          return <IconComponent size={size} color={color} />;
        },
        tabBarActiveTintColor: "#7C3AED",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          backgroundColor: "rgba(11, 16, 32, 0.9)",
          borderTopWidth: 1,
          borderTopColor: "rgba(255, 255, 255, 0.1)",
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: { fontFamily: "Urbanist_500Medium", fontSize: 12 },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Packages" component={PackagesScreen} />
      <Tab.Screen name="MyTrips" component={MyTripsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
  });

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      try {
        await ExpoSplash.hideAsync();
      } catch {}
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash" // 👉 Start at Splash
          screenOptions={{ headerShown: false }}
        >
          {/* Splash -> waits 3s then navigation.replace('Onboarding') */}
          <Stack.Screen name="Splash" component={AppSplashScreen} />

          {/* Onboarding (passes setter so it can finish and go to Main) */}
          <Stack.Screen name="Onboarding">
            {(props) => (
              <OnboardingScreen
                {...props}
                setHasCompletedOnboarding={setHasCompletedOnboarding}
              />
            )}
          </Stack.Screen>

          {/* Main app (tabs) */}
          <Stack.Screen name="Main" component={TabNavigator} />

          {/* Details with header shown */}
          <Stack.Screen
            name="PackageDetails"
            component={PackageDetailsScreen}
            options={{
              headerShown: true,
              title: "Package Details",
              headerTintColor: "#F8FAFC",
              headerTitleStyle: { fontFamily: "Urbanist_600SemiBold" },
              headerStyle: { backgroundColor: "#0B1020" },
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1020" },
});
