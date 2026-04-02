import * as React from "react";
import { View, ActivityIndicator, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {LocationProvider} from './app/utils/LocationContext';
import { StatusBar } from "expo-status-bar";
import {setupNotificationHandler, runAllNotificationChecks,} from "./notificationTest";
import { configureNotifications } from "./app/utils/notifications";

import ThemeProvider, { ThemeContext } from "./theme/ThemeProvider";
import ThemedView from "./components/ThemedView";
import BottomBar from "./components/BottomBar";
import AuthScreen from "./screens/Auth/AuthScreen";
import ParkingWS from "./components/ParkingWS";
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { EmailProvider } from './utils/EmailContext'

import { TAB_CONFIG, TAB_KEYS, TabKey, getTabByKey } from "./components/navigation/tabConfig";

const LAST_TAB_STORAGE_KEY = "last-used-tab";

setupNotificationHandler();

export default function App() {
  const [tab, setTab] = React.useState<TabKey>(TAB_CONFIG[0].key);
  const [expoPushToken, setExpoPushToken] = React.useState<string | null>(null);
  const [booting, setBooting] = React.useState(true);
  const [isAuthed, setIsAuthed] = React.useState(false);
  
  //notification trigger checks
  React.useEffect(() => {
    if (isAuthed) {
      setTimeout(() => {
      runAllNotificationChecks();},
      3000);
    } 
  }, [isAuthed]);

React.useEffect(() => {
  (async () => {
    await configureNotifications();
    try {
      // Android notification channel (do this early)
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const storedTab = await AsyncStorage.getItem(LAST_TAB_STORAGE_KEY);
      if (storedTab && TAB_KEYS.includes(storedTab as TabKey)) {
        setTab(storedTab as TabKey);
      }

      // First-launch gating for permission prompt
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");
      const shouldPrompt = hasLaunched !== "true";

      if (shouldPrompt) {
        await AsyncStorage.setItem("hasLaunched", "true");
        if (Device.isDevice) {
          const { status: cur } = await Notifications.getPermissionsAsync();
          let finalStatus = cur;

          if (cur !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }

          if (finalStatus === "granted") {
            const token = (await Notifications.getExpoPushTokenAsync()).data;
            setExpoPushToken(token);
          }
        }
      } else {
        // Not first launch: if permission is already granted, make sure token is set.
        if (Device.isDevice) {
          const { status } = await Notifications.getPermissionsAsync();
          if (status === "granted") {
            const token = (await Notifications.getExpoPushTokenAsync()).data;
            setExpoPushToken(token);
          }
        }
      }
    } finally {
      setBooting(false);
    }
  })();
}, []);

  React.useEffect(() => {
    AsyncStorage.setItem(LAST_TAB_STORAGE_KEY, tab).catch(() => {});
  }, [tab]);

  React.useEffect(() => {
    const handleIncomingLink = (incomingUrl?: string | null) => {
      if (!incomingUrl) return;
      const parsed = Linking.parse(incomingUrl);
      const [firstSegment, secondSegment] = (parsed.path ?? "").split("/");
      if (firstSegment === "tab" && secondSegment && TAB_KEYS.includes(secondSegment as TabKey)) {
        setTab(secondSegment as TabKey);
      }
    };

    Linking.getInitialURL().then(handleIncomingLink);
    const subscription = Linking.addEventListener("url", ({ url }) => handleIncomingLink(url));
    return () => subscription.remove();
  }, []);

  function Tabs() {
    const theme = React.useContext(ThemeContext);
    const activeTab = getTabByKey(tab);
    const tabContent = activeTab?.renderContent({
      onLogout: () => setIsAuthed(false),
    });

    return (
      <ActionSheetProvider>
      <ThemedView style={{ flex: 1 }}>
        <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          {tabContent}
        </SafeAreaView>
        <BottomBar tabs={TAB_CONFIG} active={tab} onChange={setTab} />
      </ThemedView>
      </ActionSheetProvider>
    );
  }

  return (
    <EmailProvider>
    <ThemeProvider>
      <LocationProvider>
      <SafeAreaProvider>
        {booting ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        ) : isAuthed ? (
          <>
            <Tabs />
            <ParkingWS />
          </>
        ) : (
          <AuthScreen pushToken={expoPushToken} onAuthed={() => setIsAuthed(true)} />
        )}
      </SafeAreaProvider>
      </LocationProvider>
    </ThemeProvider>
    </EmailProvider>
  );
}
