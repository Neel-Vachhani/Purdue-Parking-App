import React from "react";
import ThemeProvider from "./app/theme/ThemeProvider";
import ThemedView from "./app/components/ThemedView";
import BottomBar from "./app/components/BottomBar";
import ParkingListScreen from "./app/screens/Parking/ParkingListScreen";
import ParkingMapScreen from "./app/screens/Parking/ParkingMapScreen";
import SettingsScreen from "./app/screens/Settings/SettingsScreen";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeContext } from "./app/theme/ThemeProvider";

type TabKey = "list" | "map" | "settings";

export default function App() {
  const [tab, setTab] = React.useState<TabKey>("list");
  const theme = React.useContext(ThemeContext);

  function renderTab() {
    switch (tab) {
      case "list": return <ParkingListScreen />;
      case "map": return <ParkingMapScreen />;
      case "settings": return <SettingsScreen />;
    }
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
        <ThemedView style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
            <ThemedView style={{ flex: 1 }}>{renderTab()}</ThemedView>
          </SafeAreaView>
          <BottomBar active={tab} onChange={setTab} />
        </ThemedView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
