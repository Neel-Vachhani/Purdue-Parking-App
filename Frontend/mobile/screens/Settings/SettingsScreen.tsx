// screens/Settings/SettingsScreen.tsx
import React from "react";
import { View, ScrollView, Switch, Alert, Button, TouchableOpacity, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { icsToJson } from "ics-to-json";
import { Ionicons } from "@expo/vector-icons";

import { ThemeContext } from "../../theme/ThemeProvider";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import AuthInput from "../../components/AuthInput";

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
  const [origin, setOrigin] = React.useState("");
  const [originLoading, setOriginLoading] = React.useState(false);

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

  // -------- Starting Location (origin) load/save --------
  const loadOrigin = React.useCallback(async () => {
    try {
      setOriginLoading(true);
      const userJson = await SecureStore.getItemAsync("user");
      const user = userJson ? JSON.parse(userJson) : null;
      const email = user?.email;
      if (!email) return;
      const res = await axios.get(`${API_BASE}/user/origin/`, { params: { email } });
      const savedOrigin = res?.data?.default_origin ?? "";
      setOrigin(savedOrigin);
      console.log("Loaded starting location:", savedOrigin || "(none)");
    } catch (err) {
      console.error("Failed to load starting location:", err);
    } finally {
      setOriginLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadOrigin();
  }, [loadOrigin]);

  const saveOrigin = async () => {
    try {
      setOriginLoading(true);
      const userJson = await SecureStore.getItemAsync("user");
      const user = userJson ? JSON.parse(userJson) : null;
      const email = user?.email;
      if (!email) {
        Alert.alert("Not logged in", "Please log in again.");
        return;
      }
      
      const trimmedOrigin = origin.trim();
      console.log("Saving starting location:", trimmedOrigin || "(clearing)");
      await axios.post(`${API_BASE}/user/origin/`, { email, default_origin: trimmedOrigin });
      
      if (trimmedOrigin) {
        Alert.alert(
          "Saved Successfully",
          `Starting location: "${trimmedOrigin}"\n\nTravel times will now be calculated from this location.`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Cleared Successfully",
          "Starting location removed. The app will now use your device's current location for travel time calculations.",
          [{ text: "OK" }]
        );
      }
    } catch (e: any) {
      console.error("Save failed:", e);
      const errorMsg = e?.response?.data?.detail || e?.message || "Network error";
      Alert.alert("Save Failed", errorMsg + "\n\nMake sure the backend server is running.");
    } finally {
      setOriginLoading(false);
    }
  };

  const clearOrigin = async () => {
    try {
      setOriginLoading(true);
      const userJson = await SecureStore.getItemAsync("user");
      const user = userJson ? JSON.parse(userJson) : null;
      const email = user?.email;
      if (!email) {
        Alert.alert("Not logged in", "Please log in again.");
        return;
      }
      
      console.log("Clearing starting location");
      await axios.post(`${API_BASE}/user/origin/`, { email, default_origin: "" });
      setOrigin("");
      
      Alert.alert(
        "Cleared Successfully",
        "Starting location removed. The app will now use your device's current location for travel time calculations.",
        [{ text: "OK" }]
      );
    } catch (e: any) {
      console.error("Clear failed:", e);
      const errorMsg = e?.response?.data?.detail || e?.message || "Network error";
      Alert.alert("Clear Failed", errorMsg + "\n\nMake sure the backend server is running.");
    } finally {
      setOriginLoading(false);
    }
  };

  const setToggle = (key: keyof Omit<NotifPrefs, "frequency">, val: boolean) =>
    setPrefs(p => ({ ...p, [key]: val }));

  const setFrequency = (freq: Frequency) =>
    setPrefs(p => ({ ...p, frequency: freq }));

  const savePrefs = async () => {
    try {
      setSaving(true);
      await AsyncStorage.setItem("notification_prefs", JSON.stringify(prefs));
      
      // If all notifications are disabled, clear the push token
      const allDisabled = !prefs.garageFull && !prefs.permitExpiring && !prefs.eventClosures && !prefs.priceDrop;
      if (allDisabled) {
        const userJson = await SecureStore.getItemAsync("user");
        const user = userJson ? JSON.parse(userJson) : null;
        const email = user?.email;
        if (email) {
          try {
            await axios.post(`${API_BASE}/notification_token/`, {
              username: email,
              token: "" // Clear token by setting empty string
            });
          } catch {}
        }
      }
      
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

      // Convert JSON to ClassEvent[]

      Alert.alert("Calendar selected", `${file.name} uploaded.`);
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
    <ThemedView style={{ flex: 1 }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={true}
      >
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

        {/* Starting Location (for travel time calculations) */}
        <View style={{ marginTop: 12, gap: 10 }}>
          <ThemedText style={{ fontSize: 18, fontWeight: "700" }}>Starting Location</ThemedText>
          <ThemedText style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>
            Where are you traveling from?
          </ThemedText>
          
          {/* Address Format Guide */}
          <View style={{ 
            backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
            padding: 10,
            borderRadius: 8,
            marginBottom: 4
          }}>
            <ThemedText style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
              Format examples:
            </ThemedText>
            <ThemedText style={{ fontSize: 11, opacity: 0.6, fontFamily: "monospace" }}>
              • Street Address, City, State ZIP
            </ThemedText>
            <ThemedText style={{ fontSize: 11, opacity: 0.6, fontFamily: "monospace" }}>
              • Building Name, West Lafayette
            </ThemedText>
            <ThemedText style={{ fontSize: 11, opacity: 0.6, fontFamily: "monospace" }}>
              • Landmark or POI Name
            </ThemedText>
          </View>

          {/* Input with Clear Button */}
          <View style={{ position: "relative" }}>
            <AuthInput
              placeholder="e.g., 201 Grant St, West Lafayette, IN 47906"
              value={origin}
              onChangeText={setOrigin}
              style={{ paddingRight: origin ? 40 : 12 }}
            />
            {origin && (
              <TouchableOpacity
                onPress={clearOrigin}
                style={{
                  position: "absolute",
                  right: 12,
                  top: 0,
                  bottom: 0,
                  justifyContent: "center",
                  padding: 4,
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={originLoading}
              >
                <Ionicons 
                  name="close-circle" 
                  size={20} 
                  color={originLoading ? "#d1d5db" : (theme.mode === "dark" ? "#9ca3af" : "#6b7280")} 
                />
              </TouchableOpacity>
            )}
          </View>

          <View>
            <Button 
              title={originLoading ? "Saving..." : "Save Starting Location"} 
              onPress={saveOrigin} 
              disabled={originLoading || !origin.trim()} 
            />
          </View>
          
          {/* Status Message */}
          {origin ? (
            <View style={{ 
              flexDirection: "row", 
              alignItems: "center", 
              gap: 6,
              padding: 8,
              backgroundColor: theme.mode === "dark" ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.05)",
              borderRadius: 6
            }}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <ThemedText style={{ fontSize: 12, opacity: 0.8, flex: 1 }}>
                Saved: {origin}
              </ThemedText>
            </View>
          ) : (
            <View style={{ 
              flexDirection: "row", 
              alignItems: "center", 
              gap: 6,
              padding: 8,
              backgroundColor: theme.mode === "dark" ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.05)",
              borderRadius: 6
            }}>
              <Ionicons name="location" size={16} color="#3b82f6" />
              <ThemedText style={{ fontSize: 12, opacity: 0.8, flex: 1 }}>
                Not set - will use your current device location
              </ThemedText>
            </View>
          )}
        </View>

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

        <View style={{ marginTop: 16 }}>
          <Button title="Log Out" color="#e53935" onPress={handleLogout} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}
