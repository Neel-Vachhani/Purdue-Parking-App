export const FLOOR_HEIGHT_FEET_DEFAULT = 11;
export const FLOOR_HEIGHT_METERS_DEFAULT = FLOOR_HEIGHT_FEET_DEFAULT * 0.3048;

const SURFACE_THRESHOLD_METERS = 1.5;

export type FloorProfile = {
  maxFloors: number;
  hasRoof: boolean;
};

const GARAGE_FLOOR_PROFILES: Record<string, FloorProfile> = {
  PGH: { maxFloors: 5, hasRoof: true },
  PGU: { maxFloors: 5, hasRoof: true },
  PGNW: { maxFloors: 5, hasRoof: true },
  PGMD: { maxFloors: 5, hasRoof: true },
  PGW: { maxFloors: 5, hasRoof: true },
  PGG: { maxFloors: 5, hasRoof: true },
};

export const FLOORING_GARAGE_CODES = new Set(Object.keys(GARAGE_FLOOR_PROFILES));

export const isFlooringGarage = (garageCode?: string | null): boolean => {
  if (!garageCode) return false;
  return FLOORING_GARAGE_CODES.has(garageCode.toUpperCase());
};

export type FloorResult = {
  floorLabel: string;
  floorIndex: number;
  isSurface: boolean;
};

export function computeFloorLabel(
  heightMeters: number | null,
  garageCode?: string | null,
  floorHeightMeters: number = FLOOR_HEIGHT_METERS_DEFAULT,
): FloorResult {
  if (!isFlooringGarage(garageCode)) {
    return { floorLabel: "Surface", floorIndex: 0, isSurface: true };
  }

  if (heightMeters === null || !Number.isFinite(heightMeters)) {
    return { floorLabel: "Surface", floorIndex: 0, isSurface: true };
  }

  if (heightMeters <= SURFACE_THRESHOLD_METERS) {
    return { floorLabel: "Surface", floorIndex: 0, isSurface: true };
  }

  const profile = garageCode
    ? GARAGE_FLOOR_PROFILES[garageCode.toUpperCase()]
    : undefined;
  const maxFloors = profile?.maxFloors ?? 5;
  const hasRoof = profile?.hasRoof ?? true;

  const floorIndex = Math.max(1, Math.round(heightMeters / floorHeightMeters));

  if (hasRoof && floorIndex > maxFloors) {
    return { floorLabel: "Roof", floorIndex, isSurface: false };
  }

  return {
    floorLabel: `L${Math.min(floorIndex, maxFloors)}`,
    floorIndex,
    isSurface: false,
  };
}
