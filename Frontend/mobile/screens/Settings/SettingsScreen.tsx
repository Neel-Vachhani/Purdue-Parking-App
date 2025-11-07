// screens/Settings/SettingsScreen.tsx
import React from "react";
import { View, ScrollView, Switch, Alert, Button, TouchableOpacity, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { icsToJson } from "ics-to-json";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

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
  passOnSale: boolean;
  frequency: Frequency;
};

const DEFAULT_PREFS: NotifPrefs = {
  garageFull: true,
  permitExpiring: true,
  eventClosures: true,
  priceDrop: false,
  passOnSale: false,
  frequency: "realtime",
};

const API_BASE = Platform.OS === "android" ? "http://10.0.2.2:7500" : "http://localhost:7500";

export default function SettingsScreen({ onLogout }: Props) {
  const theme = React.useContext(ThemeContext);
  const isDark = theme.mode === "dark";

  // -------- Notification prefs state --------
  const [prefs, setPrefs] = React.useState<NotifPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = React.useState(false);
  const [origin, setOrigin] = React.useState("");
  const [savedOrigin, setSavedOrigin] = React.useState(""); // Track what's actually saved
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
      const loadedOrigin = res?.data?.default_origin ?? "";
      setOrigin(loadedOrigin);
      setSavedOrigin(loadedOrigin); // Track saved value separately
      console.log("Loaded starting location:", loadedOrigin || "(none)");
    } catch (err) {
      console.error("Failed to load starting location:", err);
    } finally {
      setOriginLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadOrigin();
  }, [loadOrigin]);

  // Load closure notification preference from backend (User Story #11)
  React.useEffect(() => {
    async function loadClosurePreference() {
      try {
        const userJson = await SecureStore.getItemAsync("user");
        const user = userJson ? JSON.parse(userJson) : null;
        const email = user?.email;
        
        if (!email) return;
        
        const res = await axios.get(`${API_BASE}/closure-notifications/`, {
          params: { email }
        });
        
        const enabled = res?.data?.closure_notifications_enabled ?? true;
        setPrefs(p => ({ ...p, eventClosures: enabled }));
        console.log(`Loaded closure notification preference: ${enabled}`);
      } catch (error) {
        console.error("Failed to load closure notification preference:", error);
        // Default to enabled if we can't load
      }
    }
    
    loadClosurePreference();
  }, []);

  // Load push notification status from backend (User Story #2)
  // This ensures the toggle reflects whether the user has a valid push token
  React.useEffect(() => {
    async function loadPushNotificationStatus() {
      try {
        const userJson = await SecureStore.getItemAsync("user");
        const user = userJson ? JSON.parse(userJson) : null;
        const email = user?.email;
        
        if (!email) return;
        
        // Fetch user's notification token status from backend
        const res = await axios.get(`${API_BASE}/notifications/check/`, {
          params: { email }
        });
        
        const hasToken = res?.data?.opted_in ?? false;
        setPrefs(p => ({ ...p, passOnSale: hasToken }));
        console.log(`Loaded push notification status: ${hasToken ? 'enabled (has token)' : 'disabled (no token)'}`);
      } catch (error) {
        console.error("Failed to load push notification status:", error);
        // Default to disabled if we can't load
        setPrefs(p => ({ ...p, passOnSale: false }));
      }
    }
    
    loadPushNotificationStatus();
  }, []);

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
      
      // Update saved origin state
      setSavedOrigin(trimmedOrigin);
      
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
      setSavedOrigin(""); // Clear saved origin state
      
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
      const allDisabled = !prefs.garageFull && !prefs.permitExpiring && !prefs.eventClosures && !prefs.priceDrop && !prefs.passOnSale;
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

  // -------- Lot Closure Notifications Toggle Handler (User Story #11) --------
  const handleEventClosuresToggle = async (enabled: boolean) => {
    const userJson = await SecureStore.getItemAsync("user");
    const user = userJson ? JSON.parse(userJson) : null;
    const email = user?.email;

    if (!email) {
      Alert.alert("Not logged in", "Please log in to enable notifications.");
      return;
    }

    try {
      // Update backend preference
      await axios.post(`${API_BASE}/closure-notifications/`, {
        email,
        enabled
      });
      
      // Update local state
      setToggle("eventClosures", enabled);
      
      console.log(`Closure notifications ${enabled ? 'enabled' : 'disabled'} for ${email}`);
    } catch (error) {
      console.error("Failed to update closure notification preference:", error);
      Alert.alert("Error", "Failed to update notification preference. Please try again.");
    }
  };

  // -------- Parking Pass Sale Notifications Toggle Handler --------
  const handlePassOnSaleToggle = async (enabled: boolean) => {
    const userJson = await SecureStore.getItemAsync("user");
    const user = userJson ? JSON.parse(userJson) : null;
    const email = user?.email;

    if (!email) {
      Alert.alert("Not logged in", "Please log in to enable notifications.");
      return;
    }

    if (enabled) {
      // ENABLE FLOW: Request permissions, get token, send to backend, trigger test
      try {
        if (!Device.isDevice) {
          Alert.alert(
            "Physical Device Required", 
            "Push notifications don't work on simulators/emulators. Please use a physical device."
          );
          return;
        }

        // Request notification permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Please enable notifications in your device settings to receive parking pass sale alerts."
          );
          return;
        }

        // Get Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const pushToken = tokenData.data;

        // Send token to backend
        await axios.post(`${API_BASE}/notification_token/`, {
          email,
          token: pushToken
        });

        // Trigger test notification
        const testResponse = await axios.post(`${API_BASE}/notification_test/`, {
          email
        });

        // Update state
        setPrefs(p => ({ ...p, passOnSale: true }));
        
        // Save to AsyncStorage
        const newPrefs = { ...prefs, passOnSale: true };
        await AsyncStorage.setItem("notification_prefs", JSON.stringify(newPrefs));

        Alert.alert(
          "Notifications Enabled! 🎉",
          "You'll now receive alerts when parking passes go on sale. Check your notifications for a test message!"
        );

      } catch (error: any) {
        console.error("Failed to enable notifications:", error);
        const errorMsg = error?.response?.data?.detail || error?.message || "Unknown error";
        Alert.alert(
          "Setup Failed",
          `Could not enable notifications: ${errorMsg}\n\nMake sure the backend is running.`
        );
      }

    } else {
      // DISABLE FLOW: Clear token on backend
      try {
        await axios.post(`${API_BASE}/notification_disable/`, {
          email
        });

        // Update state
        setPrefs(p => ({ ...p, passOnSale: false }));
        
        // Save to AsyncStorage
        const newPrefs = { ...prefs, passOnSale: false };
        await AsyncStorage.setItem("notification_prefs", JSON.stringify(newPrefs));

        Alert.alert(
          "Notifications Disabled",
          "You will no longer receive parking pass sale alerts."
        );

      } catch (error: any) {
        console.error("Failed to disable notifications:", error);
        const errorMsg = error?.response?.data?.detail || error?.message || "Unknown error";
        Alert.alert(
          "Disable Failed",
          `Could not disable notifications: ${errorMsg}`
        );
      }
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
      await axios.post(`${API_BASE}/test/`, jsonData);

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
        <View style={{ 
          marginTop: 20, 
          backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Ionicons name="home" size={22} color={theme.primary} />
          <ThemedText style={{ fontSize: 18, fontWeight: "700" }}>Starting Location</ThemedText>
          </View>
          
          <ThemedText style={{ fontSize: 14, opacity: 0.65, marginBottom: 16, lineHeight: 20 }}>
            Set your default starting point for travel time estimates
          </ThemedText>
          
          {/* Status Message at Top - Only show if there's a saved location */}
          {savedOrigin ? (
            <View style={{ 
              flexDirection: "row", 
              alignItems: "center", 
              gap: 8,
              padding: 12,
              backgroundColor: theme.mode === "dark" ? "rgba(34, 197, 94, 0.15)" : "rgba(34, 197, 94, 0.1)",
              borderRadius: 10,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "rgba(34, 197, 94, 0.3)"
            }}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 11, opacity: 0.7, fontWeight: "600", marginBottom: 2 }}>
                  SAVED LOCATION
                </ThemedText>
                <ThemedText style={{ fontSize: 13, fontWeight: "500" }}>
                  {savedOrigin}
                </ThemedText>
              </View>
            </View>
          ) : (
            <View style={{ 
              flexDirection: "row", 
              alignItems: "center", 
              gap: 8,
              padding: 12,
              backgroundColor: theme.mode === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)",
              borderRadius: 10,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "rgba(59, 130, 246, 0.3)"
            }}>
              <Ionicons name="location" size={20} color="#3b82f6" />
              <ThemedText style={{ fontSize: 13, opacity: 0.85, flex: 1, lineHeight: 18 }}>
                Not set - travel times will not be displayed
              </ThemedText>
            </View>
          )}
          
          {/* Address Format Guide */}
          <View style={{ 
            backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
            padding: 12,
            borderRadius: 10,
            marginBottom: 12,
            borderLeftWidth: 3,
            borderLeftColor: theme.primary
          }}>
            <ThemedText style={{ fontSize: 12, fontWeight: "600", opacity: 0.7, marginBottom: 8 }}>
              FORMAT EXAMPLES:
            </ThemedText>
            <ThemedText style={{ fontSize: 12, opacity: 0.65, lineHeight: 18, marginBottom: 4 }}>
              • <ThemedText style={{ fontWeight: "500" }}>Street Address:</ThemedText> 201 Grant St, West Lafayette, IN 47906
            </ThemedText>
            <ThemedText style={{ fontSize: 12, opacity: 0.65, lineHeight: 18, marginBottom: 4 }}>
              • <ThemedText style={{ fontWeight: "500" }}>Building Name:</ThemedText> Memorial Union
            </ThemedText>
            <ThemedText style={{ fontSize: 12, opacity: 0.65, lineHeight: 18 }}>
              • <ThemedText style={{ fontWeight: "500" }}>Landmark:</ThemedText> Lawson Computer Science Building
            </ThemedText>
          </View>

          {/* Input with Clear Button */}
          <View style={{ position: "relative", marginBottom: 12 }}>
            <AuthInput
              placeholder="Enter your starting location..."
              value={origin}
              onChangeText={setOrigin}
              style={{ paddingRight: origin ? 50 : 12, fontSize: 15 }}
            />
            {origin && (
              <TouchableOpacity
                onPress={clearOrigin}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: [{ translateY: -12 }],
                  width: 24,
                  height: 24,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                  borderRadius: 12
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={originLoading}
              >
                <Ionicons 
                  name="close" 
                  size={16} 
                  color={originLoading ? "#9CA3AF" : (theme.mode === "dark" ? "#D1D5DB" : "#6B7280")} 
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
              onValueChange={handleEventClosuresToggle}
            />
          </Row>

          <Row label="Price Drop Notifications">
            <Switch
              value={prefs.priceDrop}
              onValueChange={(v) => setToggle("priceDrop", v)}
            />
          </Row>

          <Row label="Parking Pass Sale Notifications">
            <Switch
              value={prefs.passOnSale}
              onValueChange={handlePassOnSaleToggle}
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
