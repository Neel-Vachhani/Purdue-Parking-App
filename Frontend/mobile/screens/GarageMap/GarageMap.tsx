import { useState } from "react";
import GarageList from "../../components/Garagelist";
import ParkingMapScreen from "../Parking/ParkingMapScreen";

const GarageMap = () => {
  const [view, setView] = useState<'garage' | 'map'>('garage');
  if (view === 'map') {
    return (
      <ParkingMapScreen view={view} setView={setView} />
    );
  }
  return (
    <GarageList view={view} setView={setView} />
  )
}

export default GarageMap