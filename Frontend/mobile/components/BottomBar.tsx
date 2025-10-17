import React from "react";
import { View, Pressable } from "react-native";
import { ThemeContext } from "../theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ThemedText from "./ThemedText";

// Add "calendar" to TabKey
type TabKey = "garages" | "map" | "settings" | "calendar";
type Props = { active: TabKey; onChange: (key: TabKey) => void };

// Update labels to include Calendar
const TAB_LABELS: Record<TabKey, string> = {
  garages: "Garages",
  map: "Map",
  settings: "Settings",
  calendar: "Calendar",
};

export default function BottomBar({ active, onChange }: Props) {
  const theme = React.useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: "row",
        borderTopWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.bg,
        paddingBottom: Math.max(8, insets.bottom),
        paddingTop: 8,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 },
        elevation: 6,
      }}
    >
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
              backgroundColor: isActive ? theme.primary : "transparent",
              borderRadius: 8,
              marginHorizontal: 4,
            }}
          >
            <ThemedText
              style={{
                fontWeight: isActive ? "700" : "400",
                fontSize: 16,
                color: isActive ? "#000000" : theme.text,
              }}
            >
              {TAB_LABELS[key]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
