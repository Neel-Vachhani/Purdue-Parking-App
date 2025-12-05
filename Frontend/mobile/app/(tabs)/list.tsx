// app/(tabs)/list.tsx
import React from "react";
import GarageList from "../../components/Garagelist";

export default function List() {
  const [view, setView] = React.useState<"garage" | "map">("garage");

  return (
    <GarageList
      view={view}
      setView={setView}
      onToggleFavorite={(g) => console.log("toggle fav", g.name)}
      onOpenInMaps={(g) => {
        console.log("open maps for", g.name);
      }}
    />
  );
}
