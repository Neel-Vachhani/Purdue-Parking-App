import React from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import GooglePlacesTextInput from "react-native-google-places-textinput";
import MapView, { Marker } from "react-native-maps";
import ThemedView from "./ThemedView";
import GarageDetail, { Garage } from "./DetailedGarage";
import { ThemeContext } from "../theme/ThemeProvider";
import { Ionicons } from "./ThemedIcons";
import { GARAGE_DEFINITIONS } from "../data/garageDefinitions";
import { Coordinate, geocodeAddress } from "../utils/travelTime";
import { INITIAL_GARAGE_LOOKUP } from "../data/initialGarageAvailability";
import { loadParkingLocations } from "../screens/Parking/parkingLocationsData";
import { getGoogleMapsApiKey } from "../config/env";
import { INITIAL_REGION } from "../constants/map";
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from "../constants/mapStyle";
import { useBulkForecasts } from "../utils/useForecast";
import * as Location from "expo-location";

type RoutePointKind = "stop" | "destination";
type NavigationStage = "editing" | "selecting" | "completed";

type RoutePoint = {
  id: string;
  kind: RoutePointKind;
  label: string;
  address: string;
  coordinates?: Coordinate;
  selectedGarageCode?: string;
  selectedGarageName?: string;
};

type GarageCandidate = {
  garage: Garage;
  distanceMeters: number;
};

type AvailabilityByCode = Record<
  string,
  {
    available?: number;
    capacity?: number;
  }
>;

const MAX_CANDIDATES_PER_STEP = 5;
const DRIVING_FACTOR = 1.4;
const AVG_SPEED_MPH = 20

const toRadians = (value: number): number => (value * Math.PI) / 180;

const haversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const radius = 6371000;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radius * c;
};

const formatMiles = (distanceMeters: number): string => {
  const miles = distanceMeters / 1609.344;
  if (miles < 0.1) {
    return "<0.1 mi";
  }
  return `${miles.toFixed(1)} mi`;
};

function estimateETAMinutes(distanceMeters: number): number {
  const drivingMiles = (distanceMeters * DRIVING_FACTOR) / 1609.344;
  return Math.max(1, Math.round((drivingMiles / AVG_SPEED_MPH) * 60));
}

