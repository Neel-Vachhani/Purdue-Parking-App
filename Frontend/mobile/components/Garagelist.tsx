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
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext, AppTheme } from "../theme/ThemeProvider";
import { useEffect } from "react";
import GarageDetail from "./DetailedGarage";
import EmptyState from "./EmptyState";
type ParkingPass = "A" | "B" | "C" | "SG" | "Grad House" | "Residence Hall" | "Paid";

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
  rating: number;
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


export interface HoursBlock {
  days: string; // e.g., "Mon–Fri" or "Sat–Sun"
  open: string; // "07:00"
  close: string; // "22:00" or "24/7"
}

export interface GarageDetailType {
  id: string;
  code?: string; // Lot code for fetching events (User Story #10)
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
  price?: string;
  hours?: HoursBlock[];
  lastUpdatedIso?: string;
  heroImageUrl?: string;
  heightClearanceMeters?: number;
  rating: number;
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
  rating: number;
};
const PASS_OPTIONS: ParkingPass[] = ["A", "B", "C", "SG", "Grad House", "Residence Hall", "Paid"];

const GARAGE_DEFINITIONS: GarageDefinition[] = [
  { code: "PGH", name: "Harrison Street Parking Garage", paid: true, favorite: true, lat: 40.420928743577996, lng: -86.91759020145541, passes: ["A", "B", "Paid"], rating: 3.5 },
  { code: "PGG", name: "Grant Street Parking Garage", paid: true, favorite: true, lat: 40.42519706999441, lng: -86.90972814560583, passes: ["A", "B", "Paid"], rating: 4 },
  { code: "PGU", name: "University Street Parking Garage", paid: true, lat: 40.4266903911869, lng: -86.91728093292815, passes: ["A", "SG", "Paid"], rating: 3 },
  { code: "PGNW", name: "Northwestern Avenue Parking Garage", paid: true, lat: 40.42964447741563, lng: -86.91111021483658, passes: ["A", "SG", "Paid"], rating: 5 },
  { code: "PGMD", name: "McCutcheon Drive Parking Garage", paid: true, lat: 40.43185, lng: -86.91445, passes: ["Residence Hall", "Paid"], rating: 2 },
  { code: "PGW", name: "Wood Street Parking Garage", paid: true, lat: 40.42785, lng: -86.91885, passes: ["A", "SG", "Paid"], rating: 2 },
  { code: "PGGH", name: "Graduate House Parking Garage", paid: true, lat: 40.43095, lng: -86.91625, passes: ["Grad House", "Paid"], rating: 2 },
  { code: "PGM", name: "Marsteller Street Parking Garage", paid: true, lat: 40.42545, lng: -86.91325, passes: ["A", "Paid"], rating: 2  },
  { code: "LOT_R", name: "Lot R (North of Ross-Ade)", lat: 40.41445, lng: -86.91245, passes: ["A", "B", "C"], rating: 2  },
  { code: "LOT_H", name: "Lot H (West of Football Practice Field)", lat: 40.41625, lng: -86.91485, passes: ["A", "B", "C"], rating: 2  },
  { code: "LOT_FB", name: "Lot FB (East of Football Practice Field)", lat: 40.41585, lng: -86.91135, passes: ["A", "B"], rating: 2  },
  { code: "KFPC", name: "Kozuch Football Performance Complex Lot", lat: 40.41525, lng: -86.91055, passes: ["A", "B"], rating: 2 },
  { code: "LOT_A", name: "Lot A (North of Cary Quad)", lat: 40.42845, lng: -86.92045, passes: ["A", "B"], rating: 2  },
  { code: "CREC", name: "Co-Rec Parking Lots", lat: 40.42185, lng: -86.91965, passes: ["A", "B", "C"], rating: 2 },
  { code: "LOT_O", name: "Lot O (East of Rankin Track)", lat: 40.41925, lng: -86.91845, passes: ["A", "B", "C"], rating: 2  },
  { code: "TARK_WILY", name: "Tarkington & Wiley Lots", lat: 40.43045, lng: -86.92125, passes: ["A", "B"], rating: 2  },
  { code: "LOT_AA", name: "Lot AA (6th & Russell)", lat: 40.42655, lng: -86.90585, passes: ["A", "B"], rating: 2  },
  { code: "LOT_BB", name: "Lot BB (6th & Waldron)", lat: 40.42545, lng: -86.90485, passes: ["A", "B"], rating: 2  },
  { code: "WND_KRACH", name: "Windsor & Krach Shared Lot", lat: 40.43165, lng: -86.91845, passes: ["A", "B"], rating: 2.0 },
  { code: "SHRV_ERHT_MRDH", name: "Shreve, Earhart & Meredith Shared Lot", lat: 40.43265, lng: -86.92265, passes: ["A", "B"], rating: 2  },
  { code: "MCUT_HARR_HILL", name: "McCutcheon, Harrison & Hillenbrand Lot", lat: 40.43225, lng: -86.91565, passes: ["A", "B"], rating: 2  },
  { code: "DUHM", name: "Duhme Hall Parking Lot", lat: 40.43385, lng: -86.91925, passes: ["A", "B"], rating: 2  },
  { code: "PIERCE_ST", name: "Pierce Street Parking Lot", paid: true, lat: 40.42385, lng: -86.91445, passes: ["A", "B", "Paid"], rating: 2 },
  { code: "SMTH_BCHM", name: "Smith & Biochemistry Lot", lat: 40.42745, lng: -86.91665, passes: ["A"], rating: 2  },
  { code: "DISC_A", name: "Discovery Lot (A Permit)", lat: 40.428997605924756, lng: -86.91608038169943, passes: ["A"], rating: 2  },
  { code: "DISC_AB", name: "Discovery Lot (AB Permit)", lat: 40.42865, lng: -86.91545, passes: ["A", "B"], rating: 2  },
  { code: "DISC_ABC", name: "Discovery Lot (ABC Permit)", lat: 40.42825, lng: -86.91485, passes: ["A", "B", "C"], rating: 2  },
  { code: "AIRPORT", name: "Airport Parking Lots", lat: 40.41225, lng: -86.93685, passes: ["A", "B", "C"], rating: 2  },
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
    rating: definition.rating,
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

// Changes the traditional garage data to the detailed format
function mapListGarageToDetail(g:   Garage): GarageDetailType {
  const occupied = Math.max(0, (g.total ?? 0) - (g.current ?? 0));
  return {
    id: g.id,
    code: g.code,
    name: g.name,
    address: "Address coming from API", // replace with real field if you have it
    totalSpots: g.total,
    occupiedSpots: occupied,
    covered: true,
    shaded: true,
    rating: g.rating,
    amenities: ["covered", "lighting"],
    price: g.paid ? "Paid Lot" : "Free",
    hours: [{ days: "Mon–Sun", open: "00:00", close: "24/7" }],
    lastUpdatedIso: new Date().toISOString(),
  };
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const FILTER_STORAGE_KEY = "garage_filters";

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
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);
  const filtersLoadedRef = React.useRef(false);

  // detail panel state
  const [selected, setSelected] = React.useState<Garage | null>(null);
  const translateX = React.useRef(new Animated.Value(SCREEN_WIDTH)).current;

  React.useEffect(() => setGarages(data), [data]);

  React.useEffect(() => {
    const loadFilters = async () => {
      try {
        const stored = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
        if (!stored) {
          filtersLoadedRef.current = true;
          return;
        }
        const parsed = JSON.parse(stored) as {
          passes?: ParkingPass[];
          favoritesOnly?: boolean;
        };
        if (Array.isArray(parsed?.passes)) {
          setSelectedPasses(parsed.passes.filter((p): p is ParkingPass => PASS_OPTIONS.includes(p)));
        }
        if (typeof parsed?.favoritesOnly === "boolean") {
          setShowFavoritesOnly(parsed.favoritesOnly);
        }
      } catch (error) {
        console.warn("Failed to load garage filters", error);
      } finally {
        filtersLoadedRef.current = true;
      }
    };
    loadFilters();
  }, []);

  React.useEffect(() => {
    if (!filtersLoadedRef.current) return;
    const persist = async () => {
      try {
        if (selectedPasses.length === 0 && !showFavoritesOnly) {
          await AsyncStorage.removeItem(FILTER_STORAGE_KEY);
          return;
        }
        await AsyncStorage.setItem(
          FILTER_STORAGE_KEY,
          JSON.stringify({
            passes: selectedPasses,
            favoritesOnly: showFavoritesOnly,
          })
        );
      } catch (error) {
        console.warn("Failed to save garage filters", error);
      }
    };
    persist();
  }, [selectedPasses, showFavoritesOnly]);

  // Handles toggling favorite status
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


  const handleOpenInMaps = React.useCallback(
    (garage: Garage) => {
      const garageName: string = garage.name
      const urlName = garageName.replace(" ", "+")
      const url = Platform.select({
      //ios: `http://maps.apple.com/?saddr=40.428604085531404+-86.91934994154656&daddr=${garage.lat},${garage.lng}`,
      ios: `https://www.google.com/maps/dir/?api=1&origin=28+Hilltop+Dr+IN&destination=${urlName}+West+Lafayette+IN&travelmode=driving`,
      android: `https://www.google.com/maps/dir/?api=1&origin=28+Hilltop+Dr+IN&destination=${urlName}+West+Lafayette+IN&travelmode=driving`,
    })
    Linking.openURL(url!)
    },
    [onOpenInMaps]
  );

  useEffect(() => {
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
        if (!lots || lots.length === 0 || !isMounted) return;

        // Some sort of odd mapping logic to match lots from API to our local list
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

        // Update garages with fetched availability data using all three maps for extra matching?
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

  // Logic to open and close the detailed view with animation
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

  const closeDetail = (code: string) => {
    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setSelected(null);
    });
    const selected_garage = garages.find((garage) => garage.code == code)
    if (selected_garage) {
      getRatings(code).then((new_rating) => {
        selected_garage.rating = new_rating
        
      })
    }
    
  };
  

  // Filtering logic for garages
  const trimmedQuery = searchQuery.trim();

  const visibleGarages = React.useMemo(() => {
    const query = trimmedQuery.toLowerCase();

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

    if (showFavoritesOnly) {
      filtered = filtered.filter((garage) => garage.favorite);
    }

    return filtered;
  }, [garages, trimmedQuery, selectedPasses, showFavoritesOnly]);

  const toggleFavoritesFilter = React.useCallback(() => {
    setShowFavoritesOnly((prev) => !prev);
  }, []);

  const togglePassFilter = React.useCallback((pass: ParkingPass) => {
    setSelectedPasses((prev) =>
      prev.includes(pass) ? prev.filter((item) => item !== pass) : [...prev, pass]
    );
  }, []);

  const clearPassFilters = React.useCallback(() => {
    setSelectedPasses([]);
  }, []);

  const handleClearFilters = React.useCallback(() => {
    setSearchQuery("");
    setSelectedPasses([]);
    setShowFavoritesOnly(false);
    setIsFilterVisible(false);
    AsyncStorage.removeItem(FILTER_STORAGE_KEY).catch(() => {});
  }, []);

  const getRatings = async (code: string) => {
      const API_BASE = Platform.OS === "android" ? "http://10.0.2.2:7500" : "http://localhost:7500";
      //TODO: API Call to backend to update the rating in the backend
      let avg_rating: number = 0
      await fetch(`${API_BASE}/api/get_rating`, {
        method: "POST",
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: code
        })
      }).then(res => res.json())
      .then((res) => {
        avg_rating = res['avg_rating']
  });
      return avg_rating
      
    }

  // Function to render every garage item in non-detailed view
  const renderItem = ({ item }: { item: Garage }) => {
    const total = item.total || 1;
    const pct = Math.min(item.current / total, 1);
    const occupancy = getOccupancyColors(pct, theme);
    const passesLabel = item.passes.join(", ");
    const avg_rating = async () => {
      item.rating = await getRatings(item.code)
    }
    const cardBg = theme.surface;
    const secondaryText = theme.textMuted;

    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => openDetail(item)}>
        <View
          style={{
            marginHorizontal: 16,
            marginVertical: 10,
            padding: 16,
            borderRadius: 14,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: theme.border,
            borderLeftWidth: 4,
            borderLeftColor: occupancy.fill,
            shadowColor: theme.shadow,
            shadowOpacity: theme.mode === "dark" ? 0.35 : 0.12,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: theme.text, fontSize: 22, fontWeight: "600" }}>
                {item.name}
              </Text>
              {/* Rating Pill */}
              <View
                onLayout={() => avg_rating()}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: "center",
                  justifyContent: "center",
                  width: 64,
                  height: 28,
                  backgroundColor: theme.surfaceMuted,
                  borderRadius: 999,
                  marginTop: 5,
                  paddingHorizontal: 8,
                }}
              >
                <Text
                  style={{
                    marginTop: 2,
                    color: theme.text,
                    fontWeight: "700",
                  }}
                >
                  {item.rating.toFixed(1) + " "}
                  <Ionicons name={"star"} size={14} color={theme.primary} />
                </Text>
              </View>

              <Text style={{ color: secondaryText, marginTop: 4, fontSize: 14 }}>
                Passes: {passesLabel}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              

              <TouchableOpacity
                onPress={() => handleToggleFavorite(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ marginTop: 2 }}
              >
                <Ionicons
                  name={item.favorite ? "star" : "star-outline"}
                  size={22}
                  color={theme.primary}
                />
              </TouchableOpacity>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() => handleOpenInMaps(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginTop: 12 }}
                >
                  <Ionicons name="navigate-outline" size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={{ color: secondaryText, marginTop: 8 }}>
            {item.current}/{item.total}
          </Text>

          <View
            style={{
              height: 14,
              backgroundColor: theme.borderMuted,
              borderRadius: 8,
              marginTop: 10,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${pct * 100}%`,
                height: "100%",
                backgroundColor: occupancy.fill,
              }}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filtersReady = filtersLoadedRef.current;
  const favoritesOnlyActive =
    showFavoritesOnly && selectedPasses.length === 0 && trimmedQuery.length === 0;
  const hasActiveFilters =
    trimmedQuery.length > 0 || selectedPasses.length > 0 || showFavoritesOnly;

  const emptyStateContent = React.useMemo(() => {
    if (!filtersReady || visibleGarages.length > 0) {
      return null;
    }

    if (favoritesOnlyActive) {
      return (
        <EmptyState
          title="No favorites yet"
          description="Tap the star on any garage to save it, then it will appear in this view."
          iconName="star-outline"
          primaryActionLabel="Browse garages"
          onPrimaryAction={handleClearFilters}
          testID="garage-favorites-empty"
        />
      );
    }

    if (hasActiveFilters) {
      return (
        <EmptyState
          title="No garages match your filters"
          description="Try adjusting your search or clear filters to see every garage again."
          iconName="funnel-outline"
          primaryActionLabel="Clear filters"
          onPrimaryAction={handleClearFilters}
          testID="garage-filters-empty"
        />
      );
    }

    return (
      <EmptyState
        title="No garages available"
        description="Garages will appear here once data is available."
        iconName="car-outline"
        testID="garage-empty"
      />
    );
  }, [
    filtersReady,
    visibleGarages.length,
    hasActiveFilters,
    favoritesOnlyActive,
    handleClearFilters,
  ]);

  const renderEmptyComponent = React.useCallback(() => {
    if (!emptyStateContent) return null;
    return (
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 48 }}>
        {emptyStateContent}
      </View>
    );
  }, [emptyStateContent]);

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
            onPress={toggleFavoritesFilter}
            testID="favorites-filter-toggle"
            accessibilityRole="button"
            accessibilityLabel={
              showFavoritesOnly ? "Showing favorites only" : "Filter favorites"
            }
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: showFavoritesOnly
                ? theme.primary
                : theme.mode === "dark"
                  ? "#2a2d33"
                  : "#e5e7eb",
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showFavoritesOnly ? "star" : "star-outline"}
              size={18}
              color={showFavoritesOnly ? "#ffffff" : theme.text}
            />
          </TouchableOpacity>
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
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={{
          paddingBottom: 24,
          paddingTop: 8,
          flexGrow: visibleGarages.length === 0 ? 1 : 0,
          justifyContent: visibleGarages.length === 0 ? "center" : undefined,
        }}
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
            onBack={
              () => {
                closeDetail(selected.code)
                
              }
            }
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

function getOccupancyColors(pct: number, theme: AppTheme) {
  if (pct >= 0.85) return { fill: theme.danger };
  if (pct >= 0.65) return { fill: theme.warning };
  if (pct >= 0.35) return { fill: theme.info };
  return { fill: theme.success };
}

function getInitialOccupancy() {
  const total = 480;
  const current = Math.floor(Math.random() * (total + 1));
  return { current, total };
}