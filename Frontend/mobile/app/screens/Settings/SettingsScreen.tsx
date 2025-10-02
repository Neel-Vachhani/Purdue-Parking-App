import React from "react";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";

export default function SettingsScreen() {
  return (
    <ThemedView style={{ alignItems: "center", justifyContent: "center" }}>
      <ThemedText style={{ fontSize: 18 }}>Settings Screen</ThemedText>
    </ThemedView>
  );
}
