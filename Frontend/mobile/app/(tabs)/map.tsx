import React from "react";
import ParkingMapScreen from "../../screens/Parking/ParkingMapScreen";

export default function Map() {
	const [view, setView] = React.useState<"garage" | "map">("map");
	return <ParkingMapScreen view={view} setView={setView} />;
}