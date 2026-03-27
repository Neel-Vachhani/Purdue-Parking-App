import React from "react";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";
import { ThemeContext } from "../../theme/ThemeProvider";

// This is a simple starter screen to show that our theming system works
// Replace this with your actual parking screens later (like ParkingListScreen, MapScreen, etc.)
export default function StarterScreen() {
  // Get the current theme so we can show what color we're using
  const theme = React.useContext(ThemeContext);
  
  return (
    // ThemedView automatically uses the right background color for light/dark mode
    <ThemedView style={{ 
      alignItems: "center",     // Center everything horizontally
      justifyContent: "center", // Center everything vertically  
      padding: 16               // Add some space around the edges
    }}>
      
      {/* Main title - bigger font size */}
      <ThemedText style={{ fontSize: 18, marginBottom: 8 }}>
        Purdue Parking App — Frontend Ready
      </ThemedText>
      
      {/* Show what our primary color is (Purdue Gold) */}
      <ThemedText>Theme primary: {theme.primary}</ThemedText>
      
      {/* Instructions for the team - slightly faded */}
      <ThemedText style={{ marginTop: 16, opacity: 0.8 }}>
        Add your screen here (e.g., ParkingListScreen)
      </ThemedText>
      
    </ThemedView>
  );
}
