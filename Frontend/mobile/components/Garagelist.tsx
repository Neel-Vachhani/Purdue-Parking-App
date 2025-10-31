// components/GarageList.tsx
import Constants from "expo-constants";
import * as React from "react";
import { Platform, View, Text, FlatList, TouchableOpacity } from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router/build/exports";
import { ThemeContext } from "../theme/ThemeProvider";
import PaidLot from "./PaidLot";

type Garage = {
  id: string;
  name: string;
  current: number;   
  total: number;     
  paid: boolean;
  favorite?: boolean;
  lat?: number;
  lng?: number;
};

const INITIAL_GARAGES: Garage[] = [
  { id: "1", name: "Harrison Garage", current: 8, total: 240, favorite: true, paid: true },
  { id: "2", name: "Grant Street Garage", current: 158, total: 240, favorite: true, paid: true },
  { id: "3", name: "University Street Garage", current: 70, total: 240, paid: false },
  { id: "4", name: "Northwestern Garage", current: 240, total: 240, paid: false },
  { id: "5", name: "DSAI Lot", current: 32, total: 38, paid: true },
];

type ApiLot = {
  id?: number;
  name?: string;
  available?: number;
  capacity?: number;
};

const AVAILABILITY_ENDPOINT = "/parking/availability/";

const getApiBaseUrl = (): string => {
  const configExtra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  const manifest = Constants.manifest as
    | { extra?: { apiBaseUrl?: string }; debuggerHost?: string }
    | null;
  const manifestExtra = manifest?.extra;

  const override = configExtra?.apiBaseUrl || manifestExtra?.apiBaseUrl;
  if (override) {
    return override.replace(/\/$/, "");
  }

  let host = "localhost";

  if (Platform.OS === "android") {
    host = "10.0.2.2";
  } else {
    const debuggerHost = Constants.expoConfig?.hostUri || manifest?.debuggerHost;
    if (debuggerHost) {
      host = debuggerHost.split(":")[0];
    }
  }

  return `http://${host}:8000`;
};

