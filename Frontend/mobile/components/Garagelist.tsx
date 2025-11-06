// components/GarageList.tsx
import Constants from "expo-constants";
import * as React from "react";
import {
  Platform,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router/build/exports";
import { ThemeContext } from "../theme/ThemeProvider";
import GarageDetail from "./detailedGarage";
import PaidLot from "./PaidLot";
type ParkingPass = "A" | "B" | "C" | "SG" | "Grad House" | "Residence Hall";

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
  passes: ParkingPass[];
};
export type Amenity =
  | "covered"
  | "ev"
  | "accessible"
  | "cameras"
  | "restrooms"
  | "security"
  | "lighting"
  | "bike"
  | "heightClearance";

export interface PriceTier {
  label: string; // e.g., "First hour", "Daily max"
  amount: number; // in USD
  unit?: string; // e.g., "/hr", "/day"
}

export interface HoursBlock {
  days: string; // e.g., "Mon–Fri" or "Sat–Sun"
  open: string; // "07:00"
  close: string; // "22:00" or "24/7"
}

export interface GarageDetailType {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  isOpen?: boolean;
  totalSpots?: number;
  occupiedSpots?: number;
  covered?: boolean;
  shaded?: boolean;
  amenities?: Amenity[];
  price?: PriceTier[];
  hours?: HoursBlock[];
  lastUpdatedIso?: string;
  heroImageUrl?: string;
  heightClearanceMeters?: number;
  evPorts?: number;
  accessibleSpots?: number;
}
type GarageDefinition = {
  code: string;
  name: string;
  paid?: boolean;
  favorite?: boolean;
  lat?: number;
  lng?: number;
  passes: ParkingPass[];
};
const PASS_OPTIONS: ParkingPass[] = ["A", "B", "C", "SG", "Grad House", "Residence Hall"];

