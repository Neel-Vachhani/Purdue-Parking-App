import React from "react";
import { Text, TextProps } from "react-native";
import { ThemeContext } from "../theme/ThemeProvider";

// This is a Text component that automatically uses the correct text color
// Use this instead of regular <Text> when you want text that adapts to light/dark mode
// Example: <ThemedText style={{fontSize: 20}}>Hello World</ThemedText>
export default function ThemedText(props: TextProps) {
  // Get the current theme (light or dark mode colors)
  const theme = React.useContext(ThemeContext);
  
  // Return a Text with the theme text color and default font size
  // The {...props} passes through any other props you give it (like onPress, etc.)
  // The style array combines our theme text color with any custom styles you add
  return (
    <Text 
      {...props} 
      style={[
        { 
          color: theme.text,
          fontSize: 16
        }, 
        props.style
      ]} 
    />
  );
}
