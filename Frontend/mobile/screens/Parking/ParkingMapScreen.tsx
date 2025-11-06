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
import { Marker } from 'react-native-maps';
import ThemedView from "../../components/ThemedView";
import ParkingMap from "../../components/map/ParkingMap";
import { INITIAL_REGION } from "../../constants/map";
import { PARKING_LOCATIONS, loadParkingLocations, ParkingLocation } from "./parkingLocationsData";
import { ThemeContext } from "../../theme/ThemeProvider";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "../../components/ThemedIcons";

export default function ParkingMapScreen({view, setView} : {view: string, setView: React.Dispatch<React.SetStateAction<"garage" | "map">>}) {
  const [locations, setLocations] = useState<ParkingLocation[]>(PARKING_LOCATIONS);

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
          <Marker
            key={location.id}
            coordinate={location.coordinate}
            title={location.title}
            description={location.description}
          />
        ))}
      </ParkingMap>
    </ThemedView>
  );
}