function formatETA(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatArrivalTime(etaMinutes: number): string {
  const arrival = new Date(Date.now() + etaMinutes * 60 * 1000);
  const h = arrival.getHours();
  const m = arrival.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const extractAddressFromPlace = (place: any): string => {
  return (
    place?.details?.formattedAddress ||
    place?.details?.displayName?.text ||
    place?.structuredFormat?.mainText?.text ||
    place?.displayName?.text ||
    ""
  );
};

const extractCoordinatesFromPlace = (place: any): Coordinate | null => {
  const latitude = place?.details?.location?.latitude;
  const longitude = place?.details?.location?.longitude;

  if (typeof latitude === "number" && typeof longitude === "number") {
    return { latitude, longitude };
  }

  return null;
};

const normalizeAddressKey = (address: string): string =>
  address.trim().toLowerCase().replace(/\s+/g, " ");

const getGarageCoordinatesFromAddress = (address: string): Coordinate | null => {
  const normalized = address.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const matchedGarage = GARAGE_DEFINITIONS.find(
    (definition) => definition.address.trim().toLowerCase() === normalized
  );

  if (!matchedGarage) {
    return null;
  }

  return {
    latitude: matchedGarage.lat,
    longitude: matchedGarage.lng,
  };
};

const buildRoutePoints = (
  stops: string[],
  stopCoordinates: Array<Coordinate | null>,
  destination: string,
  destinationCoordinate: Coordinate | null
): RoutePoint[] => {
  const points: RoutePoint[] = [];

  stops.forEach((stop, index) => {
    const cleaned = stop.trim();
    if (!cleaned) {
      return;
    }

    points.push({
      id: `stop-${points.length + 1}`,
      kind: "stop",
      label: `Stop ${points.length + 1}`,
      address: cleaned,
      coordinates: stopCoordinates[index] ?? undefined,
    });
  });

  points.push({
    id: "destination",
    kind: "destination",
    label: "Destination",
    address: destination.trim(),
    coordinates: destinationCoordinate ?? undefined,
  });

  return points;
};

const getSelectedLotAddress = (point: RoutePoint): string => {
  const pointAddress = point.address?.trim();
  if (pointAddress) {
    return pointAddress;
  }

  const fallback = GARAGE_DEFINITIONS.find(
    (definition) => definition.code === point.selectedGarageCode
  )?.address;

  return fallback?.trim() ?? "";
};

const buildGoogleDirectionsUrl = (
  routePoints: RoutePoint[]
): string | null => {
  if (routePoints.length === 0) {
    return null;
  }

  const allPointsSelected = routePoints.every((point) => Boolean(point.selectedGarageCode));
  if (!allPointsSelected) {
    return null;
  }

  const selectedAddresses = routePoints.map(getSelectedLotAddress);
  const hasMissingAddress = selectedAddresses.some((address) => !address);
  if (hasMissingAddress) {
    return null;
  }

  const destinationAddress = selectedAddresses[selectedAddresses.length - 1];
  const stopAddresses = selectedAddresses.slice(0, -1);
  const waypointString = stopAddresses.join("|");

  let url =
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${encodeURIComponent(destinationAddress)}` +
    `&travelmode=driving`;

  if (waypointString) {
    url += `&waypoints=${encodeURIComponent(waypointString)}`;
  }

  return url;
};

const buildAppleDirectionsUrl = (routePoints: RoutePoint[]): string | null => {
  if (routePoints.length === 0) {
    return null;
  }

  const destinationAddress = getSelectedLotAddress(routePoints[routePoints.length - 1]);
  if (!destinationAddress) {
    return null;
  }

  return `http://maps.apple.com/?daddr=${encodeURIComponent(destinationAddress)}&dirflg=d`;
};

const NavigationView = () => {
  const theme = React.useContext(ThemeContext);
  const googleMapsApiKey = getGoogleMapsApiKey();
  const coordinateCacheRef = React.useRef<Record<string, Coordinate>>({});
  const navMapRef = React.useRef<MapView>(null);

  const locationRestriction = React.useMemo(
    () => ({
      rectangle: {
        low: { latitude: 40.39286, longitude: -86.954622 },
        high: { latitude: 40.466874, longitude: -86.871755 },
      },
    }),
    []
  );

  const autocompleteStyles = React.useMemo(
    () => ({
      container: {
        width: "100%" as const,
      },
      input: {
        minHeight: 44,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.bg,
        color: theme.text,
        paddingHorizontal: 12,
        fontSize: 15,
      },
      suggestionsContainer: {
        marginTop: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        maxHeight: 220,
      },
      suggestionItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      },
      suggestionText: {
        main: {
          color: theme.text,
          fontSize: 14,
        },
        secondary: {
          color: theme.textMuted,
          fontSize: 12,
        },
      },
      loadingIndicator: {
        color: theme.textMuted,
      },
      placeholder: {
        color: theme.textMuted,
      },
    }),
    [theme]
  );

  const [destinationInput, setDestinationInput] = React.useState("");
  const [destinationCoordinate, setDestinationCoordinate] = React.useState<Coordinate | null>(
    null
  );
  const [stopInputs, setStopInputs] = React.useState<string[]>([]);
  const [stopCoordinates, setStopCoordinates] = React.useState<Array<Coordinate | null>>([]);

  const [stage, setStage] = React.useState<NavigationStage>("editing");
  const [routePoints, setRoutePoints] = React.useState<RoutePoint[]>([]);
  const [currentPointIndex, setCurrentPointIndex] = React.useState(0);

  const [candidateGarages, setCandidateGarages] = React.useState<GarageCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = React.useState(false);
  const [candidateError, setCandidateError] = React.useState<string | null>(null);
  const [availabilityByCode, setAvailabilityByCode] = React.useState<AvailabilityByCode>({});

  const [detailGarage, setDetailGarage] = React.useState<Garage | null>(null);
  const [favoriteCodes, setFavoriteCodes] = React.useState<Set<string>>(
    () =>
      new Set(
        GARAGE_DEFINITIONS.filter((garage) => garage.favorite).map((garage) => garage.code)
      )
  );

  const [filterFullAtETA, setFilterFullAtETA] = React.useState(false);
  const [showFilterMenu, setShowFilterMenu] = React.useState(false);

  const [userLocation, setUserLocation] = React.useState<Coordinate | null>(null);

  const getUserToGarageDistance = React.useCallback((garage: Garage): number | null => {
  if (!userLocation || garage.latitude == null || garage.longitude == null) return null;
  return haversineMeters(userLocation.latitude, userLocation.longitude, garage.latitude, garage.longitude);
}, [userLocation]);

React.useEffect(() => {
  let mounted = true;
  (async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (mounted) setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e) {
      console.warn("[Nav] Could not get location:", e);
    }
  })();
  return () => { mounted = false; };
}, []);

  const currentPoint =
    stage === "selecting" ? routePoints[currentPointIndex] ?? null : null;

  const candidateCodes = React.useMemo(
    () => candidateGarages.map((c) => c.garage.code ?? "").filter(Boolean),
    [candidateGarages]
  );
  console.log("[DEBUG] candidateCodes:", candidateCodes);
  const { getForecast, loading: forecastLoading } = useBulkForecasts(candidateCodes);
  console.log("[DEBUG] forecastLoading:", forecastLoading);

 const filteredCandidates = React.useMemo(() => {
    if (!filterFullAtETA) return candidateGarages;
    return candidateGarages.filter((c) => {
      const fc = getForecast(c.garage.code ?? "");
      if (!fc) return true; 
      const dist = getUserToGarageDistance(c.garage);
      if (!dist) return true;
      const etaMin = estimateETAMinutes(dist);
      const arrivalMs = Date.now() + etaMin * 60 * 1000;
      const step = findStepAtTime(fc.forecast, arrivalMs);
      if (!step) return true;
      return step.occupancy_pct < 0.95;
    });
  }, [candidateGarages, filterFullAtETA, getForecast, getUserToGarageDistance]);

  const filteredOutCount = candidateGarages.length - filteredCandidates.length;

  const cacheCoordinateForAddress = React.useCallback((address: string, coordinates: Coordinate) => {
    const key = normalizeAddressKey(address);
    if (!key) {
      return;
    }
    coordinateCacheRef.current[key] = coordinates;
  }, []);

  const getCachedCoordinateForAddress = React.useCallback((address: string): Coordinate | null => {
    const key = normalizeAddressKey(address);
    if (!key) {
      return null;
    }
    return coordinateCacheRef.current[key] ?? null;
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    const loadAvailability = async () => {
      try {
        const locations = await loadParkingLocations();
        if (!isMounted) {
          return;
        }

        const lookup: AvailabilityByCode = {};
        locations.forEach((location) => {
          lookup[location.code.toUpperCase()] = {
            available: location.available,
            capacity: location.capacity,
          };
        });
        setAvailabilityByCode(lookup);
      } catch {
        if (isMounted) {
          setAvailabilityByCode({});
        }
      }
    };

    loadAvailability();

    return () => {
      isMounted = false;
    };
  }, []);

  // Pan map to the current route point whenever the active point changes
  React.useEffect(() => {
    if (stage !== "selecting" && stage !== "completed") return;
    const coord = routePoints[currentPointIndex]?.coordinates;
    if (!coord) return;
    navMapRef.current?.animateToRegion(
      { ...coord, latitudeDelta: 0.015, longitudeDelta: 0.015 },
      700
    );
  }, [stage, currentPointIndex]);

  // Pan to the selected garage whenever the user picks one
  React.useEffect(() => {
    const code = currentPoint?.selectedGarageCode;
    if (!code) return;
    const def = GARAGE_DEFINITIONS.find((d) => d.code === code);
    if (!def) return;
    navMapRef.current?.animateToRegion(
      { latitude: def.lat, longitude: def.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      600
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPoint?.selectedGarageCode]);

  // After the full route is confirmed, fit all selected garages into view
  React.useEffect(() => {
    if (stage !== "completed") return;
    const coords = routePoints
      .map((point) => {
        const def = GARAGE_DEFINITIONS.find((d) => d.code === point.selectedGarageCode);
        return def ? { latitude: def.lat, longitude: def.lng } : null;
      })
      .filter((c): c is { latitude: number; longitude: number } => c !== null);
    if (coords.length === 0) return;
    // Small delay lets the MapView finish its layout before fitting
    setTimeout(() => {
      navMapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }, 400);
  }, [stage]);

  const toGarageModel = React.useCallback(
    (garageCode: string, distanceMeters: number): Garage | null => {
      const definition = GARAGE_DEFINITIONS.find((garage) => garage.code === garageCode);
      if (!definition) {
        return null;
      }

      const code = definition.code.toUpperCase();
      const fallback = INITIAL_GARAGE_LOOKUP.get(code);
      const live = availabilityByCode[code];

      const capacity = live?.capacity ?? fallback?.total;
      const available = live?.available ?? fallback?.current;
      const occupied =
        capacity !== undefined && available !== undefined
          ? Math.max(capacity - available, 0)
          : undefined;

      return {
        id: definition.code,
        code: definition.code,
        name: definition.name,
        address: definition.address,
        latitude: definition.lat,
        longitude: definition.lng,
        distanceMeters,
        isOpen: true,
        totalSpots: capacity,
        occupiedSpots: occupied,
        covered: false,
        shaded: false,
        amenities: ["lighting"],
        price: definition.paid ? "Paid lot" : "Permit lot",
        hours: [{ days: "Mon-Sun", open: "00:00", close: "24/7" }],
        lastUpdatedIso: new Date().toISOString(),
        rating: definition.rating,
        individual_rating: definition.individual_rating,
      };
    },
    [availabilityByCode]
  );

  React.useEffect(() => {
    if (!currentPoint || stage !== "selecting") {
      return;
    }

    let isMounted = true;

    const fetchNearestGarages = async () => {
      setLoadingCandidates(true);
      setCandidateError(null);
      setCandidateGarages([]);

      const coordinates =
        currentPoint.coordinates ??
        getCachedCoordinateForAddress(currentPoint.address) ??
        getGarageCoordinatesFromAddress(currentPoint.address) ??
        (await geocodeAddress(currentPoint.address));
      if (!isMounted) {
        return;
      }

      if (!coordinates) {
        setLoadingCandidates(false);
        setCandidateError(
          `Could not geocode ${currentPoint.label.toLowerCase()}. Please edit the address and try again.`
        );
        return;
      }

      cacheCoordinateForAddress(currentPoint.address, coordinates);

      const ranked = GARAGE_DEFINITIONS.map((definition) => {
        const distanceMeters = haversineMeters(
          coordinates.latitude,
          coordinates.longitude,
          definition.lat,
          definition.lng
        );
        const garage = toGarageModel(definition.code, distanceMeters);
        return {
          garage,
          distanceMeters,
        };
      })
        .filter((candidate): candidate is { garage: Garage; distanceMeters: number } => {
          return candidate.garage !== null;
        })
        .sort((first, second) => first.distanceMeters - second.distanceMeters)
        .slice(0, MAX_CANDIDATES_PER_STEP)
        .map((candidate) => ({
          garage: candidate.garage,
          distanceMeters: candidate.distanceMeters,
        }));

      if (ranked.length === 0) {
        setCandidateError("No garages found from the known garage list.");
      }

      setCandidateGarages(ranked);
      setLoadingCandidates(false);
    };

    fetchNearestGarages();

    return () => {
      isMounted = false;
    };
  }, [
    cacheCoordinateForAddress,
    currentPoint?.address,
    currentPoint?.label,
    getCachedCoordinateForAddress,
    stage,
    toGarageModel,
  ]);

  const setStopAtIndex = React.useCallback((index: number, value: string) => {
    setStopInputs((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });

    setStopCoordinates((previous) => {
      const next = [...previous];
      next[index] = null;
      return next;
    });
  }, []);

  const setStopSelection = React.useCallback(
    (index: number, address: string, coordinates: Coordinate | null) => {
      setStopInputs((previous) => {
        const next = [...previous];
        next[index] = address;
        return next;
      });

      setStopCoordinates((previous) => {
        const next = [...previous];
        next[index] = coordinates;
        return next;
      });

      if (coordinates) {
        cacheCoordinateForAddress(address, coordinates);
      }
    },
    [cacheCoordinateForAddress]
  );

  const removeStopAtIndex = React.useCallback((index: number) => {
    setStopInputs((previous) => previous.filter((_, stopIndex) => stopIndex !== index));
    setStopCoordinates((previous) =>
      previous.filter((_, stopIndex) => stopIndex !== index)
    );
  }, []);

  const startGarageSelection = React.useCallback(() => {
    const destination = destinationInput.trim();
    if (!destination) {
      Alert.alert("Destination required", "Enter a destination before continuing.");
      return;
    }

    const points = buildRoutePoints(
      stopInputs,
      stopCoordinates,
      destination,
      destinationCoordinate
    );
    setRoutePoints(points);
    setCurrentPointIndex(0);
    setStage("selecting");
    setCandidateError(null);
  }, [destinationCoordinate, destinationInput, stopCoordinates, stopInputs]);

  const selectGarageForCurrentPoint = React.useCallback(
    (garage: Garage) => {
      if (!garage.code) {
        return;
      }

      setRoutePoints((previous) =>
        previous.map((point, index) =>
          index === currentPointIndex
            ? {
                ...point,
                selectedGarageCode: garage.code,
                selectedGarageName: garage.name,
                // Do NOT overwrite coordinates – keep the original destination
                // location so the flag pin stays on the searched address.
              }
            : point
        )
      );

      if (garage.latitude !== undefined && garage.longitude !== undefined) {
        cacheCoordinateForAddress(garage.address, {
          latitude: garage.latitude,
          longitude: garage.longitude,
        });
      }
    },
    [cacheCoordinateForAddress, currentPointIndex]
  );

  const confirmCurrentSelection = React.useCallback(() => {
    if (!currentPoint) {
      return;
    }

    const selectedGarage = candidateGarages.find(
      (candidate) => candidate.garage.code === currentPoint.selectedGarageCode
    )?.garage;

    if (!selectedGarage?.code) {
      Alert.alert(
        "Select a garage",
        `Choose which garage you want to park at for ${currentPoint.label.toLowerCase()}.`
      );
      return;
    }

    setRoutePoints((previous) =>
      previous.map((point, index) =>
        index === currentPointIndex
          ? {
              ...point,
              address: selectedGarage.address,
              selectedGarageCode: selectedGarage.code,
              selectedGarageName: selectedGarage.name,
              coordinates:
                selectedGarage.latitude !== undefined && selectedGarage.longitude !== undefined
                  ? {
                      latitude: selectedGarage.latitude,
                      longitude: selectedGarage.longitude,
                    }
                  : point.coordinates,
            }
          : point
      )
    );

    if (currentPointIndex >= routePoints.length - 1) {
      setStage("completed");
      return;
    }

    setCurrentPointIndex((previous) => previous + 1);
  }, [candidateGarages, currentPoint, currentPointIndex, routePoints.length]);

  const returnToEditing = React.useCallback(() => {
    const stopPoints = routePoints
      .filter((point) => point.kind === "stop")
      .map((point) => point.address);
    const stopPointCoordinates = routePoints
      .filter((point) => point.kind === "stop")
      .map((point) => point.coordinates ?? null);
    const destinationPoint = routePoints.find((point) => point.kind === "destination");

    setStopInputs(stopPoints);
    setStopCoordinates(stopPointCoordinates);
    setDestinationInput(destinationPoint?.address ?? destinationInput);
    setDestinationCoordinate(destinationPoint?.coordinates ?? null);
    setStage("editing");
    setCandidateGarages([]);
    setCandidateError(null);
  }, [destinationInput, routePoints]);

  const resetWorkflow = React.useCallback(() => {
    setStage("editing");
    setRoutePoints([]);
    setCurrentPointIndex(0);
    setCandidateGarages([]);
    setCandidateError(null);
    setStopCoordinates([]);
    setDestinationCoordinate(null);
  }, []);

  const openDirectionsUrl = React.useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Navigation unavailable", "Unable to open this navigation app on your device.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Navigation unavailable", "Unable to open navigation right now.");
    }
  }, []);

  const sendDirections = React.useCallback(() => {
    const googleUrl = buildGoogleDirectionsUrl(routePoints);
    if (!googleUrl) {
      Alert.alert("Route incomplete", "Confirm a garage for every stop and destination first.");
      return;
    }

    const appleUrl = buildAppleDirectionsUrl(routePoints);
    const buttons: Array<{ text: string; style?: "cancel"; onPress?: () => void }> = [
      {
        text: "Google Maps",
        onPress: () => {
          openDirectionsUrl(googleUrl);
        },
      },
    ];

    if (Platform.OS === "ios" && appleUrl) {
      buttons.push({
        text: "Apple Maps",
        onPress: () => {
          if (routePoints.length > 1) {
            Alert.alert(
              "Apple Maps",
              "Apple Maps will open with the final destination. Use Google Maps for full waypoint routing."
            );
          }
          openDirectionsUrl(appleUrl);
        },
      });
    }

    buttons.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Send directions", "Choose a navigation app.", buttons);
  }, [openDirectionsUrl, routePoints]);

  const openGarageDetail = React.useCallback((garage: Garage) => {
    setDetailGarage(garage);
  }, []);

  const closeGarageDetail = React.useCallback(() => {
    setDetailGarage(null);
  }, []);

  const toggleFavoriteGarage = React.useCallback((garageId: string, nextValue: boolean) => {
    setFavoriteCodes((previous) => {
      const next = new Set(previous);
      if (nextValue) {
        next.add(garageId);
      } else {
        next.delete(garageId);
      }
      return next;
    });
  }, []);

  const navigateDirectlyToGarage = React.useCallback(
    (garage: Garage) => {
      const destinationAddress = garage.address?.trim();
      if (!destinationAddress) {
        return;
      }

      const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        destinationAddress
      )}&travelmode=driving`;
      openDirectionsUrl(googleUrl);
    },
    [openDirectionsUrl]
  );

  const getArrivalForecast = React.useCallback((garage: Garage) => {
    const fc = getForecast(garage.code ?? "");
    if (!fc) return null;
    const dist = getUserToGarageDistance(garage);
    if (!dist) return null;
    const etaMin = estimateETAMinutes(dist);
    const arrivalMs = Date.now() + etaMin * 60 * 1000;
    const step = findStepAtTime(fc.forecast, arrivalMs);
    return { etaMin, step, source: fc.source, derived: fc.derived };
  }, [getForecast]);

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
        },
        headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        container: {
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
          gap: 12,
        },
        header: {
          fontSize: 24,
          fontWeight: "800",
          color: theme.text,
        },
        subheader: {
          fontSize: 14,
          color: theme.textMuted,
          marginBottom: 6,
        },
        sectionCard: {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 12,
          gap: 10,
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        autocompleteWrapper: {
          flex: 1,
          minHeight: 44,
        },
        removeStopButton: {
          alignSelf: "center",
        },
        warningText: {
          color: theme.warning,
          fontSize: 12,
          fontWeight: "600",
        },
        addStopButton: {
          height: 42,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.bg,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 6,
        },
        addStopText: {
          color: theme.text,
          fontWeight: "700",
        },
        primaryButton: {
          minHeight: 48,
          borderRadius: 12,
          backgroundColor: theme.primary,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 12,
          marginTop: 6,
        },
        primaryButtonText: {
          color: theme.primaryText,
          fontSize: 15,
          fontWeight: "800",
        },
        secondaryButton: {
          minHeight: 44,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 12,
        },
        secondaryButtonText: {
          color: theme.text,
          fontWeight: "700",
        },
        progressCard: {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 12,
          gap: 8,
        },
        progressRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        },
        progressLeft: {
          flex: 1,
          gap: 2,
        },
        progressLabel: {
          color: theme.text,
          fontSize: 13,
          fontWeight: "700",
        },
        progressAddress: {
          color: theme.textMuted,
          fontSize: 12,
        },
        progressStatus: {
          fontSize: 12,
          fontWeight: "700",
        },
        candidateList: {
          gap: 10,
        },
        candidateCard: {
          flexDirection: "row",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          overflow: "hidden",
        },
        candidateBody: {
          flex: 1,
          padding: 12,
          gap: 4,
        },
        candidateName: {
          color: theme.text,
          fontSize: 15,
          fontWeight: "700",
        },
        candidateAddress: {
          color: theme.textMuted,
          fontSize: 12,
        },
        candidateMeta: {
          color: theme.primary,
          fontWeight: "700",
          fontSize: 12,
        },
        candidateActions: {
          width: 112,
          borderLeftWidth: 1,
          borderLeftColor: theme.border,
          justifyContent: "center",
          padding: 8,
          gap: 8,
        },
        candidateActionButton: {
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.border,
          minHeight: 34,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.bg,
          paddingHorizontal: 8,
        },
        candidateActionButtonSelected: {
          borderColor: theme.primary,
          backgroundColor: theme.primary,
        },
        candidateActionText: {
          color: theme.text,
          fontSize: 12,
          fontWeight: "700",
          textAlign: "center",
        },
        candidateActionTextSelected: {
          color: theme.primaryText,
        },
        infoText: {
          color: theme.textMuted,
          fontSize: 13,
        },
        errorText: {
          color: theme.danger,
          fontSize: 13,
          fontWeight: "600",
        },
        summaryCard: {
          backgroundColor: theme.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 12,
          gap: 8,
        },
        summaryRow: {
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          gap: 2,
        },
        summaryLabel: {
          color: theme.text,
          fontSize: 13,
          fontWeight: "700",
        },
        summaryGarage: {
          color: theme.primary,
          fontSize: 13,
          fontWeight: "700",
        },
        summaryAddress: {
          color: theme.textMuted,
          fontSize: 12,
        },
        etaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
      etaText: { fontSize: 11, fontWeight: "600" },
      predRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
      predText: { fontSize: 11, fontWeight: "600" },
      filterBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1.5 },
      filterBtnText: { fontSize: 12, fontWeight: "700" },
      filterPanel: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 12, gap: 10, marginBottom: 4 },
      filterToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
      filterToggleLabel: { flex: 1, fontSize: 13, fontWeight: "600", color: theme.text },
      filterNotice: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: theme.mode === "dark" ? "#2a2d31" : "#fff7ed" },
      filterNoticeText: { fontSize: 12, color: "#f59e0b", fontWeight: "600", flex: 1 },
      }),
    [theme]
  );

  return (
    <ThemedView style={styles.screen}>
      {stage === "editing" ? (
        <View style={styles.container}>
          <Text style={styles.header}>Navigation Planner</Text>
          <Text style={styles.subheader}>
            Add stops and a destination, then pick the best garage for each step.
          </Text>

          <View style={styles.sectionCard}>
            {!googleMapsApiKey && (
              <Text style={styles.warningText}>
                Google Maps API key missing. Autocomplete suggestions will not load.
              </Text>
            )}

            <Text style={styles.progressLabel}>Stops</Text>
            {stopInputs.map((stop, index) => (
              <View key={`stop-input-${index}`} style={styles.row}>
                <Ionicons name="location-outline" size={18} color={theme.primary} />
                <View style={[styles.autocompleteWrapper, { zIndex: 1000 - index }]}> 
                  <GooglePlacesTextInput
                    apiKey={googleMapsApiKey}
                    placeHolderText={`Stop ${index + 1}`}
                    value={stop}
                    onTextChange={(value) => {
                      if (value !== stop) {
                        setStopAtIndex(index, value);
                      }
                    }}
                    onChange={(event) => {
                      const value = event.nativeEvent.text;
                      if (value !== stop) {
                        setStopAtIndex(index, value);
                      }
                    }}
                    onPlaceSelect={(place) => {
                      const address = extractAddressFromPlace(place);
                      const coordinates = extractCoordinatesFromPlace(place);
                      if (address) {
                        setStopSelection(index, address, coordinates);
                      }
                    }}
                    fetchDetails={true}
                    detailsFields={["formattedAddress", "location", "displayName"]}
                    minCharsToFetch={1}
                    debounceDelay={250}
                    hideOnKeyboardDismiss={true}
                    locationRestriction={locationRestriction}
                    style={autocompleteStyles}
                  />
                </View>
                <Pressable style={styles.removeStopButton} onPress={() => removeStopAtIndex(index)}>
                  <Ionicons name="remove-circle-outline" size={22} color={theme.danger} />
                </Pressable>
              </View>
            ))}

            <Pressable
              style={styles.addStopButton}
              onPress={() => {
                setStopInputs((prev) => [...prev, ""]);
                setStopCoordinates((prev) => [...prev, null]);
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
              <Text style={styles.addStopText}>Add stop</Text>
            </Pressable>

            <Text style={styles.progressLabel}>Destination</Text>
            <View style={styles.row}>
              <Ionicons name="flag-outline" size={18} color={theme.primary} />
              <View style={[styles.autocompleteWrapper, { zIndex: 900 }]}> 
                <GooglePlacesTextInput
                  apiKey={googleMapsApiKey}
                  placeHolderText="Enter destination"
                  value={destinationInput}
                  onTextChange={(value) => {
                    if (value !== destinationInput) {
                      setDestinationInput(value);
                      setDestinationCoordinate(null);
                    }
                  }}
                  onChange={(event) => {
                    const value = event.nativeEvent.text;
                    if (value !== destinationInput) {
                      setDestinationInput(value);
                      setDestinationCoordinate(null);
                    }
                  }}
                  onPlaceSelect={(place) => {
                    const address = extractAddressFromPlace(place);
                    const coordinates = extractCoordinatesFromPlace(place);
                    if (address) {
                      setDestinationInput(address);
                      setDestinationCoordinate(coordinates);
                      if (coordinates) {
                        cacheCoordinateForAddress(address, coordinates);
                      }
                    }
                  }}
                  fetchDetails={true}
                  detailsFields={["formattedAddress", "location", "displayName"]}
                  minCharsToFetch={1}
                  debounceDelay={250}
                  hideOnKeyboardDismiss={true}
                  locationRestriction={locationRestriction}
                  style={autocompleteStyles}
                />
              </View>
            </View>

            <Pressable style={styles.primaryButton} onPress={startGarageSelection}>
              <Text style={styles.primaryButtonText}>Find Closest Garages</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* ── Navigation map ──────────────────────────────────────────── */}
          <View style={navMapStyles.mapContainer}>
            <MapView
              ref={navMapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={INITIAL_REGION}
              mapType={theme.mode === "dark" ? "mutedStandard" : "standard"}
              customMapStyle={theme.mode === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
              showsUserLocation
              showsCompass={false}
              pitchEnabled={false}
              moveOnMarkerPress={false}
            >
              {/* Stop + destination pins */}
              {routePoints.map((point, idx) => {
                if (!point.coordinates) return null;
                const isCurrent = idx === currentPointIndex && stage === "selecting";
                return (
                  <Marker
                    key={`rp-${point.id}`}
                    coordinate={point.coordinates}
                    tracksViewChanges={false}
                  >
                    <View
                      style={[
                        navMapStyles.routePin,
                        {
                          backgroundColor: isCurrent ? theme.primary : theme.surface,
                          borderColor: theme.primary,
                        },
                      ]}
                    >
                      <Ionicons
                        name={point.kind === "destination" ? "flag" : "location"}
                        size={12}
                        color={isCurrent ? "#0E0F11" : theme.primary}
                      />
                    </View>
                  </Marker>
                );
              })}

              {/* Candidate garage pins – tap to select (selecting stage) */}
              {stage === "selecting" &&
                candidateGarages.map((candidate) => {
                  const { garage } = candidate;
                  if (!garage.latitude || !garage.longitude) return null;
                  const isSelected = currentPoint?.selectedGarageCode === garage.code;
                  return (
                    <Marker
                      key={`cg-${garage.code}`}
                      coordinate={{ latitude: garage.latitude, longitude: garage.longitude }}
                      tracksViewChanges={isSelected}
                      onPress={() => selectGarageForCurrentPoint(garage)}
                    >
                      <View
                        style={[
                          navMapStyles.garagePin,
                          isSelected && navMapStyles.garagePinSelected,
                        ]}
                      >
                        <Text
                          style={[
                            navMapStyles.garagePinText,
                            isSelected && navMapStyles.garagePinTextSelected,
                          ]}
                        >
                          P
                        </Text>
                      </View>
                    </Marker>
                  );
                })}

              {/* Confirmed garage pins (completed stage) */}
              {stage === "completed" &&
                routePoints.map((point) => {
                  const def = GARAGE_DEFINITIONS.find((d) => d.code === point.selectedGarageCode);
                  if (!def) return null;
                  return (
                    <Marker
                      key={`sg-${point.id}`}
                      coordinate={{ latitude: def.lat, longitude: def.lng }}
                      tracksViewChanges={false}
                    >
                      <View style={navMapStyles.garagePinSelected}>
                        <Text style={navMapStyles.garagePinTextSelected}>P</Text>
                      </View>
                    </Marker>
                  );
                })}
            </MapView>
          </View>

          {/* ── Scrollable route content below the map ─────────────────── */}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
              <Text style={styles.header}>Navigation Planner</Text>
              {stage === "selecting" && (
                <Pressable style={[styles.filterBtn, {
                  borderColor: filterFullAtETA ? theme.primary : theme.border,
                  backgroundColor: filterFullAtETA ? `${theme.primary}15` : "transparent",
                }]} onPress={() => setShowFilterMenu((p) => !p)}>
                  <Ionicons name="filter" size={14} color={filterFullAtETA ? theme.primary : theme.textMuted} />
                  <Text style={[styles.filterBtnText, { color: filterFullAtETA ? theme.primary : theme.text }]}>Filter</Text>
                  {filterFullAtETA && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary }} />}
                </Pressable>
              )}
            </View>
          
          <Text style={styles.subheader}>
            Add stops and a destination, then pick the best garage for each step.
          </Text>

          {showFilterMenu && stage === "selecting" && (
              <View style={styles.filterPanel}>
                <View style={styles.filterToggleRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.filterToggleLabel}>Hide garages likely full at ETA</Text>
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>Excludes garages predicted ≥95% full when you arrive</Text>
                  </View>
                  <Pressable onPress={() => setFilterFullAtETA((p) => !p)}
                    style={{ width: 44, height: 26, borderRadius: 13, justifyContent: "center", paddingHorizontal: 2,
                      backgroundColor: filterFullAtETA ? theme.primary : (theme.mode === "dark" ? "#374151" : "#d1d5db") }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff",
                      alignSelf: filterFullAtETA ? "flex-end" : "flex-start",
                      shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 }} />
                  </Pressable>
                </View>
              </View>
            )}

          {stage === "selecting" && currentPoint && (
            <>
            <View style={styles.progressCard}>
              <Text style={styles.progressLabel}>Route Progress</Text>
              {routePoints.map((point, index) => {
                const isCurrent = index === currentPointIndex;
                const isDone = index < currentPointIndex;
                const statusText = isCurrent
                  ? "Selecting garage"
                  : isDone
                  ? "Confirmed"
                  : "Pending";
                const selectedCode = point.selectedGarageCode;
                const selectedCandidate = selectedCode ? candidateGarages.find((c) => c.garage.code === selectedCode) : null;
                const etaMin = selectedCandidate ? estimateETAMinutes(selectedCandidate.distanceMeters) : null;
                return (
                  <View key={point.id} style={styles.progressRow}>
                    <View style={styles.progressLeft}>
                      <Text style={styles.progressLabel}>{point.label}</Text>
                      <Text style={styles.progressAddress}>{point.address}</Text>
                      {etaMin != null && (isCurrent || isDone) && (
                            <View style={styles.etaRow}>
                              <Ionicons name="time-outline" size={12} color="#4aa3ff" />
                              <Text style={[styles.etaText, { color: "#4aa3ff" }]}>
                                ETA: {formatETA(etaMin)} (arrive {formatArrivalTime(etaMin)})
                              </Text>
                            </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.progressStatus,
                        {
                          color: isCurrent
                            ? theme.primary
                            : isDone
                            ? theme.success
                            : theme.textMuted,
                        },
                      ]}
                    >
                      {statusText}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.progressLabel}>Choose garage for {currentPoint.label}</Text>
              <Text style={styles.infoText}>{currentPoint.address}</Text>

              {loadingCandidates && (
                <View style={styles.row}>
                  <ActivityIndicator color={theme.primary} />
                  <Text style={styles.infoText}>Finding the closest garages...</Text>
                </View>
              )}

              {!loadingCandidates && candidateError && (
                <Text style={styles.errorText}>{candidateError}</Text>
              )}

              {!loadingCandidates && !candidateError && (
                <View style={styles.candidateList}>
                  {filterFullAtETA && filteredOutCount > 0 && (
                        <View style={styles.filterNotice}>
                          <Ionicons name="eye-off-outline" size={14} color="#f59e0b" />
                          <Text style={styles.filterNoticeText}>{filteredOutCount} garage{filteredOutCount > 1 ? "s" : ""} hidden (predicted full at your ETA)</Text>
                        </View>
                      )}

                  {filteredCandidates.map((candidate, index) => {
                    const selected =
                      candidate.garage.code !== undefined &&
                      currentPoint.selectedGarageCode === candidate.garage.code;
                    const arrival = getArrivalForecast(candidate.garage);
                    const arrivalPct = arrival?.step ? Math.round(arrival.step.occupancy_pct * 100) : null;
                    const arrivalAvail = arrival?.step ? Math.round(arrival.step.available) : null;
                    const predColor = arrivalPct != null
                        ? (arrivalPct >= 95 ? "#ef4444" : arrivalPct >= 75 ? "#f59e0b" : "#22c55e")
                        : theme.textMuted;
                    const availLabel = arrivalAvail != null
                        ? (arrivalAvail <= 0 ? "Likely full" : `~${arrivalAvail} spots`)
                        : null;  

                    return (
                      <View key={`${candidate.garage.id}-${index}`} style={styles.candidateCard}>
                        <Pressable
                          style={styles.candidateBody}
                          onPress={() => openGarageDetail(candidate.garage)}
                        >
                          <Text style={styles.candidateName}>{candidate.garage.name}</Text>
                          <Text style={styles.candidateAddress}>{candidate.garage.address}</Text>
                          <Text style={styles.candidateMeta}>
                            {index === 0 ? "Closest" : `#${index + 1} closest`} - {formatMiles(candidate.distanceMeters)}
                          </Text>
                          {arrival && (
                                <>
                                  <View style={styles.etaRow}>
                                    <Ionicons name="time-outline" size={12} color="#4aa3ff" />
                                    <Text style={[styles.etaText, { color: "#4aa3ff" }]}>
                                      ETA: {formatETA(arrival.etaMin)} (arrive {formatArrivalTime(arrival.etaMin)})
                                    </Text>
                                  </View>
                                  {availLabel && (
                                    <View style={styles.predRow}>
                                      <Ionicons name="analytics-outline" size={12} color={predColor} />
                                      <Text style={[styles.predText, { color: predColor }]}>At arrival: {availLabel}</Text>
                                    </View>
                                  )}
                                  {arrival.derived.time_to_capacity_min != null && (
                                    <View style={styles.predRow}>
                                      <Ionicons name="alert-circle-outline" size={12} color="#f59e0b" />
                                      <Text style={[styles.predText, { color: "#f59e0b" }]}>Fills up in ~{arrival.derived.time_to_capacity_min} min</Text>
                                    </View>
                                  )}
                                </>
                              )}
                              {!arrival && forecastLoading && (
                                <View style={styles.etaRow}>
                                  <ActivityIndicator size={10} color={theme.textMuted} />
                                  <Text style={[styles.etaText, { color: theme.textMuted }]}>Loading forecast…</Text>
                                </View>
                              )}

                        </Pressable>
                        <View style={styles.candidateActions}>
                          <Pressable
                            style={[
                              styles.candidateActionButton,
                              selected && styles.candidateActionButtonSelected,
                            ]}
                            onPress={() => selectGarageForCurrentPoint(candidate.garage)}
                          >
                            <Text
                              style={[
                                styles.candidateActionText,
                                selected && styles.candidateActionTextSelected,
                              ]}
                            >
                              {selected ? "Selected" : "Select"}
                            </Text>
                          </Pressable>

                          <Pressable
                            style={styles.candidateActionButton}
                            onPress={() => openGarageDetail(candidate.garage)}
                          >
                            <Text style={styles.candidateActionText}>Details</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <Pressable
                style={styles.primaryButton}
                onPress={confirmCurrentSelection}
                disabled={loadingCandidates || candidateGarages.length === 0}
              >
                <Text style={styles.primaryButtonText}>
                  {currentPointIndex >= routePoints.length - 1
                    ? "Confirm and Finish"
                    : "Confirm and Continue"}
                </Text>
              </Pressable>

              <Pressable style={styles.secondaryButton} onPress={returnToEditing}>
                <Text style={styles.secondaryButtonText}>Edit route</Text>
              </Pressable>
            </View>
            </>
          )}

          {stage === "completed" && (
            <>
            <View style={styles.summaryCard}>
              <Text style={styles.progressLabel}>Route Ready</Text>
              <Text style={styles.infoText}>
                Each stop and destination now points to the garage you selected.
              </Text>

              {routePoints.map((point, index) => (
                <View
                  key={`${point.id}-summary`}
                  style={[
                    styles.summaryRow,
                    {
                      borderBottomWidth: index === routePoints.length - 1 ? 0 : 1,
                    },
                  ]}
                >
                  <Text style={styles.summaryLabel}>{point.label}</Text>
                  <Text style={styles.summaryGarage}>{point.selectedGarageName ?? "No garage selected"}</Text>
                  <Text style={styles.summaryAddress}>{point.address}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.primaryButton} onPress={sendDirections}>
              <Text style={styles.primaryButtonText}>Send Directions to Navigation App</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={resetWorkflow}>
              <Text style={styles.secondaryButtonText}>Plan another route</Text>
            </Pressable>
            </>
          )}
          </ScrollView>
        </View>
      )}

      {detailGarage && (
        <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={closeGarageDetail}>
          <GarageDetail
            garage={detailGarage}
            isFavorite={favoriteCodes.has(detailGarage.id)}
            onBack={closeGarageDetail}
            onToggleFavorite={toggleFavoriteGarage}
            onStartNavigation={navigateDirectlyToGarage}
            onStartParking={() => {}}
            onShare={() => {}}
          />
        </Modal>
      )}
    </ThemedView>
  );
};

function findStepAtTime(steps: Array<{ timestamp: string; available: number; occupancy_pct: number }>, targetMs: number) {
  if (!steps.length) return null;
  let closest = steps[0];
  let closestDiff = Math.abs(new Date(steps[0].timestamp).getTime() - targetMs);
  for (let i = 1; i < steps.length; i++) {
    const diff = Math.abs(new Date(steps[i].timestamp).getTime() - targetMs);
    if (diff < closestDiff) { closest = steps[i]; closestDiff = diff; }
  }
  return closest;
}

const navMapStyles = StyleSheet.create({
  mapContainer: {
    height: 260,
    overflow: "hidden",
  },
  // Stop / destination pin – circle with icon
  routePin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  // Unselected garage candidate
  garagePin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#B5975A",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  // Selected / confirmed garage
  garagePinSelected: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#CFB991",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  garagePinText: {
    color: "#0E0F11",
    fontSize: 11,
    fontWeight: "800",
  },
  garagePinTextSelected: {
    color: "#0E0F11",
    fontSize: 13,
    fontWeight: "800",
  },
});

export default NavigationView;