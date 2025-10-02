import React, { createContext } from "react";
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme } from "./tokens";

// This creates a "context" that lets any component in our app access the current theme
// Think of it like a global variable that any screen or component can read
export const ThemeContext = createContext(lightTheme);

// This component wraps our entire app and provides the theme to all child components
export default function ThemeProvider({ children }: React.PropsWithChildren) {
  // Check if the user's phone is set to light or dark mode
  const systemTheme = useColorScheme(); // Returns "light" or "dark"
  
  // Choose which theme to use based on the user's phone settings
  let currentTheme;
  if (systemTheme === "dark") {
    currentTheme = darkTheme;
  } else {
    currentTheme = lightTheme; // Default to light theme if we can't detect
  }
  
  // Provide the theme to all child components
  return (
    <ThemeContext.Provider value={currentTheme}>
      {children}
    </ThemeContext.Provider>
  );
}
