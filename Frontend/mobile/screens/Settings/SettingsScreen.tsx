// screens/Settings/SettingsScreen.tsx
import React from "react";
import { View, ScrollView, Switch, Alert, Button, TouchableOpacity, Platform, Pressable, LayoutAnimation, UIManager } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { icsToJson } from "ics-to-json";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

import { ThemeContext } from "../../theme/ThemeProvider";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import AuthInput from "../../components/AuthInput";
import { getApiBaseUrl } from "../../config/env";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  favoriteLotAlerts: boolean;
  favoriteLotThreshold: number;
  frequency: Frequency;
};

const DEFAULT_PREFS: NotifPrefs = {
  garageFull: true,
  permitExpiring: true,
  eventClosures: true,
  priceDrop: false,
  passOnSale: false,
  favoriteLotAlerts: false,
  favoriteLotThreshold: 25,
  frequency: "realtime",
};

const API_BASE = getApiBaseUrl();

const SECTION_STATE_KEY = "settings_section_state_v1";
const SECTION_IDS = ["account", "travel", "notifications", "about"] as const;
type SectionId = typeof SECTION_IDS[number];
type SummaryTone = "neutral" | "success" | "warning";

const DEFAULT_SECTION_STATE: Record<SectionId, boolean> = {
  account: true,
  travel: true,
  notifications: true,
  about: false,
};

