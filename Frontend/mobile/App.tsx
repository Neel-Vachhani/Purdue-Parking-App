import * as React from "react";
import { View, ActivityIndicator } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import ThemeProvider, { ThemeContext } from "./theme/ThemeProvider";
import ThemedView from "./components/ThemedView";
import BottomBar from "./components/BottomBar";
import SettingsScreen from "./screens/Settings/SettingsScreen";
import GarageMap from "./screens/GarageMap/GarageMap";
import Calendar from "./screens/Calender/Calender";
import AuthScreen from "./screens/Auth/AuthScreen";
import Insights from "./screens/Insights/Insights";
import PredictiveInsights from "./screens/Predictions/PredictiveInsights"
import ParkingWS from "./components/ParkingWS";
import NavigationScreen from "./screens/Navigation/NavigationScreen";


// Tab type
type TabKey = "garages" | "settings" | "calendar" | "insights" | "predictions" | "navigation";

export default function App() {
  const [tab, setTab] = React.useState<TabKey>("garages");
  const [expoPushToken, setExpoPushToken] = React.useState<string | null>(null);
  const [booting, setBooting] = React.useState(true);
  const [isAuthed, setIsAuthed] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem("hasLaunched");
        if (hasLaunched !== "true") {
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
        }
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  function Tabs() {
    const theme = React.useContext(ThemeContext);
    return (
      <ThemedView style={{ flex: 1 }}>
        <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          {(tab === "garages") ? <GarageMap></GarageMap> : null}
          {(tab === "calendar") ? <Calendar /> : null}
          {(tab === "settings") ? <SettingsScreen onLogout={() => setIsAuthed(false)} /> : null}
          {(tab === "insights") ? <Insights /> : null}
          {(tab === "predictions") ? <PredictiveInsights /> : null}
          {(tab == "navigation") ? <NavigationScreen></NavigationScreen> : null}
        </SafeAreaView>
        <BottomBar active={tab} onChange={setTab} />
      </ThemedView>
    );
  }

  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}
