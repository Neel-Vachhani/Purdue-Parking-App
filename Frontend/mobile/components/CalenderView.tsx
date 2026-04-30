// components/CalendarEvents.tsx
import * as React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { ThemeContext } from "../theme/ThemeProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoCalendar from "expo-calendar";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { INITIAL_GARAGES } from "../data/initialGarageAvailability";
import { GARAGE_DEFINITIONS } from "../data/garageDefinitions";
import { geocodeAddress, getCurrentLocation } from "../utils/travelTime";
import { useBulkForecasts } from "../utils/useForecast";

type Category = "meeting" | "deadline" | "personal" | "other";

interface AppEvent {
  id: string;
  title: string;
  time: string; // "09:00 - 10:00"
  date: string; // "YYYY-MM-DD"
  location?: string;
  category?: Category;
}

interface ParkingResult {
  code: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  paid: boolean;
  rating: number;
  available: number | null;
  capacity: number | null;
  walkToEvent_m: number;
  driveFromUser_m: number | null;
}

type SortMode = "distance" | "availability";

const COLOR_MAP: Record<Category | "default", string> = {
  meeting: "#4aa3ff",
  deadline: "#f87171",
  personal: "#a78bfa",
  other: "#facc15",
  default: "#6b7280",
};

type ReminderOption = {
  label: string;
  minutes: number;
};

const REMINDER_OPTIONS: ReminderOption[] = [
  { label: "at event time", minutes: 0 },
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
];

function getEventStartDate(event: AppEvent): Date | null {
  try {
    const startTime = event.time.split(" - ")[0].trim();
    const [hours, mins] = startTime.split(":").map(Number);
    const [year, month, day] = event.date.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(hours, mins, 0, 0);
    return date;
  } catch {
    return null;
  }
}

function getReminderKey(eventId: string, minutes: number): string {
  return `reminder_${eventId}_${minutes}`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function estimateWalkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 80));
}

const SAMPLE: AppEvent[] = [
  { id: "1", title: "Team Sync", time: "09:30 - 10:00", date: "2025-12-11", category: "meeting" },
  { id: "2", title: "Work Session", time: "10:30 - 12:00", date: "2025-12-11", category: "personal" },
  { id: "3", title: "Project Demo", time: "14:00 - 15:00", date: "2025-12-11", category: "deadline" },
  { id: "4", title: "Work Session", time: "10:30 - 12:00", date: "2025-12-16", category: "personal" },
  { id: "5", title: "Project Demo", time: "14:00 - 15:00", date: "2025-12-10", category: "deadline" },
];

const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  lawson: { lat: 40.4278, lng: -86.9169 },
  walc: { lat: 40.4274, lng: -86.9126 },
  pmucorr: { lat: 40.425, lng: -86.9108 },
  corec: { lat: 40.4219, lng: -86.9197 },
  elliott: { lat: 40.4271, lng: -86.9029 },
  ellt: { lat: 40.4271, lng: -86.9029 },
  stewart: { lat: 40.4246, lng: -86.9128 },
  stew: { lat: 40.4246, lng: -86.9128 },
  krannert: { lat: 40.4233, lng: -86.9108 },
  rawls: { lat: 40.4233, lng: -86.9108 },
  ee: { lat: 40.4284, lng: -86.9112 },
  msee: { lat: 40.4284, lng: -86.9112 },
  phys: { lat: 40.428, lng: -86.9152 },
  bhee: { lat: 40.4241, lng: -86.9142 },
  me: { lat: 40.4281, lng: -86.9133 },
  cl50: { lat: 40.4243, lng: -86.9164 },
  lily: { lat: 40.4228, lng: -86.9192 },
  hamp: { lat: 40.4262, lng: -86.9082 },
  knoy: { lat: 40.4267, lng: -86.911 },
  smith: { lat: 40.4275, lng: -86.9167 },
  "memorial union": { lat: 40.425, lng: -86.9108 },
};

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const findLocationCoordsLocal = (location: string): { lat: number; lng: number } | null => {
  const lower = location.toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (lower.includes(key)) return coords;
  }
  return null;
};

const findLocationCoords = async (
  location: string
): Promise<{ lat: number; lng: number } | null> => {
  const local = findLocationCoordsLocal(location);
  if (local) return local;

  try {
    const geocoded = await geocodeAddress(location);
    if (geocoded) {
      return { lat: geocoded.latitude, lng: geocoded.longitude };
    }
  } catch (e) {
    console.warn("Geocoding fallback failed for:", location, e);
  }

  return null;
};

