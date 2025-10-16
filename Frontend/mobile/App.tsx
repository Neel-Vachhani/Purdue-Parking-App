// app/_layout.tsx
import React from "react";
import { Stack, router, usePathname } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const [checking, setChecking] = React.useState(true);
  const pathname = usePathname();

  React.useEffect(() => {
    (async () => {
      // Consider a real backend session; for now accept either Google or Apple presence
      const google = await SecureStore.getItemAsync("googleTokens");
      const apple  = await SecureStore.getItemAsync("appleIdentity");
      const isAuthed = !!google || !!apple;

      // If not authenticated, keep the user on login
      if (!isAuthed && !pathname.startsWith("/(auth)")) {
        router.replace("/(auth)/login");
      }
      // If authenticated and still on login, go home
      if (isAuthed && pathname.startsWith("/(auth)")) {
        router.replace("/");
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
    <Stack screenOptions={{ headerShown: false }}>
      {/* Public auth group */}
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      {/* Private app screens */}
      <Stack.Screen name="index" options={{ headerShown: true, title: "Home" }} />
    </Stack>
  );
}
