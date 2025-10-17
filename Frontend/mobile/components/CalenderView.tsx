import * as React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

export type EventType = "lecture" | "lab" | "discussion";

export interface ClassEvent {
  id: string;
  course: string;
  time: string;
  location: string;
  type?: EventType;
}

interface CalendarViewProps {
  data?: ClassEvent[];
}

const COLOR_MAP: Record<EventType | "default", string> = {
  lecture: "#4aa3ff",
  lab: "#22c55e",
  discussion: "#facc15",
  default: "#6b7280",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121314" },
  header: { color: "white", fontSize: 32, fontWeight: "700", margin: 16 },
  eventCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#202225",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  courseText: { color: "white", fontSize: 18, fontWeight: "600" },
  timeText: { color: "#cfd2d6", marginTop: 4 },
  locationText: { color: "#9ca3af", marginTop: 2 },
  listContent: { paddingBottom: 24 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  emptyText: { color: "#9ca3af", fontSize: 16, textAlign: "center", lineHeight: 24 },
});

export default function CalendarView({ data = [] }: CalendarViewProps): React.JSX.Element {
  const displayData = React.useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const getBorderColor = React.useCallback((type?: EventType) => {
    return type && type in COLOR_MAP ? COLOR_MAP[type] : COLOR_MAP.default;
  }, []);

  const renderItem = React.useCallback(({ item }: { item: ClassEvent }) => (
    <View style={[styles.eventCard, { borderColor: getBorderColor(item.type) }]}>
      <Text style={styles.courseText}>{item.course}</Text>
      <Text style={styles.timeText}>{item.time}</Text>
      <Text style={styles.locationText}>{item.location}</Text>
    </View>
  ), [getBorderColor]);

  const keyExtractor = React.useCallback((item: ClassEvent) => item.id, []);

  const renderEmptyState = React.useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No classes scheduled for today</Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Today</Text>
      <FlatList
        data={displayData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
      />
    </View>
  );
}
