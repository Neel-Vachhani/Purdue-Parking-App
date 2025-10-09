import React, { useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import MapView, { Region } from "react-native-maps";
import { INITIAL_REGION, MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL } from "../../constants/map";
import { MaterialIcons } from "@expo/vector-icons";

export type ParkingMapProps = {
  initialRegion?: Region;
};

export default function ParkingMap({ initialRegion }: ParkingMapProps) {
  const region: Region = initialRegion ?? INITIAL_REGION;
  const mapRef = useRef<MapView>(null);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        mapType="mutedStandard"
        zoomEnabled
        minZoomLevel={MIN_ZOOM_LEVEL}
        maxZoomLevel={MAX_ZOOM_LEVEL}
        showsUserLocation
        showsCompass
        moveOnMarkerPress={false}
        mapPadding={{ top: 0, right: 0, bottom: 24, left: 0 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recenter map"
        accessibilityHint="Centers the map on Purdue campus"
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        style={styles.fab}
        onPress={() => mapRef.current?.animateToRegion(INITIAL_REGION, 600)}
      >
        <MaterialIcons name="my-location" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 32,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1f1f1f",
    opacity: 0.9,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});


