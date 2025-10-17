import React from "react";
import { View, ViewProps } from "react-native";
import { ThemeContext } from "../theme/ThemeProvider";

// This is a View component that automatically uses the correct background color
// Use this instead of regular <View> when you want the background to match the theme
// Example: <ThemedView style={{padding: 20}}>content here</ThemedView>
export default function ThemedView(props: ViewProps) {
  // Get the current theme (light or dark mode colors)
  const theme = React.useContext(ThemeContext);
  
  // Return a View with the theme background color
  // The {...props} passes through any other props you give it (like onPress, etc.)
  // The style array combines our theme background with any custom styles you add
  return (
    <View 
      {...props} 
      style={[
        { flex: 1, backgroundColor: theme.bg }, // Use theme background color
        props.style // Your custom styles go on top
      ]} 
    />
  );
}
