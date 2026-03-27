import React from "react";
import { View, FlatList } from "react-native";
import ThemedText from "../../components/ThemedText";

export default function EventsScreen() {
  const [events] = React.useState<any[]>([]);
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <ThemedText style={{ fontSize: 22, fontWeight: "700" }}>Upcoming Events</ThemedText>
      <FlatList
        data={events}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <ThemedText>{item?.title ?? "Event"}</ThemedText>}
      />
    </View>
  );
}
