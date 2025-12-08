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
  Pressable,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext, AppTheme } from "../theme/ThemeProvider";
import { useEffect } from "react";
import GarageDetail from "./DetailedGarage";
import { EmailContext } from "../utils/EmailContext";
import EmptyState from "./EmptyState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { useActionSheet } from "@expo/react-native-action-sheet";
import axios from "axios";
import { ParkingPass, PARKING_PASS_OPTIONS } from "../constants/passes";
import { INITIAL_GARAGES, InitialGarage } from "../data/initialGarageAvailability";
import { subscribeToParkingUpdates } from "../utils/parkingEvents";
import { API_BASE_URL } from "../config/env";

type Garage = InitialGarage;
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
  individual_rating: number;
}
const API_BASE = Platform.OS === "android" ? "http://10.0.2.2:7500" : "http://localhost:7500";


type ApiLot = {
  id?: number;
  name?: string;
  code?: string;
  available?: number;
  capacity?: number;
};

const AVAILABILITY_ENDPOINT = "/parking/availability/";

const formatLastUpdatedTimestamp = () =>
  new Date().toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });


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

  return `http://${host}:7500`;
};

// Changes the traditional garage data to the detailed format
function mapListGarageToDetail(g: Garage, email: string): GarageDetailType {
  const occupied = Math.max(0, (g.total ?? 0) - (g.current ?? 0));
  let lot_ratings: {[name: string]: number} = {}
  
  async function getUserRatings(){
      const API_BASE = API_BASE_URL;
      await fetch(`${API_BASE}/user/get_user`, {
            method: "POST",
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: email
            })
          }).then((res) => res.json())
          .then((response) => {
            lot_ratings = response['lot_ratings']['codes']
          });
    }
    getUserRatings();

  return {
    id: g.id,
    code: g.code,
    name: g.name,
    address: g.address, // replace with real field if you have it
    totalSpots: g.total,
    occupiedSpots: occupied,
    covered: true,
    shaded: true,
    rating: g.rating,
    latitude: g.lat,
    longitude: g.lng,
    amenities: ["covered", "lighting"],
    price: g.paid ? "Paid Lot" : "Free",
    hours: [{ days: "Mon–Sun", open: "00:00", close: "24/7" }],
    lastUpdatedIso: new Date().toISOString(),
    individual_rating: 0
  };
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const FILTER_STORAGE_KEY = "garage_filters";
const BACK_TO_TOP_THRESHOLD = 420;

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
  const insets = useSafeAreaInsets();
  const fabBottomOffset = React.useMemo(() => Math.max(20, insets.bottom + 20), [insets.bottom]);
  const [garages, setGarages] = React.useState<Garage[]>(data);
  const listRef = React.useRef<FlatList<Garage>>(null);
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<string>(() =>
    formatLastUpdatedTimestamp()
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedPasses, setSelectedPasses] = React.useState<ParkingPass[]>([]);
  const [isFilterVisible, setIsFilterVisible] = React.useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);
  const [lotRatings, setLotRatings] = React.useState();
  const filtersLoadedRef = React.useRef(false);
  const userEmail = React.useContext(EmailContext);
  const { showActionSheetWithOptions } = useActionSheet();
  const [origin, setOrigin] = React.useState("");
  const [location, setLocation] = React.useState("");
  

  // detail panel state
  const [selected, setSelected] = React.useState<Garage | null>(null);
  const translateX = React.useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const fabOpacity = React.useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [BACK_TO_TOP_THRESHOLD - 140, BACK_TO_TOP_THRESHOLD - 20, BACK_TO_TOP_THRESHOLD + 60],
        outputRange: [0, 0, 1],
        extrapolate: "clamp",
      }),
    [scrollY]
  );
  const fabTranslateY = React.useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [BACK_TO_TOP_THRESHOLD - 20, BACK_TO_TOP_THRESHOLD + 80],
        outputRange: [32, 0],
        extrapolate: "clamp",
      }),
    [scrollY]
  );
  const handleListScroll = React.useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: ({ nativeEvent }: { nativeEvent: { contentOffset: { y: number } } }) => {
          const offsetY = nativeEvent.contentOffset.y;
          setShowBackToTop((prev) => {
            if (prev && offsetY < BACK_TO_TOP_THRESHOLD * 0.4) return false;
            if (!prev && offsetY > BACK_TO_TOP_THRESHOLD) return true;
            return prev;
          });
        },
      }),
    [scrollY]
  );
  const handleBackToTopPress = React.useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);


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
          setSelectedPasses(
            parsed.passes.filter((p): p is ParkingPass => PARKING_PASS_OPTIONS.includes(p))
          );
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

  // Helper function to calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in miles
  };

  // Helper function to find the nearest non-full garage
  const findNearestAlternative = (currentGarage: Garage): Garage | null => {
    if (!currentGarage.lat || !currentGarage.lng) return null;
    
    const availableGarages = garages.filter(g => 
      g.id !== currentGarage.id && // Exclude current garage
      !isGarageFull(g.current) && // Only non-full garages
      g.lat && g.lng // Must have coordinates
    );

    if (availableGarages.length === 0) return null;

    let nearestGarage = availableGarages[0];
    let shortestDistance = calculateDistance(
      currentGarage.lat, currentGarage.lng,
      nearestGarage.lat!, nearestGarage.lng!
    );

    for (let i = 1; i < availableGarages.length; i++) {
      const garage = availableGarages[i];
      const distance = calculateDistance(
        currentGarage.lat, currentGarage.lng,
        garage.lat!, garage.lng!
      );
      
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestGarage = garage;
      }
    }

    return nearestGarage;
  };

  // Helper function to determine if a garage is full
  const isGarageFull = (available: number): boolean => {
    return available <= 5; // Consider garage full if 5 or fewer spots available
  };

  // Helper function to get garage status text
  const getGarageStatus = (available: number, total: number): string => {
    if (available === 0) return "completely full";
    if (available <= 5) return "nearly full";
    const percentage = Math.round((available / total) * 100);
    return `${percentage}% available`;
  };

  // Handle garage press interaction for full garage popup
  const handleGaragePress = React.useCallback((garage: Garage) => {
    if (isGarageFull(garage.current)) {
      const statusText = getGarageStatus(garage.current, garage.total);
      const alertTitle = garage.current === 0 ? "Garage Full" : "Garage Nearly Full";
      const alertMessage = `${garage.name} is ${statusText} with ${garage.current} spots remaining.\n\nConsider checking other nearby garages for better availability.`;

      Alert.alert(
        alertTitle,
        alertMessage,
        [
          {
            text: "OK",
            style: "default",
            onPress: () => {
              openDetail(garage);
            }
          },
          {
            text: "View Alternatives", 
            style: "default",
            onPress: () => {
              const nearestAlternative = findNearestAlternative(garage);
              
              if (nearestAlternative) {
                const distance = calculateDistance(
                  garage.lat!, garage.lng!,
                  nearestAlternative.lat!, nearestAlternative.lng!
                );
                
                const availabilityPercent = Math.round((nearestAlternative.current / nearestAlternative.total) * 100);
                
                Alert.alert(
                  "Recommended Alternative",
                  `${nearestAlternative.name}\n\n• ${nearestAlternative.current}/${nearestAlternative.total} spots available (${availabilityPercent}% full)\n• ${distance.toFixed(1)} miles away\n• Accepts: ${nearestAlternative.passes.join(", ")} passes`,
                  [
                    {
                      text: "Cancel",
                      style: "cancel"
                    },
                    {
                      text: "Get Directions",
                      style: "default",
                      onPress: () => handleOpenInMaps(nearestAlternative)
                    },
                    {
                      text: "View Details",
                      style: "default", 
                      onPress: () => openDetail(nearestAlternative)
                    }
                  ],
                  { cancelable: true }
                );
              } else {
                Alert.alert(
                  "No Alternatives Available",
                  "Unfortunately, all nearby garages are currently full or nearly full. Please try again later or consider alternative transportation.",
                  [{ text: "OK", style: "default" }],
                  { cancelable: true }
                );
              }
            },
          },
        ],
        { cancelable: true }
      );
    } else {
      // For garages with good availability, show success info
      openDetail(garage);
    }
  }, []);

    const loadOrigin = React.useCallback(async () => {
    try {
      const userJson = await SecureStore.getItemAsync("user");
      const user = userJson ? JSON.parse(userJson) : null;
      const email = user?.email;
      if (!email) return;
      const res = await axios.get(`${API_BASE}/user/origin/`, { params: { email } });
      const loadedOrigin = res?.data?.default_origin ?? "";
      setOrigin(loadedOrigin);
      console.log("Loaded starting location:", loadedOrigin || "(none)");
    } catch (err) {
      console.error("Failed to load starting location:", err);
    } 
  }, []);

  const loadLocation = React.useCallback(async () => {
    try {
      const userJson = await SecureStore.getItemAsync("user");
      const user = userJson ? JSON.parse(userJson) : null;
      const email = user?.email;
      if (!email) return;
      const res = await axios.get(`${API_BASE}/user/location/`, { params: { email } });
      const loadedLocation = res?.data?.other_location ?? "";
      setLocation(loadedLocation);
      console.log("Loaded other location:", loadedLocation || "(none)");
    } catch (err) {
      console.error("Failed to load other location:", err);
    } 
  }, []);


  const handleOpenInMaps = React.useCallback(
    (garage: Garage) => {
      const options = ['Apple Maps', 'Google Maps', 'Cancel'];
      const destructiveButtonIndex = 3;
      const cancelButtonIndex = 2;
      const garageName: string = garage.name
      const urlName = garageName.replaceAll(" ", "+")
      let url = ``
      loadOrigin();
      const startingLocationName = origin.replaceAll(" ", "+"); 
      const startingLocationLink = startingLocationName.replaceAll(",", "%2C"); 
      showActionSheetWithOptions({
                options,
                cancelButtonIndex,
                destructiveButtonIndex
              }, (selectedIndex) => {
                switch (selectedIndex) {
                  case 0:
                    url = `http://maps.apple.com/?saddr=${startingLocationLink}&daddr=${urlName}+West+Lafayette+IN`
                    Linking.openURL(url)
                    break;
    
                  case 1:
                    url = `https://www.google.com/maps/dir/?api=1&origin=${startingLocationLink}&destination=${urlName}+West+Lafayette+IN&travelmode=driving`
                    Linking.openURL(url)
                    break;
    
                  case cancelButtonIndex:
                    // Canceled
                }});
      },
      [onOpenInMaps]
  );

  useEffect(() => {
    async function getUserRatings() {
      const API_BASE = Platform.OS === "android" ? "http://10.0.2.2:7500" : "http://localhost:7500";
          //TODO: API Call to backend to update the rating in the backend
          await fetch(`${API_BASE}/user/get_user`, {
            method: "POST",
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: userEmail.userEmail
            })
          }).then((res) => res.json())
          .then((response) => {
            setLotRatings(response['lot_ratings']['codes'])
          });
    }
    getUserRatings();
  }, [])
  useEffect(() => {
    let isMounted = true;

    const loadAvailability = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}${AVAILABILITY_ENDPOINT}`);

        if (!response.ok) {
          console.error("Failed to fetch parking availability", response.status);
          return;
        }

        const payload: { lots?: ApiLot[] } = await response.json();
        const lots = Array.isArray(payload?.lots) ? payload.lots : [];
        if (!lots.length || !isMounted) {
          return;
        }

        const updatesByCode = new Map<string, ApiLot>();
        lots.forEach((lot) => {
          if (lot.code) {
            updatesByCode.set(lot.code.toUpperCase(), lot);
          }
        });

        if (!updatesByCode.size) {
          return;
        }

        if (!isMounted) {
          return;
        }

        setGarages((prev) =>
          prev.map((garage) => {
            const update = updatesByCode.get(garage.code.toUpperCase());
            if (!update || typeof update.available !== "number") {
              return garage;
            }

            const capacityOverride =
              typeof update.capacity === "number" ? update.capacity : undefined;
            const nextTotal = capacityOverride ?? garage.total;
            const nextAvailable = Math.max(update.available, 0);
            const cappedAvailable = nextTotal > 0 ? Math.min(nextAvailable, nextTotal) : nextAvailable;

            return {
              ...garage,
              total: nextTotal,
              current: cappedAvailable,
            };
          })
        );

        setLastUpdated(formatLastUpdatedTimestamp());
      } catch (error) {
        console.error("Failed to load parking availability", error);
      }
    };

    loadAvailability();
    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    const unsubscribe = subscribeToParkingUpdates(({ lot, count }) => {
      const normalizedLot = typeof lot === "string" ? lot.toUpperCase() : lot;
      if (!normalizedLot) return;

      setGarages((prev) =>
        prev.map((garage) => {
          if (!garage.code || garage.code.toUpperCase() !== normalizedLot) {
            return garage;
          }

          const nextTotal = typeof garage.total === "number" ? garage.total : garage.current;
          const safeCount = Math.max(0, count);
          const capped = nextTotal && nextTotal > 0 ? Math.min(safeCount, nextTotal) : safeCount;

          return {
            ...garage,
            current: capped,
          };
        })
      );

      setLastUpdated(formatLastUpdatedTimestamp());
    });

    return () => {
      unsubscribe();
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
      await fetch(`${API_BASE}/get_rating`, {
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
      //getUserRatings();
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
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => handleGaragePress(item)} // ← Changed to use handleGaragePress instead of openDetail
      >
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
            // Add subtle opacity for full garages
            opacity: isGarageFull(item.current) ? 0.8 : 1,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ color: theme.text, fontSize: 22, fontWeight: "600" }}>
                  {item.name}
                </Text>
              </View>
              {/* Rating Pill */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {isGarageFull(item.current) && (
                  <View style={{
                    backgroundColor: "#ef4444",
                    borderWidth: 1,
                    borderColor: "white",
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    width: 50,
                    height: 28,
                    marginTop: 5,
                  }}>
                    <Text style={{ fontSize: 12, color: "white", fontWeight: "bold", marginTop: 3.5, marginHorizontal: 1 }}>
                      {item.current === 0 ? "FULL" : "LOW"}
                    </Text>
                  </View>
                )}
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
                  {PARKING_PASS_OPTIONS.map((pass) => {
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

      <Animated.FlatList
        ref={listRef}
        data={visibleGarages}
        keyExtractor={(g) => g.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmptyComponent}
        onScroll={handleListScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: 24,
          paddingTop: 8,
          flexGrow: visibleGarages.length === 0 ? 1 : 0,
          justifyContent: visibleGarages.length === 0 ? "center" : undefined,
        }}
      />

      <Animated.View
        pointerEvents={showBackToTop ? "auto" : "none"}
        style={[
          {
            position: "absolute",
            right: 20,
            bottom: fabBottomOffset,
            zIndex: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: theme.mode === "dark" ? 0.35 : 0.18,
            shadowRadius: 12,
            elevation: 6,
          },
          { opacity: fabOpacity, transform: [{ translateY: fabTranslateY }] },
        ]}
      >
        <Pressable
          onPress={handleBackToTopPress}
          accessibilityRole="button"
          accessibilityLabel="Back to top"
          accessibilityHint="Scrolls the garage list to the beginning"
          testID="garage-list-back-to-top"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? theme.fabBackgroundPressed : theme.fabBackground,
            borderWidth: theme.mode === "dark" ? 0 : 1,
            borderColor: theme.mode === "dark" ? "transparent" : "rgba(0,0,0,0.08)",
          })}
        >
          <Ionicons name="arrow-up" size={22} color={theme.fabIcon} />
        </Pressable>
      </Animated.View>

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
            garage={mapListGarageToDetail(selected, userEmail.userEmail )}
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

