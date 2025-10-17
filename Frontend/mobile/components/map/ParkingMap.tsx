import React, { useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
<<<<<<< HEAD:Frontend/mobile/components/map/ParkingMap.tsx
import MapView, { Region, MapViewProps } from "react-native-maps";
import { INITIAL_REGION, MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL } from "../../constants/map";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemeContext } from "../../theme/ThemeProvider";

// Public props for the reusable map component.
// - initialRegion: allow callers to override where the camera starts.
// Future stories can extend this interface (e.g., markers, onMarkerPress).
interface ParkingMapProps extends MapViewProps {
  children?: React.ReactNode;
}

// Renders a themed, full-bleed map with sane defaults for Boiler Park.
export default function ParkingMap({ children, initialRegion }: ParkingMapProps) {
  const region: Region = initialRegion ?? INITIAL_REGION;
  const mapRef = useRef<MapView>(null);
  const theme = React.useContext(ThemeContext);

  return (
    <View style={styles.container}>
      {/* Base map. Keep config minimal; avoid coupling to data here. */}
=======
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
>>>>>>> neel-dev:Frontend/mobile/app/components/map/ParkingMap.tsx
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
<<<<<<< HEAD:Frontend/mobile/components/map/ParkingMap.tsx
        // Use a cleaner style in dark mode for reduced visual noise on campus
        mapType={theme.mode === "dark" ? "mutedStandard" : "standard"}
=======
        mapType="mutedStandard"
>>>>>>> neel-dev:Frontend/mobile/app/components/map/ParkingMap.tsx
        zoomEnabled
        minZoomLevel={MIN_ZOOM_LEVEL}
        maxZoomLevel={MAX_ZOOM_LEVEL}
        showsUserLocation
        showsCompass
        moveOnMarkerPress={false}
        mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
<<<<<<< HEAD:Frontend/mobile/components/map/ParkingMap.tsx
      >
        {children}
      </MapView>
      {/* Recenter control: animates camera back to campus.
          Future: replace with camera-to-lot animation when a marker is selected. */}
=======
      />
>>>>>>> neel-dev:Frontend/mobile/app/components/map/ParkingMap.tsx
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recenter map"
        accessibilityHint="Centers the map on Purdue campus"
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
<<<<<<< HEAD:Frontend/mobile/components/map/ParkingMap.tsx
        style={[
          styles.fab,
          {
            backgroundColor: theme.mode === "dark" ? "#1f1f1f" : "#FFFFFF",
            borderWidth: theme.mode === "dark" ? 0 : 1,
            borderColor: "rgba(0,0,0,0.12)",
          },
        ]}
        onPress={() => mapRef.current?.animateToRegion(INITIAL_REGION, 600)}
      >
        {/* Purdue gold icon for brand consistency */}
        <MaterialIcons name="my-location" size={22} color={theme.primary} />
=======
        style={styles.fab}
        onPress={() => mapRef.current?.animateToRegion(INITIAL_REGION, 600)}
      >
        <MaterialIcons name="my-location" size={22} color="#fff" />
>>>>>>> neel-dev:Frontend/mobile/app/components/map/ParkingMap.tsx
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


