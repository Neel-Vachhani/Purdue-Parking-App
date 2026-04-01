import React, { useContext, useRef, useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Image, Platform, TouchableOpacity, Linking, Modal, TextInput, Alert, AppState } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext, AppTheme } from "../theme/ThemeProvider";
import { Ionicons, MaterialCommunityIcons } from "./ThemedIcons";
import EmptyState from "./EmptyState";
import * as SecureStore from "expo-secure-store";
import { getTravelTimeFromDefaultOrigin, TravelTimeResult } from "../utils/travelTime";
import { useActionSheet } from '@expo/react-native-action-sheet';
import StarRating from 'react-native-star-rating-widget';
import axios from "axios";
import { API_BASE_URL } from "../config/env";
import * as Notifications from 'expo-notifications';

//timed parking notifs - sprint 2
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


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

export interface LotEvent {
  id: number;
  lot_code: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
}

export interface ParkingSession {
  garageId: string;
  durationMinutes: number;
  startedAtIso: string;    // ISO-8601
  expiresAtIso: string;    // ISO-8601
  notificationId?: string; 
}
/* custom duration */
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240] as const;

export interface Garage {
  id: string;
  code?: string; // Lot code for fetching events
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
  evPorts?: number;
  accessibleSpots?: number;
  rating: number;
  individual_rating: number;
}

