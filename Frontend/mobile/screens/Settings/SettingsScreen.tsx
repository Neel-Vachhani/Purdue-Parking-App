import React from "react";
import { View, Switch, Alert, Button } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as SecureStore from "expo-secure-store";
import { ThemeContext } from "../../theme/ThemeProvider";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";

interface Props {
  onLogout: () => void;
}

export default function SettingsScreen({ onLogout }: Props) {
  const theme = React.useContext(ThemeContext);
  const isDark = theme.mode === "dark";

  const pickCalendar = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["text/calendar", ".ics"],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;

      const okExt = file.name?.toLowerCase().endsWith(".ics");
      const okMime =
        file.mimeType === "text/calendar" ||
        file.mimeType === "application/ics" ||
        file.mimeType === "application/x-ics";

      if (!okExt && !okMime) {
        Alert.alert("Invalid file", "Please select a .ics calendar file.");
        return;
      }

      Alert.alert("Calendar selected", `${file.name}`);
    } catch (e: any) {
      Alert.alert("Picker error", e?.message ?? "Unknown error");
    }
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync("sessionToken");
      await SecureStore.deleteItemAsync("user");
      Alert.alert("Logged out", "Your session has been cleared.");
      onLogout(); // 👈 triggers authMode("login") in App.tsx
    } catch (e: any) {
      Alert.alert("Logout failed", e?.message ?? "Unknown error");
    }
  };

  return (
    <ThemedView style={{ padding: 20, gap: 16 }}>
      <ThemedText style={{ fontSize: 22, fontWeight: "700" }}>Settings</ThemedText>

      {/* Dark mode toggle */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <ThemedText style={{ fontSize: 16 }}>Dark Mode</ThemedText>
        <Switch
          value={isDark}
          onValueChange={theme.toggle}
          trackColor={{ false: "#9CA3AF", true: theme.primary }}
          thumbColor={isDark ? "#111827" : "#FFFFFF"}
        />
      </View>

      {/* Calendar upload */}
      <View style={{ marginTop: 8 }}>
        <Button title="Upload calendar (.ics)" onPress={pickCalendar} />
      </View>

      {/* Logout */}
      <View style={{ marginTop: 16 }}>
        <Button title="Log Out" color="#e53935" onPress={handleLogout} />
      </View>
    </ThemedView>
  );
}
