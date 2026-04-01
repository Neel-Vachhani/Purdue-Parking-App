// Google Maps custom style JSON – applied on Android (Google Maps provider).
// On iOS with Apple Maps, customMapStyle is silently ignored; the map type
// ("mutedStandard" for dark, "standard" for light) gives a close-enough look.
// Palette follows the app's Purdue brand tokens from theme/tokens.ts.

export const DARK_MAP_STYLE = [
  // Base land geometry
  { elementType: "geometry", stylers: [{ color: "#1A1C21" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0E0F11" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94A3B8" }] },

  // Water – deep navy
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0D1929" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },

  // Local roads
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#252830" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1A1C21" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8D9AAA" }] },

  // Highways – slightly lighter, gold label text for emphasis
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#31353F" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#252830" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#CFB991" }] },

  // POI – muted so parking pins stand out
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1C1F24" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#64748B" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#0D1A0D" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#3D6B3D" }] },
  { featureType: "poi.school", elementType: "geometry", stylers: [{ color: "#1C2036" }] },

  // Transit
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1E2128" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#CFB991" }] },

  // Admin boundaries
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2A2D35" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
];

export const LIGHT_MAP_STYLE = [
  // Base land – parchment / ivory
  { elementType: "geometry", stylers: [{ color: "#EFE5D1" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F7F3EA" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#0F172A" }] },

  // Water – soft muted blue
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#A8C8DF" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },

  // Local roads – clean white
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#D4C9B5" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },

  // Highways – Purdue gold fill, darker gold stroke
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#CFB991" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#B5975A" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#0E0F11" }] },

  // POI – parchment-tinted
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#E5D9C5" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#C8DDB8" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#2F6B2F" }] },
  { featureType: "poi.school", elementType: "geometry", stylers: [{ color: "#DAD0F0" }] },

  // Transit
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#E5D9C5" }] },

  // Admin
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#D4C9B5" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
];
