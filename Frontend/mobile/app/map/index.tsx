import React from "react";
import { View } from "react-native";
import ParkingMap from "../components/map/ParkingMap";
import { INITIAL_REGION } from "../constants/map";

export default function MapScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ParkingMap initialRegion={INITIAL_REGION} />
    </View>
  );
}
