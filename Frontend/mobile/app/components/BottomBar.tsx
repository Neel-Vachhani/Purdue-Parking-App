import React from "react";
import { View, Pressable, Platform } from "react-native";
import ThemedText from "./ThemedText";
import { ThemeContext } from "../theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Define what tabs we have in our app
type TabKey = "list" | "map" | "settings";
type Props = { active: TabKey; onChange: (key: TabKey) => void };

// Labels for each tab that users will see
const TAB_LABELS: Record<TabKey, string> = {
  list: "List",
  map: "Map", 
  settings: "Settings",
};


export default function BottomBar({ active, onChange }: Props) {
  const theme = React.useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  
  return (
    // Main container for the bottom tab bar
    <View style={{ 
      flexDirection: "row", 
      borderTopWidth: 1, 
      borderColor: "#ddd",
      backgroundColor: theme.bg, // Match app background
      paddingBottom: Math.max(8, insets.bottom), // Respect bottom inset
      paddingTop: 8,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: -2 },
      elevation: 6, // Android shadow
    }}>
      {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => {
        const isActive = key === active;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: "center",
              justifyContent: "center",
              // Show Purdue Gold background for active tab (more visible now)
              backgroundColor: isActive ? theme.primary : "transparent",
              borderRadius: 8, // Rounded corners for modern look
              marginHorizontal: 4, // Small gap between tabs
            }}
          >
            {/* Tab label - no icons, just clean text */}
            <ThemedText style={{ 
              fontWeight: isActive ? "700" : "400",
              fontSize: 16,
              // Dark text on gold background when active, normal theme text when inactive
              color: isActive ? "#000000" : theme.text
            }}>
              {TAB_LABELS[key]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
