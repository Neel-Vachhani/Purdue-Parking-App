import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import { Platform, TouchableOpacity, Alert } from "react-native";
import { View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "../../theme/ThemeProvider";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import { getTravelTimeFromDefaultOrigin, TravelTimeResult } from "../../utils/travelTime";

type ParkingLot = {
  id: number;
  name: string;
  capacity: number;
  available: number;
  isFavorite: boolean;
  lat?: number;
  lng?: number;
  travelTime?: TravelTimeResult | null;
};

type ApiLot = Pick<ParkingLot, "id" | "name"> &
  Partial<Pick<ParkingLot, "available" | "capacity">>;

const INITIAL_PARKING_LOTS: ParkingLot[] = [
  {
    id: 1,
    name: "Harrison Garage",
    capacity: 800,
    available: 560,
    isFavorite: false,
    lat: 40.420928743577996,
    lng: -86.91759020145541,
  },
  {
    id: 2,
    name: "Grant Street Garage",
    capacity: 648,
    available: 118,
    isFavorite: false,
    lat: 40.42519706999441,
    lng: -86.90972814560583,
  },
  {
    id: 3,
    name: "University Street Garage",
    capacity: 826,
    available: 406,
    isFavorite: false,
    lat: 40.4266903911869,
    lng: -86.91728093292815,
  },
  {
    id: 4,
    name: "Northwestern Garage",
    capacity: 434,
    available: 1, // ← Changed from 2 to 1 for testing "full garage" alert
    isFavorite: false,
    lat: 40.42964447741563,
    lng: -86.91111021483658,
  },
  {
    id: 5,
    name: "DS/AI Lot",
    capacity: 178,
    available: 0, // ← Changed from 32 to 0 for testing "completely full" alert
    isFavorite: false,
    lat: 40.428997605924756,
    lng: -86.91608038169943,
  },
];

const AVAILABILITY_ENDPOINT = "/parking/availability/";

const getApiBaseUrl = (): string => {
  const extraFromConfig = Constants.expoConfig?.extra as
    | { apiBaseUrl?: string }
    | undefined;
  const manifest = Constants.manifest as
    | { extra?: { apiBaseUrl?: string }; debuggerHost?: string }
    | null;
  const extraFromManifest = manifest?.extra;

  const override = extraFromConfig?.apiBaseUrl || extraFromManifest?.apiBaseUrl;
  if (override) {
    return override.replace(/\/$/, "");
  }

  let host = "localhost";

  if (Platform.OS === "android") {
    host = "10.0.2.2";
  } else {
    const debuggerHost = Constants.expoConfig?.hostUri || manifest?.debuggerHost;
    if (debuggerHost) {
      host = debuggerHost.split(":")[0];
    }
  }

  return `http://${host}:7500`;
};

export default function ParkingListScreen() {
  const theme = React.useContext(ThemeContext);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>(
    INITIAL_PARKING_LOTS
  );
  const [originType, setOriginType] = useState<"saved" | "current" | "none">("none");
  const [debugInfo, setDebugInfo] = useState<string>("Initial load");

  // 🔍 DEBUG: Log whenever parking lots state changes
  useEffect(() => {
    const debugInfo = parkingLots.map(lot => ({
      name: lot.name,
      available: lot.available,
      capacity: lot.capacity
    }));
    console.log("🅿️ ParkingLots state updated:", debugInfo);
    
    // Visual debug alert for Harrison Garage specifically
    const harrison = parkingLots.find(lot => lot.name.includes("Harrison"));
    if (harrison && harrison.available === 240) {
      setDebugInfo(`❌ OVERWRITTEN: Harrison=${harrison.available}/${harrison.capacity}`);
    } else if (harrison) {
      setDebugInfo(`✅ Current: Harrison=${harrison.available}/${harrison.capacity}`);
    }
  }, [parkingLots]);

  // Helper function to determine if a garage is full
  const isGarageFull = (available: number): boolean => {
    return available <= 5; // Consider garage full if 5 or fewer spots available
  };

  // Helper function to get garage status text
  const getGarageStatus = (available: number, capacity: number): string => {
    if (available === 0) return "completely full";
    if (available <= 5) return "nearly full";
    const percentage = Math.round((available / capacity) * 100);
    return `${percentage}% available`;
  };

  // Handle garage press interaction
  const handleGaragePress = (lot: ParkingLot) => {
    if (isGarageFull(lot.available)) {
      const statusText = getGarageStatus(lot.available, lot.capacity);
      const alertTitle = lot.available === 0 ? "Garage Full" : "Garage Nearly Full";
      const alertMessage = `${lot.name} is ${statusText} with ${lot.available} spots remaining.${
        lot.travelTime
          ? `\n\nTravel time: ${lot.travelTime.formattedDuration}`
          : ""
      }\n\nConsider checking other nearby garages for better availability.`;

      Alert.alert(
        alertTitle,
        alertMessage,
        [
          {
            text: "OK",
            style: "default",
          },
          {
            text: "View Alternatives", 
            style: "default",
            onPress: () => {
              // Future enhancement: could scroll to or highlight other garages
              console.log("View alternatives pressed");
            },
          },
        ],
        { cancelable: true }
      );
    } else {
      // For garages with good availability, show success info
      const statusText = getGarageStatus(lot.available, lot.capacity);
      Alert.alert(
        "Garage Information",
        `${lot.name} is ${statusText} with ${lot.available} spots available.${
          lot.travelTime
            ? `\n\nTravel time: ${lot.travelTime.formattedDuration}`
            : ""
        }`,
        [{ text: "OK", style: "default" }],
        { cancelable: true }
      );
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadAvailability = async () => {
      // *** TEMPORARILY DISABLED FOR TESTING FULL GARAGE POPUP ***
      // This prevents API data from overriding our static test values
      console.log("🧪 ========== API EFFECT STARTED ==========");
      console.log("🧪 API call disabled for testing - using static data with Northwestern Garage (1 spot) and DS/AI Lot (0 spots)");
      console.log("🔍 Current parking lots before API (should remain unchanged):", 
        INITIAL_PARKING_LOTS.map(lot => `${lot.name}: ${lot.available}/${lot.capacity}`));
      console.log("🚫 RETURNING EARLY - API SHOULD NOT RUN");
      
      // Visual confirmation that API is disabled
      Alert.alert("🧪 DEBUG", "API effect ran but was disabled. Data should remain: Northwestern=1, DS/AI=0");
      
      return; // Early return to skip API call
      
      try {
        const response = await fetch(
          `${getApiBaseUrl()}${AVAILABILITY_ENDPOINT}`
        );

        if (!response.ok) {
          console.error(
            "Failed to fetch parking availability:",
            response.status
          );
          return;
        }

        const payload: { lots?: ApiLot[] } = await response.json();
        const lots = Array.isArray(payload?.lots) ? payload.lots : undefined;
        if (!lots || lots.length === 0) {
          return;
        }

        const updatesById = new Map<number, ApiLot>();
        lots.forEach((lot) => updatesById.set(lot.id, lot));

        if (!isMounted) {
          return;
        }

        setParkingLots((prev) =>
          prev.map((lot) => {
            const update =
              updatesById.get(lot.id) ||
              lots.find((item) => item.name === lot.name);

            if (!update) {
              return lot;
            }

            return {
              ...lot,
              capacity:
                typeof update.capacity === "number"
                  ? update.capacity
                  : lot.capacity,
              available:
                typeof update.available === "number"
                  ? update.available
                  : lot.available,
            };
          })
        );
      } catch (error) {
        console.error("Failed to load parking availability", error);
      }
    };

    loadAvailability();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load travel times from default origin
  useEffect(() => {
    let isMounted = true;

    const loadTravelTimes = async () => {
      try {
        // Get user email from secure storage
        const userJson = await SecureStore.getItemAsync("user");
        const user = userJson ? JSON.parse(userJson) : null;
        const email = user?.email;
        
        if (!email) {
          console.log("🔍 No user email found - skipping travel time calculation");
          return;
        }

        console.log("📍 Calculating travel times for parking lots");

        // Use setParkingLots with a function to get current state and avoid overwriting
        setParkingLots(currentLots => {
          const travelTimePromises = currentLots.map(async (lot) => {
            // Skip if already has travel time to prevent unnecessary API calls
            if (lot.travelTime) {
              return lot;
            }

            if (!lot.lat || !lot.lng) {
              return { ...lot, travelTime: null };
            }

            const travelTime = await getTravelTimeFromDefaultOrigin(
              { latitude: lot.lat, longitude: lot.lng },
              email
            );

            return { ...lot, travelTime };
          });

          // Handle async operations properly
          Promise.all(travelTimePromises).then(lotsWithTravelTimes => {
            if (isMounted) {
              setParkingLots(lotsWithTravelTimes);
              // Detect origin type from first successful result
              const firstWithTravelTime = lotsWithTravelTimes.find(lot => lot.travelTime?.originType);
              if (firstWithTravelTime?.travelTime?.originType) {
                setOriginType(firstWithTravelTime.travelTime.originType);
              }
            }
          }).catch(error => {
            console.error("Failed to load travel times", error);
          });

          // Return current state unchanged for now
          return currentLots;
        });

      } catch (error) {
        console.error("Failed to load travel times", error);
      }
    };

    loadTravelTimes();

    return () => {
      isMounted = false;
    };
  }, []); // ← Empty dependency array to run only once

  const toggleFavorite = (id: number) => {
    setParkingLots((prevLots) =>
      prevLots.map((lot) =>
        lot.id === id ? { ...lot, isFavorite: !lot.isFavorite } : lot
      )
    );
  };

  const getAvailabilityColor = (available: number, capacity: number) => {
    const percentage = getAvailabilityPercentage(available, capacity);
    if (percentage > 50) return "#22c55e";
    if (percentage > 20) return "#eab308";
    return "#ef4444";
  };

  const getAvailabilityPercentage = (available: number, capacity: number) => {
    return (available / capacity) * 100;
  };

  const currentTime = new Date().toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24 }}>
      <ThemedText style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        Parking Garages
      </ThemedText>

      {/* 🔍 DEBUG BANNER */}
      <View style={{
        backgroundColor: "#ff6b6b",
        padding: 8,
        borderRadius: 4,
        marginBottom: 16,
      }}>
        <ThemedText style={{ color: "white", fontSize: 12, textAlign: "center" }}>
          🔍 DEBUG: {debugInfo}
        </ThemedText>
      </View>

      {/* Banner showing current location usage */}
      {originType === "current" && (
        <View style={{
          backgroundColor: "#3b82f6",
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "center",
        }}>
          <Ionicons name="information-circle" size={20} color="white" />
          <ThemedText style={{ color: "white", marginLeft: 8, flex: 1, fontSize: 13 }}>
            Using your current location for travel times.{"\n"}
            Set a starting location in Settings for more accurate estimates.
          </ThemedText>
        </View>
      )}

      {/* Success banner showing saved location usage */}
      {originType === "saved" && (
        <View style={{
          backgroundColor: "#22c55e",
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "center",
        }}>
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <ThemedText style={{ color: "white", marginLeft: 8, flex: 1, fontSize: 13 }}>
            Travel times calculated from your saved starting location
          </ThemedText>
        </View>
      )}

      {parkingLots.map((lot) => (
        <TouchableOpacity
          key={lot.id}
          onPress={() => handleGaragePress(lot)}
          activeOpacity={0.7}
          style={{ marginBottom: 16 }}
        >
          <ThemedView
            style={{
              backgroundColor: theme.mode === "dark" ? "#111827" : "#f9fafb",
              borderRadius: 12,
              padding: 16,
              borderWidth: 2,
              borderColor: getAvailabilityColor(lot.available, lot.capacity),
              // Add subtle shadow and scale effect for interactivity hint
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
              // Add subtle opacity for full garages
              opacity: isGarageFull(lot.available) ? 0.8 : 1,
            }}
          >
            <ThemedView style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <ThemedView style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ThemedText style={{ fontSize: 18, fontWeight: "600" }}>
                  {lot.name}
                </ThemedText>
                {isGarageFull(lot.available) && (
                  <View style={{
                    backgroundColor: "#ef4444",
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}>
                    <ThemedText style={{ fontSize: 10, color: "white", fontWeight: "600" }}>
                      {lot.available === 0 ? "FULL" : "LOW"}
                    </ThemedText>
                  </View>
                )}
                <ThemedText style={{ fontSize: 14, color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }}>Tap for info</ThemedText>
              </ThemedView>
              <ThemedText
                style={{ fontSize: 20, color: lot.isFavorite ? "#facc15" : (theme.mode === "dark" ? "#6b7280" : "#9ca3af") }}
                onPress={() => toggleFavorite(lot.id)}
              >
                {lot.isFavorite ? "*" : "+"}
              </ThemedText>
            </ThemedView>

          <ThemedView>
            <ThemedView style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <ThemedText style={{ fontSize: 14, color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }}>
                {lot.available}/{lot.capacity}
              </ThemedText>
              {lot.travelTime && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons 
                    name={originType === "saved" ? "home" : "location"} 
                    size={12} 
                    color={theme.mode === "dark" ? "#9ca3af" : "#6b7280"} 
                  />
                  <ThemedText style={{ fontSize: 14, color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }}>
                    {lot.travelTime.formattedDuration} ({lot.travelTime.formattedDistance})
                  </ThemedText>
                </View>
              )}
            </ThemedView>
            <ThemedView style={{ width: "100%", height: 12, backgroundColor: theme.mode === "dark" ? "#374151" : "#e5e7eb", borderRadius: 6, overflow: "hidden" }}>
              <ThemedView
                style={{
                  height: "100%",
                  width: `${getAvailabilityPercentage(lot.available, lot.capacity)}%`,
                  backgroundColor: getAvailabilityColor(lot.available, lot.capacity),
                  borderRadius: 6,
                }}
              />
            </ThemedView>
            </ThemedView>
          </ThemedView>
        </TouchableOpacity>
      ))}      <ThemedText style={{ fontSize: 14, color: theme.mode === "dark" ? "#9ca3af" : "#6b7280", textAlign: "center", marginTop: 24 }}>
        Last Updated: {currentTime}
      </ThemedText>
    </ThemedView>
  );
}