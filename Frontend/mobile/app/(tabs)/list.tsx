// app/(tabs)/list.tsx
import React from "react";
import ParkingListScreen from "../../screens/Parking/ParkingListScreen";
import GarageList from "../../components/GarageList";
export default function List() { return <GarageList
            onToggleFavorite={(g) => console.log("toggle fav", g.name)}
            onOpenInMaps={(g) => {
              console.log("open maps for", g.name);
            }}
    />; }


