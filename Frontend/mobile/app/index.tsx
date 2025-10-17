// app/index.tsx
import React from "react";
import ThemedView from "../components/ThemedView";
import BottomBar from "../components/BottomBar";
import { SafeAreaView } from "react-native-safe-area-context";
import ParkingMapScreen from "../screens/Parking/ParkingMapScreen";
import SettingsScreen from "../screens/Settings/SettingsScreen";
import GarageList from "../components/Garagelist";

type TabKey = "garages" | "map" | "settings";

export default function TabsHome() {
  const [tab, setTab] = React.useState<TabKey>("garages");
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {tab === "garages" && <GarageList />}
        {tab === "map" && <ParkingMapScreen />}
        {tab === "settings" && <SettingsScreen />}
      </SafeAreaView>
      <BottomBar active={tab} onChange={setTab} />
    </ThemedView>
  );
}
