// app/(tabs)/list.tsx
import React from "react";
import GarageList from "../../components/Garagelist";

export default function List() {  return <GarageList
            onToggleFavorite={(g) => console.log("toggle fav", g.name)}
            onOpenInMaps={(g) => {
              console.log("open maps for", g.name);
            }}
    />;
}
