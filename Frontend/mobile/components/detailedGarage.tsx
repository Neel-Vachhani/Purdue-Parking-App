import React, { useContext } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Image } from "react-native";
import { ThemeContext, AppTheme } from "../theme/ThemeProvider";
import { Ionicons, MaterialCommunityIcons } from "../components/ThemedIcons";
import * as SecureStore from "expo-secure-store";
import { getTravelTimeFromDefaultOrigin, TravelTimeResult } from "../utils/travelTime";

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

export interface Garage {
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

export interface GarageDetailProps {
  garage: Garage;
  isFavorite?: boolean;
  loading?: boolean;
  onBack?: () => void;
  onRefresh?: () => void;
  onToggleFavorite?: (id: string, next: boolean) => void;
  onStartNavigation?: (garage: Garage) => void;
  onStartParking?: (garage: Garage) => void;
  onShare?: (garage: Garage) => void;
}

function toMiles(meters?: number) {
  if (!meters || meters < 0) return null;
  return (meters / 1609.344).toFixed(1);
}

function percent(occupied?: number, total?: number) {
  if (!total || total <= 0) return 0;
  const val = Math.max(0, Math.min(1, (occupied ?? 0) / total));
  return val;
}

function formatTime(iso?: string) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    height: 56,
    paddingHorizontal: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerLeft: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerRight: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: theme.text },
  scroll: { padding: 16 },
  hero: { width: "100%", height: 160, borderRadius: 16 },
  heroPlaceholder: { backgroundColor: theme.bg, alignItems: "center", justifyContent: "center", borderRadius: 16 },

  summaryCard: {
    marginTop: 12,
    backgroundColor: theme.bg,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  name: { fontSize: 20, fontWeight: "800", color: theme.text },
  address: { fontSize: 13, color: theme.text },
  summaryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 6 },
  pill: { backgroundColor: theme.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, flexDirection: "row", gap: 6, alignItems: "center" },
  pillText: { color: theme.text, fontSize: 12, fontWeight: "600" },

  card: {
    marginTop: 12,
    backgroundColor: theme.bg,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: "700", marginBottom: 8 },

  occRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  occBarOuter: { flex: 1, height: 14, backgroundColor: theme.bg, borderRadius: 999, overflow: "hidden" },
  occBarFill: { height: 14, backgroundColor: theme.primary },
  occPct: { width: 48, textAlign: "right", color: theme.text, fontWeight: "700" },
  occCaption: { marginTop: 6, color: theme.text, fontSize: 12 },
  updated: { marginTop: 2, color: theme.text, fontSize: 11 },

  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  priceLabel: { color: theme.text },
  priceAmt: { color: theme.text, fontWeight: "700" },

  hoursRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  hoursDays: { color: theme.text },
  hoursTime: { color: theme.text },

  amenitiesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  amenity: { backgroundColor: theme.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  amenityText: { color: theme.text, fontSize: 12, fontWeight: "600" },

  actionsCard: { gap: 12 },
  actionBtn: { height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  primary: { backgroundColor: theme.primary },
  actionText: { color: theme.text, fontWeight: "800", fontSize: 16 },
  actionsRow: { flexDirection: "row", justifyContent: "space-between" },
  iconBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center", gap: 6 },
  iconBtnLabel: { color: theme.text, fontSize: 12, fontWeight: "700" },

  line: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "flex-end" },
  loadingPill: { marginBottom: 24, backgroundColor: theme.bg, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  loadingText: { color: theme.text, fontWeight: "700" },
});

const Pill = ({ children }: { children: React.ReactNode }) => {
  const theme = useContext(ThemeContext);
  const styles = makeStyles(theme);
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
};

// Badge shown when a lot is shaded by trees/buildings but not truly covered by a roof
const ShadeBadge = () => {
  const theme = useContext(ThemeContext);
  const styles = makeStyles(theme);
  return (
    <View style={styles.pill}>
      <Ionicons name="umbrella" size={14} />
      <Text style={styles.pillText}>Shaded (No Roof)</Text>
    </View>
  );
};

