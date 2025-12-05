// import React from "react";
// import ThemedView from "../../components/ThemedView";
// import ParkingMap from "../../components/map/ParkingMap";
// import { INITIAL_REGION } from "../../constants/map";

// export default function ParkingMapScreen() {
//   return (
//     <ThemedView>
//       <ParkingMap initialRegion={INITIAL_REGION} />
//     </ThemedView>
//   );
// }

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Linking } from "react-native";
import { Marker, Callout } from "react-native-maps";
import * as SecureStore from "expo-secure-store";
import ThemedView from "../../components/ThemedView";
import ParkingMap from "../../components/map/ParkingMap";
import { INITIAL_REGION } from "../../constants/map";
import { PARKING_LOCATIONS, loadParkingLocations, ParkingLocation } from "./parkingLocationsData";
import { INITIAL_GARAGE_LOOKUP } from "../../data/initialGarageAvailability";
import { ThemeContext } from "../../theme/ThemeProvider";
import { Ionicons } from "../../components/ThemedIcons";        
import { getTravelTimeFromDefaultOrigin, TravelTimeResult } from "../../utils/travelTime";
import { PARKING_PASS_OPTIONS, ParkingPass } from "../../constants/passes";
import GarageDetail, { Garage as GarageDetailModel } from "../../components/DetailedGarage";
import { subscribeToParkingUpdates } from "../../utils/parkingEvents";
        
        // Extend ParkingLocation to include travel time
interface ParkingLocationWithTravel extends ParkingLocation {
  travelTime?: TravelTimeResult | null;
}

const DOUBLE_TAP_DELAY_MS = 1200;

const withInitialAvailability = (
  locations: ParkingLocation[]
): ParkingLocationWithTravel[] => {
  return locations.map((location) => {
    const baseline = INITIAL_GARAGE_LOOKUP.get(location.code.toUpperCase());
    if (!baseline) {
      return location;
    }

    const hasLiveAvailability =
      typeof location.available === "number" && Number.isFinite(location.available);
    const hasLiveCapacity =
      typeof location.capacity === "number" && Number.isFinite(location.capacity);

    return {
      ...location,
      available: hasLiveAvailability ? location.available : baseline.current,
      capacity: hasLiveCapacity ? location.capacity : baseline.total,
    };
  });
};

