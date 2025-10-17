import React from "react";
import { View, Switch, Pressable } from "react-native";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import { ThemeContext } from "../../theme/ThemeProvider";
import * as DocumentPicker from "expo-document-picker";

export default function SettingsScreen() {
  const theme = React.useContext(ThemeContext);
  const isDark = theme.mode === "dark";
  const onUploadPress = React.useCallback(async () => {
    try {
      await DocumentPicker.getDocumentAsync({
        type: ["text/calendar", "application/ics", "text/plain", "application/octet-stream"],
        multiple: false,
        copyToCacheDirectory: true,
      });
    } catch (e) {
      // no-op for now; we only need to show the dialog per acceptance criteria
    }
  }, []);
  return (
    // Settings is the entry point for user-facing theme control
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

      {/* Calendar upload CTA - UI only for now */}
      <View style={{ height: 1, backgroundColor: isDark ? "#1F2937" : "#E5E7EB", marginVertical: 8 }} />
      <View>
        <ThemedText style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>Calendar</ThemedText>
        <Pressable
          onPress={onUploadPress}
          style={{
            backgroundColor: theme.primary,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            alignSelf: "flex-start",
          }}
        >
          <ThemedText style={{ color: "#111827", fontWeight: "700" }}>Upload .ics file</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}
