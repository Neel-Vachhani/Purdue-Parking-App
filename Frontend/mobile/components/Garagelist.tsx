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
  code: string;
  name: string;
  current: number;   
  total: number;     
  paid: boolean;
  favorite?: boolean;
  lat?: number;
  lng?: number;
};

type GarageDefinition = {
  code: string;
  name: string;
  favorite?: boolean;
  lat?: number;
  lng?: number;
};

const GARAGE_DEFINITIONS: GarageDefinition[] = [
  { code: "PGH", name: "Harrison Street Parking Garage", favorite: true },
  { code: "PGG", name: "Grant Street Parking Garage", favorite: true },
  { code: "PGU", name: "University Street Parking Garage", favorite: true },
  { code: "PGNW", name: "Northwestern Avenue Parking Garage" },
  { code: "PGMD", name: "McCutcheon Drive Parking Garage" },
  { code: "PGW", name: "Wood Street Parking Garage" },
  { code: "PGGH", name: "Graduate House Parking Garage" },
  { code: "PGM", name: "Marsteller Street Parking Garage" },
  { code: "LOT_R", name: "Lot R (North of Ross-Ade)" },
  { code: "LOT_H", name: "Lot H (North of Football Practice Field)" },
  { code: "LOT_FB", name: "Lot FB (East of Football Practice Field)" },
  { code: "KFPC", name: "Kozuch Football Performance Complex Lot" },
  { code: "LOT_A", name: "Lot A (North of Cary Quad)" },
  { code: "CREC", name: "Co-Rec Parking Lots" },
  { code: "LOT_O", name: "Lot O (East of Rankin Track)" },
  { code: "TARK_WILY", name: "Tarkington & Wiley Lots" },
  { code: "LOT_AA", name: "Lot AA (6th & Russell)" },
  { code: "LOT_BB", name: "Lot BB (6th & Waldron)" },
  { code: "WND_KRACH", name: "Windsor & Krach Shared Lot" },
  { code: "SHRV_ERHT_MRDH", name: "Shreve, Earhart & Meredith Shared Lot" },
  { code: "MCUT_HARR_HILL", name: "McCutcheon, Harrison & Hillenbrand Lot" },
  { code: "DUHM", name: "Duhme Hall Parking Lot" },
  { code: "PIERCE_ST", name: "Pierce Street Parking Lot" },
  { code: "SMTH_BCHM", name: "Smith & Biochemistry Lot" },
  { code: "DISC_A", name: "Discovery Lot (A Permit)" },
  { code: "DISC_AB", name: "Discovery Lot (AB Permit)" },
  { code: "DISC_ABC", name: "Discovery Lot (ABC Permit)" },
  { code: "AIRPORT", name: "Airport Parking Lots" },
const INITIAL_GARAGES: Garage[] = [
  { id: "1", name: "Harrison Garage", current: 8, total: 240, favorite: true, paid: true },
  { id: "2", name: "Grant Street Garage", current: 158, total: 240, favorite: true, paid: true },
  { id: "3", name: "University Street Garage", current: 70, total: 240, paid: false },
  { id: "4", name: "Northwestern Garage", current: 240, total: 240, paid: false },
  { id: "5", name: "DSAI Lot", current: 32, total: 38, paid: true },
];

const INITIAL_GARAGES: Garage[] = GARAGE_DEFINITIONS.map((definition, index) => {
  const initialCounts = getInitialOccupancy();
  return {
    id: String(index + 1),
    code: definition.code,
    name: definition.name,
  favorite: definition.favorite ?? false,
    current: initialCounts.current,
    total: initialCounts.total,
    lat: definition.lat,
    lng: definition.lng,
  };
});

type ApiLot = {
  id?: number;
  name?: string;
  code?: string;
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
  const [searchQuery, setSearchQuery] = React.useState("");

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
        const updatesByCode = new Map<string, ApiLot>();
        const updatesByName = new Map<string, ApiLot>();

        lots.forEach((lot) => {
          const idKey = lot.id !== undefined ? String(lot.id) : undefined;
          if (idKey) {
            updatesById.set(idKey, lot);
          }

          const codeKey = lot.code ? lot.code.toUpperCase() : undefined;
          if (codeKey) {
            updatesByCode.set(codeKey, lot);
          }

          const nameKey = lot.name ? lot.name.toLowerCase() : undefined;
          if (nameKey) {
            updatesByName.set(nameKey, lot);
          }
        });

        setGarages((prev) =>
          prev.map((garage) => {
            const update =
              updatesByCode.get(garage.code.toUpperCase()) ||
              updatesById.get(String(garage.id)) ||
              updatesByName.get(garage.name.toLowerCase());

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

  const visibleGarages = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return garages;
    }
    return garages.filter((garage) => {
      const nameMatches = garage.name.toLowerCase().includes(query);
      const codeMatches = garage.code.toLowerCase().includes(query);
      return nameMatches || codeMatches;
    });
  }, [garages, searchQuery]);

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
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: "600" }}>
              {item.name}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <TouchableOpacity
              onPress={() => handleOpenInMaps(item)}
              style={{ marginBottom: 12 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="location-outline" size={22} color={theme.primary} />
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
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 34, fontWeight: "700", flex: 1 }}>
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="map-outline" size={26} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.mode === "dark" ? "#1e1f23" : "#f3f4f6",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 8,
          }}
        >
          <Ionicons
            name="search"
            size={18}
            color={theme.mode === "dark" ? "#9ca3af" : "#6b7280"}
          />
          <TextInput
            placeholder="Search garages"
            placeholderTextColor={theme.mode === "dark" ? "#9ca3af" : "#6b7280"}
            style={{ flex: 1, color: theme.text, fontSize: 16 }}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
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
        data={visibleGarages}
        keyExtractor={(g) => g.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
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

function getInitialOccupancy() {
  const total = 100 + Math.floor(Math.random() * 400);
  const current = Math.floor(Math.random() * (total + 1));

  return { total, current };
}
