import { View, Text, Button } from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

export default function Home() {
  const signOut = async () => {
    await SecureStore.deleteItemAsync("googleTokens");
    await SecureStore.deleteItemAsync("appleIdentity");
    router.replace("/(auth)/login");
  };


  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Text>Home</Text>
      <Button title="Sign out" onPress={signOut} />
      <Button title="List View" onPress={() => router.replace("/list")} />
    </View>
  );
}
