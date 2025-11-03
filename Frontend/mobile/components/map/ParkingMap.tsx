import React, { useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import MapView, { Region, MapViewProps } from "react-native-maps";
import { INITIAL_REGION, MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL } from "../../constants/map";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemeContext } from "../../theme/ThemeProvider";
import { Config}  from "react-native-config";
import GooglePlacesTextInput from "react-native-google-places-textinput";


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
        {/*<script asyncmsrc={Config.GOOGLE_MAPS_URL}></script>*/}
      {/* Base map. Keep config minimal; avoid coupling to data here. */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        // Use a cleaner style in dark mode for reduced visual noise on campus
        mapType={theme.mode === "dark" ? "mutedStandard" : "standard"}
        zoomEnabled
        minZoomLevel={MIN_ZOOM_LEVEL}
        maxZoomLevel={MAX_ZOOM_LEVEL}
        showsUserLocation
        showsCompass
        moveOnMarkerPress={false}
        mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
      >
        {children}
      </MapView>
      {/* Recenter control: animates camera back to campus.
          Future: replace with camera-to-lot animation when a marker is selected. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recenter map"
        accessibilityHint="Centers the map on Purdue campus"
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
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
      </Pressable>
      <GooglePlacesTextInput 
        apiKey="APIKEY"//TODO
        placeHolderText="Search for a garage"
        fetchDetails={true}
        detailsFields={['formattedAddress', 'location']}
        locationRestriction={{
          rectangle: {
            low: { latitude: 40.39286, longitude: -86.954622},
            high: { latitude: 40.466874, longitude: -86.871755 }
          }
        }}
        onPlaceSelect={ handlePlaceSelect }  >

        </GooglePlacesTextInput>

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


const handlePlaceSelect = (place: any) => {
    console.log('Selected place:', place.details.formattedAddress);
  };