import React from "react";
import { View, Switch } from "react-native";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import { ThemeContext } from "../../theme/ThemeProvider";

export default function SettingsScreen() {
  const theme = React.useContext(ThemeContext);
  const isDark = theme.mode === "dark";
  return (
    <ThemedView style={{ padding: 20, gap: 16 }}>
      <ThemedText style={{ fontSize: 22, fontWeight: "700" }}>Settings</ThemedText>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <ThemedText style={{ fontSize: 16 }}>Dark Mode</ThemedText>
        <Switch
          value={isDark}
          onValueChange={theme.toggle}
          trackColor={{ false: "#9CA3AF", true: theme.primary }}
          thumbColor={isDark ? "#111827" : "#FFFFFF"}
        />
      </View>
    </ThemedView>
  );
}