export interface GarageDetailProps {
  garage: Garage;
  loading?: boolean;
  isFavorite?: boolean;
  onBack?: () => void;
  onRefresh?: () => void;
  onToggleFavorite?: (garageId: string, nextValue: boolean) => void;
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

function formatEventDate(iso: string) {
  try {
    const d = new Date(iso);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${month} ${day}, ${time}`;
  } catch {
    return iso;
  }
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0m 00s";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

/** SecureStore key for persisting active parking session */
const SESSION_STORE_KEY = "active_parking_session";

async function saveSession(session: ParkingSession | null) {
  if (session) {
    await SecureStore.setItemAsync(SESSION_STORE_KEY, JSON.stringify(session));
  } else {
    await SecureStore.deleteItemAsync(SESSION_STORE_KEY);
  }
}

async function loadSession(): Promise<ParkingSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ParkingSession;
  } catch {
    return null;
  }
}

/** Request notification permissions (idempotent) */
async function ensureNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/** Schedule a local notification `secondsBefore` seconds before `expiresAt` */
async function scheduleExpiryNotification(
  garageName: string,
  expiresAt: Date,
  secondsBefore: number = 300, // default: 5 minutes warning
): Promise<string | null> {
  const hasPermission = await ensureNotificationPermissions();
  if (!hasPermission) return null;

  const triggerDate = new Date(expiresAt.getTime() - secondsBefore * 1000);
  // If the trigger is in the past, fire immediately
  const secondsUntilTrigger = Math.max(1, Math.round((triggerDate.getTime() - Date.now()) / 1000));

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Parking Expiring Soon",
      body: `Your parking at ${garageName} expires in ${Math.round(secondsBefore / 60)} minutes. Move your vehicle to avoid a citation.`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntilTrigger,
    },
  });
  return id;
}

async function cancelScheduledNotification(notifId?: string) {
  if (notifId) {
    await Notifications.cancelScheduledNotificationAsync(notifId);
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
  scroll: { padding: 0 },
  hero: { width: "100%", height: 160, borderRadius: 16 },
  heroPlaceholder: { backgroundColor: theme.bg, alignItems: "center", justifyContent: "center", borderRadius: 16 },

  summaryCard: {
    marginTop: 12,
    backgroundColor: theme.bg,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    position: "relative",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  name: { fontSize: 20, fontWeight: "800", color: theme.text },
  address: { fontSize: 13, color: theme.text },
  summaryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4},
  pill: { backgroundColor: theme.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, flexDirection: "row", gap: 6, alignItems: "center" },
  directions: { flexDirection: "row", alignItems: "flex-end"},
  pillText: { color: theme.text, fontSize: 12, fontWeight: "600" },

  card: {
    marginTop: 12,
    backgroundColor: theme.bg,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  miniCard: {
    marginTop: 12,
    backgroundColor: theme.bg,
  },
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: "700", marginBottom: 8 },

  reliabilityPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reliabilityBarOuter: {
    width: 42,        // small inline meter
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.border,
    overflow: "hidden",
  },
  reliabilityBarFill: {
    height: 6,
    borderRadius: 999,
  },
  reliabilityText: { fontSize: 12, fontWeight: "700", color: theme.text },


  occRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  occBarOuter: { flex: 1, height: 14, backgroundColor: theme.bg, borderRadius: 999, overflow: "hidden" },
  occBarFill: { height: 14, backgroundColor: theme.primary },
  occPct: { width: 48, textAlign: "right", color: theme.text, fontWeight: "700" },
  occCaption: { marginTop: 6, color: theme.text, fontSize: 12 },
  updated: { marginTop: 2, color: theme.text, fontSize: 11 },
  accuracySummary: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.mode === "dark" ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)",
  },
  accuracySummaryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  accuracySummaryLabel: { color: theme.text, fontSize: 13, fontWeight: "600" },
  accuracySummaryValue: { color: theme.primary, fontSize: 20, fontWeight: "800" },
  accuracySummaryCaption: { marginTop: 6, color: theme.text, opacity: 0.7, fontSize: 11 },

  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  priceLabel: { color: theme.text, fontSize: 10 },
  priceAmt: { color: theme.text, fontWeight: "500", fontSize: 10 },

  hoursRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  hoursDays: { color: theme.text, fontSize: 10 },
  hoursTime: { color: theme.text, fontSize: 10 },

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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
  },
  reportInput: {
    minHeight: 120,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.mode === "dark" ? "rgba(148,163,184,0.35)" : "rgba(107,114,128,0.35)",
    color: theme.text,
    backgroundColor: theme.mode === "dark" ? "rgba(17,24,39,0.8)" : "rgba(255,255,255,0.95)",
    textAlignVertical: "top",
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  submitBtn: {
    paddingHorizontal: 20,
    backgroundColor: "#fbbf24",
    borderRadius: 12,
  },
  navMenuWrapper: {
    position: "relative",
    alignItems: "flex-end", // or "center" depending on layout
  },
  navCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.mode != "dark" ? "rgba(17,24,39,0.05)" : "rgba(255,255,255,0.05)", // or your theme bg
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  navDropdown: {
    position: "absolute",
    width: 80,
    height: 120,
    top: 48,          // just below the circle
    right: -20,         // align with button left edge
    gap: 8,           // if using RN 0.71+ or use marginBottom on children
    zIndex: 20,
  },

  timedParkingCard: {
    marginTop: 12,
    backgroundColor: theme.bg,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  // (Duration chip styles below replace old permit option styles)
  startTimerBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: theme.primary,
    marginTop: 4,
  },
  startTimerBtnDisabled: {
    opacity: 0.45,
  },
  startTimerBtnText: {
    color: theme.mode === "dark" ? "#0f172a" : "#0b0b0c",
    fontWeight: "800",
    fontSize: 16,
  },

  // Active timer display
  timerContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  timerCountdown: {
    fontSize: 36,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    color: theme.text,
    letterSpacing: 1,
  },
  timerCountdownExpired: {
    color: "#ef4444",
  },
  timerPermitLabel: {
    color: theme.text,
    opacity: 0.7,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  timerMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  timerMetaBlock: { alignItems: "center", flex: 1 },
  timerMetaLabel: { color: theme.text, opacity: 0.5, fontSize: 11, fontWeight: "600", marginBottom: 2 },
  timerMetaValue: { color: theme.text, fontSize: 13, fontWeight: "700" },
  timerProgressOuter: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    overflow: "hidden",
    marginTop: 14,
  },
  timerProgressFill: {
    height: 8,
    borderRadius: 999,
  },
  endSessionBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "#ef4444",
    backgroundColor: theme.mode === "dark" ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)",
  },
  endSessionBtnText: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 14,
  },
  notifToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  notifToggleLabel: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    marginLeft: 8,
  },

  // Duration picker chips
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    minWidth: 56,
    alignItems: "center",
  },
  durationChipDefault: {
    borderColor: theme.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
  },
  durationChipSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.mode === "dark" ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.08)",
  },
  durationChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.text,
  },
  durationChipTextSelected: {
    color: theme.primary,
  },
  customDurationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  customDurationInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.mode === "dark" ? "rgba(148,163,184,0.35)" : "rgba(107,114,128,0.35)",
    color: theme.text,
    backgroundColor: theme.mode === "dark" ? "rgba(17,24,39,0.6)" : "rgba(255,255,255,0.95)",
    fontSize: 14,
    fontWeight: "600",
  },
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
  const insets = useSafeAreaInsets();
  const headerInset = 8
  const miles = toMiles(garage.distanceMeters);
  const p = percent(garage.occupiedSpots, garage.totalSpots);
  const pctStr = `${Math.round(p * 100)}%`;
  const { showActionSheetWithOptions } = useActionSheet();

  const [reliability, setReliability] = React.useState<number>(() => Math.floor(Math.random() * 101));

  React.useEffect(() => {
    setReliability(Math.floor(Math.random() * 101));
  }, [garage.id]);

  


  // State for travel time (User Story #9)
  const [travelTime, setTravelTime] = React.useState<TravelTimeResult | null>(null);
  const [loadingTravel, setLoadingTravel] = React.useState(false);

  // State for events (User Story #10)
  const [events, setEvents] = React.useState<LotEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [reportModalVisible, setReportModalVisible] = React.useState(false);
  const [reportDescription, setReportDescription] = React.useState("");
  const [reportSubmitting, setReportSubmitting] = React.useState(false);
  const [dataAccuracyRating, setDataAccuracyRating] = React.useState(0);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const fakeAccuracyStats = React.useMemo(() => ({ averageRating: 4.6, sampleSize: 46 }), []);

  //state for timed parking
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [activeSession, setActiveSession] = useState<ParkingSession | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  //State for origin/location
  const [origin, setOrigin] = React.useState("");
  const [location, setLocation] = React.useState("");

  const API_BASE = API_BASE_URL;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadSession();
      if (cancelled) return;
      if (stored && stored.garageId === garage.id) {
        const remaining = Math.max(0, Math.round((new Date(stored.expiresAtIso).getTime() - Date.now()) / 1000));
        setActiveSession(stored);
        setSecondsRemaining(remaining);
      } else {
        setActiveSession(null);
        setSecondsRemaining(0);
      }
    })();
    return () => { cancelled = true; };
  }, [garage.id]);

  // ── Tick the countdown every second while a session is active ─────────
  useEffect(() => {
    if (!activeSession) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Recalculate on each tick to survive app backgrounding
    const tick = () => {
      const remaining = Math.max(0, Math.round((new Date(activeSession.expiresAtIso).getTime() - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    };

    tick(); // immediate
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession]);

  // ── Recalculate remaining time when app comes to foreground ───────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && activeSession) {
        const remaining = Math.max(0, Math.round((new Date(activeSession.expiresAtIso).getTime() - Date.now()) / 1000));
        setSecondsRemaining(remaining);
      }
    });
    return () => sub.remove();
  }, [activeSession]);

  // ── Start a parking session ───────────────────────────────────────────
  const handleStartTimer = useCallback(async () => {
    // Determine the duration: either a preset or custom entry
    let durationMins = selectedDuration;
    if (!durationMins) {
      const parsed = parseInt(customMinutes, 10);
      if (!parsed || parsed <= 0) return;
      durationMins = parsed;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMins * 60 * 1000);

    let notificationId: string | null = null;
    if (notificationsEnabled) {
      // Schedule 5-minute warning (or at start if duration <= 5 min)
      const warningSeconds = Math.min(300, durationMins * 60 - 1);
      notificationId = await scheduleExpiryNotification(garage.name, expiresAt, warningSeconds);
    }

    const session: ParkingSession = {
      garageId: garage.id,
      durationMinutes: durationMins,
      startedAtIso: now.toISOString(),
      expiresAtIso: expiresAt.toISOString(),
      notificationId: notificationId ?? undefined,
    };

    await saveSession(session);
    setActiveSession(session);
    setSecondsRemaining(durationMins * 60);

    // Also record on the backend
    try {
      const userJson = await SecureStore.getItemAsync("user");
      const email = userJson ? JSON.parse(userJson).email : null;
      if (email) {
        await axios.post(`${API_BASE}/confirm_parking/`, {
          code: garage.code,
          email,
          duration_minutes: durationMins,
          timestamp: now.toISOString(),
        });
      }
    } catch (err) {
      console.error("Failed to record timed parking on server:", err);
    }
  }, [selectedDuration, customMinutes, garage, notificationsEnabled]);

  // ── End session early ─────────────────────────────────────────────────
  const handleEndSession = useCallback(async () => {
    Alert.alert(
      "End Parking Session",
      "Are you sure you want to stop the timer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Session",
          style: "destructive",
          onPress: async () => {
            if (activeSession?.notificationId) {
              await cancelScheduledNotification(activeSession.notificationId);
            }
            await saveSession(null);
            setActiveSession(null);
            setSecondsRemaining(0);
            setSelectedDuration(null);
            setCustomMinutes("");
          },
        },
      ],
    );
  }, [activeSession]);

  // Timer progress (0 → 1, where 1 = fully elapsed)
  const timerProgress = useMemo(() => {
    if (!activeSession) return 0;
    const totalSecs = activeSession.durationMinutes * 60;
    return Math.min(1, Math.max(0, 1 - secondsRemaining / totalSecs));
  }, [activeSession, secondsRemaining]);

  const timerProgressColor = useMemo(() => {
    if (secondsRemaining <= 0) return "#ef4444";
    if (timerProgress > 0.85) return "#f59e0b";
    return "#22c55e";
  }, [timerProgress, secondsRemaining]);

  const RatingWidget = () => {
    
    return (
        <StarRating
          rating={rating}
          color={theme.primary}
          onChange={ratingChange}
        />
    );
  };

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

  React.useEffect(() => {
    loadLocation();
    loadOrigin();
  }, []);

const handleConfirmParking = async () => {
  try {
    const userJson = await SecureStore.getItemAsync("user");
    const user = userJson ? JSON.parse(userJson) : null;
    const email = user?.email;
    if (!email) return;

    await axios.post(`${API_BASE}/confirm_parking/`, {
      code: garage.code,
      email,
      timestamp: new Date().toISOString()
    });


    // Optional: feedback to user
    alert("Thanks! Your parking has been recorded.");
  } catch (err) {
    console.error("Failed to confirm parking:", err);
    alert("Oops! Could not record parking. Try again.");
  }
};

  
  const DataAccuracyRatingWidget = () => {
    return (
      <StarRating
        rating={dataAccuracyRating}
        color="#f59e0b" // Orange color to differentiate from quality rating
        onChange={dataAccuracyRatingChange}
      />
    );
  };

  const ratingChange = async (rating: number) => {
    const userJson = await SecureStore.getItemAsync("user");
    const user = userJson ? JSON.parse(userJson) : null;
    const email = user?.email;
    if (!email) return;
    setRating(rating)
    await fetch(`${API_BASE}/update_rating`, {
      method: "POST",
      headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: garage.code,
        user_rating: rating
      })
    })
  
    await fetch(`${API_BASE}/update_specific_rating`, {
      
      method: "POST",
      headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        code: garage.code,
        user_rating: rating
      })
    })
  }

  const dataAccuracyRatingChange = async (rating: number) => {
    setDataAccuracyRating(rating);
    const API_BASE = API_BASE_URL;
    // API call to update data accuracy rating
    try {
      await fetch(`${API_BASE}/update_data_accuracy`, {
        method: "POST",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: garage.code,
          accuracy_rating: rating
        })
      });
    } catch (error) {
      console.error('Error submitting data accuracy rating:', error);
    }
  };

  const handleOpenInMaps = (locationType: string) => {
        const options = ['Apple Maps', 'Google Maps', 'Cancel'];
        const destructiveButtonIndex = 3;
        const cancelButtonIndex = 2;
        const garageName: string = garage.name
        const urlName = garageName.replace(" ", "+")
        let url = ``
        let starting_location = ``
        if (locationType == "origin") {
          loadOrigin();
          starting_location = origin
        } else {
          loadLocation();
          starting_location = location
        }
        console.log("here")
        console.log(starting_location)
        const startingLocationName = starting_location.replaceAll(" ", "+"); 
        const startingLocationLink = startingLocationName.replaceAll(",", "%2C"); 
        showActionSheetWithOptions({
            options,
            cancelButtonIndex,
            destructiveButtonIndex
          }, (selectedIndex) => {
            switch (selectedIndex) {
              case 0:
                url =  `http://maps.apple.com/?saddr=${startingLocationLink}&daddr=${urlName}+West+Lafayette+IN`
                Linking.openURL(url)
                break;

              case 1:
                url = `https://www.google.com/maps/dir/?api=1&origin=${startingLocationLink}&destination=${urlName}+West+Lafayette+IN&travelmode=driving`
                Linking.openURL(url)
                break;

              case cancelButtonIndex:
                // Canceled
            }});
    };

  const openReportModal = () => {
    setReportDescription("");
    setReportModalVisible(true);
  };

  const closeReportModal = () => setReportModalVisible(false);

  const submitReport = async () => {
    if (!reportDescription.trim()) {
      Alert.alert("Describe the issue", "Please add a brief description before submitting.");
      return;
    }

    try {
      setReportSubmitting(true);
      const response = await fetch(`${API_BASE}/reports/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lot_code: garage.code ?? "",
          lot_name: garage.name,
          description: reportDescription.trim(),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody?.detail || "Unable to submit report right now.";
        throw new Error(message);
      }

      setReportDescription("");
      setReportModalVisible(false);
      Alert.alert("Report submitted", "Thanks for flagging the issue. We'll review it shortly.");
    } catch (err: any) {
      const message = err?.message || "Unexpected error while submitting report.";
      Alert.alert("Submit failed", message);
    } finally {
      setReportSubmitting(false);
    }
  };


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

        if (!result) {
          
        }
        
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

  // Load events when garage changes (User Story #10)
  React.useEffect(() => {
    let isMounted = true;
    
    async function loadEvents() {
      const lotCode = garage.code;
      console.log(garage.individual_rating)
      
      if (!lotCode) {
        if (isMounted) setEvents([]);
        return;
      }
      
      try {
        if (isMounted) setLoadingEvents(true);
        const API_BASE = API_BASE_URL;
        const response = await fetch(`${API_BASE}/lots/${lotCode}/events/`);
        
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setEvents(Array.isArray(data) ? data : []);
            console.log(`Loaded ${data.length} events for ${lotCode}`);
          }
        } else {
          console.error(`Failed to fetch events for ${lotCode}:`, response.status);
          if (isMounted) setEvents([]);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
        if (isMounted) setEvents([]);
      } finally {
        if (isMounted) setLoadingEvents(false);
      }
    }
    
    // Clear old events first
    setEvents([]);
    loadEvents();
    
    return () => {
      isMounted = false;
    };
  }, [garage.id, garage.code]);

  return (
    <SafeAreaView
      style={[styles.root, { paddingTop: headerInset }]}
      edges={['left', 'right']}
    >
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
          <Ionicons name={isFavorite ? "star" : "star-outline"} size={22} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Top summary */}
        <View style={styles.summaryCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{garage.name}</Text>
            <View>
              <View style={[{flex:1,flexDirection:'row'}]}>
                  <Text style={styles.address} numberOfLines={2}>{garage.address}</Text>
              </View>
            <View style={[{justifyContent:'space-evenly', marginVertical:10}]}>
            <View style={{position: "absolute", top: -50, right: 6}}>
              <View style={styles.navMenuWrapper}>
            {/* Circle button */}
            <TouchableOpacity
              style={styles.navCircleButton}
              onPress={() => setNavMenuOpen((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate-outline" size={18} style={{ color: theme.mode === "dark" ? "#fff" : "#000", position: "absolute", top: 12, right: 12 }} />
            </TouchableOpacity>

            {/* Dropdown with the two pills */}
            {navMenuOpen && (
              <View style={styles.navDropdown}>
                <TouchableOpacity onPress={() => { handleOpenInMaps("origin"); setNavMenuOpen(false); }}>
                  <Pill>
                    <Ionicons name="navigate-outline" size={14} /> Origin
                  </Pill>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { handleOpenInMaps("other"); setNavMenuOpen(false); }}>
                  <Pill>
                    <Ionicons name="navigate-outline" size={14} /> Other
                  </Pill>
                </TouchableOpacity>
              </View>
            )}
          </View>
          </View>
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
                    <Ionicons name={travelTime.originType === "saved" ? "home" : "location"} size={14} /> {travelTime.formattedDurationCar}
                  </Pill>
                </>
              )}
            </View>

            {/* Pricing */}
            {garage.price && garage.price.length > 0 && (
              <View style={styles.miniCard}>
                <Text style={{color: theme.text, fontSize: 12, fontWeight: "700", marginBottom: 4}}>Pricing</Text>
                <Text style={styles.priceLabel}>{garage.price}</Text>
              </View>
            )}

            {/* Hours */}
            {garage.hours && garage.hours.length > 0 && (
              <View style={styles.miniCard}>
                <Text style={{color: theme.text, fontSize: 12, fontWeight: "700", marginBottom: 4}}>Hours</Text>
                {garage.hours.map((h, i) => (
                  <View key={`${h.days}-${i}`} style={styles.hoursRow}>
                    <Text style={styles.hoursDays}>{h.days}</Text>
                    <Text style={styles.hoursTime}>{h.close === "24/7" ? "24/7" : `${h.open} - ${h.close}`}</Text>
                  </View>
                ))}
              </View>
            )}

              <View style={{ justifyContent: 'space-evenly', marginVertical: 10 }}>


              {/* Step 1: New button */}
              {/* <TouchableOpacity onPress={handleConfirmParking}>
                <Pill>
                  <Ionicons name="car" size={14} /> Mark as Parked 
                </Pill>
              </TouchableOpacity> */}

            </View>

                </View>
            </View>
            
            
            {/* Reliability indicator */}
            <View
              style={[
                styles.reliabilityPill,
                { backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" },
              ]}
            >
              <View style={styles.reliabilityBarOuter}>
                <View
                  style={[
                    styles.reliabilityBarFill,
                    {
                      width: `${reliability}%`,
                      backgroundColor: reliabilityColor(reliability),
                    },
                  ]}
                />
              </View>
              <Ionicons name="shield-checkmark" size={14} color={reliabilityColor(reliability)} />
              <Text style={styles.reliabilityText}>{reliability}%</Text>
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
          <View style={styles.accuracySummary}>
            <View style={styles.accuracySummaryHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="analytics" size={16} color={theme.primary} />
                <Text style={styles.accuracySummaryLabel}>Avg data accuracy</Text>
              </View>
              <Text style={styles.accuracySummaryValue}>
                {fakeAccuracyStats.averageRating.toFixed(1)} / 5
              </Text>
            </View>
          </View>
        </View>

                {(garage.name.toLowerCase().includes("grant") ||
          garage.name.toLowerCase().includes("harrison")) && (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ionicons name="ticket-outline" size={18} color={theme.primary} />
              <Text style={styles.sectionTitle}>Visitor Pass – Timed Parking</Text>
            </View>
            <Text
              style={{
                color: theme.text,
                opacity: 0.7,
                fontSize: 13,
                marginBottom: 12,
                lineHeight: 18,
              }}
            >
              Visitor passes at {garage.name} are subject to timed parking rates.
            </Text>
            <View
              style={{
                backgroundColor:
                  theme.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                borderRadius: 12,
                padding: 12,
                gap: 0,
              }}
            >
              {[
                { label: "0 – 30 Minutes", amount: "$1.00" },
                { label: "30 – 60 Minutes", amount: "$3.00" },
                { label: "Each Additional Hour", amount: "$1.00" },
                { label: "Maximum (24 hr period)", amount: "$10.00" },
              ].map((row, i, arr) => (
                <View
                  key={row.label}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: "500" }}>
                    {row.label}
                  </Text>
                  <Text style={{ color: theme.primary, fontSize: 14, fontWeight: "700" }}>
                    {row.amount}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.timedParkingCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Ionicons name="timer-outline" size={18} color={theme.primary} />
            <Text style={styles.sectionTitle}>Parking Timer</Text>
          </View>

          {/* ── Active session: show countdown ─────────────────────────── */}
          {activeSession ? (
            <View style={styles.timerContainer}>
              <Text style={styles.timerPermitLabel}>
                {activeSession.durationMinutes >= 60
                  ? `${Math.floor(activeSession.durationMinutes / 60)}h${activeSession.durationMinutes % 60 > 0 ? ` ${activeSession.durationMinutes % 60}m` : ""}`
                  : `${activeSession.durationMinutes}m`}{" "}
                session
              </Text>

              <Text
                style={[
                  styles.timerCountdown,
                  secondsRemaining <= 0 && styles.timerCountdownExpired,
                ]}
              >
                {secondsRemaining <= 0 ? "EXPIRED" : formatCountdown(secondsRemaining)}
              </Text>

              {/* Progress bar */}
              <View style={styles.timerProgressOuter}>
                <View
                  style={[
                    styles.timerProgressFill,
                    {
                      width: `${Math.round(timerProgress * 100)}%`,
                      backgroundColor: timerProgressColor,
                    },
                  ]}
                />
              </View>

              {/* Start / Expires times */}
              <View style={styles.timerMeta}>
                <View style={styles.timerMetaBlock}>
                  <Text style={styles.timerMetaLabel}>STARTED</Text>
                  <Text style={styles.timerMetaValue}>
                    {formatTime(activeSession.startedAtIso) ?? "—"}
                  </Text>
                </View>
                <View style={styles.timerMetaBlock}>
                  <Text style={styles.timerMetaLabel}>EXPIRES</Text>
                  <Text style={styles.timerMetaValue}>
                    {formatTime(activeSession.expiresAtIso) ?? "—"}
                  </Text>
                </View>
                <View style={styles.timerMetaBlock}>
                  <Text style={styles.timerMetaLabel}>DURATION</Text>
                  <Text style={styles.timerMetaValue}>
                    {activeSession.durationMinutes} min
                  </Text>
                </View>
              </View>

              {/* End session button */}
              <Pressable style={styles.endSessionBtn} onPress={handleEndSession}>
                <Ionicons name="stop-circle-outline" size={18} color="#ef4444" />
                <Text style={styles.endSessionBtnText}>End Session</Text>
              </Pressable>
            </View>
          ) : (
            /* ── No active session: duration picker + start button ────── */
            <>
              <Text
                style={{
                  color: theme.text,
                  opacity: 0.7,
                  fontSize: 13,
                  marginBottom: 12,
                  lineHeight: 18,
                }}
              >
                Pick how long you'll be parked and start a timer. You'll get a notification before your time runs out.
              </Text>

              {/* Duration chips */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {DURATION_OPTIONS.map((mins) => {
                  const selected = selectedDuration === mins;
                  const label =
                    mins >= 60
                      ? mins % 60 === 0
                        ? `${mins / 60}h`
                        : `${Math.floor(mins / 60)}h ${mins % 60}m`
                      : `${mins}m`;
                  return (
                    <Pressable
                      key={mins}
                      onPress={() => {
                        setSelectedDuration(selected ? null : mins);
                        setCustomMinutes("");
                      }}
                      style={[
                        styles.durationChip,
                        selected ? styles.durationChipSelected : styles.durationChipDefault,
                      ]}
                    >
                      <Text
                        style={[
                          styles.durationChipText,
                          selected && styles.durationChipTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Custom duration input */}
              <View style={styles.customDurationRow}>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}>
                  Or enter minutes:
                </Text>
                <TextInput
                  value={customMinutes}
                  onChangeText={(t) => {
                    // Only allow digits
                    const cleaned = t.replace(/[^0-9]/g, "");
                    setCustomMinutes(cleaned);
                    if (cleaned) setSelectedDuration(null); // deselect chip
                  }}
                  placeholder="e.g. 75"
                  placeholderTextColor={theme.mode === "dark" ? "#9CA3AF" : "#6B7280"}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={styles.customDurationInput}
                />
              </View>

              {/* Notification toggle */}
              <View style={styles.notifToggleRow}>
                <Ionicons
                  name={notificationsEnabled ? "notifications" : "notifications-off-outline"}
                  size={18}
                  color={notificationsEnabled ? theme.primary : theme.text}
                />
                <Text style={styles.notifToggleLabel}>Notify me 5 min before expiry</Text>
                <Pressable
                  onPress={() => setNotificationsEnabled((v) => !v)}
                  hitSlop={10}
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: notificationsEnabled ? theme.primary : theme.border,
                    justifyContent: "center",
                    paddingHorizontal: 2,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "#fff",
                      alignSelf: notificationsEnabled ? "flex-end" : "flex-start",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  />
                </Pressable>
              </View>

              {/* Start timer button */}
              <Pressable
                style={[
                  styles.startTimerBtn,
                  !selectedDuration && !customMinutes && styles.startTimerBtnDisabled,
                ]}
                onPress={handleStartTimer}
                disabled={!selectedDuration && !customMinutes}
              >
                <Ionicons
                  name="timer-outline"
                  size={18}
                  color={theme.mode === "dark" ? "#0f172a" : "#0b0b0c"}
                />
                <Text style={styles.startTimerBtnText}>Start Parking Timer</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Ratings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rate this Garage</Text>
          <RatingWidget />
          {rating > 0 && (
            <Text style={{
              color: theme.primary,
              fontSize: 11,
              fontWeight: "600",
              marginTop: 6,
              textAlign: "center"
            }}>
              Thanks for sharing your experience.
            </Text>
          )}
        </View>

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

        {/* Data Accuracy (placed near the end so it doesn’t crowd the top of the sheet) */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Ionicons name="analytics" size={18} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Data Accuracy</Text>
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 13,
              marginBottom: 10,
              lineHeight: 18,
            }}
          >
            Tell us how close our availability estimate was to what you saw on arrival.
          </Text>
          <View
            style={{
              backgroundColor: theme.mode === "dark" ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.06)",
              padding: 12,
              borderRadius: 10,
              marginBottom: 8,
            }}
          >
            <DataAccuracyRatingWidget />
            {dataAccuracyRating > 0 && (
              <Text
                style={{
                  color: "#b45309",
                  fontSize: 11,
                  fontWeight: "600",
                  marginTop: 6,
                  textAlign: "center",
                }}
              >
                Thanks! Your feedback improves future predictions.
              </Text>
            )}
          </View>
          <Text
            style={{
              color: theme.text,
              opacity: 0.65,
              fontSize: 11,
              fontStyle: "italic",
            }}
          >
            We aggregate these ratings to calibrate our occupancy model.
          </Text>
        </View>

        {/* Upcoming Events (User Story #10) */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Ionicons name="calendar" size={18} color={theme.primary} />
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
          </View>
          
          {loadingEvents ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: theme.text, opacity: 0.6 }}>Loading events...</Text>
            </View>
          ) : events.length > 0 ? (
            <View style={{ gap: 10 }}>
              {events.map((event, i) => (
                <View 
                  key={event.id} 
                  style={{ 
                    padding: 12, 
                    backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    borderRadius: 10,
                    borderLeftWidth: 3,
                    borderLeftColor: theme.primary
                  }}
                >
                  <Text style={{ 
                    color: theme.text, 
                    fontWeight: "700", 
                    fontSize: 14, 
                    marginBottom: 4 
                  }}>
                    {event.title}
                  </Text>
                  <Text style={{ 
                    color: theme.text, 
                    opacity: 0.7, 
                    fontSize: 12, 
                    marginBottom: 6,
                    lineHeight: 16
                  }}>
                    {event.description}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="time-outline" size={14} color={theme.primary} />
                    <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "600" }}>
                      {formatEventDate(event.start_time)} - {formatEventDate(event.end_time)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              title="No upcoming closures"
              description="We'll post events and closures here as soon as they're scheduled for this garage."
              iconName="calendar-outline"
              style={{ backgroundColor: "transparent", borderColor: theme.border }}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Need to flag something?</Text>
          <Text style={{ color: theme.text, opacity: 0.7, fontSize: 13, marginBottom: 12 }}>
            Let us know if anything looks incorrect for this garage.
          </Text>
          <Pressable style={[styles.actionBtn, styles.primary]} onPress={openReportModal}>
            <Ionicons name="alert" size={18} color={theme.mode === "dark" ? "#0f172a" : "#0b0b0c"} />
            <Text style={[styles.actionText, { color: theme.mode === "dark" ? "#0f172a" : "#0b0b0c" }]}>Report an Issue</Text>
          </Pressable>
        </View>

        <View style={{ height: 32 }} />

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
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <View style={styles.loadingPill}>
            <Text style={styles.loadingText}>Updating occupancy…</Text>
          </View>
        </View>
      )}

      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeReportModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.card, styles.modalContent]}>
            <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>Report an Issue</Text>
            <Text style={{ color: theme.text, opacity: 0.7, marginBottom: 12 }}>
              Garage: {garage.name}
            </Text>

            <TextInput
              value={reportDescription}
              onChangeText={setReportDescription}
              placeholder="Describe what's incorrect (availability, signage, etc.)"
              placeholderTextColor={theme.mode === "dark" ? "#9CA3AF" : "#6B7280"}
              style={styles.reportInput}
              multiline
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 16, gap: 12 }}>
              <Pressable style={styles.cancelBtn} onPress={closeReportModal}>
                <Text style={{ color: theme.text, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionBtn,
                  styles.submitBtn,
                  { opacity: reportDescription.trim() && !reportSubmitting ? 1 : 0.6 },
                ]}
                onPress={submitReport}
                disabled={reportSubmitting || !reportDescription.trim()}
              >
                <Text style={[styles.actionText, { color: "#000" }]}> 
                  {reportSubmitting ? "Submitting..." : "Submit"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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



function reliabilityColor(v: number) {
  // 0–40 red, 41–70 amber, 71–100 green
  if (v <= 40) return "#ef4444";
  if (v <= 70) return "#f59e0b";
  return "#22c55e";
}