const GARAGE_DEFINITIONS: GarageDefinition[] = [
  { code: "PGH", name: "Harrison Street Parking Garage", paid: true, favorite: true, lat: 40.420928743577996, lng: -86.91759020145541, passes: ["A", "B"] },
  { code: "PGG", name: "Grant Street Parking Garage", paid: true, favorite: true, lat: 40.42519706999441, lng: -86.90972814560583, passes: ["A", "B"] },
  { code: "PGU", name: "University Street Parking Garage", paid: true, lat: 40.4266903911869, lng: -86.91728093292815, passes: ["A", "SG"] },
  { code: "PGNW", name: "Northwestern Avenue Parking Garage", paid: true, lat: 40.42964447741563, lng: -86.91111021483658, passes: ["A", "SG"] },
  { code: "PGMD", name: "McCutcheon Drive Parking Garage", paid: true, lat: 40.43185, lng: -86.91445, passes: ["Residence Hall"] },
  { code: "PGW", name: "Wood Street Parking Garage", paid: true, lat: 40.42785, lng: -86.91885, passes: ["A", "SG"] },
  { code: "PGGH", name: "Graduate House Parking Garage", paid: true, lat: 40.43095, lng: -86.91625, passes: ["Grad House"] },
  { code: "PGM", name: "Marsteller Street Parking Garage", paid: true, lat: 40.42545, lng: -86.91325, passes: ["A"] },
  { code: "LOT_R", name: "Lot R (North of Ross-Ade)", lat: 40.41445, lng: -86.91245, passes: ["A", "B", "C"] },
  { code: "LOT_H", name: "Lot H (West of Football Practice Field)", lat: 40.41625, lng: -86.91485, passes: ["A", "B", "C"] },
  { code: "LOT_FB", name: "Lot FB (East of Football Practice Field)", lat: 40.41585, lng: -86.91135, passes: ["A", "B"] },
  { code: "KFPC", name: "Kozuch Football Performance Complex Lot", lat: 40.41525, lng: -86.91055, passes: ["A", "B"] },
  { code: "LOT_A", name: "Lot A (North of Cary Quad)", lat: 40.42845, lng: -86.92045, passes: ["A", "B"] },
  { code: "CREC", name: "Co-Rec Parking Lots", lat: 40.42185, lng: -86.91965, passes: ["A", "B", "C"] },
  { code: "LOT_O", name: "Lot O (East of Rankin Track)", lat: 40.41925, lng: -86.91845, passes: ["A", "B", "C"] },
  { code: "TARK_WILY", name: "Tarkington & Wiley Lots", lat: 40.43045, lng: -86.92125, passes: ["A", "B"] },
  { code: "LOT_AA", name: "Lot AA (6th & Russell)", lat: 40.42655, lng: -86.90585, passes: ["A", "B"] },
  { code: "LOT_BB", name: "Lot BB (6th & Waldron)", lat: 40.42545, lng: -86.90485, passes: ["A", "B"] },
  { code: "WND_KRACH", name: "Windsor & Krach Shared Lot", lat: 40.43165, lng: -86.91845, passes: ["A", "B"] },
  { code: "SHRV_ERHT_MRDH", name: "Shreve, Earhart & Meredith Shared Lot", lat: 40.43265, lng: -86.92265, passes: ["A", "B"] },
  { code: "MCUT_HARR_HILL", name: "McCutcheon, Harrison & Hillenbrand Lot", lat: 40.43225, lng: -86.91565, passes: ["A", "B"] },
  { code: "DUHM", name: "Duhme Hall Parking Lot", lat: 40.43385, lng: -86.91925, passes: ["A", "B"] },
  { code: "PIERCE_ST", name: "Pierce Street Parking Lot", paid: true, lat: 40.42385, lng: -86.91445, passes: ["A", "B"] },
  { code: "SMTH_BCHM", name: "Smith & Biochemistry Lot", lat: 40.42745, lng: -86.91665, passes: ["A"] },
  { code: "DISC_A", name: "Discovery Lot (A Permit)", lat: 40.428997605924756, lng: -86.91608038169943, passes: ["A"] },
  { code: "DISC_AB", name: "Discovery Lot (AB Permit)", lat: 40.42865, lng: -86.91545, passes: ["A", "B"] },
  { code: "DISC_ABC", name: "Discovery Lot (ABC Permit)", lat: 40.42825, lng: -86.91485, passes: ["A", "B", "C"] },
  { code: "AIRPORT", name: "Airport Parking Lots", lat: 40.41225, lng: -86.93685, passes: ["A", "B", "C"] },
];

