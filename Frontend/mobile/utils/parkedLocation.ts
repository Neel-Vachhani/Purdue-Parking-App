import * as SecureStore from "expo-secure-store";

export type ParkedLocation = {
  garageCode: string | null;
  garageName: string | null;
  latitude: number;
  longitude: number;
  altitudeMeters: number | null;
  horizontalAccuracyMeters: number | null;
  verticalAccuracyMeters: number | null;
  heightAboveGroundMeters: number | null;
  floorLabel: string | null;
  isSurface: boolean;
  parkedAtIso: string;
};

const PARKED_LOCATION_KEY = "parked_location";

export async function saveParkedLocation(location: ParkedLocation): Promise<void> {
  await SecureStore.setItemAsync(PARKED_LOCATION_KEY, JSON.stringify(location));
}

export async function loadParkedLocation(): Promise<ParkedLocation | null> {
  try {
    const raw = await SecureStore.getItemAsync(PARKED_LOCATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ParkedLocation;
  } catch {
    return null;
  }
}

export async function clearParkedLocation(): Promise<void> {
  await SecureStore.deleteItemAsync(PARKED_LOCATION_KEY);
}
