import { API_BASE_URL } from "../config/env";

export type ElevationLookupResult = {
  found: boolean;
  ground_elevation_m?: number;
  floor_height_m?: number;
  max_floors?: number;
  has_roof?: boolean;
  garage_code?: string;
  source?: string;
  distance_m?: number;
};

export async function fetchGroundElevation(
  latitude: number,
  longitude: number,
  garageCode?: string | null,
): Promise<ElevationLookupResult> {
  if (!API_BASE_URL) {
    return { found: false };
  }

  const response = await fetch(`${API_BASE_URL}/elevation/lookup/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      latitude,
      longitude,
      garage_code: garageCode ?? undefined,
    }),
  });

  if (!response.ok) {
    return { found: false };
  }

  const payload = (await response.json()) as ElevationLookupResult;
  return payload;
}