const INITIAL_GARAGES: Garage[] = GARAGE_DEFINITIONS.map((definition, index) => {
  const initialCounts = getInitialOccupancy();
  return {
    id: String(index + 1),
    code: definition.code,
    name: definition.name,
    paid: definition.paid ?? false,
    favorite: definition.favorite ?? false,
    current: initialCounts.current,
    total: initialCounts.total,
    lat: definition.lat,
    lng: definition.lng,
    passes: definition.passes,
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
  if (override) return override.replace(/\/$/, "");

  let host = "localhost";
  if (Platform.OS === "android") host = "10.0.2.2";
  else {
    const dbg = Constants.expoConfig?.hostUri || manifest?.debuggerHost;
    if (dbg) host = dbg.split(":")[0];
  }

  return "http://localhost:7500";
};

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function GarageList({
  data = INITIAL_GARAGES,
  onToggleFavorite,
  onOpenInMaps,
  view, setView,
}: {
  data?: Garage[];
  onToggleFavorite?: (g: Garage) => void;
  onOpenInMaps?: (g: Garage) => void;
  view: string;
  setView: React.Dispatch<React.SetStateAction<"garage" | "map">>;
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
  const [selectedPasses, setSelectedPasses] = React.useState<ParkingPass[]>([]);
  const [isFilterVisible, setIsFilterVisible] = React.useState(false);

  // detail panel state
  const [selected, setSelected] = React.useState<Garage | null>(null);
  const translateX = React.useRef(new Animated.Value(SCREEN_WIDTH)).current;

  React.useEffect(() => setGarages(data), [data]);

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

  const sortGaragesByPrice = React.useCallback(() => {
    setGarages((prev) => {
      const sorted = [...prev];
      sorted.sort((a, b) => Number(b.paid) - Number(a.paid));
      return sorted;
    });
  }, []);

  const handleOpenInMaps = React.useCallback(
    (garage: Garage) => onOpenInMaps?.(garage),
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
        console.log(payload)
        const lots = Array.isArray(payload?.lots) ? payload.lots : undefined;
        if (!lots || lots.length === 0 || !isMounted) return;

        const updatesById = new Map<string, ApiLot>();
        const updatesByCode = new Map<string, ApiLot>();
        const updatesByName = new Map<string, ApiLot>();

        lots.forEach((lot) => {
          if (lot.id !== undefined) {
            updatesById.set(String(lot.id), lot);
          }

          if (lot.code) {
            updatesByCode.set(lot.code.toUpperCase(), lot);
          }

          if (lot.name) {
            updatesByName.set(lot.name.toLowerCase(), lot);
          }
        });

        setGarages((prev) =>
          prev.map((garage) => {
            const update =
              updatesByCode.get(garage.code.toUpperCase()) ||
              updatesById.get(garage.id) ||
              updatesByName.get(garage.name.toLowerCase());

            if (!update) return garage;

            return {
              ...garage,
              current:
                typeof update.available === "number" ? update.available : garage.current,
              total:
                typeof update.capacity === "number" ? update.capacity : garage.total,
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

  const openDetail = (g: Garage) => {
    setSelected(g);
    translateX.setValue(SCREEN_WIDTH);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeDetail = () => {
    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setSelected(null);
    });
  };
  const visibleGarages = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let filtered = garages;

    if (query) {
      filtered = filtered.filter((garage) => {
        const nameMatches = garage.name.toLowerCase().includes(query);
        const codeMatches = garage.code.toLowerCase().includes(query);
        return nameMatches || codeMatches;
      });
    }

    if (selectedPasses.length > 0) {
      filtered = filtered.filter((garage) =>
        garage.passes.some((pass) => selectedPasses.includes(pass))
      );
    }

    return filtered;
  }, [garages, searchQuery, selectedPasses]);

  const togglePassFilter = React.useCallback((pass: ParkingPass) => {
    setSelectedPasses((prev) =>
      prev.includes(pass) ? prev.filter((item) => item !== pass) : [...prev, pass]
    );
  }, []);

  const clearPassFilters = React.useCallback(() => {
    setSelectedPasses([]);
  }, []);

  const renderItem = ({ item }: { item: Garage }) => {
    const total = item.total || 1;
    const pct = Math.min(item.current / total, 1);
    const colors = getColors(pct);
    const passesLabel = item.passes.join(", ");

    const cardBg = theme.mode === "dark" ? "#202225" : "#FFFFFF";
    const secondaryText = theme.mode === "dark" ? "#cfd2d6" : "#6b7280";

    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => openDetail(item)}>
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
            <View style={{ flex: 1, flexDirection: "row" }}>
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
            </View>

            <Text style={{ color: secondaryText, marginTop: 6, fontSize: 14 }}>
              Code: {item.code}
            </Text>

            <Text style={{ color: secondaryText, marginTop: 4, fontSize: 14 }}>
              Passes: {passesLabel}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              {item.paid ? (
                <FontAwesome name="usd" size={20} color={theme.primary} />
              ) : (
                <View style={{ width: 20 }} />
              )}

              <TouchableOpacity
                onPress={() => handleOpenInMaps(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="location-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => handleToggleFavorite(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginTop: 12, alignSelf: "flex-end" }}
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
      </TouchableOpacity>
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
          onPress={() => {setView("map")}}
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

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.mode === "dark" ? "#1e1f23" : "#f3f4f6",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 10,
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
          <TouchableOpacity
            onPress={() => setIsFilterVisible(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.mode === "dark" ? "#2a2d33" : "#e5e7eb",
              position: "relative",
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="filter"
              size={18}
              color={selectedPasses.length > 0 ? theme.primary : theme.text}
            />
            {selectedPasses.length > 0 && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.primary,
                  position: "absolute",
                  top: 6,
                  right: 6,
                }}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        transparent
        visible={isFilterVisible}
        animationType="fade"
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsFilterVisible(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.45)",
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 24,
            }}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={{
                  width: "100%",
                  backgroundColor: theme.mode === "dark" ? "#1b1d21" : "#ffffff",
                  borderRadius: 16,
                  padding: 20,
                  gap: 16,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}>
                  Filter by Parking Pass
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  {PASS_OPTIONS.map((pass) => {
                    const isSelected = selectedPasses.includes(pass);
                    const backgroundColor = isSelected
                      ? theme.primary
                      : theme.mode === "dark"
                        ? "#2a2d33"
                        : "#e5e7eb";
                    const textColor = isSelected ? "#ffffff" : theme.text;
                    return (
                      <TouchableOpacity
                        key={pass}
                        onPress={() => togglePassFilter(pass)}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 14,
                          borderRadius: 999,
                          backgroundColor,
                        }}
                      >
                        <Text style={{ color: textColor, fontWeight: "500" }}>{pass}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    gap: 12,
                  }}
                >
                  <TouchableOpacity
                    onPress={clearPassFilters}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      backgroundColor: theme.mode === "dark" ? "#24262c" : "#f3f4f6",
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: "500" }}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsFilterVisible(false)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 20,
                      borderRadius: 999,
                      backgroundColor: theme.primary,
                    }}
                  >
                    <Text style={{ color: "#ffffff", fontWeight: "600" }}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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

      {/* Slide-over detail panel */}
      {selected && (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "100%",
            transform: [{ translateX }],
            backgroundColor: "#0B0B0C",
            elevation: 6,
          }}
        >
          <GarageDetail
            garage={mapListGarageToDetail(selected)}
            isFavorite={!!selected.favorite}
            onBack={closeDetail}
            onRefresh={() => {}}
            onToggleFavorite={(id, next) =>
              handleToggleFavorite({ ...selected, id, favorite: next })
            }
            onStartNavigation={() => handleOpenInMaps(selected)}
            onStartParking={() => {}}
            onShare={() => {}}
          />
        </Animated.View>
      )}
    </View>
  );
}

