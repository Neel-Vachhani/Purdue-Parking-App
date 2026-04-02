// app/_layout.tsx
import React from "react";
import { Slot, router, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import ThemedView from "../components/ThemedView";
import ThemeProvider from "../theme/ThemeProvider";


WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const [checking, setChecking] = React.useState(true);
  const segments = useSegments();

  React.useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("sessionToken");
      const isAuthed = !!token;
      const inAuthGroup = segments[0] === "(auth)";

      if (!isAuthed && !inAuthGroup) {
        router.replace("/(auth)/login");
        // keep spinner until redirect completes; effect re-runs on segment change
      } else if (isAuthed && inAuthGroup) {
        router.replace("/(tabs)/list");
        // keep spinner until redirect completes; effect re-runs on segment change
      } else {
        setChecking(false);
      }
    })();
  }, [segments]);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <ThemeProvider>
      <ThemedView style={{ flex: 1 }}>
        <Slot />
      </ThemedView>
    </ThemeProvider>
  );
}