function buildParkingResults(
  eventCoords: { lat: number; lng: number },
  userCoords: { lat: number; lng: number } | null
): ParkingResult[] {
  const availabilityMap = new Map<string, { current: number; capacity: number }>();
  for (const g of INITIAL_GARAGES) {
    availabilityMap.set(g.code, { current: g.current, capacity: g.total ?? g.current });
  }

  const results: ParkingResult[] = GARAGE_DEFINITIONS.map((def) => {
    const avail = availabilityMap.get(def.code);
    return {
      code: def.code,
      name: def.name,
      address: def.address,
      lat: def.lat,
      lng: def.lng,
      paid: !!def.paid,
      rating: def.rating,
      available: avail?.current ?? null,
      capacity: avail?.capacity ?? null,
      walkToEvent_m: Math.round(haversine(def.lat, def.lng, eventCoords.lat, eventCoords.lng)),
      driveFromUser_m: userCoords
        ? Math.round(haversine(userCoords.lat, userCoords.lng, def.lat, def.lng))
        : null,
    };
  });

  results.sort((a, b) => a.walkToEvent_m - b.walkToEvent_m);
  return results.slice(0, 5);
}

function openDirections(
  destLat: number,
  destLng: number,
  originLat?: number,
  originLng?: number
): void {
  const destination = `${destLat},${destLng}`;
  const origin =
    originLat != null && originLng != null ? `${originLat},${originLng}` : "current+location";
  const googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

  if (Platform.OS === "ios") {
    const appleUrl = `http://maps.apple.com/?daddr=${destLat},${destLng}&dirflg=d`;
    Linking.canOpenURL(appleUrl).then((supported) => {
      Linking.openURL(supported ? appleUrl : googleUrl);
    });
  } else {
    const geoUrl = `google.navigation:q=${destLat},${destLng}`;
    Linking.canOpenURL(geoUrl).then((supported) => {
      Linking.openURL(supported ? geoUrl : googleUrl);
    });
  }
}

async function resolveUserOrigin(): Promise<{
  coords: { lat: number; lng: number };
  type: "saved" | "current";
} | null> {
  try {
    const userJson = await SecureStore.getItemAsync("user");
    const user = userJson ? JSON.parse(userJson) : null;
    const email = user?.email;

    if (email) {
      const { getApiBaseUrl } = require("../config/env");
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/user/origin/?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        const savedOrigin = data?.default_origin;
        if (savedOrigin && savedOrigin.trim() !== "") {
          const geocoded = await geocodeAddress(savedOrigin);
          if (geocoded) {
            return {
              coords: { lat: geocoded.latitude, lng: geocoded.longitude },
              type: "saved",
            };
          }
        }
      }
    }
  } catch (e) {
    console.warn("Failed to load saved origin:", e);
  }

  try {
    const loc = await getCurrentLocation();
    if (loc) {
      return {
        coords: { lat: loc.latitude, lng: loc.longitude },
        type: "current",
      };
    }
  } catch (e) {
    console.warn("Fallback GPS failed:", e);
  }

  return null;
}

