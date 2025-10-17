// components/CalendarView.tsx
import * as React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

// Strict type definitions
type EventType = "lecture" | "lab" | "discussion";

interface ClassEvent {
  id: string;
  course: string;
  time: string;
  location: string;
  type?: EventType;
}

interface CalendarViewProps {
  data?: ClassEvent[];
}

// Default data with proper typing
const SAMPLE_SCHEDULE: ClassEvent[] = [
  { 
    id: "1", 
    course: "CS 18200 - Foundations Of Computer Science", 
    time: "08:30 - 09:45", 
    location: "HAMP 101", 
    type: "lecture" 
  },
  { 
    id: "2", 
    course: "CS 24000 - Programming In C", 
    time: "10:00 - 11:15", 
    location: "UNIV 203", 
    type: "lecture" 
  },
  { 
    id: "3", 
    course: "CS 24000 - Programming In C Lab", 
    time: "11:30 - 12:45", 
    location: "ENGR 110", 
    type: "lab" 
  },
  { 
    id: "4", 
    course: "MA 26100 - Multivariate Calculus", 
    time: "13:00 - 13:50", 
    location: "STEW 310", 
    type: "lecture" 
  },
  { 
    id: "5", 
    course: "PHYS 22000 - General Physics", 
    time: "14:00 - 14:50", 
    location: "UNIV 204", 
    type: "discussion" 
  },
];

// Color mapping with fallbacks
const COLOR_MAP: Record<EventType | "default", string> = {
  lecture: "#4aa3ff",
  lab: "#22c55e",
  discussion: "#facc15",
  default: "#6b7280",
};

// Styles extracted for better performance and maintenance
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121314",
  },
  header: {
    color: "white",
    fontSize: 32,
    fontWeight: "700",
    margin: 16,
  },
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 3, // For Android shadow
  },
  courseText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  timeText: {
    color: "#cfd2d6",
    marginTop: 4,
  },
  locationText: {
    color: "#9ca3af",
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});

export default function CalendarView({ data = SAMPLE_SCHEDULE }: CalendarViewProps): React.JSX.Element {
  // Safe data handling with fallback
  const displayData = React.useMemo(() => {
    return Array.isArray(data) ? data : SAMPLE_SCHEDULE;
  }, [data]);

  const getBorderColor = React.useCallback((type?: EventType): string => {
    if (type && type in COLOR_MAP) {
      return COLOR_MAP[type];
    }
    return COLOR_MAP.default;
  }, []);

  const renderItem = React.useCallback(({ item }: { item: ClassEvent }) => {
    const borderColor = getBorderColor(item.type);

    return (
      <View
        style={[
          styles.eventCard,
          { borderColor } // Dynamic border color
        ]}
      >
       <Text style={styles.courseText}>
        {item.course}
        </Text>
        <Text style={styles.timeText}>
        {item.time}
        </Text>
        <Text style={styles.locationText}>
        {item.location}
        </Text>
      </View>
    );
  }, [getBorderColor]);

  const keyExtractor = React.useCallback((item: ClassEvent): string => {
    return item.id || `event-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const renderEmptyState = React.useCallback((): React.JSX.Element => {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          No classes scheduled for today
        </Text>
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Today
      </Text>
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

// Keep the original function for backward compatibility if needed elsewhere
export function getColors(type?: EventType): { border: string } {
  return {
    border: type && type in COLOR_MAP ? COLOR_MAP[type] : COLOR_MAP.default
  };
}