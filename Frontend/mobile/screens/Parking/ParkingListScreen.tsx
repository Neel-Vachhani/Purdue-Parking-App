import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { View } from "react-native";
import { ThemeContext } from "../../theme/ThemeProvider";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";

type ParkingLot = {
  id: number;
  name: string;
  capacity: number;
  available: number;
  isFavorite: boolean;
  adaSpaces?: number;
  hasAdaAccess: boolean;
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
    adaSpaces: 24,
    hasAdaAccess: true,
  },
  {
    id: 2,
    name: "Grant Street Garage",
    capacity: 648,
    available: 118,
    isFavorite: false,
    adaSpaces: 18,
    hasAdaAccess: true,
  },
  {
    id: 3,
    name: "University Street Garage",
    capacity: 826,
    available: 406,
    isFavorite: false,
    adaSpaces: 20,
    hasAdaAccess: true,
  },
  {
    id: 4,
    name: "Northwestern Garage",
    capacity: 434,
    available: 2,
    isFavorite: false,
    adaSpaces: 16,
    hasAdaAccess: true,
  },
  {
    id: 5,
    name: "DS/AI Lot",
    capacity: 178,
    available: 32,
    isFavorite: false,
    adaSpaces: 8,
    hasAdaAccess: true,
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
  const theme = React.useContext(ThemeContext);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>(INITIAL_PARKING_LOTS);
  const [showOnlyAda, setShowOnlyAda] = useState(false);

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

  const filteredParkingLots = showOnlyAda
    ? parkingLots.filter(lot => lot.hasAdaAccess)
    : parkingLots;

  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24 }}>
      <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <ThemedText style={{ fontSize: 24, fontWeight: "bold" }}>
          Parking Garages
        </ThemedText>
        <ThemedView 
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: theme.mode === "dark" ? "#374151" : "#e5e7eb",
            padding: 8,
            borderRadius: 8
          }}
        >
          <ThemedText style={{ marginRight: 8, color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }}>
            ADA Only
          </ThemedText>
          <ThemedView 
            style={{ 
              width: 40, 
              height: 24, 
              backgroundColor: showOnlyAda ? "#22c55e" : (theme.mode === "dark" ? "#1f2937" : "#d1d5db"),
              borderRadius: 12,
              padding: 2,
            }}
          >
            <ThemedView 
              style={{
                width: 20,
                height: 20,
                backgroundColor: "#fff",
                borderRadius: 10,
                transform: [{ translateX: showOnlyAda ? 16 : 0 }],
              }}
            />
          </ThemedView>
          <ThemedText 
            onPress={() => setShowOnlyAda(!showOnlyAda)}
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0
            }}
          />
        </ThemedView>
      </ThemedView>

      {filteredParkingLots.map((lot) => (
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
            <ThemedView style={{ flex: 1 }}>
              <ThemedView style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <ThemedText style={{ fontSize: 18, fontWeight: "600" }}>
                  {lot.name}
                </ThemedText>
                <ThemedText style={{ fontSize: 16, color: theme.primary }}>ⓘ</ThemedText>
              </ThemedView>
              {lot.hasAdaAccess && (
                <ThemedView style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <ThemedText style={{ 
                    fontSize: 14, 
                    color: theme.mode === "dark" ? "#9ca3af" : "#6b7280",
                    backgroundColor: theme.mode === "dark" ? "#374151" : "#e5e7eb",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 4
                  }}>
                    ♿️ {lot.adaSpaces} spaces
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>
            <ThemedText
              style={{ fontSize: 20, color: lot.isFavorite ? "#facc15" : (theme.mode === "dark" ? "#6b7280" : "#9ca3af") }}
              onPress={() => toggleFavorite(lot.id)}
            >
              {lot.isFavorite ? "★" : "☆"}
            </ThemedText>
          </ThemedView>

          <ThemedView>
            <ThemedText style={{ fontSize: 14, color: theme.mode === "dark" ? "#9ca3af" : "#6b7280", marginBottom: 8 }}>
              {lot.available}/{lot.capacity}
            </ThemedText>
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