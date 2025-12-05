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
  {
    id: '6',
    title: 'McCutcheon Drive Parking Garage',
    coordinate: {
      latitude: 40.42652551336225, 
      longitude: -86.92818343856386
    },
    description: ''
  },
  {
    id: '7',
    title: 'Wood Street Parking Garage',
    coordinate: {
      latitude: 40.422896646954236,
      longitude: -86.90994775472916
    },
    description: ''
  },
  {
    id: '8',
    title: 'Marstellar Street Parking Garage',
    coordinate: {
      latitude: 40.423087103382265,
      longitude: -86.91295902148983
    },
    description: ''
  },
  {
    id: '9',
    title: 'Lot R',
    coordinate: {
      latitude: 40.437068242471796,
      longitude: -86.91894044353512
    },
    description: ''
  },
  {
    id: '10',
    title: 'Lot H',
    coordinate: {
      latitude: 40.43766476303421,
      longitude: -86.91835119049729
    },
    description: ''
  },
  {
    id: '11',
    title: 'Lot FB',
    coordinate: {
      latitude: 40.43697244134169,
      longitude: -86.91615958545678
    },
    description: ''
  },
  {
    id: '12',
    title: 'Kozuch Football Performance Complex Lot',
    coordinate: {
      latitude: 40.435319735654794,
      longitude: -86.91592343445679
    },
    description: ''
  },
  {
    id: '13',
    title: 'Lot A',
    coordinate: {
      latitude: 40.43315708120875,
      longitude: -86.91788026833336
    },
    description: ''
  },
  {
    id: '14',
    title: 'Co-Rec Parking Lots',
    coordinate: {
      latitude: 40.430492687715876,
      longitude: -86.92439346008695
    },
    description: ''
  },
  {
    id: '15',
    title: 'Lot O',
    coordinate: {
      latitude: 40.43044626261592,
      longitude: -86.92189709454921
    },
    description: ''
  },
  {
    id: '16',
    title: 'Tarkington & Wiley Lots',
    coordinate: {
      latitude: 40.43004149054732,
      longitude: -86.91992165130084
    },
    description: ''
  },
  {
    id: '17',
    title: 'Lot AA',
    coordinate: {
      latitude: 40.42975994682923,
      longitude: -86.91880262881052
    },
    description: ''
  },
  {
    id: '18',
    title: 'Lot BB',
    coordinate: {
      latitude: 40.42998628886127,
      longitude: -86.91755979034515
    },
    description: ''
  },
  {
    id: '19',
    title: 'Windsor & Krach Shared Lot',
    coordinate: {
      latitude: 40.427032124421046,
      longitude: -86.9215123526961
    },
    description: ''
  },
  {
    id: '20',
    title: 'Shreve, Earhart, & Meredith Shared Lot',
    coordinate: {
      latitude: 40.426307898399834,
      longitude: -86.92424170926513
    },
    description: ''
  },
  {
    id: '21',
    title: 'McCutcheon, Harrison, & Hillenbrand Lot',
    coordinate: {
      latitude: 40.4256588119257, 
      longitude: -86.92747010704142
    },
    description: ''
  },
  {
    id: '22',
    title: 'Duhme Hall Parking Lot',
    coordinate: {
      latitude: 40.42518360003659,
      longitude: -86.92070535142598
    },
    description: ''
  },
  {
    id: '23',
    title: 'Pierce Street Parking Lot',
    coordinate: {
      latitude: 40.422807519256466,
      longitude: -86.90949786590964
    },
    description: ''
  },
  {
    id: '24',
    title: 'Smith & Biochemistry Lot',
    coordinate: {
      latitude: 40.42312333069804,
      longitude: -86.9168025644751
    },
    description: ''
  },
  {
    id: '25',
    title: 'Discovery Lot (A Permit)',
    coordinate: {
      latitude: 40.42042563354299,
      longitude: -86.92323501777994
    },
    description: ''
  },
  {
    id: '26',
    title: 'Discovery Lot (AB Permit)',
    coordinate: {
      latitude: 40.41979072949785,
      longitude: -86.92303734779857
    },
    description: ''
  },
  {
    id: '27',
    title: 'Discovery Lot (ABC Permit)',
    coordinate: {
      latitude: 40.41889824033828,
      longitude: -86.92335659251165
    },
    description: ''
  },
  {
    id: '28',
    title: 'Airport Parking Lots',
    coordinate: {
      latitude: 40.41570075385503,
      longitude: -86.92525336949184
    },
    description: ''
  }
];

type ApiLot = {
  id?: number;
  name?: string;
  available?: number;
  capacity?: number;
};

const AVAILABILITY_ENDPOINT = "/api/parking/availability/";

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