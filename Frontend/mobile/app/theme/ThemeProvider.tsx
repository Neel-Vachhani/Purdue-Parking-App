import React, { createContext } from "react";
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme } from "./tokens";

// This creates a "context" that lets any component in our app access the current theme
// Think of it like a global variable that any screen or component can read
export type ThemeMode = "light" | "dark";
export type AppTheme = typeof lightTheme & { mode: ThemeMode; toggle: () => void };
export const ThemeContext = createContext<AppTheme>({ ...lightTheme, mode: "light", toggle: () => {} });

// This component wraps our entire app and provides the theme to all child components
export default function ThemeProvider({ children }: React.PropsWithChildren) {
  // Default to dark mode for the app regardless of system setting
  const [mode, setMode] = React.useState<ThemeMode>("dark");
  const toggle = React.useCallback(() => setMode((m) => (m === "dark" ? "light" : "dark")), []);
  const palette = mode === "dark" ? darkTheme : lightTheme;
  const currentTheme: AppTheme = { ...palette, mode, toggle };
  
  // Provide the theme to all child components
  return (
    <ThemeContext.Provider value={currentTheme}>
      {children}
    </ThemeContext.Provider>
  );
}
