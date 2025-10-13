import React, { useState } from "react";
import { View, Text, Switch, StyleSheet, ScrollView } from "react-native";
import ThemedView from "../../components/ThemedView";
import ThemedText from "../../components/ThemedText";

export default function SettingsScreen() {
  const [lotClosures, setLotClosures] = useState(true);
  const [parkingPassSale, setParkingPassSale] = useState(true);
  const [criticalIssues, setCriticalIssues] = useState(true);

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        
        <View style={styles.preferenceContainer}>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>Lot closures</Text>
            <Switch
              value={lotClosures}
              onValueChange={setLotClosures}
              trackColor={{ false: "#3a3a3c", true: "#34c759" }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>Parking pass on sale reminder</Text>
            <Switch
              value={parkingPassSale}
              onValueChange={setParkingPassSale}
              trackColor={{ false: "#3a3a3c", true: "#34c759" }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>Critical issues</Text>
            <Switch
              value={criticalIssues}
              onValueChange={setCriticalIssues}
              trackColor={{ false: "#3a3a3c", true: "#34c759" }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    marginTop: 12,
    color: "#fff",
    opacity: 0.9,
  },
  preferenceContainer: {
    gap: 20,
  },
  preferenceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  preferenceLabel: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
  },
});
