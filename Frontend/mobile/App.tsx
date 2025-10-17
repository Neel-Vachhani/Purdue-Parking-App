import React from "react";
import ThemeProvider from "./theme/ThemeProvider";
import ThemedView from "./components/ThemedView";
import BottomBar from "./components/BottomBar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeContext } from "./theme/ThemeProvider";
import ParkingListScreen from "./screens/Parking/ParkingListScreen";
import ParkingMapScreen from "./screens/Parking/ParkingMapScreen";
import SettingsScreen from "./screens/Settings/SettingsScreen";

type TabKey = "garages" | "map" | "settings";

export default function App() {
  const [tab, setTab] = React.useState<TabKey>("garages");
  const theme = React.useContext(ThemeContext);

  function renderTab() {
    switch (tab) {
      case "garages": return <ParkingListScreen />;
      case "map": return <ParkingMapScreen />;
      case "settings": return <SettingsScreen />;
    }
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
        {/* App layout: content respects top safe area; bottom bar overlays flush */}
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
