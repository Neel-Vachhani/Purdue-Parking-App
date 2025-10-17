// Geographic constants for campus map configuration
export const PURDUE_CENTER = { latitude: 40.4237, longitude: -86.9212 };
// Tighter deltas focus initial camera on campus (tune if UX requests)
export const DEFAULT_DELTA = { latitudeDelta: 0.02, longitudeDelta: 0.02 };

// Default starting region for the map camera
export const INITIAL_REGION = {
  latitude: PURDUE_CENTER.latitude,
  longitude: PURDUE_CENTER.longitude,
  latitudeDelta: DEFAULT_DELTA.latitudeDelta,
  longitudeDelta: DEFAULT_DELTA.longitudeDelta,
};

// Conservative zoom bounds that work across iOS/Android
export const MIN_ZOOM_LEVEL = 10;
export const MAX_ZOOM_LEVEL = 20;