const Line = () => {
  const theme = useContext(ThemeContext);
  const styles = makeStyles(theme);
  return <View style={styles.line} />;
};

export default function GarageDetail({
  garage,
  loading,
  isFavorite,
  onBack,
  onRefresh,
  onToggleFavorite,
  onStartNavigation,
  onStartParking,
  onShare,
}: GarageDetailProps) {
  const theme = useContext(ThemeContext);
  const styles = makeStyles(theme);
  const miles = toMiles(garage.distanceMeters);
  const p = percent(garage.occupiedSpots, garage.totalSpots);
  const pctStr = `${Math.round(p * 100)}%`;

  // State for travel time (User Story #9)
  const [travelTime, setTravelTime] = React.useState<TravelTimeResult | null>(null);
  const [loadingTravel, setLoadingTravel] = React.useState(false);

  // Load travel time when garage changes (User Story #9 - AC3)
  React.useEffect(() => {
    let isMounted = true;
    
    async function loadTravelTime() {
      // Need coordinates to calculate travel time
      const lat = garage.latitude;
      const lng = garage.longitude;
      
      if (!lat || !lng) {
        if (isMounted) setTravelTime(null);
        return;
      }
      
      try {
        if (isMounted) setLoadingTravel(true);
        const userJson = await SecureStore.getItemAsync("user");
        const email = userJson ? JSON.parse(userJson).email : null;
        
        if (!email) {
          if (isMounted) setTravelTime(null);
          return;
        }
        
        const result = await getTravelTimeFromDefaultOrigin(
          { latitude: lat, longitude: lng },
          email
        );
        
        if (isMounted) {
          // Only set travel time if we got valid data
          if (result && result.distance > 0 && result.duration > 0) {
            setTravelTime(result);
          } else {
            console.log("No valid travel time available - hiding travel info");
            setTravelTime(null);
          }
        }
      } catch (error) {
        console.error("Failed to load travel time for detailed view:", error);
        if (isMounted) setTravelTime(null);
      } finally {
        if (isMounted) setLoadingTravel(false);
      }
    }
    
    // Clear old travel time first
    setTravelTime(null);
    loadTravelTime();
    
    return () => {
      isMounted = false;
    };
  }, [garage.id, garage.latitude, garage.longitude]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.headerLeft}>
          <Ionicons name="chevron-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{garage.name}</Text>
        <Pressable
          onPress={() => onToggleFavorite?.(garage.id, !isFavorite)}
          hitSlop={12}
          style={styles.headerRight}
        >
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={22} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero
        {garage.heroImageUrl ? (
          <Image source={{ uri: garage.heroImageUrl }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <MaterialCommunityIcons name="parking" size={64} />
          </View>
        )} */}

        {/* Top summary */}
        <View style={styles.summaryCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{garage.name}</Text>
            <Text style={styles.address} numberOfLines={2}>{garage.address}</Text>
            <View style={styles.summaryRow}>
              {loadingTravel && (
                <Pill>
                  <Ionicons name="hourglass-outline" size={14} /> Calculating...
                </Pill>
              )}
              {!loadingTravel && travelTime && (
                <>
                  <Pill>
                    <Ionicons name="navigate" size={14} /> {travelTime.formattedDistance}
                  </Pill>
                  <Pill>
                    <Ionicons name={travelTime.originType === "saved" ? "home" : "location"} size={14} /> {travelTime.formattedDuration}
                  </Pill>
                </>
              )}
              <Pill>
                <Ionicons name={garage.isOpen ? "time" : "close"} size={14} /> {garage.isOpen ? "Open" : "Closed"}
              </Pill>
              <Pill>
                {garage.covered ? (
                  <>
                    <MaterialCommunityIcons name="car" size={14} /> Covered
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="car-outline" size={14} /> Uncovered
                  </>
                )}
              </Pill>
            </View>
          </View>
        </View>

        {/* Occupancy */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Occupancy</Text>
          <View style={styles.occRow}>
            <View style={styles.occBarOuter}>
              <View style={[styles.occBarFill, { width: `${Math.round(p * 100)}%` }]} />
            </View>
            <Text style={styles.occPct}>{pctStr}</Text>
          </View>
          <Text style={styles.occCaption}>
            {garage.occupiedSpots ?? 0} of {garage.totalSpots ?? 0} spots in use
          </Text>
          {garage.lastUpdatedIso && (
            <Text style={styles.updated}>Updated {formatTime(garage.lastUpdatedIso)}</Text>
          )}
        </View>

        {/* Pricing */}
        {garage.price && garage.price.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            {garage.price.map((t, i) => (
              <View key={`${t.label}-${i}`} style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t.label}</Text>
                <Text style={styles.priceAmt}>${t.amount.toFixed(2)}{t.unit ? ` ${t.unit}` : ""}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Hours */}
        {garage.hours && garage.hours.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Hours</Text>
            {garage.hours.map((h, i) => (
              <View key={`${h.days}-${i}`} style={styles.hoursRow}>
                <Text style={styles.hoursDays}>{h.days}</Text>
                <Text style={styles.hoursTime}>{h.close === "24/7" ? "24/7" : `${h.open} – ${h.close}`}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Amenities */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesWrap}>
            <AmenityItem a={garage.covered ? "covered" : undefined} />
            {garage.evPorts ? <AmenityItem a="ev" labelOverride={`${garage.evPorts} ports`} /> : null}
            {garage.accessibleSpots ? <AmenityItem a="accessible" labelOverride={`${garage.accessibleSpots} ADA`} /> : null}
            {garage.heightClearanceMeters ? <AmenityItem a="heightClearance" labelOverride={`${garage.heightClearanceMeters} m`} /> : null}
            {garage.shaded ? (
              <View style={styles.amenity}>
                <Ionicons name="leaf" size={16} />
                <Text style={styles.amenityText}>Shade</Text>
              </View>
            ) : null}
            {(garage.amenities ?? []).map((a, i) => (
              <React.Fragment key={`${a}-${i}`}><AmenityItem a={a} /></React.Fragment>
            ))}
          </View>
        </View>

        {/* Actions */}
        {/* <View style={[styles.card, styles.actionsCard]}>
          <Pressable style={[styles.actionBtn, styles.primary]} onPress={() => onStartParking?.(garage)}>
            <Ionicons name="car" size={18} />
            <Text style={styles.actionText}>Start Parking</Text>
          </Pressable>
          <Line />
          <View style={styles.actionsRow}>
            <Pressable style={styles.iconBtn} onPress={() => onStartNavigation?.(garage)}>
              <Ionicons name="navigate" size={18} />
              <Text style={styles.iconBtnLabel}>Navigate</Text>
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => onShare?.(garage)}>
              <Ionicons name="share-social" size={18} />
              <Text style={styles.iconBtnLabel}>Share</Text>
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={18} />
              <Text style={styles.iconBtnLabel}>Refresh</Text>
            </Pressable>
          </View>
        </View> */}

        <View style={{ height: 32 }} />
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <View style={styles.loadingPill}>
            <Text style={styles.loadingText}>Updating occupancy…</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const AmenityItem = ({ a, labelOverride }: { a?: Amenity; labelOverride?: string }) => {
  if (!a) return null;
  const theme = useContext(ThemeContext);
  const styles = makeStyles(theme);
  const iconFor: Record<Amenity, React.ComponentProps<typeof Ionicons>["name"]> = {
    covered: "home",
    ev: "flash",
    accessible: "accessibility",
    cameras: "videocam",
    restrooms: "water",
    security: "shield-checkmark",
    lighting: "bulb",
    bike: "bicycle",
    heightClearance: "swap-vertical",
  } as const;
  const labelMap: Record<Amenity, string> = {
    covered: "Covered",
    ev: "EV charging",
    accessible: "Accessible",
    cameras: "Cameras",
    restrooms: "Restrooms",
    security: "Security",
    lighting: "Good lighting",
    bike: "Bike parking",
    heightClearance: "Height",
  } as const;
  return (
    <View style={styles.amenity}>
      <Ionicons name={iconFor[a]} size={16} />
      <Text style={styles.amenityText}>{labelOverride ?? labelMap[a]}</Text>
    </View>
  );
};


