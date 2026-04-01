// components/CalendarEvents.tsx
import * as React from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Pressable, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { ThemeContext } from "../theme/ThemeProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoCalendar from "expo-calendar";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { INITIAL_GARAGES } from "../data/initialGarageAvailability";

type Category = "meeting" | "deadline" | "personal" | "other";

interface AppEvent {
  id: string;
  title: string;
  time: string;       // "09:00 - 10:00"
  date: string;       // "YYYY-MM-DD"
  location?: string;
  category?: Category;
}

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
    const startTime = event.time.split(" - ")[0].trim(); // "09:00"
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

// Sample general events
const SAMPLE: AppEvent[] = [
  { id: "1", title: "Team Sync", time: "09:30 - 10:00", date: "2025-12-11", category: "meeting" },
  { id: "2", title: "Work Session", time: "10:30 - 12:00", date: "2025-12-11", category: "personal" },
  { id: "3", title: "Project Demo", time: "14:00 - 15:00", date: "2025-12-11", category: "deadline" },
  { id: "4", title: "Work Session", time: "10:30 - 12:00", date: "2025-12-16", category: "personal" },
  { id: "5", title: "Project Demo", time: "14:00 - 15:00", date: "2025-12-10", category: "deadline" },
];

const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  "lawson": { lat: 40.4278, lng: -86.9169 },
  "walc": { lat: 40.4274, lng: -86.9126 },
  "pmucorr": { lat: 40.4250, lng: -86.9108 },
  "corec": { lat: 40.4219, lng: -86.9197 },
  "elliott": { lat: 40.4271, lng: -86.9029 },
  "ellt": { lat: 40.4271, lng: -86.9029 },
  "stewart": { lat: 40.4246, lng: -86.9128 },
  "stew": { lat: 40.4246, lng: -86.9128 },
  "krannert": { lat: 40.4233, lng: -86.9108 },
  "rawls": { lat: 40.4233, lng: -86.9108 },
  "ee": { lat: 40.4284, lng: -86.9112 },
  "msee": { lat: 40.4284, lng: -86.9112 },
  "phys": { lat: 40.4280, lng: -86.9152 },
  "bhee": { lat: 40.4241, lng: -86.9142 },
  "me": { lat: 40.4281, lng: -86.9133 },
  "cl50": { lat: 40.4243, lng: -86.9164 },
  "lily": { lat: 40.4228, lng: -86.9192 },
  "hamp": { lat: 40.4262, lng: -86.9082 },
  "knoy": { lat: 40.4267, lng: -86.9110 },
  "smith": { lat: 40.4275, lng: -86.9167 },
  "memorial union": { lat: 40.4250, lng: -86.9108 },
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

const findLocationCoords = (location: string): { lat: number; lng: number } | null => {
  const lower = location.toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (lower.includes(key)) return coords;
  }
  return null;
};

