import Constants from "expo-constants";
import { Platform } from "react-native";
import { GARAGE_DEFINITIONS } from "../../data/garageDefinitions";
import { ParkingPass } from "../../constants/passes";

export interface ParkingLocation {
  id: string;
  code: string;
  title: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  passes?: ParkingPass[];
  favorite?: boolean;
  available?: number;
  capacity?: number;
}

const BASE_COORDINATES: ParkingLocation[] = GARAGE_DEFINITIONS.map((definition, index) => ({
  id: String(index + 1),
  code: definition.code,
  title: definition.name,
  coordinate: {
    latitude: definition.lat,
    longitude: definition.lng,
  },
  description: "",
  passes: definition.passes,
  favorite: definition.favorite ?? false,
}));

type ApiLot = {
  id?: number;
  name?: string;
  code?: string;
  available?: number | string;
  capacity?: number | string;
};

const parseCount = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

// Match the same endpoint the ParkingList screen calls so both views share one
// source of truth for live availability numbers.
const AVAILABILITY_ENDPOINT = "/parking/availability/";

const getApiBaseUrl = (): string => {
  const configExtra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  const manifest = Constants.manifest as
    | { extra?: { apiBaseUrl?: string }; debuggerHost?: string }
    | null;
  const manifestExtra = manifest?.extra;

  const override = configExtra?.apiBaseUrl || manifestExtra?.apiBaseUrl;
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

const cache: { locations: ParkingLocation[] | null; timestamp: number | null } = {
  locations: null,
  timestamp: null,
};

export async function loadParkingLocations(): Promise<ParkingLocation[]> {
  const now = Date.now();
  if (cache.locations && cache.timestamp && now - cache.timestamp < 60_000) {
    return cache.locations;
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}${AVAILABILITY_ENDPOINT}`);
    if (!response.ok) {
      console.error("Failed to fetch parking availability for map:", response.status);
      cache.locations = BASE_COORDINATES;
      cache.timestamp = now;
      return cache.locations;
    }

    const payload: { lots?: ApiLot[] } = await response.json();
    const lots = Array.isArray(payload?.lots) ? payload.lots : [];
    const lotsByTitle = new Map<string, ApiLot>();
    const lotsById = new Map<string, ApiLot>();
    const lotsByCode = new Map<string, ApiLot>();

    lots.forEach((lot) => {
      const idKey = lot.id !== undefined ? String(lot.id) : undefined;
      const nameKey = lot.name?.trim();
      const codeKey = lot.code?.trim()?.toUpperCase();
      if (idKey) {
        lotsById.set(idKey, lot);
      }
      if (nameKey) {
        lotsByTitle.set(nameKey, lot);
      }
      if (codeKey) {
        lotsByCode.set(codeKey, lot);
      }
    });

    const locations = BASE_COORDINATES.map((location) => {
      const match =
        lotsById.get(location.id) ||
        lotsByTitle.get(location.title) ||
        lotsByCode.get(location.code.toUpperCase()) ||
        lots.find((lot) => lot.name?.toLowerCase() === location.title.toLowerCase());

      if (!match) {
        return {
          ...location,
          description: location.description ?? "No live data",
        };
      }

      const available = parseCount(match.available);
      const capacity = parseCount(match.capacity);

      const description =
        available !== undefined
          ? `Available: ${available}${
              capacity !== undefined ? ` / ${capacity}` : " spots"
            }`
          : location.description ?? "Availability unavailable";

      return {
        ...location,
        description,
        available: available ?? location.available,
        capacity: capacity ?? location.capacity,
      };
    });

    cache.locations = locations;
    cache.timestamp = now;
    return locations;
  } catch (error) {
    console.error("Failed to load parking availability for map", error);
    cache.locations = BASE_COORDINATES;
    cache.timestamp = now;
    return cache.locations;
  }
}

export async function getParkingLocations(): Promise<ParkingLocation[]> {
  return loadParkingLocations();
}

export const PARKING_LOCATIONS: ParkingLocation[] = BASE_COORDINATES;