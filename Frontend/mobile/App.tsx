import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

import ThemeProvider from "./app/theme/ThemeProvider";
import ThemedView from "./app/components/ThemedView";
import BottomBar from "./app/components/BottomBar";
import ParkingListScreen from "./app/screens/Parking/ParkingListScreen";
import ParkingMapScreen from "./app/screens/Parking/ParkingMapScreen";
import SettingsScreen from "./app/screens/Settings/SettingsScreen";
import LoginScreen from "./app/screens/Auth/LogInScreen";
import SignupScreen from "./app/screens/Auth/SignUpScreen";

type TabKey = "list" | "map" | "settings";
type AuthModeKey = "signup" | "login" | null;

export default function App() {
  // expoPushToken identifies the device that a push notification would go to
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  // Default to login screen
  const [authMode, setAuthMode] = React.useState<AuthModeKey>("login");
  const [tab, setTab] = React.useState<TabKey>("list");

  useEffect(() => {
    const setupPushNotifications = async () => {
      // Look for hasLaunched key
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");

      // Only run this block on the first ever launch of the app on the device
      if (hasLaunched != "true") {
        await AsyncStorage.setItem("hasLaunched", "true");

        // Sending notfications to simulators doesn't work
        if (!Device.isDevice) {
          return;
        }

        // Check if we already have permission for push notifications
        // on iOS, push notifications permissions are controlled by the OS, so apps can remember past preferences when app is reinstalled
        const { status: currentStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = currentStatus;
        // If we don't already have permission, ask the user for permission
        if (currentStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.log("Push notification permissions denied");
          return;
        }

        // Get Expo push token
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log("Expo push token:", token);
        // save this push token in expoPushToken (local variable)
        setExpoPushToken(token);

        // Send token to Django backend as token object JSON string
        await fetch("http://127.0.0.1:8000/notification_token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token }),
        });
      }
    };

    setupPushNotifications();
  }, []);

  // function to render the correct screen based on authMode and tab
  function renderScreen() {
    // If user is not logged in, render the login screen
    switch(authMode) {
      case "login": 
        return (
          < LoginScreen 
            onLogin={ () => setAuthMode(null) }
            onRequestSignup={() => setAuthMode("signup")}
          />
        );
      case "signup":
        return (
          <SignupScreen
              onSignup= {
                async () => {
                    setAuthMode("login");
                } 
              }
          />
        );
      case null: // If the user is already logged in, just render the page with tabs
        return (
          <>
            <ThemedView style={{ flex: 1 }}>{renderTab()}</ThemedView>
            <BottomBar active={tab} onChange={setTab} />
          </>
        );
      
    }
  }

  // Function to render the correct tab screen
  function renderTab() {
    switch (tab) {
      case "list": return <ParkingListScreen />;
      case "map": return <ParkingMapScreen />;
      case "settings": return <SettingsScreen />;
    }
  }

  return (
    <ThemeProvider>
      <ThemedView style={{ flex: 1 }}>
        {renderScreen()}
      </ThemedView>
    </ThemeProvider>
  );
}
