import { getDistanceMeters, LatLng } from "./garageProximity";
import { InitialGarage } from "../data/initialGarageAvailability";

export type GarageMatch = {
  garage: InitialGarage;
  distanceMeters: number;
};

const DEFAULT_RADIUS_METERS = 90;

export function findNearestGarage(
  userLocation: LatLng,
  garages: InitialGarage[],
  radiusMeters: number = DEFAULT_RADIUS_METERS,
): GarageMatch | null {
  let nearest: GarageMatch | null = null;

  garages.forEach((garage) => {
    const distanceMeters = getDistanceMeters(userLocation, {
      latitude: garage.lat,
      longitude: garage.lng,
    });

    if (distanceMeters > radiusMeters) {
      return;
    }

    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { garage, distanceMeters };
    }
  });

  return nearest;
}
