import React from 'react'
import SettingsSectionCard from './SettingsSectionCard'
import { Button, TouchableOpacity, View } from 'react-native'
import { ThemeContext } from '../theme/ThemeProvider';
import { Ionicons } from "@expo/vector-icons";
import ThemedText from './ThemedText';
import AuthInput from './AuthInput';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Alert } from 'react-native';
import { getApiBaseUrl } from '../config/env';
import { findNearestGarageForAddress } from '../utils/travelTime';


const API_BASE = getApiBaseUrl();

const TravelPreferences = ({ expandedSections, toggleSection, savedOrigin, setSavedOrigin} : { expandedSections: Record<string, boolean>; toggleSection: ((id: "account" | "travel" | "notifications" | "about") => void); savedOrigin: string; setSavedOrigin: React.Dispatch<React.SetStateAction<string>> }) => {
  const theme = React.useContext(ThemeContext);
  const [originLoading, setOriginLoading] = React.useState(false);
  const [locationLoading, setLocationLoading] = React.useState(false);
  const [savedLocation, setSavedLocation] = React.useState("");
  const [origin, setOrigin] = React.useState("");
  const [location, setLocation] = React.useState("");

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

  const checkNearbyGarageForOrigin = React.useCallback(
    async (address: string) => {
      const trimmed = address.trim();
      if (!trimmed) return;

      try {
        const result = await findNearestGarageForAddress(trimmed, 80); // 80m radius, tweak if needed

        if (result?.found && result.garage?.name) {
          Alert.alert(
            `How full is ${result.garage.name}?`,
            "Tell us what you see right now.",
            [
              {
                text: "Pretty empty",
                onPress: () => {
                  Alert.alert("Thank you for your feedback!");
                  // later you can POST this rating to backend here
                },
              },
              {
                text: "Somewhat full",
                onPress: () => {
                  Alert.alert("Thank you for your feedback!");
                },
              },
              {
                text: "Totally packed",
                onPress: () => {
                  Alert.alert("Thank you for your feedback!");
                },
              },
            ]
          );
        } else {
          console.log("No garage found near that origin");
        }
      } catch (err) {
        console.error("Failed to check nearby garage for origin:", err);
      }
    },
    []
  );

  React.useEffect(() => {
    loadLocation();
  }, [loadLocation]);

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
      const originChanged = trimmedOrigin !== savedOrigin;
      setSavedOrigin(trimmedOrigin);
      
      if (trimmedOrigin) {
        Alert.alert(
          "Saved Successfully",
          `Starting location: "${trimmedOrigin}"\n\nTravel times will now be calculated from this location.`,
          [{ text: "OK" }]
        );
        if (originChanged) {
          checkNearbyGarageForOrigin(trimmedOrigin);
        }
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

  return (
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
                secure={false}
                value={origin}
                onChangeText={(text) => setOrigin(text)}
                style={{ paddingRight: origin ? 50 : 12, fontSize: 15 }}
              />
              {origin ? (
                <TouchableOpacity
                  onPress={clearOrigin}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: [{ translateY: -20 }],
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
              placeholder="Enter your location..."
              value={location}
              onChangeText={(text) => setLocation(text)}
              style={{ paddingRight: origin ? 50 : 12, fontSize: 15 }}
            />
            {!!(location) && (
              <TouchableOpacity
                onPress={clearLocation}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: [{ translateY: -20 }],
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
              title={locationLoading ? "Saving..." : "Save Location"} 
              onPress={saveLocation} 
              disabled={locationLoading || !location.trim()} 
            />
          </View>
        </View>
        </SettingsSectionCard>
  )
}

export default TravelPreferences