export default function GarageList({
  data = INITIAL_GARAGES,
  onToggleFavorite,
  onOpenInMaps,
}: {
  data?: Garage[];
  onToggleFavorite?: (g: Garage) => void;
  onOpenInMaps?: (g: Garage) => void;
}) {
  const theme = React.useContext(ThemeContext);
  const [garages, setGarages] = React.useState<Garage[]>(data);
  const [lastUpdated, setLastUpdated] = React.useState<string>(() =>
    new Date().toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    })
  );

  React.useEffect(() => {
    setGarages(data);
  }, [data]);

  const handleToggleFavorite = React.useCallback(
    (garage: Garage) => {
      setGarages((prev) =>
        prev.map((item) =>
          item.id === garage.id ? { ...item, favorite: !item.favorite } : item
        )
      );
      onToggleFavorite?.(garage);
    },
    [onToggleFavorite]
  );

  const sortGaragesByPrice = React.useCallback( 
    () => {
      const copyArray = [...garages]
      copyArray.sort((a,b) => Number(b.paid) - Number(a.paid))
      setGarages(copyArray)
    }, []
  )

  const handleOpenInMaps = React.useCallback(
    (garage: Garage) => {
      onOpenInMaps?.(garage);
    },
    [onOpenInMaps]
  );

  React.useEffect(() => {
    let isMounted = true;

    const loadAvailability = async () => {
      try {
  const response = await fetch(`${getApiBaseUrl()}${AVAILABILITY_ENDPOINT}`);
        if (!response.ok) {
          console.error("Failed to fetch parking availability:", response.status);
          return;
        }

        const payload: { lots?: ApiLot[] } = await response.json();
        const lots = Array.isArray(payload?.lots) ? payload.lots : undefined;
        if (!lots || lots.length === 0 || !isMounted) {
          return;
        }

        const updatesById = new Map<string, ApiLot>();
        lots.forEach((lot) => {
          const key = lot.id !== undefined ? String(lot.id) : lot.name ?? "";
          if (key) {
            updatesById.set(key, lot);
          }
        });

        setGarages((prev) =>
          prev.map((garage) => {
            const update =
              updatesById.get(garage.id) || updatesById.get(garage.name) ||
              lots.find((lot) => lot.name === garage.name);

            if (!update) {
              return garage;
            }

            return {
              ...garage,
              current:
                typeof update.available === "number"
                  ? update.available
                  : garage.current,
              total:
                typeof update.capacity === "number"
                  ? update.capacity
                  : garage.total,
            };
          })
        );

        setLastUpdated(
          new Date().toLocaleString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZoneName: "short",
          })
        );
      } catch (error) {
        console.error("Failed to load parking availability", error);
      }
    };

    loadAvailability();

    return () => {
      isMounted = false;
    };
  }, []);

  const renderItem = ({ item }: { item: Garage }) => {
    const total = item.total || 1;
    const pct = Math.min(item.current / total, 1);
    const colors = getColors(pct);


    const cardBg = theme.mode === "dark" ? "#202225" : "#FFFFFF";
    const secondaryText = theme.mode === "dark" ? "#cfd2d6" : "#6b7280";

    return (
      <View
        style={{
          marginHorizontal: 16,
          marginVertical: 10,
          padding: 16,
          borderRadius: 14,
          backgroundColor: cardBg,
          borderWidth: 2,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1,  flexDirection: "row", }}>
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: "600", marginRight: 8 }}>
              {item.name}
            </Text>

            <TouchableOpacity
              onPress={() => handleOpenInMaps(item)}
              style={{ marginRight: 12 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="location-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
            <PaidLot paid={item.paid}></PaidLot>
          </View>


          <TouchableOpacity
            onPress={() => handleToggleFavorite(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={item.favorite ? "star" : "star-outline"}
              size={22}
              color={theme.primary}
            />
          </TouchableOpacity>
        </View>

        <Text style={{ color: secondaryText, marginTop: 8 }}>
          {item.current}/{item.total}
        </Text>

        <View
          style={{
            height: 14,
            backgroundColor: theme.mode === "dark" ? "#2b2b2b" : "#d9d9d9",
            borderRadius: 8,
            marginTop: 10,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${pct * 100}%`,
              height: "100%",
              backgroundColor: colors.fill,
            }}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: theme.text, fontSize: 34, fontWeight: "700", margin: 16 }}>
          Parking Lots
        </Text>
        <TouchableOpacity
        onPress={() => router.push("/map")}
        style={{
          padding: 10,
          borderRadius: 50,
          backgroundColor: theme.mode === "dark" ? "#1e1f23" : "#f3f4f6",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 4,
        }}
      >
        <Ionicons name="map-outline" size={26} color={theme.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => sortGaragesByPrice()}
        style={{
         padding: 10,
          borderRadius: 50,
          backgroundColor: theme.mode === "dark" ? "#1e1f23" : "#f3f4f6",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 4,
          marginLeft: 5
        }}
      >
        <FontAwesome name="usd" size={26} color={theme.primary} />
      </TouchableOpacity>
      </View>

      <FlatList
        data={garages}
        keyExtractor={(g) => g.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Text
        style={{
          color: "#cfd2d6",
          fontSize: 14,
          marginHorizontal: 16,
          marginBottom: 16,
        }}
      >
          Last Updated: {lastUpdated}
      </Text>
    </View>
  );
}

function getColors(pct: number) {
  if (pct >= 0.8) return { border: "#f91e1eff", fill: "#f91e1eff" };
  if (pct >= 0.65) return { border: "#ff7f1eff", fill: "#ff7f1eff" };
  if (pct >= 0.25) return { border: "#e0c542", fill: "#cbb538" };
  return { border: "#41c463", fill: "#41c463" };
}
