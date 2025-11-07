// components/CalendarEvents.tsx
import * as React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";
import { ThemeContext } from "../theme/ThemeProvider";

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

// Sample general events
const SAMPLE: AppEvent[] = [
  { id: "1", title: "Team Sync", time: "09:30 - 10:00", date: "2025-11-07", category: "meeting" },
  { id: "2", title: "Work Session", time: "10:30 - 12:00", date: "2025-11-07", category: "personal" },
  { id: "3", title: "Project Demo", time: "14:00 - 15:00", date: "2025-11-08", category: "deadline" },
];

export default function CalendarEvents(): React.JSX.Element {
  const theme = React.useContext(ThemeContext);
  const [selectedDate, setSelectedDate] = React.useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const eventsForDate = SAMPLE.filter((e) => e.date === selectedDate);

  const markedDates = SAMPLE.reduce<Record<string, any>>((acc, ev) => {
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

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Calendar
        markedDates={markedDates}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        theme={{
          calendarBackground: theme.bg,
          dayTextColor: theme.text,
          monthTextColor: theme.text,
          selectedDayBackgroundColor: COLOR_MAP.meeting,
          selectedDayTextColor: "#fff",
          todayTextColor: COLOR_MAP.meeting,
          arrowColor: theme.text,
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
            return (
              <View
                style={[
                  styles.card,
                  { borderColor, backgroundColor: theme.mode === "dark" ? "#202225" : "#fff" },
                ]}
              >
                <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
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
