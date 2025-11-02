import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { View } from "react-native";
import * as SecureStore from "expo-secure-store";
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
    const theme = React.useContext(ThemeContext);

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
    available: 2,
    isFavorite: false,
    lat: 40.42964447741563,
    lng: -86.91111021483658,
  },
  {
    id: 5,
    name: "DS/AI Lot",
    capacity: 178,
    available: 32,
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

  return `http://${host}:8000`;
};

export default function ParkingListScreen() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>(
    INITIAL_PARKING_LOTS
  );

  useEffect(() => {
    let isMounted = true;

    const loadAvailability = async () => {
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
          return;
        }

        // Calculate travel times for each lot
        const travelTimePromises = parkingLots.map(async (lot) => {
          if (!lot.lat || !lot.lng) {
            return { ...lot, travelTime: null };
          }

          const travelTime = await getTravelTimeFromDefaultOrigin(
            { latitude: lot.lat, longitude: lot.lng },
            email
          );

          return { ...lot, travelTime };
        });

        const lotsWithTravelTimes = await Promise.all(travelTimePromises);

        if (isMounted) {
          setParkingLots(lotsWithTravelTimes);
        }
      } catch (error) {
        console.error("Failed to load travel times", error);
      }
    };

    loadTravelTimes();

    return () => {
      isMounted = false;
    };
  }, []);

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
      <ThemedText style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>
        Parking Garages
      </ThemedText>

      {parkingLots.map((lot) => (
        <ThemedView
          key={lot.id}
          style={{
            backgroundColor: theme.mode === "dark" ? "#111827" : "#f9fafb",
            borderRadius: 12,
            padding: 16,
            borderWidth: 2,
            borderColor: getAvailabilityColor(lot.available, lot.capacity),
            marginBottom: 16,
          }}
        >
          <ThemedView style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <ThemedView style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: "600" }}>
                {lot.name}
              </ThemedText>
              <ThemedText style={{ fontSize: 16, color: theme.primary }}>(i)</ThemedText>
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
                <ThemedText style={{ fontSize: 14, color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }}>
                  {lot.travelTime.formattedDuration} ({lot.travelTime.formattedDistance})
                </ThemedText>
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
      ))}

      <ThemedText style={{ fontSize: 14, color: theme.mode === "dark" ? "#9ca3af" : "#6b7280", textAlign: "center", marginTop: 24 }}>
        Last Updated: {currentTime}
      </ThemedText>
    </ThemedView>
  );
}