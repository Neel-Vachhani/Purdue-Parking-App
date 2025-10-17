import * as React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { ThemeContext } from "../theme/ThemeProvider";

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
  container: {
    flex: 1,
  },
  header: {
    fontSize: 32,
    fontWeight: "700",
    margin: 16,
  },
  eventCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  courseText: {
    fontSize: 18,
    fontWeight: "600",
  },
  timeText: {
    marginTop: 4,
  },
  locationText: {
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

  const theme = React.useContext(ThemeContext);

  const headerColor = theme.text;
  const cardBg = theme.mode === "dark" ? "#202225" : "#FFFFFF";
  const courseColor = theme.text;
  const timeColor = theme.mode === "dark" ? "#cfd2d6" : "#6b7280";
  const locationColor = theme.mode === "dark" ? "#9ca3af" : "#6b7280";
  const emptyColor = theme.mode === "dark" ? "#9ca3af" : "#6b7280";

  const getBorderColor = React.useCallback((type?: EventType) => {
    return type && type in COLOR_MAP ? COLOR_MAP[type] : COLOR_MAP.default;
  }, []);

  const renderItem = React.useCallback(({ item }: { item: ClassEvent }) => {
    const borderColor = getBorderColor(item.type);

    return (
      <View
        style={[
          styles.eventCard,
          { borderColor, backgroundColor: cardBg } // Dynamic border and background
        ]}
      >
       <Text style={[styles.courseText, { color: courseColor }]}>
        {item.course}
        </Text>
        <Text style={[styles.timeText, { color: timeColor }]}>
        {item.time}
        </Text>
        <Text style={[styles.locationText, { color: locationColor }]}>
        {item.location}
        </Text>
      </View>
    );
  }, [getBorderColor]);

  const keyExtractor = React.useCallback((item: ClassEvent) => item.id, []);

  const renderEmptyState = React.useCallback((): React.JSX.Element => {
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: emptyColor }] }>
          No classes scheduled for today
        </Text>
      </View>
    );
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.header, { color: headerColor }] }>
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