export default function CalendarEvents(): React.JSX.Element {
  const theme = React.useContext(ThemeContext);
  const [selectedDate, setSelectedDate] = React.useState<string>(() => { 
    //new Date().toISOString().slice(0, 10)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
});

  const [importedEvents, setImportedEvents] = React.useState<AppEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = React.useState<AppEvent | null>(null);
  //const [nearestGarage, setNearestGarage] = React.useState<any>(null);
  const [garageResults, setGarageResults] = React.useState<any[]>([]);
  
  const [activeReminders, setActiveReminders] = React.useState<Record<string, string>>({});

  //load reminders
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
    //ics events
    let icsEvents: AppEvent[] = [];
    try {
      const stored = await AsyncStorage.getItem("calendar_events");
      if (stored) icsEvents = JSON.parse(stored);
    } catch (e) {
      console.log("ics event loading failed:", e);
    }

    //import device calendar    
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
          }
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
    setGarageResults([]);
    return;
  }

  const coords = findLocationCoords(selectedEvent.location);
  const targetCodes = ["PGU", "PGG"];

  const results = INITIAL_GARAGES
    .filter((g) => targetCodes.includes(g.code) && g.current > 0)
    .map((g) => ({
      name: g.name,
      code: g.code,
      available: g.current,
      distance_m: coords ? Math.round(haversine(coords.lat, coords.lng, g.lat, g.lng)) : null,
    })).sort((a, b) => (a.code === "PGU" ? -1 : 1));;

  setGarageResults(results);
}, [selectedEvent]);


  const allEvents = [...SAMPLE, ...importedEvents];
  const eventsForDate = allEvents.filter((e) => e.date === selectedDate);

  const markedDates = allEvents .reduce<Record<string, any>>((acc, ev) => {
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
    const secondsUntilReminder = Math.floor((reminderTime.getTime() - now.getTime()) / 1000);

    if (secondsUntilReminder <= 0) {
      Alert.alert(
        "Too Late",
        `This reminder time has already passed. The event ${minutesBefore >= 60 ? `starts in less than ${minutesBefore / 60} hour(s)` : `starts in less than ${minutesBefore} minutes`}.`
      );
      return;
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Enable notifications in your device settings.");
        return;
      }

      const label = minutesBefore >= 60 ? `${minutesBefore / 60} hour(s)` : `${minutesBefore} min`;

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

      //TODO reminder
      /*Alert.alert(
        "Reminder Set",
        `You'll be notified ${label} before "${event.title}".`
      );*/
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

    const formatDisplayDate = (dateStr: string): string => {
      try {
        const [year, month, day] = dateStr.split("-").map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
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
        {/* Header */}
        <View style={detailStyles.header}>
          <Pressable style={detailStyles.headerBtn} onPress={() => setSelectedEvent(null)}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[detailStyles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            Event Details
          </Text>
          <View style={detailStyles.headerBtn} />
        </View>

        <ScrollView contentContainerStyle={detailStyles.scroll} showsVerticalScrollIndicator={false}>
          {/* Summary card */}
          <View style={[detailStyles.card, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            {/* Category badge */}
            {selectedEvent.category && (
              <View style={[detailStyles.categoryBadge, { borderColor: categoryColor }]}>
                <Text style={[detailStyles.categoryText, { color: categoryColor }]}>
                  {selectedEvent.category.charAt(0).toUpperCase() + selectedEvent.category.slice(1)}
                </Text>
              </View>
            )}

            <Text style={[detailStyles.eventTitle, { color: theme.text }]}>{selectedEvent.title}</Text>

            {/* Date row */}
            <View style={detailStyles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.textMuted} style={detailStyles.infoIcon} />
              <Text style={[detailStyles.infoText, { color: theme.text }]}>
                {formatDisplayDate(selectedEvent.date)}
              </Text>
            </View>

            {/* Time row */}
            <View style={detailStyles.infoRow}>
              <Ionicons name="time-outline" size={16} color={theme.textMuted} style={detailStyles.infoIcon} />
              <Text style={[detailStyles.infoText, { color: theme.text }]}>
                {isAllDay ? "All day" : parseTimeRange(selectedEvent.time)}
              </Text>
            </View>

            {/* Location row */}
            {selectedEvent.location && (
              <View style={detailStyles.infoRow}>
                <Ionicons name="location-outline" size={16} color={theme.textMuted} style={detailStyles.infoIcon} />
                <Text style={[detailStyles.infoText, { color: theme.text }]}>{selectedEvent.location}</Text>
              </View>
            )}
          </View>

          {/* Reminders card */}
          <View style={[detailStyles.card, { backgroundColor: theme.bg, borderColor: theme.border }]}>
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
                        borderColor: isActive ? theme.success : theme.border,
                        backgroundColor: isActive ? `${theme.success}1A` : "transparent",
                        opacity: !isValid && !isActive ? 0.35 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isActive ? "notifications" : "notifications-outline"}
                      size={13}
                      color={isActive ? theme.success : theme.textMuted}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[detailStyles.chipText, { color: isActive ? theme.success : theme.text, fontWeight: isActive ? "700" : "500" }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {REMINDER_OPTIONS.some((o) => !!activeReminders[getReminderKey(selectedEvent.id, o.minutes)]) && (
              <View style={[detailStyles.reminderSummary, { borderTopColor: theme.border }]}>
                <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                <Text style={[detailStyles.reminderSummaryText, { color: theme.textMuted }]}>
                  {REMINDER_OPTIONS
                    .filter((o) => !!activeReminders[getReminderKey(selectedEvent.id, o.minutes)])
                    .map((o) => o.label)
                    .join(", ")}{" "}
                  before
                </Text>
              </View>
            )}
          </View>

          {/* Nearby parking card */}
          <View style={[detailStyles.card, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <View style={detailStyles.sectionHeader}>
              <Ionicons name="car-outline" size={18} color={theme.text} />
              <Text style={[detailStyles.sectionTitle, { color: theme.text }]}>Nearby Parking</Text>
            </View>

            {!selectedEvent.location ? (
              <Text style={[detailStyles.mutedText, { color: theme.textMuted }]}>
                No location set for this event
              </Text>
            ) : garageResults.length > 0 ? (
              garageResults.map((g, idx) => (
                <View key={g.code}>
                  {idx > 0 && <View style={[detailStyles.divider, { backgroundColor: theme.border }]} />}
                  <View style={detailStyles.garageRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[detailStyles.garageName, { color: theme.text }]}>{g.name}</Text>
                      {g.distance_m != null && (
                        <Text style={[detailStyles.mutedText, { color: theme.textMuted }]}>{g.distance_m}m away</Text>
                      )}
                    </View>
                    <View style={[detailStyles.availBadge, { backgroundColor: g.available > 0 ? `${theme.success}22` : `${theme.danger}22` }]}>
                      <Text style={[detailStyles.availText, { color: g.available > 0 ? theme.success : theme.danger }]}>
                        {g.available} open
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[detailStyles.mutedText, { color: theme.danger }]}>No garages available</Text>
            )}
          </View>

          {/* Delete / hint */}
          {isDeviceEvent ? (
            <Text style={[detailStyles.hint, { color: theme.textMuted }]}>
              Event can only be deleted from your device calendar.
            </Text>
          ) : !isSampleEvent ? (
            <TouchableOpacity
              style={[detailStyles.deleteBtn, { borderColor: theme.danger }]}
              onPress={() => deleteEvent(selectedEvent)}
            >
              <Ionicons name="trash-outline" size={16} color={theme.danger} style={{ marginRight: 6 }} />
              <Text style={[detailStyles.deleteBtnText, { color: theme.danger }]}>Delete Event</Text>
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
          arrowColor: COLOR_MAP.meeting,//theme.text,
        }}  
      />

      <Text style={[styles.header, { color: theme.text }]}>
        {selectedDate}
      </Text>

      {eventsForDate.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }]}>
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
                  { borderColor, backgroundColor: theme.mode === "dark" ? "#202225" : "#fff" },
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[styles.title, { color: theme.text, flex: 1 }]}>{item.title}</Text>
                    {hasReminder && (
                      <Ionicons name="notifications" size={16} color="#22c55e" />
                    )}
                  </View>
                <Text style={[styles.time, { color: theme.mode === "dark" ? "#cfd2d6" : "#6b7280" }]}>
                  {item.time}
                </Text>
                {item.location && (
                  <Text
                    style={[
                      styles.location,
                      { color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" },
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

  garageRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  garageName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  mutedText: { fontSize: 13 },
  availBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  availText: { fontSize: 13, fontWeight: "700" },
  divider: { height: StyleSheet.hairlineWidth },

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