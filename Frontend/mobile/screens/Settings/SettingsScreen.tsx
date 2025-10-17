// screens/Settings/SettingsScreen.tsx
import React from "react";
import { View, Switch, Alert, Button } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { ThemeContext } from "../../theme/ThemeProvider";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";

import { icsToJson } from 'ics-to-json';
import { json } from "stream/consumers";
import axios from "axios";


export default function SettingsScreen() {
  const theme = React.useContext(ThemeContext);
  const isDark = theme.mode === "dark";

  const pickCalendar = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        // Try MIME first, then fall back to extension filter
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

      // TODO: upload file.uri to your backend or parse locally
      // file.uri, file.name, file.size, file.mimeType are available
      const response = await fetch(file.uri);
      const icsText = await response.text();
      const jsonData = icsToJson(icsText);
      console.log(jsonData);
      axios.post("http://localhost:7500/test/", jsonData)

    // Get ICS text however you like, example below
    // Make sure you have the right CORS settings if needed

  
      Alert.alert("Calendar selected", `${file.name}`);
    } catch (e: any) {
      Alert.alert("Picker error", e?.message ?? "Unknown error");
    }
  };

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

      {/* Calendar upload */}
      <View style={{ marginTop: 8 }}>
        <Button title="Upload calendar (.ics)" onPress={pickCalendar} />
      </View>
    </ThemedView>
  );
}
