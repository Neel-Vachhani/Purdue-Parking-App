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

import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Marker, Callout } from "react-native-maps";
import ThemedView from "../../components/ThemedView";
import ParkingMap from "../../components/map/ParkingMap";
import { INITIAL_REGION } from "../../constants/map";
import { PARKING_LOCATIONS, loadParkingLocations, ParkingLocation } from "./parkingLocationsData";

export default function ParkingMapScreen() {
  const [locations, setLocations] = useState<ParkingLocation[]>(PARKING_LOCATIONS);

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

  return (
    <ThemedView>
      <ParkingMap initialRegion={INITIAL_REGION}>
        {locations.map((location) => (
          <Marker key={location.id} coordinate={location.coordinate}>
            <Callout tooltip={false}>
              <View style={{ padding: 6, maxWidth: 220 }}>
                <Text style={{ fontWeight: "600" }}>{location.title}</Text>
                <Text style={{ marginTop: 4 }}>
                  {location.description || "Availability unavailable"}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </ParkingMap>
    </ThemedView>
  );
}