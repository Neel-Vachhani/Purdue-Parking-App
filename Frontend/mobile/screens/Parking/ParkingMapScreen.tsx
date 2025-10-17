import React from "react";
import ParkingMap from "../../components/map/ParkingMap";
import { INITIAL_REGION } from "../../constants/map";
import ThemedView from "../../components/ThemedView";

export default function ParkingMapScreen() {
  return (
    <ThemedView>
      <ParkingMap initialRegion={INITIAL_REGION} />
    </ThemedView>
  );
}
