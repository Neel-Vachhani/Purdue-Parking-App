// app/index.tsx

import GarageList from "../../components/GarageList";
export default function Index() {
  return <GarageList
            onToggleFavorite={(g) => console.log("toggle fav", g.name)}
            onOpenInMaps={(g) => {
              console.log("open maps for", g.name);
            }}
    />;
}
