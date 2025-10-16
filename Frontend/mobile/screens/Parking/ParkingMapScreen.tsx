import React from "react";
import ThemedView from "../../components/ThemedView";
import ParkingMap from "../../components/map/ParkingMap";
import { INITIAL_REGION } from "../../constants/map";

export default function ParkingMapScreen() {
  return (
    <ThemedView>
      <ParkingMap initialRegion={INITIAL_REGION} />
    </ThemedView>
  );
}
