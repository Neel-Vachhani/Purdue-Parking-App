import React, { useState } from "react";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";

export default function ParkingListScreen() {
  const [parkingLots, setParkingLots] = useState([
    {
      id: 1,
      name: "Harrison Garage",
      capacity: 800,
      available: 560,
      isFavorite: false,
    },
    {
      id: 2,
      name: "Grant Street Garage",
      capacity: 648,
      available: 118,
      isFavorite: false,
    },
    {
      id: 3,
      name: "University Street Garage",
      capacity: 826,
      available: 406,
      isFavorite: false,
    },
    {
      id: 4,
      name: "Northwestern Garage",
      capacity: 434,
      available: 2,
      isFavorite: false,
    },
    {
      id: 5,
      name: "DS/AI Lot",
      capacity: 178,
      available: 32,
      isFavorite: false,
    },
  ]);

  const toggleFavorite = (id: number) => {
    setParkingLots(
      parkingLots.map((lot) =>
        lot.id === id ? { ...lot, isFavorite: !lot.isFavorite } : lot
      )
    );
  };

  const getAvailabilityColor = (available: number, capacity: number) => {
    const percentage = getAvailabilityPercentage(available, capacity);
    if (percentage > 50) return "#22c55e";
    if (percentage > 20) return "#eab308";
    return "#ef4444";
  };

  const getAvailabilityPercentage = (available: number, capacity: number) => {
    return (available / capacity) * 100;
  };

  const currentTime = new Date().toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  return (
    <ThemedView style={{ flex: 1, backgroundColor: "#000000", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 24 }}>
      <ThemedText style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>
        Parking Lots
      </ThemedText>

      {parkingLots.map((lot) => (
        <ThemedView
          key={lot.id}
          style={{
            backgroundColor: "#111827",
            borderRadius: 12,
            padding: 16,
            borderWidth: 2,
            borderColor: getAvailabilityColor(lot.available, lot.capacity),
            marginBottom: 16,
          }}
        >
          <ThemedView style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <ThemedView style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: "600" }}>
                {lot.name}
              </ThemedText>
              <ThemedText style={{ fontSize: 16, color: "#60a5fa" }}>ⓘ</ThemedText>
            </ThemedView>
            <ThemedText
              style={{ fontSize: 20, color: lot.isFavorite ? "#facc15" : "#6b7280" }}
              onPress={() => toggleFavorite(lot.id)}
            >
              {lot.isFavorite ? "★" : "☆"}
            </ThemedText>
          </ThemedView>

          <ThemedView>
            <ThemedText style={{ fontSize: 14, color: "#9ca3af", marginBottom: 8 }}>
              {lot.available}/{lot.capacity}
            </ThemedText>
            <ThemedView style={{ width: "100%", height: 12, backgroundColor: "#374151", borderRadius: 6, overflow: "hidden" }}>
              <ThemedView
                style={{
                  height: "100%",
                  width: `${getAvailabilityPercentage(lot.available, lot.capacity)}%`,
                  backgroundColor: getAvailabilityColor(lot.available, lot.capacity),
                  borderRadius: 6,
                }}
              />
            </ThemedView>
          </ThemedView>
        </ThemedView>
      ))}

      <ThemedText style={{ fontSize: 14, color: "#9ca3af", textAlign: "center", marginTop: 24 }}>
        Last Updated: {currentTime}
      </ThemedText>
    </ThemedView>
  );
}