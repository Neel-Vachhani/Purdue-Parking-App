// screens/Settings/SettingsScreen.tsx
import React from "react";
import { View, Switch, Alert, Button, TouchableOpacity, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { icsToJson } from "ics-to-json";

import { ThemeContext } from "../../theme/ThemeProvider";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";

interface Props {
  onLogout: () => void;
}

type Frequency = "realtime" | "daily" | "weekly";

type NotifPrefs = {
  garageFull: boolean;
  permitExpiring: boolean;
  eventClosures: boolean;
  priceDrop: boolean;
  frequency: Frequency;
};

const DEFAULT_PREFS: NotifPrefs = {
  garageFull: true,
  permitExpiring: true,
  eventClosures: true,
  priceDrop: false,
  frequency: "realtime",
};

const API_BASE = Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";

export default function SettingsScreen({ onLogout }: Props) {
  const theme = React.useContext(ThemeContext);
  const isDark = theme.mode === "dark";

  // -------- Notification prefs state --------
  const [prefs, setPrefs] = React.useState<NotifPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("notification_prefs");
        if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
      } catch {
        // ignore; stick with defaults
      }
    })();
  }, []);

  const setToggle = (key: keyof Omit<NotifPrefs, "frequency">, val: boolean) =>
    setPrefs(p => ({ ...p, [key]: val }));

  const setFrequency = (freq: Frequency) =>
    setPrefs(p => ({ ...p, frequency: freq }));

  const savePrefs = async () => {
    try {
      setSaving(true);
      await AsyncStorage.setItem("notification_prefs", JSON.stringify(prefs));
      // Optional: send to backend
      // await axios.post(`${API_BASE}/user/notification-preferences/`, prefs);
      Alert.alert("Saved", "Your notification preferences have been updated.");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  // -------- Calendar upload (unchanged) --------
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

      const response = await fetch(file.uri);
      const icsText = await response.text();
      const jsonData = icsToJson(icsText);
      console.log(jsonData);

      // NOTE: if this is local dev and you're on Android emulator, use 10.0.2.2 instead of localhost
      await axios.post(`${API_BASE.replace(":8000", ":7500")}/test/`, jsonData);

      Alert.alert("Calendar selected", `${file.name}`);
    } catch (e: any) {
      Alert.alert("Picker error", e?.message ?? "Unknown error");
    }
  };

  // -------- Logout --------
  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync("sessionToken");
      await SecureStore.deleteItemAsync("user");
      Alert.alert("Logged out", "Your session has been cleared.");
      onLogout();
    } catch (e: any) {
      Alert.alert("Logout failed", e?.message ?? "Unknown error");
    }
  };

  // -------- Little UI helpers --------
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 }}>
      <ThemedText style={{ fontSize: 16 }}>{label}</ThemedText>
      {children}
    </View>
  );

  const Pill = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: active ? theme.primary : "#6B7280",
        marginRight: 8,
        backgroundColor: active ? theme.primary + "22" : "transparent",
      }}
    >
      <ThemedText style={{ fontWeight: "600", opacity: active ? 1 : 0.85 }}>{label}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={{ padding: 20, gap: 16 }}>
      <ThemedText style={{ fontSize: 22, fontWeight: "700" }}>Settings</ThemedText>

      {/* Theme */}
      <Row label="Dark Mode">
        <Switch
          value={isDark}
          onValueChange={theme.toggle}
          trackColor={{ false: "#9CA3AF", true: theme.primary }}
          thumbColor={isDark ? "#111827" : "#FFFFFF"}
        />
      </Row>

      {/* Notification Preferences */}
      <View style={{ marginTop: 12, gap: 10 }}>
        <ThemedText style={{ fontSize: 18, fontWeight: "700" }}>Notifications</ThemedText>

        <Row label="Garage Full Alerts">
          <Switch
            value={prefs.garageFull}
            onValueChange={(v) => setToggle("garageFull", v)}
          />
        </Row>

        <Row label="Permit Expiring Reminders">
          <Switch
            value={prefs.permitExpiring}
            onValueChange={(v) => setToggle("permitExpiring", v)}
          />
        </Row>

        <Row label="Event Day Closures">
          <Switch
            value={prefs.eventClosures}
            onValueChange={(v) => setToggle("eventClosures", v)}
          />
        </Row>

        <Row label="Price Drop Notifications">
          <Switch
            value={prefs.priceDrop}
            onValueChange={(v) => setToggle("priceDrop", v)}
          />
        </Row>

        {/* Frequency chips */}
        <View style={{ marginTop: 8 }}>
          <ThemedText style={{ marginBottom: 8, opacity: 0.85 }}>Delivery Frequency</ThemedText>
          <View style={{ flexDirection: "row" }}>
            <Pill label="Realtime" active={prefs.frequency === "realtime"} onPress={() => setFrequency("realtime")} />
            <Pill label="Daily"    active={prefs.frequency === "daily"}    onPress={() => setFrequency("daily")} />
            <Pill label="Weekly"   active={prefs.frequency === "weekly"}   onPress={() => setFrequency("weekly")} />
          </View>
        </View>

        {/* Save */}
        <View style={{ marginTop: 8 }}>
          <Button title={saving ? "Saving..." : "Save Preferences"} onPress={savePrefs} disabled={saving} />
        </View>
      </View>

      {/* Calendar upload */}
      <View style={{ marginTop: 16 }}>
        <Button title="Upload calendar (.ics)" onPress={pickCalendar} />
      </View>

      {/* Logout */}
      <View style={{ marginTop: 16 }}>
        <Button title="Log Out" color="#e53935" onPress={handleLogout} />
      </View>
    </ThemedView>
  );
}
