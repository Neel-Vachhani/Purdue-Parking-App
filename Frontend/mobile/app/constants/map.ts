export const PURDUE_CENTER = { latitude: 40.4237, longitude: -86.9212 };
// Tighter deltas to focus on campus area
export const DEFAULT_DELTA = { latitudeDelta: 0.02, longitudeDelta: 0.02 };

export const INITIAL_REGION = {
  latitude: PURDUE_CENTER.latitude,
  longitude: PURDUE_CENTER.longitude,
  latitudeDelta: DEFAULT_DELTA.latitudeDelta,
  longitudeDelta: DEFAULT_DELTA.longitudeDelta,
};

export const MIN_ZOOM_LEVEL = 10;
export const MAX_ZOOM_LEVEL = 20;