// quick adapter from list item to GarageDetail props
function mapListGarageToDetail(g: Garage): GarageDetailType {
  const occupied = Math.max(0, (g.total ?? 0) - (g.current ?? 0));
  return {
    id: g.id,
    name: g.name,
    address: "Address coming from API", // replace with real field if you have it
    latitude: g.lat, // Pass latitude for travel time calculation (User Story #9)
    longitude: g.lng, // Pass longitude for travel time calculation (User Story #9)
    totalSpots: g.total,
    occupiedSpots: occupied,
    covered: true,
    shaded: true,
    amenities: ["covered", "lighting"],
    price: [{ label: "Per hour", amount: 2.0, unit: "/hr" }],
    hours: [{ days: "Mon–Sun", open: "00:00", close: "24/7" }],
    lastUpdatedIso: new Date().toISOString(),
  };
}

function getColors(pct: number) {
  if (pct >= 0.8) return { border: "#f91e1eff", fill: "#f91e1eff" };
  if (pct >= 0.65) return { border: "#ff7f1eff", fill: "#ff7f1eff" };
  if (pct >= 0.25) return { border: "#e0c542", fill: "#cbb538" };
  return { border: "#41c463", fill: "#41c463" };
}

function getInitialOccupancy() {
  const total = 80 + Math.floor(Math.random() * 320);
  const current = Math.floor(Math.random() * (total + 1));
  return { current, total };
}
