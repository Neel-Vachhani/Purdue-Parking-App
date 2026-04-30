import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ParkedPin({ label }: { label?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="car" size={14} color="#0E0F11" />
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#F59E0B",
    borderColor: "#0E0F11",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
    color: "#0E0F11",
    backgroundColor: "#FDE68A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
});
