// components/CalendarEvents.tsx
import * as React from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
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
    const borderColor = COLOR_MAP[selectedEvent.category ?? "default"];

    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.bg, padding: 24 }]}
                  contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => setSelectedEvent(null)} style={styles.backBtn}>
          <Text style={[styles.backText, { color: COLOR_MAP.meeting }]}>← Back</Text>
        </TouchableOpacity>

        <View style={[styles.detailCard, { borderColor, backgroundColor: theme.mode === "dark" ? "#202225" : "#fff" }]}>
          <Text style={[styles.detailTitle, { color: theme.text }]}>{selectedEvent.title}</Text>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }]}>Date</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{selectedEvent.date}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }]}>Time</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{selectedEvent.time}</Text>
          </View>

          {selectedEvent.location && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }]}>Location</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{selectedEvent.location}</Text>
            </View>
          )}

          {selectedEvent.category && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }]}>Category</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{selectedEvent.category}</Text>
            </View>
          )}
        </View>

        <View style={[styles.reminderSection, { backgroundColor: theme.mode === "dark" ? "#202225" : "#fff", borderColor: theme.mode === "dark" ? "#374151" : "#e5e7eb" }]}>
          <View style={styles.reminderHeader}>
            <Ionicons name="notifications-outline" size={20} color={theme.text} />
            <Text style={[styles.reminderTitle, { color: theme.text }]}>Reminders</Text>
          </View>

          <View style={styles.reminderGrid}>
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
                    styles.reminderChip,
                    {
                      borderColor: isActive ? "#22c55e" : (theme.mode === "dark" ? "#374151" : "#d1d5db"),
                      backgroundColor: isActive
                        ? (theme.mode === "dark" ? "rgba(34, 197, 94, 0.15)" : "rgba(34, 197, 94, 0.1)")
                        : "transparent",
                      opacity: (!isValid && !isActive) ? 0.35 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={isActive ? "notifications" : "notifications-outline"}
                    size={14}
                    color={isActive ? "#22c55e" : (theme.mode === "dark" ? "#9ca3af" : "#6b7280")}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.reminderChipText,
                      {
                        color: isActive ? "#22c55e" : (theme.mode === "dark" ? "#d1d5db" : "#374151"),
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

          {REMINDER_OPTIONS.some((o) => !!activeReminders[getReminderKey(selectedEvent.id, o.minutes)]) && (
            <View style={styles.activeRemindersSummary}>
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Text style={[styles.activeRemindersText, { color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }]}>
                {REMINDER_OPTIONS
                  .filter((o) => !!activeReminders[getReminderKey(selectedEvent.id, o.minutes)])
                  .map((o) => o.label)
                  .join(", ")}{" "}
                before
              </Text>
            </View>
          )}
        </View>

        {isDeviceEvent ? (
          <Text style={[styles.hint, { color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }]}>
            Event can only be deleted from device calendar.
          </Text>
        ) : isSampleEvent ? null : (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteEvent(selectedEvent)}>
            <Text style={styles.deleteBtnText}>Delete Event</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.garageCard, { backgroundColor: theme.mode === "dark" ? "#202225" : "#f3f4f6" }]}>
          <Text style={[styles.garageTitle, { color: theme.text }]}>Nearby Garages</Text>
          {!selectedEvent.location ? (
            <Text style={[styles.garageText, { color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }]}>
              No location set for this event
            </Text>
          ) : garageResults.length > 0 ? (
            garageResults.map((g) => (
              <View key={g.code} style={{ marginBottom: 10 }}>
                <Text style={[styles.garageName, { color: theme.text }]}>{g.name}</Text>
                <Text style={[styles.garageText, { color: theme.mode === "dark" ? "#9ca3af" : "#6b7280" }]}>
                  {g.distance_m ? `${g.distance_m}m away · ` : ""}{g.available} spots available
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.garageText, { color: "#f87171" }]}>
              No garages available
            </Text>
          )}
        </View>
        
      </ScrollView>
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
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 18, fontWeight: "600" },
  detailCard: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 16,
  },
  detailTitle: { fontSize: 26, fontWeight: "700", marginBottom: 20 },
  detailRow: { marginBottom: 14 },
  detailLabel: { fontSize: 14, marginBottom: 2 },
  detailValue: { fontSize: 18 },
  deleteBtn: {
    marginTop: 16,
    backgroundColor: "#f87171",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  hint: { marginTop: 16, fontSize: 14, textAlign: "center" },

  reminderSection: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  reminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  reminderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reminderChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  reminderChipText: {
    fontSize: 13,
  },
  activeRemindersSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  activeRemindersText: {
    fontSize: 13,
  },
  garageCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
  },
  garageTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  garageName: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  garageText: { fontSize: 14 },
});