export default function SettingsScreen({ onLogout }: Props) {
  const theme = React.useContext(ThemeContext);
  const isDark = theme.mode === "dark";

  // -------- Notification prefs state --------
  const [prefs, setPrefs] = React.useState<NotifPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = React.useState(false);
  const [origin, setOrigin] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [savedOrigin, setSavedOrigin] = React.useState(""); // Track what's actually saved
  const [originLoading, setOriginLoading] = React.useState(false);
  const [locationLoading, setLocationLoading] = React.useState(false);
  const [savedLocation, setSavedLocation] = React.useState("");
  const [expandedSections, setExpandedSections] = React.useState<Record<SectionId, boolean>>(DEFAULT_SECTION_STATE);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    (async () => {
      try {
        const storedState = await AsyncStorage.getItem(SECTION_STATE_KEY);
        if (storedState) {
          const parsed = JSON.parse(storedState);
          setExpandedSections((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // noop
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const userJson = await SecureStore.getItemAsync("user");
        const user = userJson ? JSON.parse(userJson) : null;
        setUserEmail(user?.email ?? null);
      } catch {
        setUserEmail(null);
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

  const loadLocation = React.useCallback(async () => {
    try {
      setLocationLoading(true);
      const userJson = await SecureStore.getItemAsync("user");
      const user = userJson ? JSON.parse(userJson) : null;
      const email = user?.email;
      if (!email) return;
      const res = await axios.get(`${API_BASE}/user/location/`, { params: { email, other_location: "" } });
      const loadedLocation = res?.data?.other_location ?? "";
      setLocation(loadedLocation);
      setSavedLocation(loadedLocation); // Track saved value separately
      console.log("Loaded location:", loadedLocation || "(none)");
    } catch (err) {
      console.error("Failed to load location:", err);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadLocation();
  }, [loadLocation]);

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
  const saveLocation = async () => {
    try {
      setLocationLoading(true);
      const userJson = await SecureStore.getItemAsync("user");
      const user = userJson ? JSON.parse(userJson) : null;
      const email = user?.email;
      if (!email) {
        Alert.alert("Not logged in", "Please log in again.");
        return;
      }
      
      const trimmedLocation = location.trim();
      console.log("Saving starting location:", trimmedLocation || "(clearing)");
      await axios.post(`${API_BASE}/user/location/`, { email, other_location: trimmedLocation });
      
      // Update saved origin state
      setSavedLocation(trimmedLocation);
      
      if (trimmedLocation) {
        Alert.alert(
          "Saved Successfully",
          `Location: "${trimmedLocation}"\n\nYou can now choose to start from this location`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Cleared Successfully",
          "Location removed.",
          [{ text: "OK" }]
        );
      }
    } catch (e: any) {
      console.error("Save failed:", e);
      const errorMsg = e?.response?.data?.detail || e?.message || "Network error";
      Alert.alert("Save Failed", errorMsg + "\n\nMake sure the backend server is running.");
    } finally {
      setLocationLoading(false);
    }
  };

  const clearLocation = async () => {
    try {
      setLocationLoading(true);
      const userJson = await SecureStore.getItemAsync("user");
      const user = userJson ? JSON.parse(userJson) : null;
      const email = user?.email;
      if (!email) {
        Alert.alert("Not logged in", "Please log in again.");
        return;
      }
      
      console.log("Clearing location");
      await axios.post(`${API_BASE}/user/location/`, { email, other_location: "" });
      setLocation("");
      setSavedLocation(""); // Clear saved origin state
      
      Alert.alert(
        "Cleared Successfully",
        "Location removed. The app will now use your device's current location for travel time calculations.",
        [{ text: "OK" }]
      );
    } catch (e: any) {
      console.error("Clear failed:", e);
      const errorMsg = e?.response?.data?.detail || e?.message || "Network error";
      Alert.alert("Clear Failed", errorMsg + "\n\nMake sure the backend server is running.");
    } finally {
      setLocationLoading(false);
    }
  };

  type BooleanPrefKey =
    | "garageFull"
    | "permitExpiring"
    | "eventClosures"
    | "priceDrop"
    | "passOnSale"
    | "favoriteLotAlerts";

  const BOOLEAN_PREF_KEYS: BooleanPrefKey[] = [
    "garageFull",
    "permitExpiring",
    "eventClosures",
    "priceDrop",
    "passOnSale",
    "favoriteLotAlerts",
  ];

  const setToggle = (key: BooleanPrefKey, val: boolean) =>
    setPrefs(p => ({ ...p, [key]: val }));

  const setFrequency = (freq: Frequency) =>
    setPrefs(p => ({ ...p, frequency: freq }));

  const setFavoriteLotThreshold = (threshold: number) =>
    setPrefs(p => ({ ...p, favoriteLotThreshold: threshold }));

  const savePrefs = async () => {
    try {
      setSaving(true);
      await AsyncStorage.setItem("notification_prefs", JSON.stringify(prefs));
      
      // If all notifications are disabled, clear the push token
      const allDisabled =
        !prefs.garageFull &&
        !prefs.permitExpiring &&
        !prefs.eventClosures &&
        !prefs.priceDrop &&
        !prefs.passOnSale &&
        !prefs.favoriteLotAlerts;
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

  const toggleSection = React.useCallback((id: SectionId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections(prev => {
      const next = { ...prev, [id]: !prev[id] };
      AsyncStorage.setItem(SECTION_STATE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const enabledNotificationCount = React.useMemo(
    () => BOOLEAN_PREF_KEYS.reduce((total, key) => (prefs[key] ? total + 1 : total), 0),
    [prefs]
  );

  const appVersion = React.useMemo(() => {
    const expoVersion = (Constants.expoConfig as { version?: string } | undefined)?.version;
    const manifestVersion = (Constants.manifest as { version?: string } | undefined)?.version;
    return expoVersion || manifestVersion || "1.0.0";
  }, []);

  const summaryItems = React.useMemo(
    () => [
      {
        id: "travel" as SectionId,
        label: "Starting point",
        value: savedOrigin ? (savedOrigin.length > 20 ? savedOrigin.substring(0, 20) + "..." : savedOrigin) : "Not set",
        tone: savedOrigin ? ("success" as SummaryTone) : ("warning" as SummaryTone),
      },
      {
        id: "notifications" as SectionId,
        label: "Notifications",
        value: `${enabledNotificationCount}/${BOOLEAN_PREF_KEYS.length} on`,
        tone: enabledNotificationCount ? ("success" as SummaryTone) : ("warning" as SummaryTone),
      },
    ],
    [enabledNotificationCount, savedOrigin]
  );

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

  type SummaryChipProps = {
    label: string;
    value: string;
    tone?: SummaryTone;
  };

  const SummaryChip = ({ label, value, tone = "neutral" }: SummaryChipProps) => {
    const theme = React.useContext(ThemeContext);
    const paletteMap: Record<SummaryTone, { bg: string; border?: string; text: string }> = {
      neutral: { bg: theme.chipBg, border: theme.chipBorder, text: theme.chipText },
      success: { bg: theme.success + "22", border: theme.success + "33", text: theme.text },
      warning: { bg: theme.warning + "1a", border: theme.warning + "33", text: theme.text },
    };

    const palette = paletteMap[tone];

    return (
      <View
        style={{
          backgroundColor: palette.bg,
          borderRadius: 10,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderWidth: palette.border ? 1 : 0,
          borderColor: palette.border,
        }}
      >
        <ThemedText style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.7 }}>
          {label}
        </ThemedText>
        <ThemedText numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: palette.text, marginTop: 2 }}>
          {value}
        </ThemedText>
      </View>
    );
  };

  type SectionCardProps = {
    id: SectionId;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    expanded: boolean;
    onToggle: (id: SectionId) => void;
    children: React.ReactNode;
  };

  const SettingsSectionCard = ({ id, title, icon, expanded, onToggle, children }: SectionCardProps) => {
    const theme = React.useContext(ThemeContext);
    return (
      <View
        style={{
          borderRadius: 16,
          backgroundColor: theme.sectionBg,
          borderWidth: 1,
          borderColor: theme.sectionBorder,
          shadowColor: theme.cardShadowColor,
          shadowOpacity: theme.mode === "dark" ? 0.3 : 0.1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }}
      >
        <Pressable
          onPress={() => onToggle(id)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${title} section`}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: theme.sectionHeaderBg,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: theme.sectionIconBg,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name={icon} size={20} color={theme.primaryText} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontSize: 17, fontWeight: "700", color: theme.sectionHeaderText }}>{title}</ThemedText>
          </View>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.sectionHeaderText} />
        </Pressable>
        {expanded ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 16, backgroundColor: theme.sectionBg }}>
            {children}
          </View>
        </View>

        {/* Saving Other Locations */}
        <View style={{ 
          marginTop: 20, 
          backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Ionicons name="business" size={22} color={theme.primary} />
          <ThemedText style={{ fontSize: 18, fontWeight: "700" }}>Other Location</ThemedText>
          </View>
          
          <ThemedText style={{ fontSize: 14, opacity: 0.65, marginBottom: 16, lineHeight: 20 }}>
            Set a location to get directions from
          </ThemedText>
          
          {/* Status Message at Top - Only show if there's a saved location */}
          {savedLocation ? (
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
                  {savedLocation}
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

          {/* Input with Clear Button */}
          <View style={{ position: "relative", marginBottom: 12 }}>
            <AuthInput
              placeholder="Enter your starting location..."
              value={location}
              onChangeText={setLocation}
              style={{ paddingRight: origin ? 50 : 12, fontSize: 15 }}
            />
            {location && (
              <TouchableOpacity
                onPress={clearLocation}
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
                disabled={locationLoading}
              >
                <Ionicons 
                  name="close" 
                  size={16} 
                  color={locationLoading ? "#9CA3AF" : (theme.mode === "dark" ? "#D1D5DB" : "#6B7280")} 
                />
              </TouchableOpacity>
            )}
          </View>

          <View>
            <Button 
              title={locationLoading ? "Saving..." : "Save Starting Location"} 
              onPress={saveLocation} 
              disabled={locationLoading || !location.trim()} 
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

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator
      >
        <View>
          <ThemedText style={{ fontSize: 24, fontWeight: "700" }}>Settings</ThemedText>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {summaryItems.map((item) => (
            <View key={item.id} style={{ flex: 1, minWidth: "45%" }}>
              <SummaryChip label={item.label} value={item.value} tone={item.tone} />
            </View>
          ))}
        </View>

        <SettingsSectionCard
          id="account"
          title="Account & Display"
          icon="person-circle-outline"
          expanded={expandedSections.account}
          onToggle={toggleSection}
        >
          <View style={{ gap: 12 }}>
            {userEmail ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: theme.sectionBgMuted,
                }}
              >
                <Ionicons name="mail" size={16} color={theme.primaryText} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 11, opacity: 0.6 }}>Signed in as</ThemedText>
                  <ThemedText numberOfLines={1} ellipsizeMode="middle" style={{ fontSize: 13, fontWeight: "600", marginTop: 2 }}>
                    {userEmail}
                  </ThemedText>
                </View>
              </View>
            ) : null}
            <Row label="Dark Mode">
              <Switch
                value={isDark}
                onValueChange={theme.toggle}
                trackColor={{ false: "#9CA3AF", true: theme.primary }}
                thumbColor={isDark ? "#111827" : "#FFFFFF"}
              />
            </Row>
          </View>
        </SettingsSectionCard>

        <SettingsSectionCard
          id="travel"
          title="Travel Preferences"
          icon="navigate-circle-outline"
          expanded={expandedSections.travel}
          onToggle={toggleSection}
        >
          <View style={{ gap: 12 }}>
            {savedOrigin ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  padding: 10,
                  backgroundColor: theme.mode === "dark" ? "rgba(34, 197, 94, 0.12)" : "rgba(34, 197, 94, 0.08)",
                  borderRadius: 10,
                }}
              >
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                <View style={{ flex: 1 }}>
                  <ThemedText numberOfLines={1} style={{ fontSize: 13, fontWeight: "600" }}>{savedOrigin}</ThemedText>
                </View>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  padding: 10,
                  backgroundColor: theme.sectionBgMuted,
                  borderRadius: 10,
                }}
              >
                <Ionicons name="location-outline" size={18} color={theme.primaryText} />
                <ThemedText style={{ fontSize: 13, opacity: 0.7 }}>
                  Not set
                </ThemedText>
              </View>
            )}

            <View style={{ position: "relative" }}>
              <AuthInput
                placeholder="Enter your starting location..."
                value={origin}
                onChangeText={setOrigin}
                style={{ paddingRight: origin ? 50 : 12, fontSize: 15 }}
              />
              {origin ? (
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
                    borderRadius: 12,
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={originLoading}
                >
                  <Ionicons
                    name="close"
                    size={16}
                    color={originLoading ? "#9CA3AF" : theme.text}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <Button
              title={originLoading ? "Saving..." : "Save Starting Location"}
              onPress={saveOrigin}
              disabled={originLoading || !origin.trim()}
            />
          </View>
        </SettingsSectionCard>

        <SettingsSectionCard
          id="notifications"
          title="Notifications"
          icon="notifications-outline"
          expanded={expandedSections.notifications}
          onToggle={toggleSection}
        >
          <View style={{ gap: 12 }}>
            <Row label="Garage Full Alerts">
              <Switch value={prefs.garageFull} onValueChange={(v) => setToggle("garageFull", v)} />
            </Row>
            <Row label="Permit Expiring Reminders">
              <Switch value={prefs.permitExpiring} onValueChange={(v) => setToggle("permitExpiring", v)} />
            </Row>
            <Row label="Event Day Closures">
              <Switch value={prefs.eventClosures} onValueChange={handleEventClosuresToggle} />
            </Row>
            <Row label="Price Drop Notifications">
              <Switch value={prefs.priceDrop} onValueChange={(v) => setToggle("priceDrop", v)} />
            </Row>
            <Row label="Parking Pass Sale Notifications">
              <Switch value={prefs.passOnSale} onValueChange={handlePassOnSaleToggle} />
            </Row>

            <View
              style={{
                paddingVertical: 12,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: theme.sectionBorder,
                gap: 10,
              }}
            >
              <Row label="Favorited Lot Availability">
                <Switch
                  value={prefs.favoriteLotAlerts}
                  onValueChange={(v) => setToggle("favoriteLotAlerts", v)}
                />
              </Row>
              <ThemedText style={{ fontSize: 13, opacity: 0.7 }}>
                Notify me when a favorited lot drops below my selected availability threshold.
              </ThemedText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {[10, 20, 25, 30, 40, 50].map((option) => {
                  const active = prefs.favoriteLotThreshold === option;
                  const disabled = !prefs.favoriteLotAlerts;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => !disabled && setFavoriteLotThreshold(option)}
                      disabled={disabled}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: 999,
                        borderWidth: 1.5,
                        borderColor: active ? theme.primary : theme.border,
                        backgroundColor: active ? theme.primary + "22" : "transparent",
                        opacity: disabled ? 0.35 : 1,
                      }}
                    >
                      <ThemedText style={{ fontWeight: "600", fontSize: 13 }}>{option}%</ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {prefs.favoriteLotAlerts ? (
                <ThemedText style={{ fontSize: 13, opacity: 0.75 }}>
                  Alerts trigger when any favorited lot is below {prefs.favoriteLotThreshold}% available.
                </ThemedText>
              ) : null}
            </View>

            <View>
              <ThemedText style={{ marginBottom: 8, opacity: 0.85 }}>Delivery Frequency</ThemedText>
              <View style={{ flexDirection: "row" }}>
                <Pill label="Realtime" active={prefs.frequency === "realtime"} onPress={() => setFrequency("realtime")} />
                <Pill label="Daily" active={prefs.frequency === "daily"} onPress={() => setFrequency("daily")} />
                <Pill label="Weekly" active={prefs.frequency === "weekly"} onPress={() => setFrequency("weekly")} />
              </View>
            </View>

            <Button title={saving ? "Saving..." : "Save Preferences"} onPress={savePrefs} disabled={saving} />
          </View>
        </SettingsSectionCard>

        <SettingsSectionCard
          id="about"
          title="About & Support"
          icon="information-circle-outline"
          expanded={expandedSections.about}
          onToggle={toggleSection}
        >
          <View style={{ gap: 12 }}>
            <ThemedText style={{ fontSize: 13, opacity: 0.7 }}>
              Version {appVersion}
            </ThemedText>

            <Button title="Upload calendar (.ics)" onPress={pickCalendar} />

            <Button title="Log Out" color="#e53935" onPress={handleLogout} />
          </View>
        </SettingsSectionCard>
      </ScrollView>
    </ThemedView>
  );
}
