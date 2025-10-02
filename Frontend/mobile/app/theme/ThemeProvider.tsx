import React, { createContext } from "react";
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme } from "./tokens";

// This creates a "context" that lets any component in our app access the current theme
// Think of it like a global variable that any screen or component can read
export const ThemeContext = createContext(lightTheme);

// This component wraps our entire app and provides the theme to all child components
export default function ThemeProvider({ children }: React.PropsWithChildren) {
  // For now, we're building dark mode only - ignore system settings
  // Later we can add a toggle in settings to let users choose
  const currentTheme = darkTheme;
  
  // Provide the theme to all child components
  return (
    <ThemeContext.Provider value={currentTheme}>
      {children}
    </ThemeContext.Provider>
  );
}