export default function ParkingMapScreen({view, setView} : {view: string, setView: React.Dispatch<React.SetStateAction<"garage" | "map">>}) {
  
  const [locations, setLocations] = useState<ParkingLocationWithTravel[]>(
    withInitialAvailability(PARKING_LOCATIONS)
  );
  const [selectedPass, setSelectedPass] = useState<ParkingPass | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocationWithTravel | null>(null);

  const theme = useContext(ThemeContext);
  const lastMarkerPressRef = useRef<{ code: string; timestamp: number } | null>(null);

  const mapLocationToDetail = useCallback(
    (location: ParkingLocationWithTravel): GarageDetailModel => {
      const baseline = INITIAL_GARAGE_LOOKUP.get(location.code.toUpperCase());
      const total = location.capacity ?? baseline?.total ?? 0;
      const available = location.available ?? baseline?.current ?? 0;
      const occupied = Math.max(total - available, 0);

      return {
        id: location.id,
        code: location.code,
        name: location.title,
        address: baseline?.address ?? "Address unavailable",
        latitude: location.coordinate.latitude,
        longitude: location.coordinate.longitude,
        totalSpots: total,
        occupiedSpots: occupied,
        covered: true,
        shaded: true,
        amenities: ["covered", "lighting"],
        price: baseline?.paid ? "Paid Lot" : "Free",
        hours: [{ days: "Mon–Sun", open: "00:00", close: "24/7" }],
        lastUpdatedIso: new Date().toISOString(),
        rating: baseline?.rating ?? 0,
        individual_rating: baseline?.individual_rating ?? 0,
        heroImageUrl: undefined,
        heightClearanceMeters: undefined,
        evPorts: undefined,
        accessibleSpots: undefined,
        distanceMeters: location.travelTime
          ? Math.round(location.travelTime.distance * 1609.344)
          : undefined,
        isOpen: true,
      };
    },
    []
  );

  const detailGarage = useMemo(
    () => (selectedLocation ? mapLocationToDetail(selectedLocation) : null),
    [mapLocationToDetail, selectedLocation]
  );

  const openLocationDetail = useCallback((location: ParkingLocationWithTravel) => {
    setSelectedLocation(location);
  }, []);

  const handleMarkerPress = useCallback(
    (location: ParkingLocationWithTravel) => {
      const now = Date.now();
      const previous = lastMarkerPressRef.current;

      if (
        previous &&
        previous.code === location.code &&
        now - previous.timestamp < DOUBLE_TAP_DELAY_MS
      ) {
        lastMarkerPressRef.current = null;
        openLocationDetail(location);
        return;
      }

      lastMarkerPressRef.current = { code: location.code, timestamp: now };
    },
    [openLocationDetail]
  );

  const handleCalloutPress = useCallback(
    (location: ParkingLocationWithTravel) => {
      openLocationDetail(location);
    },
    [openLocationDetail]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const handleToggleFavorite = useCallback((id: string, next: boolean) => {
    setLocations((prev) =>
      prev.map((location) =>
        location.id === id ? { ...location, favorite: next } : location
      )
    );

    setSelectedLocation((prev) =>
      prev && prev.id === id ? { ...prev, favorite: next } : prev
    );
  }, []);

  const handleStartNavigation = useCallback((garage: GarageDetailModel) => {
    if (!garage.latitude || !garage.longitude) {
      return;
    }

    const lat = garage.latitude;
    const lng = garage.longitude;
    const label = encodeURIComponent(garage.name);
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
    });

    if (url) {
      Linking.openURL(url).catch(() => null);
    }
  }, []);
  useEffect(() => {
    let isMounted = true;

    const refreshLocations = async () => {
      try {
        const updated = await loadParkingLocations();
        if (isMounted) {
          setLocations(withInitialAvailability(updated));
        }
      } catch (error) {
        console.error("Failed to refresh parking locations", error);
      }
    };

    refreshLocations();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToParkingUpdates(({ lot, count }) => {
      const normalizedLot = typeof lot === "string" ? lot.toUpperCase() : lot;
      if (!normalizedLot) return;
      const safeCount = Math.max(0, count);

      setLocations((prev) =>
        prev.map((location) => {
          if (location.code.toUpperCase() !== normalizedLot) {
            return location;
          }

          const capped =
            typeof location.capacity === "number" && location.capacity > 0
              ? Math.min(safeCount, location.capacity)
              : safeCount;

          return {
            ...location,
            available: capped,
          };
        })
      );

      setSelectedLocation((prev) => {
        if (!prev || prev.code.toUpperCase() !== normalizedLot) {
          return prev;
        }

        const capped =
          typeof prev.capacity === "number" && prev.capacity > 0
            ? Math.min(safeCount, prev.capacity)
            : safeCount;

        return {
          ...prev,
          available: capped,
        };
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Load travel times from default origin
  useEffect(() => {
    let isMounted = true;

    const loadTravelTimes = async () => {
      try {
        const userJson = await SecureStore.getItemAsync("user");
        const user = userJson ? JSON.parse(userJson) : null;
        const email = user?.email;
        
        if (!email) {
          return;
        }

        const travelTimePromises = PARKING_LOCATIONS.map(async (location) => {
          const travelTime = await getTravelTimeFromDefaultOrigin(
            location.coordinate,
            email
          );

          return { code: location.code.toUpperCase(), travelTime };
        });

        const travelTimes = await Promise.all(travelTimePromises);
        const travelTimeByCode = new Map(
          travelTimes
            .filter((entry) => entry.travelTime)
            .map((entry) => [entry.code, entry.travelTime])
        );

        if (isMounted) {
          setLocations((prev) =>
            prev.map((location) => {
              const match = travelTimeByCode.get(location.code.toUpperCase());
              if (!match) {
                return location;
              }

              return {
                ...location,
                travelTime: match,
              };
            })
          );
        }
      } catch (error) {
        console.error("Failed to load travel times", error);
      }
    };

    loadTravelTimes();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      const matchesPass = selectedPass ? location.passes?.includes(selectedPass) : true;
      const matchesFavorites = favoritesOnly ? location.favorite : true;
      return matchesPass && matchesFavorites;
    });
  }, [locations, selectedPass, favoritesOnly]);

  const hasActiveFilters = Boolean(selectedPass || favoritesOnly);
  const activeFilterCount = (selectedPass ? 1 : 0) + (favoritesOnly ? 1 : 0);

  const handlePassPress = (pass: ParkingPass) => {
    setSelectedPass((current) => (current === pass ? null : pass));
  };

  const handleClearFilters = () => {
    setSelectedPass(null);
    setFavoritesOnly(false);
  };

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.mapWrapper}>
        <ParkingMap initialRegion={INITIAL_REGION}>
          {filteredLocations.map((location) => (
            <Marker
              key={location.id}
              coordinate={location.coordinate}
              onPress={() => handleMarkerPress(location)}
            >
              <Callout tooltip={false} onPress={() => handleCalloutPress(location)}>
                <View style={{ padding: 6, maxWidth: 220 }}>
                  <Text style={{ fontWeight: "600" }}>{location.title}</Text>
                  <Text style={{ marginTop: 4 }}>
                    {(() => {
                      const available =
                        typeof location.available === "number"
                          ? location.available
                          : undefined;
                      const capacity =
                        typeof location.capacity === "number"
                          ? location.capacity
                          : undefined;

                      if (available !== undefined && capacity !== undefined) {
                        return `Available: ${available} / ${capacity}`;
                      }

                      if (available !== undefined) {
                        return `Available: ${available}`;
                      }

                      if (capacity !== undefined) {
                        return `Capacity: ${capacity}`;
                      }

                      return "Occupancy data unavailable";
                    })()}
                  </Text>
                  {location.travelTime && (
                    <Text style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                      {location.travelTime.formattedDuration} ({location.travelTime.formattedDistance})
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          ))}
        </ParkingMap>

        <View pointerEvents="box-none" style={styles.overlayContainer}>
          <View style={styles.topControls}>
            <TouchableOpacity
              onPress={() => {
                setView("garage");
              }}
              style={[
                styles.homeButton,
                {
                  backgroundColor: theme.surface,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <Ionicons name="home" size={22} color={theme.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFiltersVisible((current) => !current)}
              style={[
                styles.filterToggleButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: hasActiveFilters ? theme.primary : theme.border,
                  shadowColor: theme.shadow,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Toggle parking filters"
              accessibilityState={{ expanded: filtersVisible }}
            >
              <Ionicons
                name="options"
                size={18}
                color={hasActiveFilters ? theme.primary : theme.text}
              />
              <Text style={[styles.filterToggleText, { color: theme.text }]}>Filters</Text>
              {hasActiveFilters && (
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.badgeText, { color: theme.primaryText }]}>{activeFilterCount}</Text>
                </View>
              )}
              <Ionicons
                name={filtersVisible ? "chevron-up" : "chevron-down"}
                size={16}
                color={theme.text}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </View>

          {filtersVisible && (
            <View
              style={[
                styles.filterCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <View style={styles.filterCardHeader}>
                <Text style={[styles.filterHeading, { color: theme.text }]}>Filter by pass</Text>
                <TouchableOpacity onPress={() => setFiltersVisible(false)} accessibilityRole="button">
                  <Ionicons name="close" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.chipRow}>
                {PARKING_PASS_OPTIONS.map((pass) => {
                  const isSelected = selectedPass === pass;
                  return (
                    <TouchableOpacity
                      key={pass}
                      onPress={() => handlePassPress(pass)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.sectionBg,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={{
                          color: isSelected ? theme.primaryText : theme.text,
                          fontWeight: "600",
                        }}
                      >
                        {pass}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={() => setFavoritesOnly((current) => !current)}
                style={[
                  styles.favoritesButton,
                  {
                    backgroundColor: favoritesOnly ? theme.primary : theme.sectionBg,
                    borderColor: favoritesOnly ? theme.primary : theme.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: favoritesOnly }}
              >
                <Ionicons
                  name={favoritesOnly ? "star" : "star-outline"}
                  size={18}
                  color={favoritesOnly ? theme.primaryText : theme.text}
                />
                <Text
                  style={{
                    color: favoritesOnly ? theme.primaryText : theme.text,
                    fontWeight: "600",
                    marginLeft: 8,
                  }}
                >
                  Favorites only
                </Text>
              </TouchableOpacity>

              {hasActiveFilters && (
                <TouchableOpacity onPress={handleClearFilters} style={styles.clearFiltersButton}>
                  <Text style={{ color: theme.primary, fontWeight: "600" }}>Clear filters</Text>
                </TouchableOpacity>
              )}

              {filteredLocations.length === 0 && (
                <Text style={[styles.emptyState, { color: theme.textMuted }]}>No locations match these filters yet.</Text>
              )}
            </View>
          )}
        </View>
      </View>

      {detailGarage && selectedLocation && (
        <Modal
          visible
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={handleCloseDetail}
        >
          <GarageDetail
            garage={detailGarage}
            isFavorite={!!selectedLocation.favorite}
            onBack={handleCloseDetail}
            onToggleFavorite={handleToggleFavorite}
            onStartNavigation={handleStartNavigation}
            onStartParking={() => {}}
            onShare={() => {}}
          />
        </Modal>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
    position: "relative",
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  homeButton: {
    padding: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
    elevation: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    elevation: 3,
  },
  filterToggleText: {
    fontWeight: "600",
    marginLeft: 6,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  filterCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginTop: 12,
  },
  filterCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  filterHeading: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  favoritesButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 8,
  },
  clearFiltersButton: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  emptyState: {
    marginTop: 12,
    fontSize: 12,
  },
});