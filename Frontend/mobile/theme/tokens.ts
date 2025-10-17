// All the colors we use in our app
// These are Purdue's official brand colors
export const colors = {
  gold:   "#CFB991",   // Purdue Gold - our main brand color
  black:  "#000000",   // Purdue Black - official brand color
  white:  "#FFFFFF",   // White for backgrounds and text
  gray900:"#111827",   // Very dark gray for dark mode backgrounds
  gray200:"#E5E7EB",   // Light gray for borders and subtle backgrounds
  gray800:"#1F2937",   // Dark gray for borders in dark mode
};

// Light theme - what the app looks like in light mode
export const lightTheme = {
  bg: colors.white,      // Background color
  text: colors.black,    // Text color
  primary: colors.gold,  // Main accent color (buttons, highlights, etc.)
  border: colors.gray200,
};

// Dark theme - what the app looks like in dark mode
export const darkTheme = {
  bg: colors.black,      // Background color
  text: colors.white,    // Text color
  primary: colors.gold,  // Main accent color (same gold works in both modes)
  border: colors.gray800,
};
