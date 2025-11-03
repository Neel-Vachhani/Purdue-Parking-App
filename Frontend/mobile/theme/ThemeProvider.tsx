import React, { createContext } from "react";
import { lightTheme, darkTheme } from "./tokens";

// This creates a "context" that lets any component in our app access the current theme
// Think of it like a global variable that any screen or component can read
export type ThemeMode = "light" | "dark";
// Theme object exposed to the app. Always use these tokens; never hard-code hex values.
export type AppTheme = typeof lightTheme & { mode: ThemeMode; toggle: () => void };
export const ThemeContext = createContext<AppTheme>({ ...lightTheme, mode: "light", toggle: () => {} });

// This component wraps our entire app and provides the theme to all child components
export default function ThemeProvider({ children }: React.PropsWithChildren) {
  // Default to dark mode regardless of system setting (brand choice)
  const [mode, setMode] = React.useState<ThemeMode>("dark");
  const toggle = React.useCallback(() => setMode((m) => (m === "dark" ? "light" : "dark")), []);
  const palette = mode === "dark" ? darkTheme : lightTheme;
  const currentTheme: AppTheme = React.useMemo(() => ({ ...palette, mode, toggle }), [mode, palette]);
  
  // Provide the theme to all child components
  return (
    <ThemeContext.Provider value={currentTheme}>
      {children}
    </ThemeContext.Provider>
  );
}
