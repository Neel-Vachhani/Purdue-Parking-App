// import React from "react";
// import ThemedView from "../../components/ThemedView";
// import ParkingMap from "../../components/map/ParkingMap";
// import { INITIAL_REGION } from "../../constants/map";

// export default function ParkingMapScreen() {
//   return (
//     <ThemedView>
//       <ParkingMap initialRegion={INITIAL_REGION} />
//     </ThemedView>
//   );
// }

import { useContext, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Marker, Callout } from "react-native-maps";
import * as SecureStore from "expo-secure-store";
import ThemedView from "../../components/ThemedView";
import ParkingMap from "../../components/map/ParkingMap";
import { INITIAL_REGION } from "../../constants/map";
import { PARKING_LOCATIONS, loadParkingLocations, ParkingLocation } from "./parkingLocationsData";
import { ThemeContext } from "../../theme/ThemeProvider";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "../../components/ThemedIcons";        
import { getTravelTimeFromDefaultOrigin, TravelTimeResult } from "../../utils/travelTime";
        
        // Extend ParkingLocation to include travel time
interface ParkingLocationWithTravel extends ParkingLocation {
  travelTime?: TravelTimeResult | null;
}

export default function ParkingMapScreen({view, setView} : {view: string, setView: React.Dispatch<React.SetStateAction<"garage" | "map">>}) {
  
  const [locations, setLocations] = useState<ParkingLocationWithTravel[]>(PARKING_LOCATIONS);

  const theme = useContext(ThemeContext);

  useEffect(() => {
    let isMounted = true;

    const refreshLocations = async () => {
      try {
        const updated = await loadParkingLocations();
        if (isMounted) {
          setLocations(updated);
        }
      } catch (error) {
        console.error("Failed to refresh parking locations", error);
      }
    };

    refreshLocations();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load travel times from default origin
  useEffect(() => {
    let isMounted = true;

    const loadTravelTimes = async () => {
      try {
        // Get user email from secure storage
        const userJson = await SecureStore.getItemAsync("user");
        const user = userJson ? JSON.parse(userJson) : null;
        const email = user?.email;
        
        if (!email) {
          return;
        }

        // Calculate travel times for each location
        const travelTimePromises = locations.map(async (location) => {
          const travelTime = await getTravelTimeFromDefaultOrigin(
            location.coordinate,
            email
          );

          return { ...location, travelTime };
        });

        const locationsWithTravelTimes = await Promise.all(travelTimePromises);

        if (isMounted) {
          setLocations(locationsWithTravelTimes);
        }
      } catch (error) {
        console.error("Failed to load travel times", error);
      }
    };

    loadTravelTimes();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ThemedView>
      <ParkingMap initialRegion={INITIAL_REGION}>
        <TouchableOpacity
          onPress={() => {setView("garage")}}
          style={{
            padding: 10,
            borderRadius: 50,
            backgroundColor: theme.mode === "dark" ? "#1e1f23" : "#f3f4f6",
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 10,
          }}
        >
          <Ionicons name="home" size={26} color={theme.primary} />
        </TouchableOpacity>
        {locations.map((location) => (
          <Marker key={location.id} coordinate={location.coordinate}>
            <Callout tooltip={false}>
              <View style={{ padding: 6, maxWidth: 220 }}>
                <Text style={{ fontWeight: "600" }}>{location.title}</Text>
                {location.travelTime && (
                  <Text style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                    {location.travelTime.formattedDuration} ({location.travelTime.formattedDistance})
                  </Text>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
      </ParkingMap>
    </ThemedView>
  );
}