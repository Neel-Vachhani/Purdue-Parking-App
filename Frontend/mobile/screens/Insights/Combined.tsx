import React, { useState, useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ThemeContext } from "../../theme/ThemeProvider";
import InsightsScreen from "./Insights"; // Your historical/current data component
import PredictiveInsights from "../Predictions/PredictiveInsights"; // Your predictive component

export default function Combined() {
  const theme = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState<"current" | "predictive">("current");

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Parking Insights</Text>
        <Text style={styles.headerSubtitle}>Real-time availability and trends</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <View style={styles.tabSelector}>
          <TouchableOpacity
            onPress={() => setActiveTab("current")}
            style={[styles.tab, activeTab === "current" && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === "current" && styles.tabTextActive]}>
              Current Status
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("predictive")}
            style={[styles.tab, activeTab === "predictive" && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === "predictive" && styles.tabTextActive]}>
              Predictive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Render Active Component */}
      {activeTab === "current" ? <InsightsScreen /> : <PredictiveInsights />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#9ca3af",
  },
  tabContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabSelector: {
    flexDirection: "row",
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 4,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#6366f1",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
  },
  tabTextActive: {
    color: "#ffffff",
  },
});