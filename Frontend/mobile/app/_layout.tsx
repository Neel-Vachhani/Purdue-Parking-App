// app/_layout.tsx
import React from "react";
import { Slot, router, usePathname } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import ThemedView from "../components/ThemedView";
import ThemeProvider from "../theme/ThemeProvider";


WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const [checking, setChecking] = React.useState(true);
  const pathname = usePathname();

  React.useEffect(() => {
    (async () => {
      const google = await SecureStore.getItemAsync("googleTokens");
      const apple  = await SecureStore.getItemAsync("appleIdentity");
      const isAuthed = !!google || !!apple;

      if (!isAuthed && !pathname.startsWith("/(auth)")) {
        router.replace("/(auth)/login");
      } else if (isAuthed && pathname.startsWith("/(auth)")) {
        router.replace("/(tabs)/list");
      }
      setChecking(false);
    })();
  }, [pathname]);

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
