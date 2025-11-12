import { Platform } from "react-native";
import NavigationView from "../../components/NavigationView";

const API_BASE = Platform.OS === "android" ? "http://10.0.2.2:7500" : "http://localhost:7500";

export default function Navigation() {
  return <NavigationView />;
}
