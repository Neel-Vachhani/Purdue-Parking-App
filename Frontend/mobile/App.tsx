import React from "react";
import ThemeProvider from "./app/theme/ThemeProvider";
import ThemedView from "./app/components/ThemedView";
import BottomBar from "./app/components/BottomBar";
import ParkingListScreen from "./app/screens/Parking/ParkingListScreen";
import ParkingMapScreen from "./app/screens/Parking/ParkingMapScreen";
import SettingsScreen from "./app/screens/Settings/SettingsScreen";
import LoginScreen from "./app/screens/Auth/LogInScreen";

type TabKey = "list" | "map" | "settings";

export default function App() {
  // When the app is first rendered, the user will not be logged in
  // But setIsLoggedIn can be called to change whether the user is logged in
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  function renderScreen() {
    // If user is not logged in, render the login screen
    // Once the user is logged in, set isLoggedIn to true
    if (!isLoggedIn) {
      return <LoginScreen onLogin={() => setIsLoggedIn(true)}/>;
    }

    // If the user is already logged in, just render the page with tabs
    return (
      <>
        <ThemedView style={{ flex: 1 }}>{renderTab()}</ThemedView>
        <BottomBar active={tab} onChange={setTab} />
      </>
    );
  }

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
        {renderScreen()}
      </ThemedView>
    </ThemeProvider>
  );
}
