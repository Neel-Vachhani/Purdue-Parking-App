export type ParkingAvailabilityLot = {
  id: number | null;
  code: string;
  name: string;
  available: number | null;
  capacity: number | null;
};

export type ParkingAvailabilitySnapshot = {
  lots: ParkingAvailabilityLot[];
  generatedAtUtc: string;
  source: string;
};

type ParkingAvailabilityApiLot = {
  id?: number;
  code?: string;
  name?: string;
  available?: number | null;
  capacity?: number | null;
};

type ParkingAvailabilityResponse = {
  lots?: ParkingAvailabilityApiLot[];
  generated_at_utc?: string;
  source?: string;
};

const AVAILABILITY_ENDPOINT = "/api/parking/availability/";

function normalizeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(Math.round(value), 0);
}

export async function fetchParkingAvailability(): Promise<ParkingAvailabilitySnapshot> {
  const response = await fetch(AVAILABILITY_ENDPOINT, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Availability request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ParkingAvailabilityResponse;
  const lots = Array.isArray(payload?.lots) ? payload.lots : [];

  const normalizedLots = lots
    .map((lot): ParkingAvailabilityLot => {
      const normalizedCode = typeof lot.code === "string" ? lot.code.toUpperCase() : "";
      const normalizedName = typeof lot.name === "string" ? lot.name : "Unknown lot";

      return {
        id: typeof lot.id === "number" && Number.isFinite(lot.id) ? lot.id : null,
        code: normalizedCode,
        name: normalizedName,
        available: normalizeNumber(lot.available),
        capacity: normalizeNumber(lot.capacity),
      };
    })
    .filter((lot) => lot.code.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const generatedAtUtc =
    typeof payload.generated_at_utc === "string" && payload.generated_at_utc.trim().length > 0
      ? payload.generated_at_utc
      : new Date().toISOString();

  return {
    lots: normalizedLots,
    generatedAtUtc,
    source: typeof payload.source === "string" && payload.source ? payload.source : "redis_snapshot",
  };
}
