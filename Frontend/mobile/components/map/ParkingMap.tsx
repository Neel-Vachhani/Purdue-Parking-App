import React, { useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import MapView, { Region, MapViewProps, Marker } from "react-native-maps";
import ClusterMapView from "react-native-map-clustering";
import { INITIAL_REGION, MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL } from "../../constants/map";
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from "../../constants/mapStyle";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemeContext } from "../../theme/ThemeProvider";
import StyledGooglePlacesTextInput from "./GooglePlacesInput";

interface ParkingMapProps extends MapViewProps {
  children?: React.ReactNode;
}

// ─── Cluster marker ───────────────────────────────────────────────────────────

/** Gold circular badge that replaces a group of nearby pins when zoomed out. */
function ClusterMarker({ cluster, isDark }: { cluster: any; isDark: boolean }) {
  const { id, geometry, onPress, properties } = cluster;
  const count: number = properties?.point_count ?? 0;
  const coordinate = {
    latitude: geometry.coordinates[1] as number,
    longitude: geometry.coordinates[0] as number,
  };

  return (
    <Marker
      key={`cluster-${id}`}
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View
        style={[
          clusterStyles.badge,
          {
            backgroundColor: isDark ? "#B5975A" : "#CFB991",
            borderColor: isDark ? "#CFB991" : "#0E0F11",
          },
        ]}
      >
        <Text style={clusterStyles.badgeText}>{count}</Text>
      </View>
    </Marker>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ParkingMap({ children, initialRegion }: ParkingMapProps) {
  const region: Region = initialRegion ?? INITIAL_REGION;
  const mapRef = useRef<MapView>(null);
  const theme = React.useContext(ThemeContext);
  const isDark = theme.mode === "dark";

  return (
    <View style={styles.container}>
      <ClusterMapView
        // Expose underlying MapView via callback ref so the recenter FAB can animate it
        mapRef={(ref) => {
          (mapRef as React.MutableRefObject<any>).current = ref;
        }}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        // mutedStandard is an Apple Maps type that gives a muted dark look on iOS;
        // customMapStyle applies on Android (Google Maps) and iOS with PROVIDER_GOOGLE.
        mapType={isDark ? "mutedStandard" : "standard"}
        customMapStyle={isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
        zoomEnabled
        minZoomLevel={MIN_ZOOM_LEVEL}
        maxZoomLevel={MAX_ZOOM_LEVEL}
        showsUserLocation
        showsCompass
        moveOnMarkerPress={false}
        mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        // Clustering
        clusteringEnabled
        clusterColor={isDark ? "#B5975A" : "#CFB991"}
        clusterTextColor="#0E0F11"
        radius={50}
        minPoints={3}
        animationEnabled
        renderCluster={(cluster: any) => (
          <ClusterMarker key={`cluster-${cluster.id}`} cluster={cluster} isDark={isDark} />
        )}
      >
        {children}
      </ClusterMapView>

      {/* Recenter button – animates camera back to Purdue campus */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recenter map"
        accessibilityHint="Centers the map on Purdue campus"
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        style={[
          styles.fab,
          {
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
        onPress={() => mapRef.current?.animateToRegion(INITIAL_REGION, 600)}
      >
        <MaterialIcons name="my-location" size={22} color={theme.primary} />
      </Pressable>

      <StyledGooglePlacesTextInput />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 32,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});

const clusterStyles = StyleSheet.create({
  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  badgeText: {
    color: "#0E0F11",
    fontWeight: "800",
    fontSize: 13,
  },
});
