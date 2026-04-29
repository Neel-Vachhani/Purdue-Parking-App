import * as Location from "expo-location";

import { fetchGroundElevation } from "./elevationApi";
import { computeFloorLabel } from "./parkingFloor";
import { ParkedLocation } from "./parkedLocation";

export type CaptureParkingInput = {
  garageCode?: string | null;
  garageName?: string | null;
};

const SAMPLE_COUNT = 3;

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

export async function captureParkingSnapshot(
  input: CaptureParkingInput,
): Promise<ParkedLocation> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission not granted");
  }

  const samples: Location.LocationObject[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const sample = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
    samples.push(sample);
  }

  const latitudes = samples.map((s) => s.coords.latitude);
  const longitudes = samples.map((s) => s.coords.longitude);
  const altitudes = samples
    .map((s) => s.coords.altitude)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const accuracies = samples
    .map((s) => s.coords.accuracy)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const altitudeAccuracies = samples
    .map((s) => s.coords.altitudeAccuracy)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  const latitude = median(latitudes);
  const longitude = median(longitudes);
  const altitudeMeters = altitudes.length ? median(altitudes) : null;
  const horizontalAccuracyMeters = accuracies.length ? median(accuracies) : null;
  const verticalAccuracyMeters = altitudeAccuracies.length
    ? median(altitudeAccuracies)
    : null;

  let heightAboveGroundMeters: number | null = null;
  let floorHeightMeters: number | undefined;

  if (altitudeMeters !== null) {
    const elevation = await fetchGroundElevation(
      latitude,
      longitude,
      input.garageCode,
    );

    if (elevation.found && typeof elevation.ground_elevation_m === "number") {
      heightAboveGroundMeters = altitudeMeters - elevation.ground_elevation_m;
      if (heightAboveGroundMeters < 0) {
        heightAboveGroundMeters = 0;
      }
      floorHeightMeters = elevation.floor_height_m;
    }
  }

  const floorResult = computeFloorLabel(
    heightAboveGroundMeters,
    input.garageCode,
    floorHeightMeters,
  );

  return {
    garageCode: input.garageCode ?? null,
    garageName: input.garageName ?? null,
    latitude,
    longitude,
    altitudeMeters,
    horizontalAccuracyMeters,
    verticalAccuracyMeters,
    heightAboveGroundMeters,
    floorLabel: floorResult.floorLabel,
    isSurface: floorResult.isSurface,
    parkedAtIso: new Date().toISOString(),
  };
}
