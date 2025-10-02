import React from "react";
import ThemeProvider from "./app/theme/ThemeProvider";
import ThemedView from "./app/components/ThemedView";
import BottomBar from "./app/components/BottomBar";
import ParkingListScreen from "./app/screens/Parking/ParkingListScreen";
import ParkingMapScreen from "./app/screens/Parking/ParkingMapScreen";
import SettingsScreen from "./app/screens/Settings/SettingsScreen";

type TabKey = "list" | "map" | "settings";

export default function App() {
  const [tab, setTab] = React.useState<TabKey>("list");

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
        <ThemedView style={{ flex: 1 }}>{renderTab()}</ThemedView>
        <BottomBar active={tab} onChange={setTab} />
      </ThemedView>
    </ThemeProvider>
  );
}
