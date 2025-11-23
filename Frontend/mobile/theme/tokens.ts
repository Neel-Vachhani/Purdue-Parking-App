// All the colors we use in our app
// These are Purdue's official brand colors
export const colors = {
  gold: "#CFB991",            // Purdue Gold - main brand accent
  goldDark: "#B5975A",
  ivory: "#F7F3EA",           // Neutral background for light mode
  parchment: "#EFE5D1",       // Muted neutral for cards + chips
  coal: "#0E0F11",            // Almost black
  graphite: "#16181C",
  white: "#FFFFFF",
  slate950: "#030712",
  slate900: "#0F172A",
  slate800: "#1F2937",
  slate600: "#475569",
  slate500: "#64748B",
  slate400: "#94A3B8",
  slate100: "#F1F5F9",
  borderLight: "#E3DACC",
  borderMuted: "#EDE4D2",
  success: "#2F855A",
  warning: "#B45309",
  danger: "#B42318",
  info: "#2563EB",
};

// Light theme - what the app looks like in light mode
export const lightTheme = {
  bg: colors.ivory,
  surface: colors.white,
  surfaceMuted: colors.parchment,
  text: colors.slate900,
  textMuted: "rgba(15,23,42,0.7)",
  primary: colors.gold,
  primaryText: colors.coal,
  border: colors.borderLight,
  borderMuted: colors.borderMuted,
  shadow: "rgba(15,15,15,0.08)",
  overlay: "rgba(0,0,0,0.04)",
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.info,
};

// Dark theme - what the app looks like in dark mode
export const darkTheme = {
  bg: colors.graphite,
  surface: "#1C1F24",
  surfaceMuted: colors.graphite,
  text: colors.white,
  textMuted: "rgba(255,255,255,0.72)",
  primary: colors.gold,
  primaryText: colors.coal,
  border: "rgba(255,255,255,0.12)",
  borderMuted: "rgba(255,255,255,0.05)",
  shadow: "rgba(0,0,0,0.6)",
  overlay: "rgba(255,255,255,0.04)",
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#F87171",
  info: "#60A5FA",
};
