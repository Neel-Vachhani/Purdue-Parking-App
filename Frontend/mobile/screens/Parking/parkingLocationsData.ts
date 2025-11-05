import Constants from "expo-constants";
import { Platform } from "react-native";

export interface ParkingLocation {
  id: string;
  title: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  description?: string;
}

const BASE_COORDINATES: ParkingLocation[] = [
  {
    id: '1',
    title: 'Harrison Garage',
    coordinate: {
      latitude: 40.420928743577996,
      longitude: -86.91759020145541
    },
    description: ''
  },
  {
    id: '2',
    title: 'Grant Street Garage',
    coordinate: {
      latitude: 40.42519706999441,
      longitude: -86.90972814560583
    },
    description: ''
  },
  {
    id: '3',
    title: 'University Street Garage',
    coordinate: {
      latitude: 40.4266903911869,
      longitude: -86.91728093292815
    },
    description: ''
  },
  {
    id: '4',
    title: 'Northwestern Garage',
    coordinate: {
      latitude: 40.42964447741563,
      longitude: -86.91111021483658
    },
    description: ''
  },
  {
    id: '5',
    title: 'DS/AI Lot',
    coordinate: {
      latitude: 40.428997605924756,
      longitude: -86.91608038169943
    },
    description: ''
  },
  // Add more parking locations as needed
];

type ApiLot = {
  id?: number;
  name?: string;
  available?: number;
  capacity?: number;
};

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

    lots.forEach((lot) => {
      const idKey = lot.id !== undefined ? String(lot.id) : undefined;
      const nameKey = lot.name?.trim();
      if (idKey) {
        lotsById.set(idKey, lot);
      }
      if (nameKey) {
        lotsByTitle.set(nameKey, lot);
      }
    });

    const locations = BASE_COORDINATES.map((location) => {
      const match =
        lotsById.get(location.id) ||
        lotsByTitle.get(location.title) ||
        lots.find((lot) => lot.name?.toLowerCase() === location.title.toLowerCase());

      if (!match) {
        return {
          ...location,
          description: location.description ?? "No live data",
        };
      }

      const available =
        typeof match.available === "number" ? match.available : undefined;
      const capacity =
        typeof match.capacity === "number" ? match.capacity : undefined;

      const description =
        available !== undefined
          ? `Available: ${available}${
              capacity !== undefined ? ` / ${capacity}` : " spots"
            }`
          : location.description ?? "Availability unavailable";

      return {
        ...location,
        description,
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