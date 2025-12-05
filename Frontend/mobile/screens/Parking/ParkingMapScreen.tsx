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

import { useContext, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
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
        
        // Extend ParkingLocation to include travel time
interface ParkingLocationWithTravel extends ParkingLocation {
  travelTime?: TravelTimeResult | null;
}

const withInitialAvailability = (
  locations: ParkingLocation[]
): ParkingLocationWithTravel[] => {
  return locations.map((location) => {
    const baseline = INITIAL_GARAGE_LOOKUP.get(location.code.toUpperCase());
    if (!baseline) {
      return location;
    }

    return {
      ...location,
      available: baseline.current,
      capacity: baseline.total,
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

  const theme = useContext(ThemeContext);

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

  // Load travel times from default origin
  useEffect(() => {
    let isMounted = true;

    const loadTravelTimes = async () => {
      try {
        // Get user email from secure storage
        const userJson = await SecureStore.getItemAsync("user");
        const user = userJson ? JSON.parse(userJson) : null;
        const email = user?.email;
        
        if (!email) {
          return;
        }

        // Calculate travel times for each location
        const travelTimePromises = locations.map(async (location) => {
          const travelTime = await getTravelTimeFromDefaultOrigin(
            location.coordinate,
            email
          );

          return { ...location, travelTime };
        });

        const locationsWithTravelTimes = await Promise.all(travelTimePromises);

        if (isMounted) {
          setLocations(locationsWithTravelTimes);
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
            <Marker key={location.id} coordinate={location.coordinate}>
              <Callout tooltip={false}>
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