function ParkingCard({
  parking,
  theme,
  isExpanded,
  onToggleExpand,
  userCoords,
  predictedAvail,
}: {
  parking: ParkingResult;
  theme: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  userCoords: { lat: number; lng: number } | null;
  predictedAvail?: number | null;
}) {
  const isDark = theme.mode === "dark";
  const subColor = theme.textMuted ?? (isDark ? "#9ca3af" : "#6b7280");

  const availColor =
    parking.available === null
      ? subColor
      : parking.available === 0
      ? "#ef4444"
      : parking.available < 20
      ? "#f59e0b"
      : "#22c55e";

  return (
    <View
      style={[
        detailStyles.parkingItemCard,
        {
          backgroundColor: isDark ? "#2a2d31" : "#fff",
          borderColor: isExpanded ? COLOR_MAP.meeting : isDark ? "#374151" : "#e5e7eb",
        },
      ]}
    >
      <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.7}>
        <View style={detailStyles.parkingItemHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[detailStyles.parkingName, { color: theme.text }]}>{parking.name}</Text>
            {parking.address ? (
              <Text
                style={[detailStyles.parkingAddress, { color: subColor }]}
                numberOfLines={1}
              >
                {parking.address}
              </Text>
            ) : null}
          </View>

          {parking.available != null && (
            <View style={[detailStyles.availBadge, { backgroundColor: `${availColor}22` }]}>
              <View style={[detailStyles.availDot, { backgroundColor: availColor }]} />
              <Text style={[detailStyles.availText, { color: availColor }]}>
                {parking.available > 0 ? `${parking.available}` : "Full"}
              </Text>
            </View>
          )}
        </View>

        {predictedAvail != null && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
          <Ionicons name="analytics-outline" size={12} color="#a78bfa" />
          <Text style={{ fontSize: 11, color: "#a78bfa", fontWeight: "600" }}>
            Predicted: ~{Math.round(predictedAvail)} spots
          </Text>
          </View>
      )}

        <View style={detailStyles.parkingMetaRow}>
          <View style={detailStyles.parkingMetaChip}>
            <Ionicons name="walk-outline" size={14} color={subColor} />
            <Text style={[detailStyles.parkingMetaText, { color: subColor }]}>
              {formatDistance(parking.walkToEvent_m)} • {estimateWalkMinutes(parking.walkToEvent_m)} min walk
            </Text>
          </View>

          {parking.driveFromUser_m != null && (
            <View style={detailStyles.parkingMetaChip}>
              <Ionicons name="car-outline" size={14} color={subColor} />
              <Text style={[detailStyles.parkingMetaText, { color: subColor }]}>
                {formatDistance(parking.driveFromUser_m)} from start
              </Text>
            </View>
          )}
        </View>

        <View style={detailStyles.chevronRow}>
          <Text style={[detailStyles.chevronHint, { color: subColor }]}>
            {isExpanded ? "Hide directions" : "Tap for directions"}
          </Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={subColor}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={detailStyles.directionsContainer}>
          <View
            style={[
              detailStyles.directionsDivider,
              { borderColor: isDark ? "#374151" : "#e5e7eb" },
            ]}
          />

          <TouchableOpacity
            style={[detailStyles.directionBtn, { backgroundColor: `${COLOR_MAP.meeting}18` }]}
            onPress={() =>
              openDirections(
                parking.lat,
                parking.lng,
                userCoords?.lat,
                userCoords?.lng
              )
            }
          >
            <Ionicons name="navigate-outline" size={20} color={COLOR_MAP.meeting} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[detailStyles.dirBtnTitle, { color: theme.text }]}>
                Navigate to Parking
              </Text>
              <Text style={[detailStyles.dirBtnSub, { color: subColor }]}>
                Opens in Maps app
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={subColor} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function CalendarEvents(): React.JSX.Element {
  const theme = React.useContext(ThemeContext);

  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const [importedEvents, setImportedEvents] = React.useState<AppEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = React.useState<AppEvent | null>(null);
  const [activeReminders, setActiveReminders] = React.useState<Record<string, string>>({});
  const [parkingResults, setParkingResults] = React.useState<ParkingResult[]>([]);
  const [sortMode, setSortMode] = React.useState<SortMode>("distance");
  const [expandedCode, setExpandedCode] = React.useState<string | null>(null);
  const [userCoords, setUserCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [originType, setOriginType] = React.useState<"saved" | "current" | null>(null);
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [loadingParking, setLoadingParking] = React.useState(false);
  const [eventCoords, setEventCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const parkingCodes = React.useMemo( () => parkingResults.map((p) => p.code).filter(Boolean),
  [parkingResults]);
  const { getForecast, loading: forecastLoading } = useBulkForecasts(parkingCodes);

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("active_reminders");
        if (raw) setActiveReminders(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  React.useEffect(() => {
    const loadAllEvents = async () => {
      let icsEvents: AppEvent[] = [];
      try {
        const stored = await AsyncStorage.getItem("calendar_events");
        if (stored) icsEvents = JSON.parse(stored);
      } catch (e) {
        console.log("ics event loading failed:", e);
      }

      let deviceEvents: AppEvent[] = [];
      try {
        const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
        if (status === "granted") {
          const calendars = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 3);

          const events = await ExpoCalendar.getEventsAsync(
            calendars.map((c) => c.id),
            startDate,
            endDate
          );

          deviceEvents = events.map((ev, i) => {
            const start = new Date(ev.startDate);
            const end = new Date(ev.endDate);
            const year = start.getFullYear();
            const month = String(start.getMonth() + 1).padStart(2, "0");
            const day = String(start.getDate()).padStart(2, "0");

            return {
              id: `device-${i}`,
              title: ev.title || "Untitled",
              date: `${year}-${month}-${day}`,
              time: `${start.toTimeString().slice(0, 5)} - ${end.toTimeString().slice(0, 5)}`,
              location: ev.location || undefined,
              category: "other" as Category,
            };
          });
        }
      } catch (e) {
        console.log("device events loading failed:", e);
      }

      setImportedEvents([...icsEvents, ...deviceEvents]);
    };

    loadAllEvents();
  }, []);

  React.useEffect(() => {
    if (!selectedEvent?.location) {
      setEventCoords(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const coords = await findLocationCoords(selectedEvent.location!);
      if (!cancelled) setEventCoords(coords);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedEvent?.id, selectedEvent?.location]);

  React.useEffect(() => {
    if (!selectedEvent?.location) {
      setParkingResults([]);
      return;
    }

    let cancelled = false;
    setLoadingParking(true);
    setLocationError(null);
    setExpandedCode(null);

    (async () => {
      const evtCoords = await findLocationCoords(selectedEvent.location!);

      if (!evtCoords || cancelled) {
        if (!cancelled) {
          setParkingResults([]);
          setLoadingParking(false);
        }
        return;
      }

      let resolvedUserCoords: { lat: number; lng: number } | null = null;
      const originResult = await resolveUserOrigin();

      if (originResult) {
        resolvedUserCoords = originResult.coords;
        if (!cancelled) {
          setUserCoords(resolvedUserCoords);
          setOriginType(originResult.type);
        }
      } else {
        if (!cancelled) {
          setUserCoords(null);
          setOriginType(null);
          setLocationError(
            "No saved starting location and device location unavailable. Set a starting location in Settings → Travel Preferences for distance info."
          );
        }
      }

      const results = buildParkingResults(evtCoords, resolvedUserCoords);

      if (!cancelled) {
        setParkingResults(results);
        setLoadingParking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedEvent?.id, selectedEvent?.location]);

  const sortedParking = React.useMemo(() => {
  const copy = [...parkingResults];
  if (sortMode === "distance") {
    copy.sort((a, b) => a.walkToEvent_m - b.walkToEvent_m);
  } else {
    copy.sort((a, b) => {
      const fcA = getForecast(a.code);
      const fcB = getForecast(b.code);
      const aAvail = fcA?.forecast?.[0]?.available ?? a.available ?? -1;
      const bAvail = fcB?.forecast?.[0]?.available ?? b.available ?? -1;
      if (bAvail !== aAvail) return bAvail - aAvail;
      return a.walkToEvent_m - b.walkToEvent_m;
    });
  }
  return copy;
}, [parkingResults, sortMode, getForecast]);

  const allEvents = [...SAMPLE, ...importedEvents];
  const eventsForDate = allEvents.filter((e) => e.date === selectedDate);

  const markedDates = allEvents.reduce<Record<string, any>>((acc, ev) => {
    acc[ev.date] = {
      marked: true,
      dotColor: COLOR_MAP[ev.category ?? "default"],
      ...(ev.date === selectedDate && {
        selected: true,
        selectedColor: COLOR_MAP[ev.category ?? "default"],
      }),
    };
    return acc;
  }, {});

  const scheduleReminder = async (event: AppEvent, minutesBefore: number) => {
    const eventStart = getEventStartDate(event);
    if (!eventStart) {
      Alert.alert("Error", "Could not parse event time.");
      return;
    }

    const reminderTime = new Date(eventStart.getTime() - minutesBefore * 60 * 1000);
    const now = new Date();
    const secondsUntilReminder = Math.floor(
      (reminderTime.getTime() - now.getTime()) / 1000
    );

    if (secondsUntilReminder <= 0) {
      Alert.alert(
        "Too Late",
        `This reminder time has already passed. The event ${
          minutesBefore >= 60
            ? `starts in less than ${minutesBefore / 60} hour(s)`
            : `starts in less than ${minutesBefore} minutes`
        }.`
      );
      return;
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Enable notifications in your device settings.");
        return;
      }

      const label =
        minutesBefore >= 60 ? `${minutesBefore / 60} hour(s)` : `${minutesBefore} min`;

      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${event.title} — Starting Soon`,
          body: `${event.title} starts in ${label}${event.location ? ` at ${event.location}` : ""}.`,
          sound: "default",
          data: { eventId: event.id, type: "calendarReminder" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntilReminder,
          repeats: false,
        },
      });

      console.log(`Reminder set: "${event.title}" in ${secondsUntilReminder}s (${label} before)`);

      const key = getReminderKey(event.id, minutesBefore);
      const updated = { ...activeReminders, [key]: notifId };
      setActiveReminders(updated);
      await AsyncStorage.setItem("active_reminders", JSON.stringify(updated));
    } catch (e: any) {
      console.error("Failed to schedule notification:", e);
      Alert.alert("Error", e?.message || "Failed to schedule notification.");
    }
  };

  const cancelReminder = async (event: AppEvent, minutesBefore: number) => {
    const key = getReminderKey(event.id, minutesBefore);
    const notifId = activeReminders[key];

    if (notifId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifId);
        console.log(`Reminder cancelled for "${event.title}" (${minutesBefore} min)`);
      } catch {}
    }

    const updated = { ...activeReminders };
    delete updated[key];
    setActiveReminders(updated);
    await AsyncStorage.setItem("active_reminders", JSON.stringify(updated));
  };

  const toggleReminder = async (event: AppEvent, minutesBefore: number) => {
    const key = getReminderKey(event.id, minutesBefore);
    const isActive = !!activeReminders[key];

    if (isActive) {
      await cancelReminder(event, minutesBefore);
    } else {
      await scheduleReminder(event, minutesBefore);
    }
  };

  const isReminderValid = (event: AppEvent, minutesBefore: number): boolean => {
    const eventStart = getEventStartDate(event);
    if (!eventStart) return false;
    const reminderTime = new Date(eventStart.getTime() - minutesBefore * 60 * 1000);
    return reminderTime.getTime() > Date.now();
  };

  const deleteEvent = async (event: AppEvent) => {
    Alert.alert("Delete Event", `Remove "${event.title}" from your calendar?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            for (const option of REMINDER_OPTIONS) {
              const key = getReminderKey(event.id, option.minutes);
              if (activeReminders[key]) {
                await cancelReminder(event, option.minutes);
              }
            }

            if (event.id.startsWith("ics-")) {
              const stored = await AsyncStorage.getItem("calendar_events");
              if (stored) {
                const events = JSON.parse(stored);
                const filtered = events.filter((e: any) => e.id !== event.id);
                await AsyncStorage.setItem("calendar_events", JSON.stringify(filtered));
                setImportedEvents((prev) => prev.filter((e) => e.id !== event.id));
              }
            }

            setSelectedEvent(null);
          } catch (e) {
            console.log("Delete failed:", e);
          }
        },
      },
    ]);
  };

  if (selectedEvent) {
    const isDeviceEvent = selectedEvent.id.startsWith("device-");
    const isSampleEvent = !selectedEvent.id.startsWith("ics-") && !isDeviceEvent;
    const categoryColor = COLOR_MAP[selectedEvent.category ?? "default"];
    const isDark = theme.mode === "dark";
    const textMuted = theme.textMuted ?? (isDark ? "#9ca3af" : "#6b7280");
    const borderTone = theme.border ?? (isDark ? "#374151" : "#e5e7eb");
    const successTone = theme.success ?? "#22c55e";
    const dangerTone = theme.danger ?? "#ef4444";

    const formatDisplayDate = (dateStr: string): string => {
      try {
        const [year, month, day] = dateStr.split("-").map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return dateStr;
      }
    };

    const parseTimeRange = (timeStr: string): string => {
      try {
        const parts = timeStr.split(" - ");
        const fmt = (t: string) => {
          const [h, m] = t.trim().split(":").map(Number);
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 || 12;
          return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
        };
        return parts.length === 2 ? `${fmt(parts[0])} – ${fmt(parts[1])}` : timeStr;
      } catch {
        return timeStr;
      }
    };

    const isAllDay = selectedEvent.time === "00:00 - 00:00" || selectedEvent.time === "";

    return (
      <SafeAreaView style={[detailStyles.root, { backgroundColor: theme.bg }]} edges={["top"]}>
        <View style={detailStyles.header}>
          <TouchableOpacity
            style={detailStyles.headerBtn}
            onPress={() => {
              setSelectedEvent(null);
              setExpandedCode(null);
              setLocationError(null);
            }}
          >
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <Text style={[detailStyles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            Event Details
          </Text>

          <View style={detailStyles.headerBtn} />
        </View>

        <ScrollView contentContainerStyle={detailStyles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[detailStyles.card, { backgroundColor: theme.bg, borderColor: borderTone }]}>
            {selectedEvent.category && (
              <View style={[detailStyles.categoryBadge, { borderColor: categoryColor }]}>
                <Text style={[detailStyles.categoryText, { color: categoryColor }]}>
                  {selectedEvent.category.charAt(0).toUpperCase() + selectedEvent.category.slice(1)}
                </Text>
              </View>
            )}

            <Text style={[detailStyles.eventTitle, { color: theme.text }]}>
              {selectedEvent.title}
            </Text>

            <View style={detailStyles.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={textMuted}
                style={detailStyles.infoIcon}
              />
              <Text style={[detailStyles.infoText, { color: theme.text }]}>
                {formatDisplayDate(selectedEvent.date)}
              </Text>
            </View>

            <View style={detailStyles.infoRow}>
              <Ionicons
                name="time-outline"
                size={16}
                color={textMuted}
                style={detailStyles.infoIcon}
              />
              <Text style={[detailStyles.infoText, { color: theme.text }]}>
                {isAllDay ? "All day" : parseTimeRange(selectedEvent.time)}
              </Text>
            </View>

            {selectedEvent.location && (
              <View style={detailStyles.infoRow}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={textMuted}
                  style={detailStyles.infoIcon}
                />
                <Text style={[detailStyles.infoText, { color: theme.text }]}>
                  {selectedEvent.location}
                </Text>
              </View>
            )}
          </View>

          <View style={[detailStyles.card, { backgroundColor: theme.bg, borderColor: borderTone }]}>
            <View style={detailStyles.sectionHeader}>
              <Ionicons name="notifications-outline" size={18} color={theme.text} />
              <Text style={[detailStyles.sectionTitle, { color: theme.text }]}>Reminders</Text>
            </View>

            <View style={detailStyles.chipGrid}>
              {REMINDER_OPTIONS.map((option) => {
                const key = getReminderKey(selectedEvent.id, option.minutes);
                const isActive = !!activeReminders[key];
                const isValid = isReminderValid(selectedEvent, option.minutes);

                return (
                  <TouchableOpacity
                    key={option.minutes}
                    onPress={() => toggleReminder(selectedEvent, option.minutes)}
                    disabled={!isValid && !isActive}
                    style={[
                      detailStyles.chip,
                      {
                        borderColor: isActive ? successTone : borderTone,
                        backgroundColor: isActive ? `${successTone}1A` : "transparent",
                        opacity: !isValid && !isActive ? 0.35 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isActive ? "notifications" : "notifications-outline"}
                      size={13}
                      color={isActive ? successTone : textMuted}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        detailStyles.chipText,
                        {
                          color: isActive ? successTone : theme.text,
                          fontWeight: isActive ? "700" : "500",
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {REMINDER_OPTIONS.some(
              (o) => !!activeReminders[getReminderKey(selectedEvent.id, o.minutes)]
            ) && (
              <View style={[detailStyles.reminderSummary, { borderTopColor: borderTone }]}>
                <Ionicons name="checkmark-circle" size={14} color={successTone} />
                <Text style={[detailStyles.reminderSummaryText, { color: textMuted }]}>
                  {REMINDER_OPTIONS.filter(
                    (o) => !!activeReminders[getReminderKey(selectedEvent.id, o.minutes)]
                  )
                    .map((o) => o.label)
                    .join(", ")}{" "}
                  before
                </Text>
              </View>
            )}
          </View>

          <View style={[detailStyles.card, { backgroundColor: theme.bg, borderColor: borderTone }]}>
            <View style={detailStyles.sectionHeader}>
              <Ionicons name="car-outline" size={18} color={theme.text} />
              <Text style={[detailStyles.sectionTitle, { color: theme.text }]}>
                Parking & Directions
              </Text>
            </View>

            {!selectedEvent.location ? (
              <View style={detailStyles.edgeCaseBox}>
                <Ionicons name="location-outline" size={28} color={textMuted} />
                <Text style={[detailStyles.edgeCaseText, { color: textMuted }]}>
                  No location set for this event.{"\n"}Add a location to see nearby parking.
                </Text>
              </View>
            ) : !eventCoords ? (
              <View style={detailStyles.edgeCaseBox}>
                <Ionicons name="alert-circle-outline" size={28} color="#f59e0b" />
                <Text style={[detailStyles.edgeCaseText, { color: textMuted }]}>
                  Could not resolve "{selectedEvent.location}" to a known location.{"\n"}Try a
                  recognized building name like Lawson, WALC, or Stewart.
                </Text>
              </View>
            ) : (
              <>
                {locationError ? (
                  <View
                    style={[
                      detailStyles.locationWarning,
                      { backgroundColor: isDark ? "#2a2d31" : "#fff7ed" },
                    ]}
                  >
                    <Ionicons name="warning-outline" size={16} color="#f59e0b" />
                    <Text style={[detailStyles.locationWarningText, { color: textMuted }]}>
                      {locationError}
                    </Text>
                  </View>
                ) : null}

                {originType ? (
                  <View
                    style={[
                      detailStyles.originInfoRow,
                      { backgroundColor: isDark ? "#2a2d31" : "#f8fafc" },
                    ]}
                  >
                    <Ionicons
                      name={originType === "saved" ? "bookmark-outline" : "locate-outline"}
                      size={16}
                      color={textMuted}
                    />
                    <Text style={[detailStyles.originInfoText, { color: textMuted }]}>
                      Distances are based on your{" "}
                      {originType === "saved" ? "saved starting location" : "current device location"}.
                    </Text>
                  </View>
                ) : null}

                <View style={detailStyles.sortRow}>
                  <Text style={[detailStyles.sortLabel, { color: textMuted }]}>Sort by</Text>

                  <TouchableOpacity
                    style={[
                      detailStyles.sortChip,
                      {
                        borderColor:
                          sortMode === "distance" ? COLOR_MAP.meeting : borderTone,
                        backgroundColor:
                          sortMode === "distance" ? `${COLOR_MAP.meeting}12` : "transparent",
                      },
                    ]}
                    onPress={() => setSortMode("distance")}
                  >
                    <Ionicons
                      name="walk-outline"
                      size={14}
                      color={sortMode === "distance" ? COLOR_MAP.meeting : textMuted}
                    />
                    <Text
                      style={[
                        detailStyles.sortChipText,
                        {
                          color:
                            sortMode === "distance" ? COLOR_MAP.meeting : theme.text,
                        },
                      ]}
                    >
                      Distance
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      detailStyles.sortChip,
                      {
                        borderColor:
                          sortMode === "availability" ? COLOR_MAP.meeting : borderTone,
                        backgroundColor:
                          sortMode === "availability" ? `${COLOR_MAP.meeting}12` : "transparent",
                      },
                    ]}
                    onPress={() => setSortMode("availability")}
                  >
                    <Ionicons
                      name="stats-chart-outline"
                      size={14}
                      color={sortMode === "availability" ? COLOR_MAP.meeting : textMuted}
                    />
                    <Text
                      style={[
                        detailStyles.sortChipText,
                        {
                          color:
                            sortMode === "availability" ? COLOR_MAP.meeting : theme.text,
                        },
                      ]}
                    >
                      Predicted Availability
                    </Text>
                  </TouchableOpacity>
                </View>

                {loadingParking ? (
                  <View style={detailStyles.loadingRow}>
                    <ActivityIndicator size="small" color={COLOR_MAP.meeting} />
                    <Text style={[detailStyles.loadingText, { color: textMuted }]}>
                      Loading parking info…
                    </Text>
                  </View>
                ) : sortedParking.length > 0 ? (
                  <>
                    {sortedParking.map((p) => {
                      const fc = getForecast(p.code);
                      const predictedAvail = fc?.forecast?.[0]?.available ?? null;
                      return (
                      <ParkingCard
                        key={p.code}
                        parking={p}
                        theme={theme}
                        userCoords={userCoords}
                        isExpanded={expandedCode === p.code}
                        onToggleExpand={() =>
                          setExpandedCode(expandedCode === p.code ? null : p.code)
                        }
                        predictedAvail={predictedAvail}
                      />
                    );
    })}

                    {eventCoords ? (
                      <TouchableOpacity
                        style={[
                          detailStyles.navigateToEventBtn,
                          { borderColor: borderTone },
                        ]}
                        onPress={() =>
                          openDirections(
                            eventCoords.lat,
                            eventCoords.lng,
                            userCoords?.lat,
                            userCoords?.lng
                          )
                        }
                      >
                        <Ionicons
                          name="map-outline"
                          size={18}
                          color={COLOR_MAP.meeting}
                        />
                        <Text
                          style={[
                            detailStyles.navigateToEventText,
                            { color: COLOR_MAP.meeting },
                          ]}
                        >
                          Navigate to Event Location
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                ) : (
                  <View style={detailStyles.edgeCaseBox}>
                    <Ionicons name="alert-circle-outline" size={28} color={dangerTone} />
                    <Text style={[detailStyles.edgeCaseText, { color: dangerTone }]}>
                      No parking locations available.
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {isDeviceEvent ? (
            <Text style={[detailStyles.hint, { color: textMuted }]}>
              Event can only be deleted from your device calendar.
            </Text>
          ) : !isSampleEvent ? (
            <TouchableOpacity
              style={[detailStyles.deleteBtn, { borderColor: dangerTone }]}
              onPress={() => deleteEvent(selectedEvent)}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={dangerTone}
                style={{ marginRight: 6 }}
              />
              <Text style={[detailStyles.deleteBtnText, { color: dangerTone }]}>
                Delete Event
              </Text>
            </TouchableOpacity>
          ) : null}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Calendar
        markedDates={markedDates}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        enableSwipeMonths={true}
        theme={{
          calendarBackground: theme.bg,
          dayTextColor: theme.text,
          monthTextColor: theme.text,
          selectedDayBackgroundColor: COLOR_MAP.meeting,
          selectedDayTextColor: "#fff",
          todayTextColor: COLOR_MAP.meeting,
          arrowColor: COLOR_MAP.meeting,
        }}
      />

      <Text style={[styles.header, { color: theme.text }]}>{selectedDate}</Text>

      {eventsForDate.length === 0 ? (
        <View style={styles.empty}>
          <Text
            style={[
              styles.emptyText,
              { color: theme.textMuted ?? (theme.mode === "dark" ? "#9ca3af" : "#6b7280") },
            ]}
          >
            No events for this date
          </Text>
        </View>
      ) : (
        <FlatList
          data={eventsForDate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const borderColor = COLOR_MAP[item.category ?? "default"];
            const hasReminder = REMINDER_OPTIONS.some(
              (o) => !!activeReminders[getReminderKey(item.id, o.minutes)]
            );

            return (
              <TouchableOpacity onPress={() => setSelectedEvent(item)}>
                <View
                  style={[
                    styles.card,
                    {
                      borderColor,
                      backgroundColor: theme.mode === "dark" ? "#202225" : "#fff",
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={[styles.title, { color: theme.text, flex: 1 }]}>
                      {item.title}
                    </Text>
                    {hasReminder && (
                      <Ionicons name="notifications" size={16} color="#22c55e" />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.time,
                      { color: theme.mode === "dark" ? "#cfd2d6" : "#6b7280" },
                    ]}
                  >
                    {item.time}
                  </Text>

                  {item.location && (
                    <Text
                      style={[
                        styles.location,
                        {
                          color:
                            theme.textMuted ??
                            (theme.mode === "dark" ? "#9ca3af" : "#6b7280"),
                        },
                      ]}
                    >
                      {item.location}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 22, fontWeight: "700", margin: 16 },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: "600" },
  time: { marginTop: 4 },
  location: { marginTop: 2 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16 },
});

const detailStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700" },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  categoryText: { fontSize: 12, fontWeight: "700" },
  eventTitle: { fontSize: 22, fontWeight: "800", marginBottom: 14 },

  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  infoIcon: { marginRight: 10 },
  infoText: { fontSize: 15, flex: 1 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },

  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13 },

  reminderSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reminderSummaryText: { fontSize: 13 },

  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  sortLabel: { fontSize: 13, fontWeight: "500" },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  sortChipText: { fontSize: 13, fontWeight: "600" },

  parkingItemCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
  },
  parkingItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  parkingName: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  parkingAddress: { fontSize: 13, marginBottom: 4 },
  parkingMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  parkingMetaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  parkingMetaText: { fontSize: 13 },
  availBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  availDot: { width: 7, height: 7, borderRadius: 4 },
  availText: { fontSize: 12, fontWeight: "700" },
  chevronRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 8,
  },
  chevronHint: { fontSize: 12 },
  directionsContainer: { marginTop: 4 },
  directionsDivider: { borderTopWidth: 1, marginBottom: 12 },
  directionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  dirBtnTitle: { fontSize: 15, fontWeight: "600" },
  dirBtnSub: { fontSize: 12, marginTop: 2 },

  edgeCaseBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 10,
  },
  edgeCaseText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  locationWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationWarningText: { fontSize: 12, flex: 1 },
  originInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  originInfoText: { fontSize: 12, flex: 1 },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingVertical: 16,
    justifyContent: "center",
  },
  loadingText: { fontSize: 13 },

  navigateToEventBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
  },
  navigateToEventText: { fontSize: 15, fontWeight: "600" },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  deleteBtnText: { fontSize: 15, fontWeight: "700" },
  hint: { fontSize: 13, textAlign: "center", marginTop: 8, marginBottom: 8 },
});