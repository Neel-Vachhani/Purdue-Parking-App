import { Alert } from "react-native";

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type Garage = {
  id: string;
  name: string;
  location: LatLng;
  radiusMeters?: number;
};

export type GarageFullness = "EMPTY" | "SOMEWHAT_FULL" | "FULL";

const DEFAULT_PROXIMITY_RADIUS_METERS = 80;

// --- distance helper (unchanged) ---
const toRad = (deg: number) => (deg * Math.PI) / 180;

export const getDistanceMeters = (a: LatLng, b: LatLng): number => {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

// --- main function with THANK YOU alert added ---
type Options = {
  userLocation: LatLng;
  garages: Garage[];
  onSelection: (garage: Garage, fullness: GarageFullness) => void;
  defaultRadiusMeters?: number;
};

export const maybePromptGarageOccupancy = ({
  userLocation,
  garages,
  onSelection,
  defaultRadiusMeters = DEFAULT_PROXIMITY_RADIUS_METERS,
}: Options) => {
  if (!userLocation) return;

  let nearestGarage: Garage | null = null;
  let nearestDistance = Number.MAX_SAFE_INTEGER;

  // find nearest garage within radius
  for (const garage of garages) {
    const radius = garage.radiusMeters ?? defaultRadiusMeters;
    const distance = getDistanceMeters(userLocation, garage.location);

    if (distance <= radius && distance < nearestDistance) {
      nearestGarage = garage;
      nearestDistance = distance;
    }
  }

  if (!nearestGarage) return;

  Alert.alert(
    `How full is ${nearestGarage.name}?`,
    "Help improve live garage accuracy.",
    [
      {
        text: "Pretty empty",
        onPress: () => {
          onSelection(nearestGarage!, "EMPTY");
          Alert.alert("Thank you!", "Your feedback helps keep the app accurate.");
        },
      },
      {
        text: "Somewhat full",
        onPress: () => {
          onSelection(nearestGarage!, "SOMEWHAT_FULL");
          Alert.alert("Thank you!", "Your feedback helps keep the app accurate.");
        },
      },
      {
        text: "Packed",
        style: "destructive",
        onPress: () => {
          onSelection(nearestGarage!, "FULL");
          Alert.alert("Thank you!", "Your feedback helps keep the app accurate.");
        },
      },
    ],
    { cancelable: true },
  );
};
