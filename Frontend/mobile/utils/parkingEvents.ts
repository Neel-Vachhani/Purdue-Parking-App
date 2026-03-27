export type ParkingUpdatePayload = {
  lot: string;
  count: number;
};

export type ParkingUpdateListener = (payload: ParkingUpdatePayload) => void;

const listeners = new Set<ParkingUpdateListener>();

export function emitParkingUpdate(payload: ParkingUpdatePayload) {
  listeners.forEach((listener) => listener(payload));
}

export function subscribeToParkingUpdates(listener: ParkingUpdateListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
